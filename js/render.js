'use strict';

/* =====================================================
   render.js — Canvas board + DOM hand tile rendering
   Cuban-style domino layout:
     - Non-doubles: landscape tiles (wider than tall)
     - Doubles: portrait tiles, perpendicular to chain
     - Clean ivory tiles, black pips — no flag background
   ===================================================== */

const Render = (() => {

  // ── Canvas setup ───────────────────────────────────

  let canvas, ctx;
  let W = 0, H = 0;
  let dpr = 1;
  let panX = 0, panY = 0;

  // Board tile dimensions (logical px, before dpr scaling)
  const TILE_LONG  = 108; // non-double tile width  / double tile height
  const TILE_SHORT = 52;  // non-double tile height / double tile width
  const TILE_R     = 7;   // corner radius
  const PIP_R      = 4.8; // pip circle radius (board)
  const GAP        = 6;   // gap between tiles on board

  function init(canvasEl) {
    canvas = canvasEl;
    ctx    = canvas.getContext('2d');
    resize();
  }

  function resize() {
    if (!canvas) return;
    dpr  = window.devicePixelRatio || 1;
    W    = canvas.offsetWidth;
    H    = canvas.offsetHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    panX = W / 2;
    panY = H / 2;
  }

  // ── Main draw entry point ──────────────────────────

  function drawBoard(state) {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(panX, panY);

    if (state.board.length === 0) {
      _drawEmptyHint();
    } else {
      _drawChain(state.board, state.leftEnd, state.rightEnd);
    }

    ctx.restore();
    state.dirty = false;
  }

  // ── Chain layout ───────────────────────────────────

  function _drawChain(boardTiles, leftEndVal, rightEndVal) {
    // Spatial order: left-played (reversed) + center double + right-played
    const center     = boardTiles.find(t => t.end === 'center');
    const leftTiles  = boardTiles.filter(t => t.end === 'left').reverse();
    const rightTiles = boardTiles.filter(t => t.end === 'right');
    const ordered    = [...leftTiles, center, ...rightTiles].filter(Boolean);

    // Total chain width (doubles are TILE_SHORT wide, non-doubles TILE_LONG wide)
    const totalW = ordered.reduce((sum, bt, i) => {
      const tileW = (bt.tile.isDouble || bt.end === 'center') ? TILE_SHORT : TILE_LONG;
      return sum + tileW + (i < ordered.length - 1 ? GAP : 0);
    }, 0);

    let x = -totalW / 2;

    ordered.forEach(bt => {
      const { tile, end, connectPip, newEndPip } = bt;

      if (tile.isDouble || end === 'center') {
        // Double / opening tile: portrait (perpendicular to chain)
        _drawBoardTileV(x, -TILE_LONG / 2, tile.a);
        x += TILE_SHORT + GAP;
      } else {
        // Non-double: landscape, orient so connecting pip faces inward
        let leftPip, rightPip;
        if (end === 'left') {
          // Tile is to the LEFT of the chain: exposed pip on left, connecting on right
          leftPip  = newEndPip;
          rightPip = connectPip;
        } else {
          // Tile is to the RIGHT: connecting pip on left, exposed on right
          leftPip  = connectPip;
          rightPip = newEndPip;
        }
        _drawBoardTileH(x, -TILE_SHORT / 2, leftPip, rightPip);
        x += TILE_LONG + GAP;
      }
    });

    // End value badges — show current left/right pip the player must match
    if (ordered.length > 0 && leftEndVal !== null) {
      _drawEndBadge(-totalW / 2 - 24, 0, leftEndVal);
      _drawEndBadge( totalW / 2 + 24, 0, rightEndVal);
    }
  }

  // ── Board tile drawing ─────────────────────────────

  // Landscape non-double tile: [leftPip | rightPip]
  function _drawBoardTileH(x, y, leftPip, rightPip) {
    const w = TILE_LONG, h = TILE_SHORT;
    _tileBase(x, y, w, h);

    // Vertical dividing line
    _divLine(x + w / 2, y + 5, x + w / 2, y + h - 5);

    _drawPips(leftPip,  x,       y, w / 2, h);
    _drawPips(rightPip, x + w/2, y, w / 2, h);
  }

  // Portrait double tile — both halves same value
  function _drawBoardTileV(x, y, pipVal) {
    const w = TILE_SHORT, h = TILE_LONG;
    _tileBase(x, y, w, h);

    // Horizontal dividing line
    _divLine(x + 5, y + h / 2, x + w - 5, y + h / 2);

    _drawPips(pipVal, x, y,       w, h / 2);
    _drawPips(pipVal, x, y + h/2, w, h / 2);
  }

  function _tileBase(x, y, w, h) {
    // Shadow
    ctx.save();
    ctx.shadowColor   = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur    = 10;
    ctx.shadowOffsetY = 4;
    _rrPath(x, y, w, h, TILE_R);
    ctx.fillStyle = '#F7F2E4';
    ctx.fill();
    ctx.restore();

    // Border
    _rrPath(x, y, w, h, TILE_R);
    ctx.strokeStyle = '#C4A96A';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
  }

  function _divLine(x1, y1, x2, y2) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = '#A0895A';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // ── End badges ────────────────────────────────────

  function _drawEndBadge(cx, cy, pipVal) {
    const R = 15;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(201,168,76,0.92)';
    ctx.fill();
    ctx.strokeStyle = '#F5E090';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = '700 13px Lato, sans-serif';
    ctx.fillStyle = '#1A0D07';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pipVal, cx, cy + 0.5);
    ctx.restore();
  }

  // ── Pip layout ─────────────────────────────────────

  // Fractional positions within a tile half (0.0–1.0 of w/h)
  const PIP_POSITIONS = {
    0: [],
    1: [[0.5,  0.5]],
    2: [[0.28, 0.28], [0.72, 0.72]],
    3: [[0.28, 0.28], [0.5,  0.5],  [0.72, 0.72]],
    4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
    5: [[0.28, 0.28], [0.72, 0.28], [0.5,  0.5],  [0.28, 0.72], [0.72, 0.72]],
    6: [[0.28, 0.2],  [0.72, 0.2],  [0.28, 0.5],  [0.72, 0.5],  [0.28, 0.8],  [0.72, 0.8]],
    7: [[0.22, 0.18], [0.5,  0.18], [0.78, 0.18], [0.5,  0.5],  [0.22, 0.82], [0.5,  0.82], [0.78, 0.82]],
    8: [[0.22, 0.18], [0.5,  0.18], [0.78, 0.18], [0.22, 0.5],  [0.78, 0.5],  [0.22, 0.82], [0.5,  0.82], [0.78, 0.82]],
    9: [[0.22, 0.16], [0.5,  0.16], [0.78, 0.16], [0.22, 0.5],  [0.5,  0.5],  [0.78, 0.5],  [0.22, 0.84], [0.5,  0.84], [0.78, 0.84]],
  };

  function _drawPips(count, x, y, w, h) {
    const positions = PIP_POSITIONS[count] || [];
    ctx.fillStyle = '#1A1008';
    positions.forEach(([rx, ry]) => {
      ctx.beginPath();
      ctx.arc(x + rx * w, y + ry * h, PIP_R, 0, Math.PI * 2);
      ctx.fill();
    });
    // Small count label for 7-9 — hard to count at small sizes
    if (count >= 7) {
      const fs = Math.floor(Math.min(w, h) * 0.24);
      ctx.font = `700 ${fs}px Lato, sans-serif`;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(count, x + w - 4, y + 3);
    }
  }

  // ── Empty board hint ───────────────────────────────

  function _drawEmptyHint() {
    ctx.save();
    ctx.font = '500 14px Lato, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Tap your opening double to begin', 0, 0);
    ctx.restore();
  }

  // ── Player hand tiles (DOM canvas elements) ────────

  function renderHandTiles(hand, validMoveMap, selectedTileId) {
    const container = document.getElementById('hand-tiles');
    if (!container) return;

    const newIds = new Set(hand.map(t => t.id));

    // Remove tiles no longer in hand
    [...container.children].forEach(el => {
      if (!newIds.has(el.dataset.tileId)) el.remove();
    });

    // Add / update tiles
    hand.forEach(tile => {
      let el = container.querySelector(`[data-tile-id="${tile.id}"]`);
      if (!el) {
        el = _createHandTileEl(tile);
        container.appendChild(el);
      }

      const isSelected = tile.id === selectedTileId;
      const isValid    = validMoveMap ? validMoveMap.has(tile.id) : false;
      const isInvalid  = validMoveMap ? !isValid : false;

      el.classList.toggle('selected',   isSelected);
      el.classList.toggle('valid-move', isValid && !isSelected);
      el.classList.toggle('no-move',    isInvalid && !isSelected);
      el.setAttribute('aria-label', `Domino ${tile.a}|${tile.b}${isValid ? ', valid move' : ''}`);
    });
  }

  function _createHandTileEl(tile) {
    const tileW = window.innerWidth < 768 ? 52 : 60;
    const tileH = window.innerWidth < 768 ? 100 : 116;
    const scale = window.devicePixelRatio || 1;

    const el = document.createElement('canvas');
    el.className = 'hand-tile';
    el.dataset.tileId = tile.id;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.width  = tileW * scale;
    el.height = tileH * scale;
    el.style.width  = tileW + 'px';
    el.style.height = tileH + 'px';

    const tctx = el.getContext('2d');
    tctx.scale(scale, scale);
    _drawHandTile(tctx, tile, tileW, tileH);
    return el;
  }

  function _drawHandTile(tctx, tile, w, h) {
    const hH   = h / 2;
    const pipR = 4.2;
    const r    = TILE_R;

    // Base — warm ivory
    _rrOnCtx(tctx, 1, 1, w - 2, h - 2, r);
    tctx.fillStyle = '#F7F2E4';
    tctx.fill();

    // Horizontal dividing line
    tctx.beginPath();
    tctx.moveTo(6, hH);
    tctx.lineTo(w - 6, hH);
    tctx.strokeStyle = '#A0895A';
    tctx.lineWidth = 1.5;
    tctx.stroke();

    // Pips — top half (a) and bottom half (b)
    tctx.fillStyle = '#1A1008';
    const pA = PIP_POSITIONS[tile.a] || [];
    const pB = PIP_POSITIONS[tile.b] || [];
    const iW = w - 6;
    const iH = hH - 6;

    pA.forEach(([rx, ry]) => {
      tctx.beginPath();
      tctx.arc(3 + rx * iW, 3 + ry * iH, pipR, 0, Math.PI * 2);
      tctx.fill();
    });
    pB.forEach(([rx, ry]) => {
      tctx.beginPath();
      tctx.arc(3 + rx * iW, hH + 3 + ry * iH, pipR, 0, Math.PI * 2);
      tctx.fill();
    });

    // Count label for 7-9
    const fs = Math.floor(hH * 0.24);
    tctx.font = `700 ${fs}px Lato, sans-serif`;
    tctx.fillStyle = 'rgba(0,0,0,0.3)';
    tctx.textAlign = 'right';
    tctx.textBaseline = 'top';
    if (tile.a >= 7) tctx.fillText(tile.a, w - 5, 3);
    if (tile.b >= 7) tctx.fillText(tile.b, w - 5, hH + 3);

    // Border
    _rrOnCtx(tctx, 1, 1, w - 2, h - 2, r);
    tctx.strokeStyle = '#C4A96A';
    tctx.lineWidth = 1.5;
    tctx.stroke();
  }

  // ── Canvas path helpers ────────────────────────────

  function _rrPath(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y,     x + w, y + r,     r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h,     x, y + h - r,     r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y,         x + r, y,         r);
    ctx.closePath();
  }

  function _rrOnCtx(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.arcTo(x + w, y,     x + w, y + r,     r);
    c.lineTo(x + w, y + h - r);
    c.arcTo(x + w, y + h, x + w - r, y + h, r);
    c.lineTo(x + r, y + h);
    c.arcTo(x, y + h,     x, y + h - r,     r);
    c.lineTo(x, y + r);
    c.arcTo(x, y,         x + r, y,         r);
    c.closePath();
  }

  // ── Pan control ────────────────────────────────────

  function pan(dx, dy) { panX += dx; panY += dy; }
  function resetPan()  { panX = W / 2; panY = H / 2; }

  return {
    init,
    resize,
    drawBoard,
    renderHandTiles,
    pan,
    resetPan,
  };

})();
