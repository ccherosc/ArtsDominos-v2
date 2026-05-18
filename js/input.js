'use strict';

/* =====================================================
   input.js — Unified mouse + touch input handler
   Board: pan (1 finger/mouse) + pinch-to-zoom (2 fingers) + scroll wheel zoom
   Hand:  tap-to-select OR drag-and-drop onto board
   ===================================================== */

const Input = (() => {

  // ── State ──────────────────────────────────────────
  let _selectedTileId = null;
  let _canvas         = null;
  let _handContainer  = null;
  let _dragGhost      = null;

  const MIN_PAN_DIST  = 14;
  const MIN_DRAG_DIST = 10;

  // Board pointer tracking
  let _boardPointers  = new Map();
  let _panStart       = null;
  let _panMoved       = false;
  let _lastPinchDist  = null;

  // Double-tap detection
  let _lastTapTime = 0;
  let _lastTapX    = 0;
  let _lastTapY    = 0;

  // Hand drag tracking
  let _dragTileId     = null;
  let _dragStart      = null;
  let _isDragging     = false;

  // ── Init ───────────────────────────────────────────

  function init(canvasEl, handContainer) {
    _canvas        = canvasEl;
    _handContainer = handContainer;
    _dragGhost     = document.getElementById('drag-ghost');

    // Board — pan, pinch-to-zoom
    canvasEl.addEventListener('pointerdown',   _onBoardDown,  { passive: false });
    canvasEl.addEventListener('pointermove',   _onBoardMove,  { passive: false });
    canvasEl.addEventListener('pointerup',     _onBoardUp);
    canvasEl.addEventListener('pointercancel', _cancelBoard);
    canvasEl.addEventListener('wheel',         _onWheel,      { passive: false });

    // Hand — tap-to-select and drag-to-place
    handContainer.addEventListener('pointerdown',   _onHandDown,   { passive: false });
    handContainer.addEventListener('pointermove',   _onHandMove,   { passive: false });
    handContainer.addEventListener('pointerup',     _onHandUp);
    handContainer.addEventListener('pointercancel', _onHandCancel);
  }

  // ── Board: pan + pinch-to-zoom ─────────────────────

  function _onBoardDown(e) {
    e.preventDefault();
    _boardPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    _canvas.setPointerCapture(e.pointerId);
    if (_boardPointers.size === 1) {
      _panStart      = { x: e.clientX, y: e.clientY };
      _panMoved      = false;
      _lastPinchDist = null;
    }
  }

  function _onBoardMove(e) {
    e.preventDefault();
    _boardPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (_boardPointers.size >= 2) {
      const pts  = [..._boardPointers.values()];
      const a = pts[0], b = pts[1];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const cx   = (a.x + b.x) / 2;
      const cy   = (a.y + b.y) / 2;

      if (_lastPinchDist !== null) {
        const rect   = _canvas.getBoundingClientRect();
        const factor = dist / _lastPinchDist;
        Render.zoomAt(factor, cx - rect.left, cy - rect.top);
        if (window._gameState) Render.drawBoard(window._gameState);
      }
      _lastPinchDist = dist;
      _panStart = null; // cancel single-touch pan while pinching
      return;
    }

    _lastPinchDist = null;
    if (!_panStart) return;
    const dx = e.clientX - _panStart.x;
    const dy = e.clientY - _panStart.y;
    if (!_panMoved && Math.hypot(dx, dy) < MIN_PAN_DIST) return;
    _panMoved = true;
    Render.pan(dx, dy);
    _panStart = { x: e.clientX, y: e.clientY };
    if (window._gameState) Render.drawBoard(window._gameState);
  }

  function _onBoardUp(e) {
    const wasOnly = _boardPointers.size === 1;
    _boardPointers.delete(e.pointerId);
    if (_boardPointers.size < 2) _lastPinchDist = null;

    if (wasOnly && _boardPointers.size === 0) {
      if (!_panMoved && _panStart) {
        const now = Date.now();
        const ddx = e.clientX - _lastTapX;
        const ddy = e.clientY - _lastTapY;
        const isDoubleTap = (now - _lastTapTime < 320) && Math.hypot(ddx, ddy) < 44;

        if (isDoubleTap && !_selectedTileId) {
          // Double-tap with no tile selected = re-fit view
          if (window._gameState) {
            Render.fitChain(window._gameState);
            Render.drawBoard(window._gameState);
          }
        } else if (_selectedTileId) {
          InputEvents.onBoardTap(_selectedTileId, e);
        }

        _lastTapTime = now;
        _lastTapX    = e.clientX;
        _lastTapY    = e.clientY;
      }
      _cancelBoard();
    }
  }

  function _cancelBoard() {
    _panStart = null;
    _panMoved = false;
  }

  // ── Board: scroll-wheel zoom ───────────────────────

  function _onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : (1 / 1.12);
    const rect   = _canvas.getBoundingClientRect();
    Render.zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top);
    if (window._gameState) Render.drawBoard(window._gameState);
  }

  // ── Hand: tap-to-select + drag-to-place ───────────

  function _onHandDown(e) {
    e.preventDefault();
    e.stopPropagation();
    const tileEl = e.target.closest('.hand-tile');
    if (!tileEl) return;
    const tileId = tileEl.dataset.tileId;
    if (!tileId) return;

    _dragTileId = tileId;
    _dragStart  = { x: e.clientX, y: e.clientY };
    _isDragging = false;
    _handContainer.setPointerCapture(e.pointerId);
  }

  function _onHandMove(e) {
    if (!_dragTileId) return;
    e.preventDefault();
    const dx = e.clientX - _dragStart.x;
    const dy = e.clientY - _dragStart.y;
    if (!_isDragging && Math.hypot(dx, dy) > MIN_DRAG_DIST) {
      _isDragging = true;
      _startGhost(_dragTileId);
    }
    if (_isDragging) _moveGhost(e.clientX, e.clientY);
  }

  function _onHandUp(e) {
    if (!_dragTileId) return;

    if (_isDragging) {
      _stopGhost();
      const boardRect = _canvas.getBoundingClientRect();
      const overBoard = e.clientX >= boardRect.left && e.clientX <= boardRect.right &&
                        e.clientY >= boardRect.top  && e.clientY <= boardRect.bottom;
      if (overBoard) {
        // Select tile then trigger placement (same as tap-select + tap-board)
        _selectedTileId = _dragTileId;
        InputEvents.onTileSelect(_dragTileId);
        InputEvents.onBoardTap(_dragTileId, e);
      }
      // If not over board: drag cancelled, no state change
    } else {
      // Short tap — toggle selection
      if (_selectedTileId === _dragTileId) {
        _selectedTileId = null;
        InputEvents.onTileDeselect();
      } else {
        _selectedTileId = _dragTileId;
        InputEvents.onTileSelect(_dragTileId);
      }
    }

    _dragTileId = null;
    _dragStart  = null;
    _isDragging = false;
  }

  function _onHandCancel() {
    _stopGhost();
    _dragTileId = null;
    _dragStart  = null;
    _isDragging = false;
  }

  // ── Drag ghost ─────────────────────────────────────

  function _startGhost(tileId) {
    if (!_dragGhost) return;
    const tileEl = _handContainer.querySelector(`[data-tile-id="${tileId}"]`);
    if (!tileEl) return;
    _dragGhost.width  = tileEl.width;
    _dragGhost.height = tileEl.height;
    _dragGhost.style.width  = tileEl.style.width;
    _dragGhost.style.height = tileEl.style.height;
    const gctx = _dragGhost.getContext('2d');
    gctx.clearRect(0, 0, _dragGhost.width, _dragGhost.height);
    gctx.drawImage(tileEl, 0, 0);
    _dragGhost.style.display = 'block';
  }

  function _moveGhost(cx, cy) {
    if (!_dragGhost) return;
    const w = parseFloat(_dragGhost.style.width)  || 32;
    const h = parseFloat(_dragGhost.style.height) || 62;
    _dragGhost.style.left = (cx - w / 2) + 'px';
    _dragGhost.style.top  = (cy - h / 2) + 'px';
  }

  function _stopGhost() {
    if (_dragGhost) _dragGhost.style.display = 'none';
  }

  // ── Keyboard support ───────────────────────────────

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      _selectedTileId = null;
      InputEvents.onTileDeselect();
    }
    if (e.key === ' ') {
      e.preventDefault();
      InputEvents.onPassRequest();
    }
  });

  // ── Public API ─────────────────────────────────────

  function getSelectedTileId() { return _selectedTileId; }
  function clearSelection()    { _selectedTileId = null; }
  function setSelectedTileId(id) { _selectedTileId = id; }

  return { init, getSelectedTileId, clearSelection, setSelectedTileId };

})();

/* =====================================================
   InputEvents — callbacks wired up by game.js
   ===================================================== */
const InputEvents = {
  onTileSelect(tileId)  { /* overridden by game.js */ },
  onTileDeselect()      { /* overridden by game.js */ },
  onBoardTap(tileId, e) { /* overridden by game.js */ },
  onPassRequest()       { /* overridden by game.js */ },
};
