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
const players = buildPlayers(Params);

function _showEndPicker() {
  document.getElementById('end-select-bar').classList.remove('hidden');
}

function _hideEndPicker() {
  document.getElementById('end-select-bar').classList.add('hidden');
  _pendingTile = null;
}

function initGame() {
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
    rounds:  'Round Win',
    points:  'First to 100',
    bestof3: 'Best of 3',
  }[state.format] || '';

  _refreshUI();
  Render.drawBoard(state);

  // If first player is AI, kick off their turn automatically
  if (!state.players[state.currentPlayer].isHuman) {
    _scheduleAITurn();
  }
}

// ── Turn flow ────────────────────────────────────────

function _scheduleAITurn() {
  document.getElementById('board-hint').textContent = `${state.players[state.currentPlayer].name} is thinking…`;
  document.getElementById('board-hint').classList.remove('hidden-hint');

  AI.takeTurn(state, state.currentPlayer, (result) => {
    document.getElementById('board-hint').classList.add('hidden-hint');
    _handleMoveResult(result);
  });
}

function _handleMoveResult(result) {
  if (!result.ok) return;

  _hideEndPicker();
  _refreshUI();
  Render.drawBoard(state);

  if (state.status === 'round_over' || state.status === 'match_over') {
    _showResult(result);
    return;
  }

  // Advance to next player
  if (!state.players[state.currentPlayer].isHuman) {
    _scheduleAITurn();
  } else {
    _refreshPassButton();
    _refreshHand();
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
  const validMap  = validEnds.length > 0 ? new Set([tileId]) : new Set();

  Render.renderHandTiles(state.hands[0], validMap, tileId);
  document.getElementById('board-hint').textContent =
    validEnds.length > 0 ? 'Tap the board to place it' : 'No valid move with this tile';
};

InputEvents.onTileDeselect = function() {
  Input.clearSelection();
  _hideEndPicker();
  Render.renderHandTiles(state.hands[0], null, null);
  document.getElementById('board-hint').textContent = 'Tap a tile in your hand to select it';
};

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

  const result = Engine.applyMove(state, 0, tile, validEnds[0]);
  Input.clearSelection();
  _handleMoveResult(result);
};

// ── UI refresh ───────────────────────────────────────

function _refreshUI() {
  // Scores
  document.getElementById('your-score').textContent    = state.matchScores[0];
  document.getElementById('opp-score').textContent     = state.matchScores[1] || 0;
  document.getElementById('your-hand-count').textContent = state.hands[0].length;
  document.getElementById('opp-hand-count').textContent  = state.hands[1]?.length || 0;
  document.getElementById('boneyard-count').textContent  = state.boneyard.length;
  document.getElementById('round-badge').textContent     = `Round ${state.roundNumber}`;

  // Turn indicator
  const isYourTurn = state.players[state.currentPlayer].isHuman;
  document.getElementById('turn-name').textContent = isYourTurn ? 'Your Turn' : `${state.players[state.currentPlayer].name}'s Turn`;
  document.getElementById('turn-arrow').classList.toggle('flip', !isYourTurn);

  _refreshHand();
  _refreshPassButton();
}

function _refreshHand() {
  const validMap = new Set(
    Engine.getValidMovesForPlayer(state, 0).map(m => m.tile.id)
  );
  Render.renderHandTiles(state.hands[0], validMap, Input.getSelectedTileId());
}

function _refreshPassButton() {
  const btn = document.getElementById('pass-btn');
  if (!btn) return;
  const canPass = state.players[state.currentPlayer].isHuman &&
                  !Engine.hasAnyValidMove(state, 0);
  btn.disabled = !canPass;
}

// ── Round / match results ────────────────────────────

function _showResult(result) {
  const isMatch = state.status === 'match_over';

  if (isMatch) {
    const summary = Scoring.getMatchSummary(state);
    const won = summary.winnerIndex === 0;

    // Record win/loss
    const opp = CharacterDB.getById(Params.opponent);
    if (opp) {
      won ? Storage.recordWin(opp.id) : Storage.recordLoss(opp.id);
    }

    document.getElementById('match-result-icon').textContent  = won ? '🏆' : '😔';
    document.getElementById('match-result-title').textContent = won ? 'You Win the Match!' : 'You Lost the Match';
    document.getElementById('match-result-detail').textContent = Scoring.roundResultText(state, result);
    document.getElementById('match-result-scores').textContent =
      `You: ${state.matchScores[0]} pts · ${state.players[1]?.name}: ${state.matchScores[1] || 0} pts`;
    document.getElementById('match-over-overlay').classList.remove('hidden');

  } else {
    const won = result.roundWinner === 0;
    document.getElementById('result-icon').textContent  = won ? '🎉' : '😤';
    document.getElementById('result-title').textContent = won ? 'Round Won!' : 'Round Lost';
    document.getElementById('result-detail').textContent = Scoring.roundResultText(state, result);
    document.getElementById('result-scores').textContent =
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
    const result = Engine.applyMove(state, 0, tile, end);
    _handleMoveResult(result);
  },

  togglePause() {
    const overlay = document.getElementById('pause-overlay');
    overlay.classList.toggle('hidden');
  },

  nextRound() {
    document.getElementById('result-overlay').classList.add('hidden');
    _hideEndPicker();
    Engine.startNewRound(state);
    _refreshUI();
    Render.resetPan();
    Render.drawBoard(state);
    if (!state.players[state.currentPlayer].isHuman) _scheduleAITurn();
  },

  restartRound() {
    document.getElementById('pause-overlay').classList.add('hidden');
    _hideEndPicker();
    Engine.startNewRound(state);
    _refreshUI();
    Render.resetPan();
    Render.drawBoard(state);
    if (!state.players[state.currentPlayer].isHuman) _scheduleAITurn();
  },

  rematch() {
    document.getElementById('match-over-overlay').classList.add('hidden');
    _hideEndPicker();
    state = Engine.createGameState(players, Params.format || 'rounds');
    window._gameState = state;
    _refreshUI();
    Render.resetPan();
    Render.drawBoard(state);
    if (!state.players[state.currentPlayer].isHuman) _scheduleAITurn();
  },
};

// ── Bootstrap ────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  const canvas    = document.getElementById('game-canvas');
  const handTiles = document.getElementById('hand-tiles');

  Render.init(canvas);
  Input.init(canvas, handTiles);

  window.addEventListener('resize', () => {
    Render.resize();
    if (state) Render.drawBoard(state);
  });

  initGame();
});
