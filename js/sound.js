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

  // Knock-knock — two hard raps on wood when a player passes.
  // Deliberately unlike the tile clack: lower frequencies, hollow resonance,
  // no high-frequency snap (clack lives at 900 Hz; this knock avoids that band).
  function pass() {
    if (!_on) return;
    try {
      const ctx = _ac();
      const t   = ctx.currentTime;
      function hardKnock(when) {
        _noise(ctx, 0.03, 1.0,  0.03,  420, 0.6, when);  // wideband impact crack
        _noise(ctx, 0.22, 0.75, 0.09,  105, 11,  when);  // deep hollow wood body
        _noise(ctx, 0.12, 0.50, 0.10,   68, 4.5, when);  // low sub-thud (mass)
      }
      hardKnock(t);
      hardKnock(t + 0.28);
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

/* =====================================================
   Music — background music player
   Loads .ogg tracks, shuffles order, plays sequentially.
   Add a filename to TRACKS to rotate it in automatically.
   ===================================================== */

const Music = (() => {

  const TRACKS = [
    'assets/audio/song1.ogg',
    'assets/audio/song2.ogg',
    'assets/audio/song3.ogg',
  ];

  let _on    = false;
  let _audio = null;
  let _queue = [];
  let _idx   = 0;

  function _shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function _advance() {
    _idx++;
    if (_idx >= _queue.length) {
      _queue = _shuffle(TRACKS);
      _idx   = 0;
    }
    _audio.src = _queue[_idx];
    _audio.play().catch(() => {});
  }

  function start() {
    if (!_on) return;
    if (!_audio) {
      _audio = new Audio();
      _audio.volume = 0.35;
      _audio.addEventListener('ended', _advance);
    }
    if (!_audio.paused) return;
    _queue    = _shuffle(TRACKS);
    _idx      = 0;
    _audio.src = _queue[0];
    _audio.play().catch(() => {});
  }

  function stop() {
    if (_audio && !_audio.paused) {
      _audio.pause();
      _audio.currentTime = 0;
    }
  }

  function setEnabled(on) {
    _on = on;
    if (on) start();
    else    stop();
  }

  function isEnabled() { return _on; }

  function init() {
    if (typeof Storage !== 'undefined' && Storage.getSettings) {
      _on = Storage.getSettings().music === true;
    }
  }

  return { start, stop, setEnabled, isEnabled, init };

})();
