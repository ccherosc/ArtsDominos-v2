'use strict';

/* =====================================================
   render.js — Canvas board rendering
   Draws the felt table, domino chain, and AI hand backs.
   Player hand tiles are DOM elements (in hand-tiles div),
   not canvas — easier for touch/click handling.

   Cuban tile style (from reference image):
     White tile body, mini Cuban flag on each half,
     black pips over the flag.
   ===================================================== */

const Render = (() => {

  // ── Canvas setup ───────────────────────────────────

  let canvas, ctx;
  let W = 0, H = 0;
  let dpr = 1;

  // Board pan state
  let panX = 0, panY = 0;

  // Tile dimensions (logical px, before dpr scaling)
  const TILE_W = 60;
  const TILE_H = 116;
  const TILE_R = 6;       // corner radius
  const PIP_R  = 5.5;     // pip circle radius
  const GAP    = 6;       // gap between tiles on board

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
    // Reset pan to center on resize
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
    // Rebuild spatial order: left-played tiles (reversed) + center + right-played tiles
    const center     = boardTiles.find(t => t.end === 'center');
    const leftTiles  = boardTiles.filter(t => t.end === 'left').reverse();
    const rightTiles = boardTiles.filter(t => t.end === 'right');
    const ordered    = [...leftTiles, center, ...rightTiles].filter(Boolean);

    const totalW = ordered.length * (TILE_W + GAP) - GAP;
    let x = -totalW / 2;
    const y = -TILE_H / 2;

    ordered.forEach(({ tile }) => {
      _drawTileH(x, y, tile);
      x += TILE_W + GAP;
    });

    // End value badges — show which pip is exposed at each end
    if (ordered.length > 0 && leftEndVal !== null) {
      const leftBadgeX  = -totalW / 2 - 18;
      const rightBadgeX =  totalW / 2 + 18;
      const badgeY = 0;
      _drawEndBadge(leftBadgeX,  badgeY, leftEndVal,  '◀');
      _drawEndBadge(rightBadgeX, badgeY, rightEndVal, '▶');
    }
  }

  function _drawEndBadge(cx, cy, pipVal, arrow) {
    const R = 16;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(201,168,76,0.9)';
    ctx.fill();
    ctx.strokeStyle = '#F5E090';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = '700 14px Lato, sans-serif';
    ctx.fillStyle = '#1A0D07';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pipVal, cx, cy);
    ctx.restore();
  }

  // ── Tile drawing ───────────────────────────────────

  // Horizontal tile: [a|b] left to right
  function _drawTileH(x, y, tile) {
    _tileBase(x, y, TILE_W, TILE_H);

    const halfH = TILE_H / 2 - 1;
    const halfY = y + 1;

    // Top half = a pips, bottom half = b pips
    _drawCubanFlagHalf(x + 1, halfY,           TILE_W - 2, halfH);
    _drawCubanFlagHalf(x + 1, halfY + halfH + 2, TILE_W - 2, halfH);

    _drawDividingLine(x, y + TILE_H / 2, x + TILE_W, y + TILE_H / 2, true);

    _drawPips(tile.a, x, y, TILE_W, TILE_H / 2);
    _drawPips(tile.b, x, y + TILE_H / 2, TILE_W, TILE_H / 2);
  }

  // Vertical (double) tile — rotated 90°
  function _drawTileV(x, y, tile) {
    // Doubles drawn as a wider horizontal for simplicity in Phase 1
    // Full rotated render comes in Phase 3 visual pass
    _drawTileH(x, y, tile);
  }

  function _tileBase(x, y, w, h) {
    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur  = 8;
    ctx.shadowOffsetY = 3;

    // White rounded rect
    _roundRect(x, y, w, h, TILE_R);
    ctx.fillStyle = '#F8F4E8';
    ctx.fill();

    ctx.restore();

    // Border
    _roundRect(x, y, w, h, TILE_R);
    ctx.strokeStyle = '#C9B890';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
  }

  // Cuban flag: simplified — horizontal stripes left side, red triangle accent
  // drawCtx defaults to the board canvas ctx; pass tctx for hand tile canvas
  function _drawCubanFlagHalf(x, y, w, h, drawCtx) {
    const c = drawCtx || ctx;
    const r = 3;
    c.save();
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.arcTo(x + w, y, x + w, y + r, r);
    c.lineTo(x + w, y + h - r);
    c.arcTo(x + w, y + h, x + w - r, y + h, r);
    c.lineTo(x + r, y + h);
    c.arcTo(x, y + h, x, y + h - r, r);
    c.lineTo(x, y + r);
    c.arcTo(x, y, x + r, y, r);
    c.closePath();
    c.clip();

    // Alternating blue/white stripes (3 blue, 2 white = 5 stripes)
    const stripeH = h / 5;
    const stripeColors = ['#002A8F', '#FFFFFF', '#002A8F', '#FFFFFF', '#002A8F'];
    stripeColors.forEach((color, i) => {
      c.fillStyle = color;
      c.fillRect(x, y + i * stripeH, w, stripeH + 1);
    });

    // Red triangle on left
    c.beginPath();
    c.moveTo(x,            y);
    c.lineTo(x + w * 0.42, y + h / 2);
    c.lineTo(x,            y + h);
    c.closePath();
    c.fillStyle = '#CF142B';
    c.fill();

    // White star in triangle center
    _drawStar(x + w * 0.15, y + h / 2, 4, 5, c);

    c.restore();
  }

  function _drawStar(cx, cy, r, points, drawCtx) {
    const c = drawCtx || ctx;
    c.save();
    c.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const radius = i % 2 === 0 ? r : r * 0.4;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
    }
    c.closePath();
    c.fillStyle = '#FFFFFF';
    c.fill();
    c.restore();
  }

  function _drawDividingLine(x1, y1, x2, y2, horizontal) {
    ctx.save();
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    } else {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.strokeStyle = '#8B7A50';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // ── Pip layout ─────────────────────────────────────

  // Standard domino pip positions for 0–9
  const PIP_POSITIONS = {
    0: [],
    1: [[0.5, 0.5]],
    2: [[0.25, 0.25], [0.75, 0.75]],
    3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
    4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
    5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
    6: [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.25, 0.8], [0.75, 0.8]],
    7: [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.25, 0.8], [0.75, 0.8], [0.5, 0.35]],
    8: [[0.2, 0.2], [0.5, 0.2], [0.8, 0.2], [0.2, 0.8], [0.5, 0.8], [0.8, 0.8], [0.2, 0.5], [0.8, 0.5]],
    9: [[0.2, 0.15], [0.5, 0.15], [0.8, 0.15], [0.2, 0.5], [0.5, 0.5], [0.8, 0.5], [0.2, 0.85], [0.5, 0.85], [0.8, 0.85]],
  };

  function _drawPips(count, x, y, w, h) {
    const positions = PIP_POSITIONS[count] || [];
    ctx.fillStyle = '#1A1008';
    positions.forEach(([rx, ry]) => {
      ctx.beginPath();
      ctx.arc(x + rx * w, y + ry * h, PIP_R, 0, Math.PI * 2);
      ctx.fill();
    });
    // Small count label for 7-9 (hard to distinguish visually at small sizes)
    if (count >= 7) {
      const fs = Math.floor(h * 0.22);
      ctx.font = `700 ${fs}px Lato, sans-serif`;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(count, x + w - 3, y + 2);
    }
  }

  // ── Empty board hint ───────────────────────────────

  function _drawEmptyHint() {
    ctx.save();
    ctx.font = '600 14px Lato, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Select a tile from your hand to begin', 0, 0);
    ctx.restore();
  }

  // ── Player hand tile DOM elements ──────────────────

  function renderHandTiles(hand, validMoveMap, selectedTileId) {
    const container = document.getElementById('hand-tiles');
    if (!container) return;

    // Reuse existing tile elements where possible (avoid full re-render)
    const existingIds = new Set([...container.children].map(el => el.dataset.tileId));
    const newIds      = new Set(hand.map(t => t.id));

    // Remove tiles no longer in hand
    [...container.children].forEach(el => {
      if (!newIds.has(el.dataset.tileId)) el.remove();
    });

    // Update or add tiles
    hand.forEach(tile => {
      let el = container.querySelector(`[data-tile-id="${tile.id}"]`);
      if (!el) {
        el = _createHandTileEl(tile);
        container.appendChild(el);
      }

      const isSelected = tile.id === selectedTileId;
      const isValid    = validMoveMap ? validMoveMap.has(tile.id) : false;
      const isInvalid  = validMoveMap ? !isValid : false;

      el.classList.toggle('selected',  isSelected);
      el.classList.toggle('valid-move', isValid && !isSelected);
      el.classList.toggle('no-move',    isInvalid && !isSelected);

      // Update aria label
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

    _drawHandTileOnCtx(tctx, tile, tileW, tileH);
    return el;
  }

  function _drawHandTileOnCtx(tctx, tile, w, h) {
    const hH = h / 2 - 1;
    const pipR = PIP_R - 0.5;

    // Base
    tctx.fillStyle = '#F8F4E8';
    _roundRectOnCtx(tctx, 1, 1, w - 2, h - 2, TILE_R);
    tctx.fill();

    // Flag halves — pass tctx directly, no global ctx swap
    _drawCubanFlagHalf(2, 2, w - 4, hH - 1, tctx);
    _drawCubanFlagHalf(2, hH + 3, w - 4, hH - 1, tctx);

    // Dividing line
    tctx.beginPath();
    tctx.moveTo(4, h / 2);
    tctx.lineTo(w - 4, h / 2);
    tctx.strokeStyle = '#8B7A50';
    tctx.lineWidth = 1.5;
    tctx.stroke();

    // Pips
    tctx.fillStyle = '#1A1008';
    const pA = PIP_POSITIONS[tile.a] || [];
    const pB = PIP_POSITIONS[tile.b] || [];
    pA.forEach(([rx, ry]) => {
      tctx.beginPath();
      tctx.arc(2 + rx * (w - 4), 2 + ry * (hH - 2), pipR, 0, Math.PI * 2);
      tctx.fill();
    });
    pB.forEach(([rx, ry]) => {
      tctx.beginPath();
      tctx.arc(2 + rx * (w - 4), hH + 3 + ry * (hH - 2), pipR, 0, Math.PI * 2);
      tctx.fill();
    });

    // Pip count labels for 7-9 (hard to count at small sizes)
    const fs = Math.floor(hH * 0.22);
    tctx.font = `700 ${fs}px Lato, sans-serif`;
    tctx.fillStyle = 'rgba(0,0,0,0.4)';
    tctx.textAlign = 'right';
    tctx.textBaseline = 'top';
    if (tile.a >= 7) tctx.fillText(tile.a, w - 4, 3);
    if (tile.b >= 7) tctx.fillText(tile.b, w - 4, hH + 4);

    // Border
    _roundRectOnCtx(tctx, 1, 1, w - 2, h - 2, TILE_R);
    tctx.strokeStyle = '#C9B890';
    tctx.lineWidth = 1.5;
    tctx.stroke();
  }

  // ── Canvas helpers ─────────────────────────────────

  function _roundRect(x, y, w, h, r) {
    _roundRectPath(x, y, w, h, r);
  }

  function _roundRectPath(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function _roundRectOnCtx(tctx, x, y, w, h, r) {
    tctx.beginPath();
    tctx.moveTo(x + r, y);
    tctx.lineTo(x + w - r, y);
    tctx.arcTo(x + w, y, x + w, y + r, r);
    tctx.lineTo(x + w, y + h - r);
    tctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    tctx.lineTo(x + r, y + h);
    tctx.arcTo(x, y + h, x, y + h - r, r);
    tctx.lineTo(x, y + r);
    tctx.arcTo(x, y, x + r, y, r);
    tctx.closePath();
  }

  // ── Pan control ────────────────────────────────────

  function pan(dx, dy) {
    panX += dx;
    panY += dy;
  }

  function resetPan() {
    panX = W / 2;
    panY = H / 2;
  }

  return {
    init,
    resize,
    drawBoard,
    renderHandTiles,
    pan,
    resetPan,
    TILE_W,
    TILE_H,
  };

})();
