'use strict';

/* =====================================================
   main.js — Menu navigation, character roster,
   match setup. Runs on index.html only.
   ===================================================== */

// Add new filenames here to rotate them in automatically
const SPLASH_IMAGES = [
  'assets/bg/splash.png',
  'assets/bg/splash2.png',
  'assets/bg/splash3.png',
];

const App = {
  mode: '1v1',
  selectedFormat: 'rounds',
  selectedOpponent: null,
  selectedPartner: null,
  profileChar: null,
  _lastSplash: null,

  // ── Splash rotation ────────────────────────────────
  _rotateSplash() {
    if (SPLASH_IMAGES.length < 2) return;
    const pool = SPLASH_IMAGES.filter(s => s !== this._lastSplash);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    this._lastSplash = pick;
    const img = document.querySelector('.menu-splash-img');
    if (img) img.src = pick;
  },

  // ── Screen navigation ──────────────────────────────
  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
    if (id === 'screen-menu') this._rotateSplash();
  },

  startModeSelect(mode) {
    this.mode = mode;
    this.selectedOpponent = null;
    this.selectedPartner  = null;
    Music.start(); // first user gesture — safe to start audio here

    const title = document.getElementById('select-title');
    if (title) title.textContent = mode === 'teams' ? 'Choose Your Opponents' : 'Choose Your Opponent';

    const partnerSection = document.getElementById('partner-section');
    if (partnerSection) partnerSection.classList.add('hidden');

    this._renderCharacterGrid('character-grid');
    this.showScreen('screen-play-select');
  },

  // ── Character grid ─────────────────────────────────
  _renderCharacterGrid(gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = '';
    CHARACTERS.forEach(char => {
      grid.appendChild(this._buildCard(char, false));
    });
  },

  _buildCard(char, isPartnerSelect) {
    const record = Storage.getRecord(char.id);
    const card = document.createElement('div');
    card.className = 'character-card';
    card.dataset.id = char.id;

    card.innerHTML = `
      <div class="card-face"></div>
      <div class="card-star"></div>
      <div class="card-portrait-wrap">
        <img
          class="card-portrait"
          src="assets/characters/${char.portraitFile}"
          alt="${char.name}"
          onerror="this.src='assets/characters/silhouette.svg'"
          loading="lazy"
        >
      </div>
      <div class="card-frame-overlay"></div>
      <div class="card-nameplate">
        <div class="card-name">${char.name}</div>
        <div class="card-level-row">
          <span class="diff-badge ${char.difficulty}">${char.difficulty.toUpperCase()}</span>
          <span class="card-level-num">LVL ${char.level}</span>
        </div>
        <div class="card-record">${record.wins}W &middot; ${record.losses}L</div>
      </div>
    `;

    card.addEventListener('click', () => {
      if (isPartnerSelect) {
        this._selectPartner(char, card);
      } else {
        this._selectOpponent(char, card);
      }
    });

    return card;
  },

  _selectOpponent(char, cardEl) {
    document.querySelectorAll('#character-grid .character-card').forEach(c => c.classList.remove('selected'));
    cardEl.classList.add('selected');
    this.selectedOpponent = char;
    this._showProfile(char);
  },

  _selectPartner(char, cardEl) {
    if (char.id === this.selectedOpponent?.id) return;
    document.querySelectorAll('#partner-grid .character-card').forEach(c => c.classList.remove('selected'));
    cardEl.classList.add('selected');
    this.selectedPartner = char;
    this._showMatchOverlay(this.selectedOpponent);
  },

  _showPartnerSelect() {
    const section = document.getElementById('partner-section');
    section.classList.remove('hidden');
    const partnerGrid = document.getElementById('partner-grid');
    if (!partnerGrid) return;
    partnerGrid.innerHTML = '';
    CHARACTERS.filter(c => c.id !== this.selectedOpponent?.id).forEach(char => {
      partnerGrid.appendChild(this._buildCard(char, true));
    });
    section.scrollIntoView({ behavior: 'smooth' });
  },

  // ── Profile modal ──────────────────────────────────
  _showProfile(char) {
    this.profileChar = char;

    const modal = document.getElementById('profile-modal');
    if (!modal) return;

    // Portrait
    const img = document.getElementById('profile-img');
    img.src = `assets/characters/${char.portraitFile}`;
    img.alt = char.name;
    img.onerror = () => { img.src = 'assets/characters/silhouette.svg'; };

    // Identity
    document.getElementById('profile-name').textContent = char.name;

    const badge = document.getElementById('profile-diff-badge');
    badge.textContent = char.difficulty.toUpperCase();
    badge.className = `diff-badge ${char.difficulty}`;

    document.getElementById('profile-level').textContent = `LVL ${char.level}`;
    document.getElementById('profile-archetype').textContent = `· ${char.archetype}`;

    // Quote
    document.getElementById('profile-quote').textContent = char.quote;

    // Bio
    document.getElementById('profile-bio').textContent = char.bio;

    // Playstyle + skills
    document.getElementById('profile-playstyle').textContent = char.playstyle;

    const skillsList = document.getElementById('profile-skills');
    skillsList.innerHTML = '';
    char.skills.forEach(skill => {
      const li = document.createElement('li');
      li.textContent = skill;
      skillsList.appendChild(li);
    });

    // Special ability
    document.getElementById('profile-ability-name').textContent = char.specialAbility.name;
    document.getElementById('profile-ability-desc').textContent = char.specialAbility.description;

    // Weakness
    document.getElementById('profile-weakness').textContent = char.weakness;

    // Challenge button label
    document.getElementById('profile-challenge-btn').textContent = `Challenge ${char.name}!`;

    // Scroll card back to top and show
    const card = modal.querySelector('.profile-card');
    if (card) card.scrollTop = 0;
    modal.classList.remove('hidden');
  },

  closeProfile() {
    const modal = document.getElementById('profile-modal');
    if (modal) modal.classList.add('hidden');
    this.profileChar = null;
  },

  challengeFromProfile() {
    const char = this.profileChar;
    if (!char) return;
    document.getElementById('profile-modal').classList.add('hidden');

    if (this.mode === 'teams') {
      this._showPartnerSelect();
    } else {
      this._showMatchOverlay(char);
    }
  },

  // ── Match overlay ──────────────────────────────────
  _showMatchOverlay(opponent) {
    const overlay = document.getElementById('match-overlay');
    if (!overlay) return;

    const img = document.getElementById('overlay-npc-img');
    img.innerHTML = `<img src="assets/characters/${opponent.portraitFile}" alt="${opponent.name}" onerror="this.src='assets/characters/silhouette.svg'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;

    document.getElementById('overlay-npc-name').textContent = opponent.name;

    const formatLabels = {
      rounds:  'First to Empty Hand',
      points:  'First to 100 Points',
      bestof3: 'Best of 3 Rounds',
    };
    document.getElementById('overlay-format').textContent =
      `${this.mode === 'teams' ? '2v2 Teams · ' : '1v1 · '}${formatLabels[this.selectedFormat]}`;

    overlay.classList.remove('hidden');
  },

  cancelOverlay() {
    document.getElementById('match-overlay').classList.add('hidden');
  },

  launchGame() {
    if (!this.selectedOpponent) return;
    const params = new URLSearchParams({
      mode:     this.mode,
      opponent: this.selectedOpponent.id,
      partner:  this.selectedPartner?.id || '',
      format:   this.selectedFormat,
    });
    window.location.href = `game.html?${params}`;
  },

  // ── Settings ───────────────────────────────────────
  toggleSetting(key) {
    const btn = document.getElementById(`toggle-${key}`);
    const current = Storage.getSettings()[key];
    const next = !current;
    Storage.saveSetting(key, next);
    if (btn) {
      btn.textContent = next ? 'ON' : 'OFF';
      btn.classList.toggle('on', next);
    }
    if (key === 'sfx') Sound.setEnabled(next);
    if (key === 'music') {
      Music.setEnabled(next);
      const splashBtn = document.getElementById('music-splash-btn');
      if (splashBtn) splashBtn.classList.toggle('off', !next);
    }
  },

  saveSetting(key, value) {
    Storage.saveSetting(key, value);
  },

  confirmReset() {
    if (confirm('Reset all win/loss records? This cannot be undone.')) {
      Storage.resetProgress();
      if (document.getElementById('screen-play-select').classList.contains('active')) {
        this._renderCharacterGrid('character-grid');
      }
    }
  },

  // ── Stats screen ───────────────────────────────────
  showStats() {
    const records = Storage.getAllRecords();
    let totalWins = 0, totalLosses = 0, bestStreak = 0, bestStreakChar = null;

    CHARACTERS.forEach(char => {
      const rec = records[char.id];
      if (rec) {
        totalWins   += rec.wins   || 0;
        totalLosses += rec.losses || 0;
        if ((rec.bestStreak || 0) > bestStreak) {
          bestStreak = rec.bestStreak;
          bestStreakChar = char;
        }
      }
    });

    const totalGames = totalWins + totalLosses;
    const winRate    = totalGames > 0 ? Math.round(totalWins / totalGames * 100) : null;

    const played   = CHARACTERS.filter(c => records[c.id] && (records[c.id].wins + records[c.id].losses) > 0);
    const unplayed = CHARACTERS.filter(c => !records[c.id] || (records[c.id].wins + records[c.id].losses) === 0);

    const rowHTML = char => {
      const rec   = records[char.id] || { wins: 0, losses: 0, bestStreak: 0 };
      const games = (rec.wins || 0) + (rec.losses || 0);
      const pct   = games > 0 ? Math.round((rec.wins || 0) / games * 100) : null;
      const streak = rec.bestStreak || 0;
      return `<div class="stats-char-row">
        <img class="stats-portrait" src="assets/characters/${char.portraitFile}"
             onerror="this.src='assets/characters/silhouette.svg'" alt="${char.name}">
        <div class="stats-char-info">
          <div class="stats-char-name">${char.name}</div>
          <div class="stats-char-record">${games === 0 ? 'Not yet played'
            : `${rec.wins}W &middot; ${rec.losses}L${pct !== null ? ` &middot; ${pct}%` : ''}`}</div>
        </div>
        <div class="stats-streak">${streak > 0 ? `&#9733; ${streak}` : '&mdash;'}</div>
      </div>`;
    };

    document.getElementById('stats-content').innerHTML = `
      <div class="stats-summary">
        <div class="stats-stat">
          <div class="stats-value">${totalGames}</div>
          <div class="stats-label">Matches</div>
        </div>
        <div class="stats-stat">
          <div class="stats-value">${winRate !== null ? winRate + '%' : '&mdash;'}</div>
          <div class="stats-label">Win Rate</div>
        </div>
        <div class="stats-stat">
          <div class="stats-value">${bestStreak > 0 ? bestStreak : '&mdash;'}</div>
          <div class="stats-label">Best Streak${bestStreakChar ? `<span class="streak-vs">vs ${bestStreakChar.name}</span>` : ''}</div>
        </div>
      </div>
      <div class="gold-rule"></div>
      ${played.length > 0 ? `<div class="stats-roster">${played.map(rowHTML).join('')}</div>` : ''}
      ${played.length > 0 && unplayed.length > 0 ? '<div class="stats-section-label">Not Yet Played</div>' : ''}
      ${unplayed.length > 0 ? `<div class="stats-roster unplayed">${unplayed.map(rowHTML).join('')}</div>` : ''}
      ${totalGames === 0 ? '<p class="stats-empty">No matches played yet. Go challenge an opponent!</p>' : ''}
    `;
    this.showScreen('screen-stats');
  },

  // ── Player name ────────────────────────────────────
  saveName() {
    const input = document.getElementById('player-name-input');
    const name  = input ? input.value.trim() : '';
    if (!name) {
      if (input) input.focus();
      return;
    }
    Storage.setPlayerName(name);
    document.getElementById('name-modal').classList.add('hidden');
    this._updateSettingsNameBtn();
    this.showScreen('screen-menu');
  },

  changeName() {
    const modal = document.getElementById('name-modal');
    if (!modal) return;
    const input = document.getElementById('player-name-input');
    if (input) input.value = Storage.getPlayerName() || '';
    modal.classList.remove('hidden');
    setTimeout(() => { if (input) input.focus(); }, 80);
  },

  _updateSettingsNameBtn() {
    const btn = document.getElementById('settings-name-btn');
    const name = Storage.getPlayerName();
    if (btn && name) btn.textContent = name;
  },

  // ── Leaderboard ────────────────────────────────────
  async showLeaderboard() {
    this.showScreen('screen-leaderboard');
    const el = document.getElementById('leaderboard-content');
    if (!el) return;

    if (!Leaderboard.isReady()) {
      el.innerHTML = '<p class="leaderboard-offline">Leaderboard coming soon — not yet configured.</p>';
      return;
    }

    el.innerHTML = '<p class="leaderboard-loading">Loading…</p>';

    const myName  = Storage.getPlayerName();
    const myStats = Storage.getGlobalStats();
    const entries = await Leaderboard.fetchTop(25);

    let html = '';

    // Personal summary card
    if (myName) {
      html += `
        <div class="lb-my-card">
          <div class="lb-my-stat"><div class="lb-my-val">${(myStats.totalPoints || 0).toLocaleString()}</div><div class="lb-my-lbl">Your Points</div></div>
          <div class="lb-my-stat"><div class="lb-my-val">${myStats.wins || 0}</div><div class="lb-my-lbl">Wins</div></div>
          <div class="lb-my-stat"><div class="lb-my-val">${myStats.bestStreak || 0}</div><div class="lb-my-lbl">Best Streak</div></div>
        </div>`;
    }

    if (entries.length === 0) {
      html += '<p class="leaderboard-empty">No entries yet — play a match to be first on the board!</p>';
    } else {
      const medals = ['🥇', '🥈', '🥉'];
      const rows = entries.map((e, i) => {
        const isYou = myName && e.name === myName;
        const streakTxt = e.bestStreak > 0 ? `🔥${e.bestStreak}` : '—';
        return `<div class="lb-row${isYou ? ' lb-you' : ''}">
          <span class="lb-rank">${medals[i] || (i + 1)}</span>
          <span class="lb-name">${e.name}</span>
          <span class="lb-pts">${(e.totalPoints || 0).toLocaleString()}</span>
          <span class="lb-wins">${e.wins || 0}W</span>
          <span class="lb-streak">${streakTxt}</span>
        </div>`;
      }).join('');

      html += `
        <div class="lb-table">
          <div class="lb-header">
            <span class="lb-rank">#</span>
            <span class="lb-name">Player</span>
            <span class="lb-pts">Points</span>
            <span class="lb-wins">W</span>
            <span class="lb-streak">Streak</span>
          </div>
          ${rows}
        </div>`;
    }

    el.innerHTML = html;
  },

  // ── Init ───────────────────────────────────────────
  init() {
    Sound.init();
    Music.init();

    // Format buttons
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedFormat = btn.dataset.format;
      });
    });

    // Sync settings toggles
    const settings = Storage.getSettings();
    ['sfx', 'music', 'hints'].forEach(key => {
      const btn = document.getElementById(`toggle-${key}`);
      if (!btn) return;
      const on = settings[key] !== false;
      btn.textContent = on ? 'ON' : 'OFF';
      btn.classList.toggle('on', on);
    });

    // AI speed select
    const aiSelect = document.getElementById('ai-speed');
    if (aiSelect) aiSelect.value = settings.aiSpeed || 'normal';

    // Sync splash music button
    const splashMusicBtn = document.getElementById('music-splash-btn');
    if (splashMusicBtn) splashMusicBtn.classList.toggle('off', settings.music === false || settings.music === undefined);

    // Close profile modal on backdrop click
    const profileModal = document.getElementById('profile-modal');
    if (profileModal) {
      profileModal.addEventListener('click', e => {
        if (e.target === profileModal) this.closeProfile();
      });
    }

    this._updateSettingsNameBtn();

    // Show name entry modal on first launch
    if (!Storage.getPlayerName()) {
      document.getElementById('name-modal')?.classList.remove('hidden');
      setTimeout(() => document.getElementById('player-name-input')?.focus(), 120);
    } else {
      this.showScreen('screen-menu');
    }
  },
};

App.init();
