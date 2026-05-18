'use strict';

/* =====================================================
   engine.js — Cuban Double-Nine game logic
   No framework, no imports — pure JS game state.

   Cuban rules:
   - 55 tiles: [0|0] through [9|9]
   - No boneyard draws; if no valid move, pass immediately
   - Highest double opens the game (must play it)
   - Blocked game: lowest pip total wins
   ===================================================== */

const Engine = (() => {

  // ── Tile generation ────────────────────────────────

  function buildFullSet() {
    const tiles = [];
    for (let a = 0; a <= 9; a++) {
      for (let b = a; b <= 9; b++) {
        tiles.push({ a, b, id: `${a}-${b}`, isDouble: a === b });
      }
    }
    return tiles; // 55 tiles
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ── Game state factory ─────────────────────────────

  /*
    players: array of { id, name, isHuman, aiStrategy }
    format:  'rounds' | 'points' | 'bestof3'
  */
  function createGameState(players, format) {
    const tilesPerPlayer = players.length <= 2 ? 10 : 7;
    const allTiles = shuffle(buildFullSet());

    const hands = players.map((_, i) =>
      allTiles.slice(i * tilesPerPlayer, (i + 1) * tilesPerPlayer)
    );
    // Remaining tiles are set aside (Cuban rules: boneyard exists but is never drawn from)
    const boneyard = allTiles.slice(players.length * tilesPerPlayer);

    const firstPlayer = _findOpeningPlayer(hands, players.length);

    return {
      players,
      hands,           // hands[playerIndex] = tile[]
      boneyard,        // reference only — never drawn from
      board: [],       // PlacedTile[]  { tile, end: 'left'|'right', orientation: 'h'|'v' }
      leftEnd: null,   // pip value at left end of chain (null = board empty)
      rightEnd: null,  // pip value at right end of chain
      currentPlayer: firstPlayer,
      firstMovePending: true,   // first player MUST play the opening double
      openingDouble: _findHighestDouble(hands[firstPlayer]),
      passCount: 0,             // consecutive passes; equals players.length => blocked
      roundScores: players.map(() => 0),   // pips scored this round
      matchScores: players.map(() => 0),   // cumulative match pips (for 'points' format)
      roundWins:   players.map(() => 0),   // rounds won (for 'bestof3')
      roundNumber: 1,
      format,
      targetPoints: 100,
      status: 'playing',   // 'playing' | 'round_over' | 'match_over'
      winner: null,        // player index or null
      lastMove: null,      // { playerIndex, tile, end } for animation
      dirty: true,
    };
  }

  // ── Opening logic ──────────────────────────────────

  function _findHighestDouble(hand) {
    let highest = null;
    for (const tile of hand) {
      if (tile.isDouble) {
        if (!highest || tile.a > highest.a) highest = tile;
      }
    }
    return highest;
  }

  function _findOpeningPlayer(hands, playerCount) {
    let bestDouble = -1;
    let bestPlayer = 0;
    for (let i = 0; i < playerCount; i++) {
      const d = _findHighestDouble(hands[i]);
      if (d && d.a > bestDouble) {
        bestDouble = d.a;
        bestPlayer = i;
      }
    }
    // If no doubles at all (extremely rare), player 0 goes first
    return bestPlayer;
  }

  // ── Move validation ────────────────────────────────

  /*
    Returns array of valid moves for a tile:
    [] if tile can't play,
    ['left'] | ['right'] | ['left','right'] | ['both'] if tile can play
    Special case: board empty → only the opening double is legal on first move
  */
  function getValidEnds(state, tile) {
    if (state.board.length === 0) {
      // First move must be the opening double
      if (state.firstMovePending) {
        return tile.id === state.openingDouble?.id ? ['first'] : [];
      }
      return ['first'];
    }

    const ends = [];
    const { leftEnd, rightEnd } = state;

    const fitsLeft  = tile.a === leftEnd  || tile.b === leftEnd;
    const fitsRight = tile.a === rightEnd || tile.b === rightEnd;

    if (fitsLeft)  ends.push('left');
    if (fitsRight) ends.push('right');

    // A double that fits both ends → player still chooses which end
    return ends;
  }

  function hasAnyValidMove(state, playerIndex) {
    return state.hands[playerIndex].some(tile => getValidEnds(state, tile).length > 0);
  }

  function getValidMovesForPlayer(state, playerIndex) {
    const moves = [];
    for (const tile of state.hands[playerIndex]) {
      const ends = getValidEnds(state, tile);
      for (const end of ends) {
        moves.push({ tile, end });
      }
    }
    return moves;
  }

  // ── Apply a move ───────────────────────────────────

  /*
    Mutates state in place and returns { ok: true } or { ok: false, reason }
    end: 'left' | 'right' | 'first'
  */
  function applyMove(state, playerIndex, tile, end) {
    if (state.currentPlayer !== playerIndex) return { ok: false, reason: 'not_your_turn' };
    if (state.status !== 'playing')          return { ok: false, reason: 'game_over' };

    const validEnds = getValidEnds(state, tile);
    if (!validEnds.includes(end)) return { ok: false, reason: 'invalid_move' };

    // Remove tile from hand
    const hand = state.hands[playerIndex];
    const idx = hand.findIndex(t => t.id === tile.id);
    if (idx === -1) return { ok: false, reason: 'tile_not_in_hand' };
    hand.splice(idx, 1);

    // Place tile on board
    if (end === 'first') {
      // Opening move — tile goes in the middle; both ends are the double's value
      state.board.push({ tile, end: 'center', orientation: 'h' });
      state.leftEnd  = tile.a;
      state.rightEnd = tile.a; // doubles have same value on both sides
      state.firstMovePending = false;
    } else {
      // Determine which pip connects and which pip becomes the new open end
      let connectPip, newEndPip;
      const targetEnd = end === 'left' ? state.leftEnd : state.rightEnd;
      if (tile.a === targetEnd) {
        connectPip = tile.a;
        newEndPip  = tile.b;
      } else {
        connectPip = tile.b;
        newEndPip  = tile.a;
      }
      state.board.push({ tile, end, orientation: tile.isDouble ? 'v' : 'h', connectPip, newEndPip });
      if (end === 'left')  state.leftEnd  = newEndPip;
      if (end === 'right') state.rightEnd = newEndPip;
    }

    state.passCount = 0; // reset consecutive passes
    state.lastMove = { playerIndex, tile, end };
    state.dirty = true;

    // Check win: player emptied their hand
    if (hand.length === 0) {
      return _resolveRoundWin(state, playerIndex);
    }

    _advanceTurn(state);
    return { ok: true };
  }

  // ── Pass ───────────────────────────────────────────

  function applyPass(state, playerIndex) {
    if (state.currentPlayer !== playerIndex) return { ok: false, reason: 'not_your_turn' };
    if (hasAnyValidMove(state, playerIndex)) return { ok: false, reason: 'can_play' };

    state.passCount++;
    state.dirty = true;

    // All players have passed consecutively → blocked game
    if (state.passCount >= state.players.length) {
      return _resolveBlockedGame(state);
    }

    _advanceTurn(state);
    return { ok: true, passed: true };
  }

  // ── Turn management ────────────────────────────────

  function _advanceTurn(state) {
    state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  }

  // ── Round resolution ───────────────────────────────

  function _resolveRoundWin(state, winnerIndex) {
    const pipsScored = state.hands.reduce((sum, hand, i) => {
      if (i === winnerIndex) return sum;
      return sum + hand.reduce((s, t) => s + t.a + t.b, 0);
    }, 0);

    state.roundScores[winnerIndex] += pipsScored;
    state.matchScores[winnerIndex] += pipsScored;
    state.roundWins[winnerIndex]++;
    state.winner = winnerIndex;

    const matchDone = _checkMatchOver(state);
    state.status = matchDone ? 'match_over' : 'round_over';

    return { ok: true, roundWinner: winnerIndex, pipsScored, matchOver: matchDone };
  }

  function _resolveBlockedGame(state) {
    // Player/team with lowest pip total wins
    const handPips = state.hands.map(hand => hand.reduce((s, t) => s + t.a + t.b, 0));
    const minPips  = Math.min(...handPips);
    const winnerIndex = handPips.indexOf(minPips);

    // Winner scores the difference between all other hands and their own
    const totalOtherPips = handPips.reduce((s, p, i) => i === winnerIndex ? s : s + p, 0);
    const pipsScored = totalOtherPips - minPips;

    state.roundScores[winnerIndex] += pipsScored;
    state.matchScores[winnerIndex] += pipsScored;
    state.roundWins[winnerIndex]++;
    state.winner = winnerIndex;

    const matchDone = _checkMatchOver(state);
    state.status = matchDone ? 'match_over' : 'round_over';

    return { ok: true, roundWinner: winnerIndex, pipsScored, blocked: true, matchOver: matchDone };
  }

  // ── Match-over check (all 3 formats) ──────────────

  function _checkMatchOver(state) {
    const { format, players, matchScores, roundWins, targetPoints } = state;

    if (format === 'rounds') {
      return true; // single round always ends the match

    } else if (format === 'points') {
      return matchScores.some(s => s >= targetPoints);

    } else if (format === 'bestof3') {
      return roundWins.some(w => w >= 2);
    }

    return false;
  }

  // ── New round (same match) ─────────────────────────

  function startNewRound(state) {
    const tilesPerPlayer = state.players.length <= 2 ? 10 : 7;
    const allTiles = shuffle(buildFullSet());

    state.hands = state.players.map((_, i) =>
      allTiles.slice(i * tilesPerPlayer, (i + 1) * tilesPerPlayer)
    );
    state.boneyard       = allTiles.slice(state.players.length * tilesPerPlayer);
    state.board          = [];
    state.leftEnd        = null;
    state.rightEnd       = null;
    state.passCount      = 0;
    state.firstMovePending = true;
    const openingPlayer  = _findOpeningPlayer(state.hands, state.players.length);
    state.openingDouble  = _findHighestDouble(state.hands[openingPlayer]);
    state.currentPlayer  = openingPlayer;
    state.roundNumber++;
    state.winner         = null;
    state.lastMove       = null;
    state.status         = 'playing';
    state.dirty          = true;
  }

  // ── Pip count helpers (used by AI + scoring) ───────

  function handPipCount(hand) {
    return hand.reduce((s, t) => s + t.a + t.b, 0);
  }

  function boardPipCount(board) {
    return board.reduce((s, { tile }) => s + tile.a + tile.b, 0);
  }

  // ── Public API ─────────────────────────────────────
  return {
    buildFullSet,
    createGameState,
    getValidEnds,
    getValidMovesForPlayer,
    hasAnyValidMove,
    applyMove,
    applyPass,
    startNewRound,
    handPipCount,
    boardPipCount,
  };

})();
