'use strict';

const Storage = (() => {
  const KEY_SETTINGS = 'artsdominos_settings';
  const KEY_RECORDS  = 'artsdominos_records';
  const KEY_PLAYER   = 'artsdominos_player';
  const KEY_GLOBAL   = 'artsdominos_global';

  const DEFAULTS_SETTINGS = { sfx: true, music: false, aiSpeed: 'normal', hints: true };

  function _load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }

  function _save(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
  }

  return {
    getSettings() {
      return { ...DEFAULTS_SETTINGS, ..._load(KEY_SETTINGS, {}) };
    },

    saveSetting(key, value) {
      const s = this.getSettings();
      s[key] = value;
      _save(KEY_SETTINGS, s);
    },

    saveSettings(settings) {
      _save(KEY_SETTINGS, settings);
    },

    getRecord(charId) {
      const all = _load(KEY_RECORDS, {});
      return all[charId] || { wins: 0, losses: 0 };
    },

    recordWin(charId) {
      const all = _load(KEY_RECORDS, {});
      if (!all[charId]) all[charId] = { wins: 0, losses: 0, streak: 0, bestStreak: 0 };
      all[charId].wins++;
      all[charId].streak = (all[charId].streak || 0) + 1;
      if (all[charId].streak > (all[charId].bestStreak || 0)) all[charId].bestStreak = all[charId].streak;
      _save(KEY_RECORDS, all);
    },

    recordLoss(charId) {
      const all = _load(KEY_RECORDS, {});
      if (!all[charId]) all[charId] = { wins: 0, losses: 0, streak: 0, bestStreak: 0 };
      all[charId].losses++;
      all[charId].streak = 0;
      _save(KEY_RECORDS, all);
    },

    getAllRecords() {
      return _load(KEY_RECORDS, {});
    },

    resetProgress() {
      localStorage.removeItem(KEY_RECORDS);
      localStorage.removeItem(KEY_GLOBAL);
    },

    // ── Player identity ──────────────────────────────
    getPlayerName() {
      return _load(KEY_PLAYER, {}).name || null;
    },

    setPlayerName(name) {
      const p = _load(KEY_PLAYER, {});
      p.name = String(name).trim().slice(0, 20);
      _save(KEY_PLAYER, p);
    },

    getPlayerId() {
      const p = _load(KEY_PLAYER, {});
      if (!p.id) {
        p.id = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
        _save(KEY_PLAYER, p);
      }
      return p.id;
    },

    // ── Global cumulative stats (across all opponents) ─
    getGlobalStats() {
      return { totalPoints: 0, wins: 0, losses: 0, bestStreak: 0, currentStreak: 0,
               ..._load(KEY_GLOBAL, {}) };
    },

    addMatchResult(points, won) {
      const g = this.getGlobalStats();
      g.totalPoints    = (g.totalPoints || 0) + Math.max(0, points || 0);
      if (won) {
        g.wins          = (g.wins || 0) + 1;
        g.currentStreak = (g.currentStreak || 0) + 1;
        if (g.currentStreak > (g.bestStreak || 0)) g.bestStreak = g.currentStreak;
      } else {
        g.losses        = (g.losses || 0) + 1;
        g.currentStreak = 0;
      }
      _save(KEY_GLOBAL, g);
    },
  };
})();
