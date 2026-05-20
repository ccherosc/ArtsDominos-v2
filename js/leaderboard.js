'use strict';

/* =====================================================
   leaderboard.js — Firebase Realtime Database bridge
   Uses plain fetch() against the REST API — no SDK.

   SETUP (one-time, ~5 min):
   1. Go to https://console.firebase.google.com
   2. Create a project → Build → Realtime Database
   3. Start in test mode (rules: public read/write)
   4. Copy the Database URL shown at the top of the DB page
   5. Paste it below replacing YOUR_FIREBASE_DB_URL
   ===================================================== */

const Leaderboard = (() => {

  const DB_URL = 'YOUR_FIREBASE_DB_URL';   // ← paste here

  const _ready = typeof DB_URL === 'string' && DB_URL.startsWith('https://');

  // ── Write / update this player's record ───────────
  async function submit(playerId, name, stats) {
    if (!_ready) return;
    try {
      await fetch(`${DB_URL}/leaderboard/${playerId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        name,
          totalPoints: stats.totalPoints  || 0,
          wins:        stats.wins         || 0,
          losses:      stats.losses       || 0,
          bestStreak:  stats.bestStreak   || 0,
          lastPlayed:  new Date().toISOString().slice(0, 10),
        }),
      });
    } catch (_) {}
  }

  // ── Fetch top N players sorted by totalPoints ──────
  async function fetchTop(limit = 25) {
    if (!_ready) return [];
    try {
      const res  = await fetch(`${DB_URL}/leaderboard.json`);
      if (!res.ok) return [];
      const data = await res.json();
      if (!data) return [];
      return Object.values(data)
        .filter(e => e && typeof e.name === 'string')
        .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
        .slice(0, limit);
    } catch (_) { return []; }
  }

  function isReady() { return _ready; }

  return { submit, fetchTop, isReady };

})();
