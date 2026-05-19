'use strict';

/* =====================================================
   sound.js — Procedural audio via Web Audio API
   No external files; all sounds synthesized on the fly.
   ===================================================== */

const Sound = (() => {

  let _ctx  = null;
  let _on   = true;

  // Lazily create AudioContext after first user gesture
  function _ac() {
    if (!_ctx) {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  // ── Core synthesizers ──────────────────────────────

  // Short noise burst shaped into a tile clack
  function _noise(ctx, durationSec, gainPeak, decayRatio, filterFreq, filterQ, startTime) {
    const sampleRate = ctx.sampleRate;
    const len = Math.ceil(sampleRate * durationSec);
    const buf = ctx.createBuffer(1, len, sampleRate);
    const data = buf.getChannelData(0);
    const halfLife = len * decayRatio;
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / halfLife);
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const bpf = ctx.createBiquadFilter();
    bpf.type      = 'bandpass';
    bpf.frequency.value = filterFreq;
    bpf.Q.value   = filterQ;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainPeak, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

    src.connect(bpf);
    bpf.connect(gain);
    gain.connect(ctx.destination);
    src.start(startTime);
    src.stop(startTime + durationSec + 0.01);
  }

  function _tone(ctx, freq, type, gainPeak, durationSec, startTime) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainPeak, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.01);
  }

  // ── Public sounds ──────────────────────────────────

  // Hard tile-on-tile impact (two layers: high click + low thump)
  function clack(pitchVariance = 0) {
    if (!_on) return;
    try {
      const ctx = _ac();
      const t   = ctx.currentTime;
      // High transient — the tile surface click
      _noise(ctx, 0.055, 0.7,  0.08, 900  + pitchVariance * 80, 1.2, t);
      // Low thump — the mass of the tile landing
      _noise(ctx, 0.08,  0.45, 0.12, 220  + pitchVariance * 20, 0.9, t);
    } catch (_) {}
  }

  // Rapid cascading clacks — shuffling tiles at round start
  function shuffle() {
    if (!_on) return;
    const count = 7;
    for (let i = 0; i < count; i++) {
      setTimeout(() => clack((Math.random() - 0.5) * 4), i * 38 + Math.random() * 12);
    }
  }

  // Knock-knock — two raps on the table when a player passes
  function pass() {
    if (!_on) return;
    try {
      const ctx = _ac();
      const t   = ctx.currentTime;
      // Each knock: sharp click transient + hollow wood body resonance
      _noise(ctx, 0.05, 0.55, 0.05, 1100, 0.9, t);
      _noise(ctx, 0.16, 0.48, 0.14,  250, 3.0, t);
      _noise(ctx, 0.05, 0.46, 0.05, 1100, 0.9, t + 0.21);
      _noise(ctx, 0.16, 0.40, 0.14,  250, 3.0, t + 0.21);
    } catch (_) {}
  }

  // Short ascending fanfare — match won
  function win() {
    if (!_on) return;
    try {
      const ctx = _ac();
      const t   = ctx.currentTime;
      const notes = [392, 494, 587, 784]; // G4 B4 D5 G5
      notes.forEach((f, i) => {
        _tone(ctx, f, 'triangle', 0.22, 0.22, t + i * 0.11);
      });
    } catch (_) {}
  }

  // Short descending figure — match lost
  function lose() {
    if (!_on) return;
    try {
      const ctx = _ac();
      const t   = ctx.currentTime;
      const notes = [392, 330, 262]; // G4 E4 C4
      notes.forEach((f, i) => {
        _tone(ctx, f, 'triangle', 0.18, 0.2, t + i * 0.13);
      });
    } catch (_) {}
  }

  // Round won (lighter than full win fanfare)
  function roundWin() {
    if (!_on) return;
    try {
      const ctx = _ac();
      const t   = ctx.currentTime;
      _tone(ctx, 523, 'triangle', 0.2, 0.18, t);
      _tone(ctx, 659, 'triangle', 0.2, 0.18, t + 0.1);
    } catch (_) {}
  }

  // ── Enable / disable ───────────────────────────────

  function setEnabled(on) { _on = on; }
  function isEnabled()    { return _on; }

  function init() {
    if (typeof Storage !== 'undefined' && Storage.getSettings) {
      _on = Storage.getSettings().sfx !== false;
    }
  }

  return { clack, shuffle, pass, win, lose, roundWin, setEnabled, isEnabled, init };

})();
