'use strict';

const Storage = (() => {
  const KEY_SETTINGS = 'artsdominos_settings';
  const KEY_RECORDS  = 'artsdominos_records';

  const DEFAULTS_SETTINGS = { sfx: true, music: true, aiSpeed: 'normal', hints: true };

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
    },
  };
})();
