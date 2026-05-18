'use strict';

/* =====================================================
   scoring.js — Match format logic and score display
   ===================================================== */

const Scoring = (() => {

  function getRoundSummary(state, result) {
    const winner = state.players[result.roundWinner];
    const loserPips = result.pipsScored;

    return {
      winnerName:  winner.name,
      winnerIndex: result.roundWinner,
      pipsScored:  loserPips,
      blocked:     result.blocked || false,
      matchScores: [...state.matchScores],
      roundWins:   [...state.roundWins],
    };
  }

  function getMatchSummary(state) {
    const winnerIndex = state.matchScores.indexOf(Math.max(...state.matchScores));
    const winner = state.players[winnerIndex];
    return {
      winnerName:  winner.name,
      winnerIndex,
      matchScores: [...state.matchScores],
      roundWins:   [...state.roundWins],
    };
  }

  // Human-readable round result text
  function roundResultText(state, result) {
    const summary = getRoundSummary(state, result);
    if (summary.blocked) {
      return `Board blocked! ${summary.winnerName} wins with the lowest pip count (+${summary.pipsScored} pts)`;
    }
    return `${summary.winnerName} cleared their hand! +${summary.pipsScored} points`;
  }

  // Detailed pip breakdown per player — shown below the result headline
  function pipBreakdownText(state, result) {
    if (!result || result.roundWinner == null) return '';
    const tileStr = hand => hand.length === 0 ? '(empty)' : hand.map(t => `[${t.a}|${t.b}]`).join(' ');
    const pipSum  = hand => hand.reduce((s, t) => s + t.a + t.b, 0);

    if (result.blocked) {
      return state.hands.map((hand, i) => {
        const pips = pipSum(hand);
        const star = i === result.roundWinner ? ' ★' : '';
        return `${state.players[i].name}: ${tileStr(hand)} = ${pips} pip${pips !== 1 ? 's' : ''}${star}`;
      }).join('\n');
    }

    // Normal win: only losing hands have tiles remaining
    return state.hands
      .map((hand, i) => ({ hand, i }))
      .filter(({ hand }) => hand.length > 0)
      .map(({ hand, i }) => {
        const pips = pipSum(hand);
        return `${state.players[i].name}: ${tileStr(hand)} = ${pips} pip${pips !== 1 ? 's' : ''}`;
      })
      .join('\n');
  }

  // Is the match over under the active format?
  function isMatchOver(state) {
    return state.status === 'match_over';
  }

  // Progress text shown in UI (e.g. "45 / 100 pts" or "Round 2 of 3")
  function progressText(state) {
    const you = state.players.findIndex(p => p.isHuman);
    switch (state.format) {
      case 'points':
        return `${state.matchScores[you]} / ${state.targetPoints} pts`;
      case 'bestof3':
        return `${state.roundWins[you]} win${state.roundWins[you] !== 1 ? 's' : ''}`;
      case 'rounds':
      default:
        return `Round ${state.roundNumber}`;
    }
  }

  return {
    getRoundSummary,
    getMatchSummary,
    roundResultText,
    pipBreakdownText,
    isMatchOver,
    progressText,
  };

})();
