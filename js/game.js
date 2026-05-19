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
const players = buildPlayers(Params);

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

function initGame() {
  Sound.init();
  state = Engine.createGameState(players, Params.format || 'rounds');
  window._gameState = state; // exposed for input.js pan redraws

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
    _handleMoveResult(result, false);
  });
}

function _handleMoveResult(result, moverIsHuman = true) {
  if (!result.ok) return;

  result.passed ? Sound.pass() : Sound.clack();

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

// ── Round / match results ────────────────────────────

function _showResult(result) {
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

    // Running record vs this opponent (already updated above)
    const rec     = opp ? Storage.getRecord(opp.id) : null;
    const streak  = rec ? (rec.streak || 0) : 0;
    const recStr  = rec ? `  ·  ${opp.name}: ${rec.wins}W – ${rec.losses}L` : '';
    const streakStr = won && streak >= 2
      ? `  ·  ${streak} wins in a row!`
      : (!won && rec && rec.bestStreak >= 2 && streak === 0 ? `  ·  streak ended at ${rec.bestStreak}` : '');

    document.getElementById('match-result-icon').textContent     = won ? '🏆' : '😔';
    document.getElementById('match-result-title').textContent    = won ? 'You Win the Match!' : 'You Lost the Match';
    document.getElementById('match-result-detail').textContent   = Scoring.roundResultText(state, result) + streakStr;
    document.getElementById('match-result-breakdown').textContent = Scoring.pipBreakdownText(state, result);
    document.getElementById('match-result-scores').textContent   =
      `You: ${state.matchScores[0]} pts · ${state.players[1]?.name}: ${state.matchScores[1] || 0} pts${recStr}`;
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

  rematch() {
    document.getElementById('match-over-overlay').classList.add('hidden');
    Render.cancelSnap();
    _hideEndPicker();
    state = Engine.createGameState(players, Params.format || 'rounds');
    window._gameState = state;
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
