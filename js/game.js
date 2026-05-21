'use strict';

/* =====================================================
   game.js — Game orchestrator for game.html
   Reads URL params, builds state, drives the game loop,
   wires up Input/Render/AI/Scoring/GameUI.
   ===================================================== */

// ── Parse URL params ─────────────────────────────────
const Params = Object.fromEntries(new URLSearchParams(window.location.search));

// ── Build player list from params ────────────────────
function buildPlayers(params) {
  const opponent = CharacterDB.getById(params.opponent);
  const partner  = params.partner ? CharacterDB.getById(params.partner) : null;

  if (params.mode === 'teams' && opponent && partner) {
    return [
      { id: 'human',       name: 'You',         isHuman: true,  aiStrategy: null },
      { id: opponent.id,   name: opponent.name,  isHuman: false, aiStrategy: opponent.aiStrategy },
      { id: 'human_partner', name: partner.name, isHuman: false, aiStrategy: 'random' }, // AI partner
      { id: opponent.id + '_2', name: 'Opp 2',  isHuman: false, aiStrategy: opponent.aiStrategy },
    ];
  }

  return [
    { id: 'human',     name: 'You',           isHuman: true,  aiStrategy: null },
    { id: opponent?.id || 'cpu', name: opponent?.name || 'CPU', isHuman: false, aiStrategy: opponent?.aiStrategy || 'random' },
  ];
}

// ── Game state ───────────────────────────────────────
let state = null;
let _pendingTile = null;
let _quoteTimer  = null;
let _recapData   = null;
const players = buildPlayers(Params);

// ── Game Recap ───────────────────────────────────────

function _recapInit() {
  const opp = state.players.find(p => !p.isHuman);
  const fmt = { rounds: 'Single Round', points: 'First to 100 pts', bestof3: 'Best of 3' };
  _recapData = {
    oppName:     opp?.name || 'CPU',
    formatLabel: fmt[state.format] || state.format,
    date:        new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    rounds:      [],
  };
  _recapStartRound();
}

function _recapStartRound() {
  if (!_recapData) return;
  _recapData.rounds.push({
    num:          state.roundNumber,
    startingHands: state.players.map((p, i) => ({
      name:  p.name,
      tiles: state.hands[i].map(t => `${t.a}|${t.b}`),
    })),
    moves:  [],
    result: null,
  });
}

function _recapRecord(playerIndex, tile, end) {
  if (!_recapData || !_recapData.rounds.length) return;
  _recapData.rounds[_recapData.rounds.length - 1].moves.push({
    name:   state.players[playerIndex].name,
    tile:   tile ? `${tile.a}|${tile.b}` : null,
    end,
    passed: !tile,
  });
}

function _buildRecapText() {
  if (!_recapData) return 'No recap available.';
  const { oppName, formatLabel, date, rounds } = _recapData;
  const W   = 52;
  const bar = '='.repeat(W);
  const L   = [];

  L.push('ARTSDOMINOS  ·  GAME RECAP');
  L.push(bar);
  L.push(`You vs. ${oppName}  |  ${formatLabel}  |  ${date}`);
  L.push('');

  rounds.forEach(round => {
    L.push(bar);
    L.push(` ROUND ${round.num}`);
    L.push(bar);
    L.push('');
    L.push('STARTING HANDS');
    round.startingHands.forEach(({ name, tiles }) => {
      L.push(`  ${(name + ' :').padEnd(12)}  ${tiles.map(t => `[${t}]`).join(' ')}`);
    });
    L.push('');
    L.push('MOVE LOG');
    round.moves.forEach((m, i) => {
      const num    = `${i + 1}.`.padStart(5);
      const name   = m.name.padEnd(10);
      const action = m.passed          ? 'PASS'
                   : m.end === 'first' ? `opens with [${m.tile}]`
                   : m.end === 'left'  ? `plays [${m.tile}]  <- left`
                                       : `plays [${m.tile}]  right ->`;
      L.push(`  ${num}  ${name}  ${action}`);
    });
    if (round.result) {
      L.push('');
      L.push(`RESULT:  ${round.result}`);
    }
    L.push('');
  });

  L.push(bar);
  L.push(`FINAL SCORE:  You: ${state.matchScores[0]} pts  |  ${oppName}: ${state.matchScores[1] || 0} pts`);
  L.push(bar);
  return L.join('\n');
}

function _showEndPicker() {
  document.getElementById('end-select-bar').classList.remove('hidden');
}

function _hideEndPicker() {
  document.getElementById('end-select-bar').classList.add('hidden');
  _pendingTile = null;
}

function _showOppQuote(trigger) {
  const opp = state.players.find(p => !p.isHuman);
  if (!opp) return;
  const quoteset = QUOTES[opp.id];
  if (!quoteset || !quoteset[trigger] || !quoteset[trigger].length) return;
  const lines = quoteset[trigger];
  const line  = lines[Math.floor(Math.random() * lines.length)];

  const el = document.getElementById('opp-quote');
  if (!el) return;

  if (_quoteTimer) { clearTimeout(_quoteTimer); _quoteTimer = null; }

  el.textContent = line;
  el.classList.remove('hidden');
  void el.offsetWidth; // replay animation

  _quoteTimer = setTimeout(() => {
    el.classList.add('hidden');
    _quoteTimer = null;
  }, 2400);
}

function _quoteForMove(result) {
  const aiIdx = state.players.findIndex(p => !p.isHuman);
  if (aiIdx < 0) return null;

  if (result.roundWinner !== undefined && result.roundWinner !== null) {
    if (result.roundWinner === aiIdx) return result.blocked ? 'closeGame' : 'roundWin';
    return null;
  }

  if (result.passed) return 'pass';

  const lastTile = state.board[state.board.length - 1];
  if (lastTile && lastTile.a === lastTile.b) return 'double';

  const aiHand = state.hands[aiIdx];
  if (aiHand && aiHand.length <= 2) return 'lowTiles';

  return null;
}

// V2: Configure seat labels and show/hide 4-player side zones
function _initSeats() {
  const is4p = state.players.length > 2;

  // North seat tag: 1v1 = opponent name, 4-player = partner name
  const northTag = document.getElementById('seat-north-tag');
  if (northTag) northTag.textContent = is4p ? (state.players[2]?.name || '') : (state.players[1]?.name || '');

  // Side zones (4-player only)
  const seatWest = document.getElementById('seat-west');
  const seatEast = document.getElementById('seat-east');
  if (seatWest) seatWest.classList.toggle('hidden', !is4p);
  if (seatEast) seatEast.classList.toggle('hidden', !is4p);

  if (is4p) {
    // East = player[1], West = player[3]
    const eastTag = document.getElementById('seat-east-tag');
    const westTag = document.getElementById('seat-west-tag');
    if (eastTag) eastTag.textContent = state.players[1]?.name || '';
    if (westTag) westTag.textContent = state.players[3]?.name || '';
  }
}

function initGame() {
  Sound.init();
  Music.init();
  Music.start();
  state = Engine.createGameState(players, Params.format || 'rounds');
  _recapInit();
  window._gameState = state;

  const opp = CharacterDB.getById(Params.opponent);
  if (opp) {
    const portrait = document.getElementById('opp-portrait');
    if (portrait) {
      portrait.src = `assets/characters/${opp.portraitFile}`;
      portrait.onerror = () => { portrait.src = 'assets/characters/silhouette.svg'; };
    }
    const nameEl = document.getElementById('opp-name');
    if (nameEl) nameEl.textContent = opp.name === 'TBD' ? `Level ${opp.level}` : opp.name;
  }

  document.getElementById('format-badge').textContent = {
    rounds:  'Single Round',
    points:  'First to 100 pts',
    bestof3: 'Best of 3',
  }[state.format] || '';

  // V2: set up seat labels and show/hide 4-player side zones
  _initSeats();

  _refreshUI();
  Render.fitChain(state);
  Render.drawBoard(state);
  Sound.shuffle();

  if (!state.players[state.currentPlayer].isHuman) {
    _scheduleAITurn();
  } else {
    Render.setPulse(true, state);
    _updateIdleHint();
  }
}

// ── Turn flow ────────────────────────────────────────

function _scheduleAITurn() {
  document.getElementById('board-hint').textContent = `${state.players[state.currentPlayer].name} is thinking…`;
  document.getElementById('board-hint').classList.remove('hidden-hint');

  AI.takeTurn(state, state.currentPlayer, (result) => {
    document.getElementById('board-hint').classList.add('hidden-hint');

    // Animate the AI tile flying from its backs zone onto the board
    if (result.ok && !result.passed && !result.blocked && state.board.length > 0) {
      const pi = state.lastMove?.playerIndex ?? state.currentPlayer;
      const total = state.players.length;
      const containerId = total === 2 ? 'backs-north'
        : ({ 1: 'backs-east', 2: 'backs-north', 3: 'backs-west' }[pi] || null);
      const container = containerId ? document.getElementById(containerId) : null;
      const backEl    = container?.lastElementChild;
      const backRect  = backEl ? backEl.getBoundingClientRect() : null;
      Render.startSnapAnim(state.board[state.board.length - 1], backRect, state);
    }

    _handleMoveResult(result, false);
  });
}

function _handleMoveResult(result, moverIsHuman = true) {
  if (!result.ok) return;

  // Record move for recap before any state display updates
  if (_recapData) {
    if (result.passed || result.blocked) {
      const pi = moverIsHuman ? 0 : state.players.findIndex(p => !p.isHuman);
      _recapRecord(pi, null, null);
    } else if (state.lastMove) {
      const lm = state.lastMove;
      _recapRecord(lm.playerIndex, lm.tile, lm.end);
    }
  }

  if (result.passed) {
    Sound.pass();
  } else if (state.lastMove?.tile?.isDouble) {
    Sound.double();
  } else {
    Sound.clack();
  }

  _hideEndPicker();
  _refreshUI();
  Render.drawBoard(state);

  if (state.status === 'round_over' || state.status === 'match_over') {
    Render.setPulse(false, null);
    if (!moverIsHuman) {
      const trigger = _quoteForMove(result);
      if (trigger) {
        _showOppQuote(trigger);
        setTimeout(() => _showResult(result), 900);
        return;
      }
    }
    _showResult(result);
    return;
  }

  // Show in-game AI quote
  if (!moverIsHuman) {
    const trigger = _quoteForMove(result);
    if (trigger) _showOppQuote(trigger);
  }

  // Advance to next player
  if (!state.players[state.currentPlayer].isHuman) {
    Render.setPulse(false, null);
    _scheduleAITurn();
  } else {
    Render.setPulse(true, state);
    _refreshPassButton();
    _refreshHand();
    _updateIdleHint();
  }
}

// ── Player actions (wired to InputEvents) ────────────

InputEvents.onTileSelect = function(tileId) {
  if (state.status !== 'playing') return;
  if (!state.players[state.currentPlayer].isHuman) return;

  _hideEndPicker();
  Input.setSelectedTileId(tileId);

  const tile = state.hands[0].find(t => t.id === tileId);
  if (!tile) return;

  const validEnds = Engine.getValidEnds(state, tile);
  const validMap  = new Map();
  if (validEnds.length > 0) validMap.set(tileId, new Set(validEnds));

  Render.renderHandTiles(state.hands[0], validMap, tileId);

  let hint;
  if (validEnds.length === 0) {
    hint = 'No valid move with this tile';
  } else if (state.board.length === 0) {
    hint = 'Tap the board to open with this double';
  } else {
    const ends = validEnds.map(e => e === 'left' ? `◀ ${state.leftEnd}` : `${state.rightEnd} ▶`);
    hint = `Tap board — plays to: ${ends.join(' or ')}`;
  }
  document.getElementById('board-hint').textContent = hint;
};

InputEvents.onTileDeselect = function() {
  Input.clearSelection();
  _hideEndPicker();
  _refreshHand();
  _updateIdleHint();
};

function _updateIdleHint() {
  const hint = document.getElementById('board-hint');
  if (!hint) return;
  if (state.board.length > 0 && state.leftEnd !== null) {
    hint.textContent = `Green = ◀ ${state.leftEnd}  ·  Blue = ${state.rightEnd} ▶  ·  Gold = either — tap a tile`;
  } else {
    hint.textContent = 'Tap your opening double to begin';
  }
}

InputEvents.onBoardTap = function(tileId) {
  if (state.status !== 'playing') return;
  if (!state.players[state.currentPlayer].isHuman) return;

  const hand = state.hands[0];
  const tile = hand.find(t => t.id === tileId);
  if (!tile) return;

  const validEnds = Engine.getValidEnds(state, tile);
  if (validEnds.length === 0) return;

  if (validEnds.length > 1) {
    _pendingTile = tile;
    _showEndPicker();
    return;
  }

  const handEl  = document.getElementById('hand-tiles')?.querySelector(`[data-tile-id="${tile.id}"]`);
  const srcRect = handEl ? handEl.getBoundingClientRect() : null;
  const result  = Engine.applyMove(state, 0, tile, validEnds[0]);
  Input.clearSelection();
  if (result.ok && state.board.length > 0) {
    Render.startSnapAnim(state.board[state.board.length - 1], srcRect, state);
  }
  _handleMoveResult(result);
};

InputEvents.onPassRequest = function() {
  if (state && state.status === 'playing' && state.players[state.currentPlayer].isHuman) {
    GameUI.playerPass();
  }
};

// ── UI refresh ───────────────────────────────────────

function _refreshUI() {
  // Scores
  document.getElementById('your-score').textContent    = state.matchScores[0];
  document.getElementById('opp-score').textContent     = state.matchScores[1] || 0;
  document.getElementById('your-hand-count').textContent = state.hands[0].length;
  const oppCount  = state.hands[1]?.length || 0;
  const oppBadge  = document.getElementById('opp-hand-count');
  if (oppBadge) { oppBadge.textContent = oppCount; oppBadge.classList.toggle('low-tiles', oppCount > 0 && oppCount <= 3); }
  document.getElementById('boneyard-count').textContent  = state.boneyard.length;
  document.getElementById('round-num').textContent = `Round ${state.roundNumber}`;

  // Turn indicator
  const isYourTurn = state.players[state.currentPlayer].isHuman;
  document.getElementById('turn-name').textContent = isYourTurn ? 'Your Turn' : `${state.players[state.currentPlayer].name}'s Turn`;
  document.getElementById('turn-arrow').classList.toggle('flip', !isYourTurn);
  document.getElementById('hand-area').classList.toggle('your-turn', isYourTurn);

  // V2: update opponent tile backs
  Render.renderOpponentBacks(state);

  _refreshHand();
  _refreshPassButton();
}

function _refreshHand() {
  const validMap = new Map();
  Engine.getValidMovesForPlayer(state, 0).forEach(({ tile, end }) => {
    if (!validMap.has(tile.id)) validMap.set(tile.id, new Set());
    validMap.get(tile.id).add(end);
  });
  Render.renderHandTiles(state.hands[0], validMap, Input.getSelectedTileId());
}

function _refreshPassButton() {
  const btn = document.getElementById('pass-btn');
  if (!btn) return;
  const canPass = state.players[state.currentPlayer].isHuman &&
                  !Engine.hasAnyValidMove(state, 0);
  btn.disabled = !canPass;
  btn.classList.toggle('must-pass', canPass);
}

// ── Streak tier helper ───────────────────────────────

function _getStreakTier(streak) {
  if (streak >= 100) return { tier: 5, label: 'Legendary',   sub: `${streak} wins in a row`, flames: '🔥🔥🔥🔥🔥' };
  if (streak >= 25)  return { tier: 4, label: 'Unstoppable', sub: `${streak} wins in a row`, flames: '🔥🔥🔥🔥' };
  if (streak >= 10)  return { tier: 3, label: 'Inferno',     sub: `${streak} wins in a row`, flames: '🔥🔥🔥' };
  if (streak >= 5)   return { tier: 2, label: 'On Fire',     sub: `${streak} wins in a row`, flames: '🔥🔥' };
  if (streak >= 3)   return { tier: 1, label: 'Hot Streak',  sub: `${streak} wins in a row`, flames: '🔥' };
  return null;
}

// ── Round / match results ────────────────────────────

function _showResult(result) {
  // Save round result line into recap
  if (_recapData && _recapData.rounds.length > 0) {
    _recapData.rounds[_recapData.rounds.length - 1].result = Scoring.roundResultText(state, result);
  }

  const isMatch = state.status === 'match_over';

  if (isMatch) {
    const summary = Scoring.getMatchSummary(state);
    const won = summary.winnerIndex === 0;

    // Record win/loss and play result sound
    const opp = CharacterDB.getById(Params.opponent);
    if (opp) {
      won ? Storage.recordWin(opp.id) : Storage.recordLoss(opp.id);
    }
    setTimeout(() => won ? Sound.win() : Sound.lose(), 300);

    // Update global cumulative stats and submit to leaderboard
    const matchPoints = state.matchScores[0] || 0;
    Storage.addMatchResult(matchPoints, won);
    if (typeof Leaderboard !== 'undefined') {
      const playerName = Storage.getPlayerName();
      const playerId   = Storage.getPlayerId();
      if (playerName) {
        Leaderboard.submit(playerId, playerName, Storage.getGlobalStats()).catch(() => {});
      }
    }

    // Running record vs this opponent (already updated above)
    const rec     = opp ? Storage.getRecord(opp.id) : null;
    const streak  = rec ? (rec.streak || 0) : 0;
    const recStr  = rec ? `  ·  ${opp.name}: ${rec.wins}W – ${rec.losses}L` : '';
    const streakStr = won && streak >= 2
      ? `  ·  ${streak} wins in a row!`
      : (!won && rec && rec.bestStreak >= 2 && streak === 0 ? `  ·  streak ended at ${rec.bestStreak}` : '');

    // Character portrait
    const portraitWrap  = document.getElementById('match-result-portrait');
    const portraitImg   = document.getElementById('match-result-portrait-img');
    const portraitBadge = document.getElementById('match-result-portrait-badge');
    if (portraitImg && opp) {
      portraitImg.src     = `assets/characters/${opp.portraitFile}`;
      portraitImg.alt     = opp.name;
      portraitImg.onerror = () => { portraitImg.src = 'assets/characters/silhouette.svg'; };
    }
    if (portraitWrap)  portraitWrap.className  = `match-result-portrait ${won ? 'won' : 'lost'}`;
    if (portraitBadge) portraitBadge.textContent = won ? '🏆' : '😔';

    document.getElementById('match-result-title').textContent = won
      ? 'You Win the Match!'
      : `${opp?.name ?? 'Opponent'} Wins!`;
    document.getElementById('match-result-detail').textContent   = Scoring.roundResultText(state, result) + streakStr;
    document.getElementById('match-result-breakdown').textContent = Scoring.pipBreakdownText(state, result);
    document.getElementById('match-result-scores').textContent   =
      `You: ${state.matchScores[0]} pts · ${state.players[1]?.name}: ${state.matchScores[1] || 0} pts${recStr}`;

    // Fire streak banner
    const fireBanner = document.getElementById('streak-fire-banner');
    if (fireBanner) {
      const tierInfo = won ? _getStreakTier(streak) : null;
      if (tierInfo) {
        fireBanner.className = `streak-fire-banner tier-${tierInfo.tier}`;
        fireBanner.innerHTML =
          `<span class="streak-fire-flames">${tierInfo.flames}</span>` +
          `<span class="streak-fire-label">${tierInfo.label}</span>` +
          `<span class="streak-fire-sub">${tierInfo.sub}</span>`;
      } else {
        fireBanner.className = 'streak-fire-banner hidden';
        fireBanner.innerHTML = '';
      }
    }

    document.getElementById('match-over-overlay').classList.remove('hidden');

  } else {
    const won = result.roundWinner === 0;
    setTimeout(() => won ? Sound.roundWin() : Sound.pass(), 200);
    document.getElementById('result-icon').textContent      = won ? '🎉' : '😤';
    document.getElementById('result-title').textContent     = won ? 'Round Won!' : 'Round Lost';
    document.getElementById('result-detail').textContent    = Scoring.roundResultText(state, result);
    document.getElementById('result-breakdown').textContent = Scoring.pipBreakdownText(state, result);
    document.getElementById('result-scores').textContent    =
      `Match Score — You: ${state.matchScores[0]} · ${state.players[1]?.name}: ${state.matchScores[1] || 0}`;

    const nextBtn = document.getElementById('result-next-btn');
    nextBtn.textContent = 'Next Round';
    document.getElementById('result-overlay').classList.remove('hidden');
  }
}

// ── GameUI — wired to HTML onclick attributes ─────────

const GameUI = {
  playerPass() {
    if (state.status !== 'playing') return;
    if (!state.players[state.currentPlayer].isHuman) return;
    const result = Engine.applyPass(state, 0);
    _handleMoveResult(result);
  },

  chooseEnd(end) {
    if (!_pendingTile) return;
    const tile = _pendingTile;
    _pendingTile = null;
    _hideEndPicker();
    Input.clearSelection();
    const handEl  = document.getElementById('hand-tiles')?.querySelector(`[data-tile-id="${tile.id}"]`);
    const srcRect = handEl ? handEl.getBoundingClientRect() : null;
    const result  = Engine.applyMove(state, 0, tile, end);
    if (result.ok && state.board.length > 0) {
      Render.startSnapAnim(state.board[state.board.length - 1], srcRect, state);
    }
    _handleMoveResult(result);
  },

  togglePause() {
    const overlay = document.getElementById('pause-overlay');
    overlay.classList.toggle('hidden');
    // Sync SFX button to current sound state whenever pause opens
    const btn = document.getElementById('pause-sfx-btn');
    if (btn) { btn.textContent = Sound.isEnabled() ? 'SFX: ON' : 'SFX: OFF'; btn.classList.toggle('on', Sound.isEnabled()); }
  },

  nextRound() {
    document.getElementById('result-overlay').classList.add('hidden');
    Render.cancelSnap();
    _hideEndPicker();
    Engine.startNewRound(state);
    _recapStartRound();
    _refreshUI();
    Render.rebuildHand();
    Render.fitChain(state);
    Render.drawBoard(state);
    _refreshHand();
    Sound.shuffle();
    if (!state.players[state.currentPlayer].isHuman) {
      Render.setPulse(false, null);
      _scheduleAITurn();
    } else {
      Render.setPulse(true, state);
    }
  },

  restartRound() {
    document.getElementById('pause-overlay').classList.add('hidden');
    Render.cancelSnap();
    _hideEndPicker();
    Engine.startNewRound(state);
    // Replace the current round's recap data with a fresh entry
    if (_recapData) _recapData.rounds.pop();
    _recapStartRound();
    _refreshUI();
    Render.rebuildHand();
    Render.fitChain(state);
    Render.drawBoard(state);
    _refreshHand();
    Sound.shuffle();
    if (!state.players[state.currentPlayer].isHuman) {
      Render.setPulse(false, null);
      _scheduleAITurn();
    } else {
      Render.setPulse(true, state);
    }
  },

  shareResult() {
    const summary = Scoring.getMatchSummary(state);
    const won     = summary.winnerIndex === 0;
    const opp     = CharacterDB.getById(Params.opponent);
    const oppName = opp?.name ?? 'my opponent';
    const myPts   = state.matchScores[0] || 0;
    const oppPts  = state.matchScores[1] || 0;
    const baseUrl = window.location.href.replace(/game\.html.*$/, '');

    const text = won
      ? `I beat ${oppName} ${myPts}–${oppPts}! 🁣 #ArtsDominos`
      : `${oppName} beat me ${oppPts}–${myPts} in Cuban Double-Nine 🁣 #ArtsDominos`;

    const btn   = document.getElementById('share-result-btn');
    const flash = msg => {
      if (!btn) return;
      const orig = btn.innerHTML;
      btn.innerHTML  = msg;
      btn.disabled   = true;
      setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 1800);
    };

    if (navigator.share) {
      navigator.share({ text, url: baseUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text + ' ' + baseUrl)
        .then(() => flash('✓ Copied!'))
        .catch(() => flash('Could not copy'));
    }
  },

  rematch() {
    document.getElementById('match-over-overlay').classList.add('hidden');
    Render.cancelSnap();
    _hideEndPicker();
    state = Engine.createGameState(players, Params.format || 'rounds');
    window._gameState = state;
    _recapInit();
    _refreshUI();
    Render.rebuildHand();
    Render.fitChain(state);
    Render.drawBoard(state);
    _refreshHand();
    Sound.shuffle();
    if (!state.players[state.currentPlayer].isHuman) {
      Render.setPulse(false, null);
      _scheduleAITurn();
    } else {
      Render.setPulse(true, state);
    }
  },

  toggleSfx() {
    const next = !Sound.isEnabled();
    Sound.setEnabled(next);
    Storage.saveSetting('sfx', next);
    const btn = document.getElementById('pause-sfx-btn');
    if (btn) { btn.textContent = next ? 'SFX: ON' : 'SFX: OFF'; btn.classList.toggle('on', next); }
    if (next) Sound.clack();
  },

  showRecap(roundOnly = false) {
    let text;
    if (roundOnly && _recapData && _recapData.rounds.length > 0) {
      const r   = _recapData.rounds[_recapData.rounds.length - 1];
      const W   = 52;
      const bar = '='.repeat(W);
      const L   = [];
      L.push(`ARTSDOMINOS  ·  ROUND ${r.num} RECAP`);
      L.push(bar);
      L.push(`You vs. ${_recapData.oppName}  |  ${_recapData.date}`);
      L.push('');
      L.push('STARTING HANDS');
      r.startingHands.forEach(({ name, tiles }) => {
        L.push(`  ${(name + ' :').padEnd(12)}  ${tiles.map(t => `[${t}]`).join(' ')}`);
      });
      L.push('');
      L.push('MOVE LOG');
      r.moves.forEach((m, i) => {
        const num    = `${i + 1}.`.padStart(5);
        const name   = m.name.padEnd(10);
        const action = m.passed          ? 'PASS'
                     : m.end === 'first' ? `opens with [${m.tile}]`
                     : m.end === 'left'  ? `plays [${m.tile}]  <- left`
                                         : `plays [${m.tile}]  right ->`;
        L.push(`  ${num}  ${name}  ${action}`);
      });
      if (r.result) { L.push(''); L.push(`RESULT:  ${r.result}`); }
      text = L.join('\n');
    } else {
      text = _buildRecapText();
    }
    document.getElementById('recap-text').textContent = text;
    document.getElementById('recap-overlay').classList.remove('hidden');
  },

  closeRecap() {
    document.getElementById('recap-overlay').classList.add('hidden');
  },

  downloadRecap() {
    const text = _buildRecapText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `ArtsDominos_Recap_vs_${(_recapData?.oppName || 'CPU').replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

// ── Bootstrap ────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  const canvas    = document.getElementById('game-canvas');
  const handTiles = document.getElementById('hand-tiles');

  Render.init(canvas);
  Input.init(canvas, handTiles);

  let _resizeTimer = null;
  window.addEventListener('resize', () => {
    // Debounce: wait until orientation change settles before rebuilding
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
      Render.resize();
      Render.rebuildHand();
      if (state) {
        Render.fitChain(state);
        Render.drawBoard(state);
        _refreshHand();
      }
    }, 200);
  });

  initGame();
});
