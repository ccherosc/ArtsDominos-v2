'use strict';

/* =====================================================
   input.js — Unified mouse + touch input handler
   Handles tile selection in hand and board panning.
   Calls back into game.js via InputEvents.
   ===================================================== */

const Input = (() => {

  // ── State ──────────────────────────────────────────
  let _selectedTileId = null;
  let _panStart = null;        // { x, y } at pan gesture start
  let _panMoved = false;       // true if pointer moved enough to count as pan
  let _canvas = null;

  const MIN_PAN_DIST = 14;     // px before a drag becomes a pan (higher = easier to tap on mobile)

  // ── Init ───────────────────────────────────────────

  function init(canvasEl, handContainer) {
    _canvas = canvasEl;

    // Board canvas — pan gesture
    canvasEl.addEventListener('pointerdown',  _onBoardDown,  { passive: false });
    canvasEl.addEventListener('pointermove',  _onBoardMove,  { passive: false });
    canvasEl.addEventListener('pointerup',    _onBoardUp);
    canvasEl.addEventListener('pointercancel',_cancelPan);

    // Hand container — tile tap/click for selection
    handContainer.addEventListener('pointerdown', _onHandTileDown, { passive: false });
  }

  // ── Board pan ──────────────────────────────────────

  function _onBoardDown(e) {
    e.preventDefault();
    _panStart = { x: e.clientX, y: e.clientY };
    _panMoved = false;
    _canvas.setPointerCapture(e.pointerId);
  }

  function _onBoardMove(e) {
    e.preventDefault();
    if (!_panStart) return;

    const dx = e.clientX - _panStart.x;
    const dy = e.clientY - _panStart.y;

    if (!_panMoved && Math.hypot(dx, dy) < MIN_PAN_DIST) return;
    _panMoved = true;

    Render.pan(dx, dy);
    _panStart = { x: e.clientX, y: e.clientY };

    // Re-draw immediately during pan — only if state is available
    if (window._gameState) Render.drawBoard(window._gameState);
  }

  function _onBoardUp(e) {
    if (!_panMoved && _panStart) {
      // Tap on board — attempt to place selected tile
      if (_selectedTileId) {
        InputEvents.onBoardTap(_selectedTileId, e);
      }
    }
    _cancelPan();
  }

  function _cancelPan() {
    _panStart = null;
    _panMoved = false;
  }

  // ── Hand tile selection ────────────────────────────

  function _onHandTileDown(e) {
    e.preventDefault();
    e.stopPropagation();

    // Find the tile element the pointer is over
    const tileEl = e.target.closest('.hand-tile');
    if (!tileEl) return;

    const tileId = tileEl.dataset.tileId;
    if (!tileId) return;

    // If already selected, deselect
    if (_selectedTileId === tileId) {
      _selectedTileId = null;
      InputEvents.onTileDeselect();
      return;
    }

    _selectedTileId = tileId;
    InputEvents.onTileSelect(tileId);
  }

  // ── Keyboard support (accessibility) ──────────────

  function _onKeyDown(e) {
    if (e.key === 'Escape') {
      _selectedTileId = null;
      InputEvents.onTileDeselect();
    }
  }

  document.addEventListener('keydown', _onKeyDown);

  // ── Public API ─────────────────────────────────────

  function getSelectedTileId() { return _selectedTileId; }

  function clearSelection() {
    _selectedTileId = null;
  }

  function setSelectedTileId(id) {
    _selectedTileId = id;
  }

  return { init, getSelectedTileId, clearSelection, setSelectedTileId };

})();

/* =====================================================
   InputEvents — callbacks wired up by game.js
   ===================================================== */
const InputEvents = {
  onTileSelect(tileId)  { /* overridden by game.js */ },
  onTileDeselect()      { /* overridden by game.js */ },
  onBoardTap(tileId, e) { /* overridden by game.js */ },
};
