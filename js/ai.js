'use strict';

/* =====================================================
   ai.js — NPC decision-making
   Each strategy receives the game state + player index
   and returns { tile, end } or null (pass).
   Strategies never access other players' hands directly —
   they infer from played tiles only (no cheating).
   ===================================================== */

const AI = (() => {

  // ── Strategy dispatcher ────────────────────────────

  function choosMove(state, playerIndex) {
    const char = state.players[playerIndex];
    switch (char.aiStrategy) {
      case 'greedy':    return _greedy(state, playerIndex);
      case 'defensive': return _defensive(state, playerIndex);
      case 'strategic': return _strategic(state, playerIndex);
      case 'expert':    return _expert(state, playerIndex);
      default:          return _random(state, playerIndex);
    }
  }

  // ── RANDOM (Level 1–2): plays any valid tile at random ──

  function _random(state, playerIndex) {
    const moves = Engine.getValidMovesForPlayer(state, playerIndex);
    if (moves.length === 0) return null;
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // ── GREEDY (Level 3–4): plays highest pip tile ─────────
  // Goal: empty hand fast and reduce leftover pip burden

  function _greedy(state, playerIndex) {
    const moves = Engine.getValidMovesForPlayer(state, playerIndex);
    if (moves.length === 0) return null;

    return moves.reduce((best, move) => {
      const pipCount = move.tile.a + move.tile.b;
      const bestPips = best.tile.a + best.tile.b;
      return pipCount > bestPips ? move : best;
    });
  }

  // ── DEFENSIVE (Level 5–7): limits opponent's options ───
  // Prefers playing tiles that close ends opponents likely need

  function _defensive(state, playerIndex) {
    const moves = Engine.getValidMovesForPlayer(state, playerIndex);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    // Track which pip values have been seen on the board
    const playedPips = new Set();
    state.board.forEach(({ tile }) => {
      playedPips.add(tile.a);
      playedPips.add(tile.b);
    });

    // Prefer moves that change the open ends to values already seen
    // (more likely to block opponents who haven't passed yet)
    const scored = moves.map(move => {
      const newEnd = _getNewEnd(state, move);
      const restrictiveness = playedPips.has(newEnd) ? 1 : 0;
      const pips = move.tile.a + move.tile.b;
      return { move, score: restrictiveness * 10 + pips };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].move;
  }

  // ── STRATEGIC (Level 8–10): balance offense + defense ──
  // Tracks played tiles, manages connectivity, avoids weak positions

  function _strategic(state, playerIndex) {
    const moves = Engine.getValidMovesForPlayer(state, playerIndex);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    const myHand = state.hands[playerIndex];

    const scored = moves.map(move => {
      let score = 0;

      // 1. Prefer moves that leave more playable tiles in hand (connectivity)
      const futureLeft  = _simulateEnd(state, move, 'left');
      const futureRight = _simulateEnd(state, move, 'right');
      const connectivityAfter = myHand.filter(t =>
        t.id !== move.tile.id && (
          t.a === futureLeft || t.b === futureLeft ||
          t.a === futureRight || t.b === futureRight
        )
      ).length;
      score += connectivityAfter * 5;

      // 2. Prefer high pip tiles (reduce hand weight)
      score += (move.tile.a + move.tile.b) * 0.5;

      // 3. Bonus for playing doubles (free both sides once doubled)
      if (move.tile.isDouble) score += 3;

      return { move, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].move;
  }

  // ── EXPERT (Level 11–14): near-optimal play ────────────
  // Full tile tracking, probability inference, end-game planning

  function _expert(state, playerIndex) {
    const moves = Engine.getValidMovesForPlayer(state, playerIndex);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    const myHand   = state.hands[playerIndex];
    const allTiles = Engine.buildFullSet();

    // Tiles not in my hand and not on board → in opponents' hands or boneyard
    const boardIds = new Set(state.board.map(p => p.tile.id));
    const myIds    = new Set(myHand.map(t => t.id));
    const unknown  = allTiles.filter(t => !boardIds.has(t.id) && !myIds.has(t.id));

    // Which pip values are still in play (unknown tiles)
    const unknownPips = new Map();
    unknown.forEach(t => {
      unknownPips.set(t.a, (unknownPips.get(t.a) || 0) + 1);
      unknownPips.set(t.b, (unknownPips.get(t.b) || 0) + 1);
    });

    const scored = moves.map(move => {
      let score = 0;

      // Connectivity of own hand after move
      const futureLeft  = _simulateEnd(state, move, 'left');
      const futureRight = _simulateEnd(state, move, 'right');
      const myConnectivity = myHand.filter(t =>
        t.id !== move.tile.id && (
          t.a === futureLeft || t.b === futureLeft ||
          t.a === futureRight || t.b === futureRight
        )
      ).length;
      score += myConnectivity * 6;

      // Prefer ends that are rare in unknown tiles (blocks opponents more)
      const newEnd    = _getNewEnd(state, move);
      const frequency = unknownPips.get(newEnd) || 0;
      score += (10 - frequency); // rarer end = better block

      // High pips → reduce pip burden
      score += (move.tile.a + move.tile.b) * 0.8;

      // Prioritize doubles
      if (move.tile.isDouble) score += 5;

      // End-game: if hand is small, maximize chance to go out next turn
      if (myHand.length <= 3) score += myConnectivity * 4;

      return { move, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Add slight randomness at top to avoid being perfectly predictable
    const topN = scored.slice(0, Math.min(2, scored.length));
    return topN[Math.floor(Math.random() * topN.length)].move;
  }

  // ── Helpers ────────────────────────────────────────

  function _getNewEnd(state, move) {
    if (state.board.length === 0) return move.tile.a;
    const targetEnd = move.end === 'left' ? state.leftEnd : state.rightEnd;
    return move.tile.a === targetEnd ? move.tile.b : move.tile.a;
  }

  function _simulateEnd(state, move, side) {
    if (state.board.length === 0) return move.tile.a;
    if (move.end === side) return _getNewEnd(state, move);
    return side === 'left' ? state.leftEnd : state.rightEnd;
  }

  // ── AI turn with delay (for UX realism) ───────────

  function takeTurn(state, playerIndex, onDone) {
    const settings = typeof Storage !== 'undefined' ? Storage.getSettings() : {};
    const delays = { fast: 400, normal: 900, slow: 1800 };
    const delay  = delays[settings.aiSpeed] || 900;

    setTimeout(() => {
      if (!Engine.hasAnyValidMove(state, playerIndex)) {
        onDone(Engine.applyPass(state, playerIndex));
      } else {
        const move = choosMove(state, playerIndex);
        if (move) {
          onDone(Engine.applyMove(state, playerIndex, move.tile, move.end));
        } else {
          onDone(Engine.applyPass(state, playerIndex));
        }
      }
    }, delay + Math.random() * 300);
  }

  return { choosMove, takeTurn };

})();
