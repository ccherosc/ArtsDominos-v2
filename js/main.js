'use strict';

/* =====================================================
   main.js — Menu navigation, character roster,
   match setup. Runs on index.html only.
   ===================================================== */

// ── PWA install prompt ─────────────────────────────
let _installPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _installPrompt = e;
  const btn = document.getElementById('install-btn');
  if (btn) btn.classList.remove('hidden');
});

// Hide button once installed
window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('install-btn');
  if (btn) btn.classList.add('hidden');
  _installPrompt = null;
});

// Show button on iOS Safari if not already in standalone mode
(function _iosInstallCheck() {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari = /^((?!chrome|crios|fxios).)*safari/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;
  if (isIos && isSafari && !isStandalone) {
    const btn = document.getElementById('install-btn');
    if (btn) btn.classList.remove('hidden');
  }
})();

// Drop any splash*.png into assets/bg/ — picked up automatically, no code change needed.
// Probes splash.png, splash2.png … splash12.png; missing files are silently removed.
let SPLASH_IMAGES = [
  'assets/bg/splash.png',
  ...Array.from({ length: 11 }, (_, i) => `assets/bg/splash${i + 2}.png`),
];

const App = {
  mode: '1v1',
  selectedFormat: 'rounds',
  selectedOpponent: null,   // opp in 1v1; opp1 in teams
  selectedOpponent2: null,  // opp2 in teams
  selectedTeammate: null,   // user's AI partner in teams
  selectedPartner: null,    // legacy alias (kept for safety)
  teamsStep: 'teammate',    // 'teammate' | 'opp1' | 'opp2'
  profileChar: null,
  _lastSplash: null,

  // ── Splash rotation ────────────────────────────────
  _rotateSplash() {
    if (SPLASH_IMAGES.length === 0) return;
    const pool = SPLASH_IMAGES.filter(s => s !== this._lastSplash);
    const pick = (pool.length > 0 ? pool : SPLASH_IMAGES)[Math.floor(Math.random() * (pool.length || SPLASH_IMAGES.length))];
    this._lastSplash = pick;
    const img = document.querySelector('.menu-splash-img');
    if (!img) return;
    img.src = pick;
    img.onerror = () => {
      // Prune missing files so they're never tried again
      SPLASH_IMAGES = SPLASH_IMAGES.filter(s => s !== pick);
      this._lastSplash = null;
      if (SPLASH_IMAGES.length > 0) this._rotateSplash();
      else img.style.display = 'none';
    };
  },

  // ── Screen navigation ──────────────────────────────
  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
    if (id === 'screen-menu') this._rotateSplash();
  },

  startModeSelect(mode) {
    this.mode              = mode;
    this.selectedOpponent  = null;
    this.selectedOpponent2 = null;
    this.selectedTeammate  = null;
    this.selectedPartner   = null;
    this.teamsStep         = 'teammate';
    Music.start(); // first user gesture — safe to start audio here

    const title  = document.getElementById('select-title');
    const stepEl = document.getElementById('teams-step-indicator');

    if (mode === 'teams') {
      if (title)  title.textContent  = 'Step 1 of 3 · Choose Your Teammate';
      if (stepEl) { stepEl.textContent = ''; stepEl.classList.remove('hidden'); }
    } else {
      if (title)  title.textContent = 'Choose Your Opponent';
      if (stepEl) stepEl.classList.add('hidden');
    }

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

  // Teams grid: repopulate main grid, filtering already-chosen characters
  _renderTeamsGrid() {
    const grid = document.getElementById('character-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const exclude = [
      this.selectedTeammate?.id,
      this.selectedOpponent?.id,
      this.selectedOpponent2?.id,
    ].filter(Boolean);
    CHARACTERS
      .filter(c => !exclude.includes(c.id))
      .forEach(char => grid.appendChild(this._buildCard(char, false)));
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
    // In teams mode the correct state variable is set inside challengeFromProfile
    if (this.mode !== 'teams') this.selectedOpponent = char;
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

    // Challenge button label — context-aware for teams steps
    const teamsBtnLabels = {
      teammate: `Choose ${char.name} as Teammate`,
      opp1:     `Challenge ${char.name}!`,
      opp2:     `Challenge ${char.name}!`,
    };
    document.getElementById('profile-challenge-btn').textContent =
      this.mode === 'teams'
        ? (teamsBtnLabels[this.teamsStep] || `Challenge ${char.name}!`)
        : `Challenge ${char.name}!`;

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
    this.profileChar = null;

    if (this.mode !== 'teams') {
      this.selectedOpponent = char;
      this._showMatchOverlay(char);
      return;
    }

    // ── Teams mode: advance through three-step selection ──
    const title  = document.getElementById('select-title');
    const stepEl = document.getElementById('teams-step-indicator');

    if (this.teamsStep === 'teammate') {
      this.selectedTeammate = char;
      this.teamsStep = 'opp1';
      if (title)  title.textContent  = 'Step 2 of 3 · Choose Opponent 1';
      if (stepEl) stepEl.textContent = `🤝 Teammate: ${char.name}`;
      this._renderTeamsGrid();

    } else if (this.teamsStep === 'opp1') {
      this.selectedOpponent = char;
      this.teamsStep = 'opp2';
      if (title)  title.textContent  = 'Step 3 of 3 · Choose Opponent 2';
      if (stepEl) stepEl.textContent =
        `🤝 ${this.selectedTeammate?.name}  ·  ⚔️ Opp 1: ${char.name}`;
      this._renderTeamsGrid();

    } else if (this.teamsStep === 'opp2') {
      this.selectedOpponent2 = char;
      this._showMatchOverlay(char);
    }
  },

  // ── Match overlay ──────────────────────────────────
  _showMatchOverlay(_unused) {
    const overlay = document.getElementById('match-overlay');
    if (!overlay) return;
    const card = document.getElementById('match-overlay-card');
    if (!card) return;

    const formatLabels = {
      rounds:    'Single Match',
      points:    'Play to 100',
      points200: 'Play to 200',
    };
    const fmtLabel = formatLabels[this.selectedFormat] || this.selectedFormat;

    if (this.mode === 'teams') {
      const tm  = this.selectedTeammate;
      const op1 = this.selectedOpponent;
      const op2 = this.selectedOpponent2;
      const ring = (char, label) => char
        ? `<div class="overlay-portrait-ring npc small"><img src="assets/characters/${char.portraitFile}" alt="${char.name}" onerror="this.src='assets/characters/silhouette.svg'"></div>`
        : `<div class="overlay-portrait-ring you small">${label}</div>`;

      card.innerHTML = `
        <div class="overlay-vs-row">
          <div class="overlay-team">
            <div class="overlay-team-portraits">
              <div class="overlay-portrait-ring you small">YOU</div>
              ${ring(tm, 'TM')}
            </div>
            <div class="overlay-team-name">${tm?.name || 'Partner'}</div>
          </div>
          <div class="overlay-vs">VS</div>
          <div class="overlay-team">
            <div class="overlay-team-portraits">
              ${ring(op1, 'O1')}
              ${ring(op2, 'O2')}
            </div>
            <div class="overlay-team-name">${op1?.name || 'Opp 1'} + ${op2?.name || 'Opp 2'}</div>
          </div>
        </div>
        <div class="overlay-format">2v2 Teams · ${fmtLabel}</div>
        <button class="btn-primary" onclick="App.launchGame()">Let's Play!</button>
        <button class="btn-secondary" onclick="App.cancelOverlay()">Change Lineup</button>
      `;
    } else {
      const opponent = this.selectedOpponent;
      card.innerHTML = `
        <div class="overlay-vs-row">
          <div class="overlay-player">
            <div class="overlay-portrait-ring you">YOU</div>
          </div>
          <div class="overlay-vs">VS</div>
          <div class="overlay-player">
            <div class="overlay-portrait-ring npc">
              <img src="assets/characters/${opponent?.portraitFile}" alt="${opponent?.name}" onerror="this.src='assets/characters/silhouette.svg'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">
            </div>
            <div class="overlay-npc-name">${opponent?.name || 'CPU'}</div>
          </div>
        </div>
        <div class="overlay-format">1v1 · ${fmtLabel}</div>
        <button class="btn-primary" onclick="App.launchGame()">Let's Play!</button>
        <button class="btn-secondary" onclick="App.cancelOverlay()">Change Opponent</button>
      `;
    }

    overlay.classList.remove('hidden');
  },

  cancelOverlay() {
    document.getElementById('match-overlay').classList.add('hidden');

    if (this.mode === 'teams') {
      // Step back to opp2 selection so the user can swap the second opponent
      this.selectedOpponent2 = null;
      this.teamsStep = 'opp2';
      const title  = document.getElementById('select-title');
      const stepEl = document.getElementById('teams-step-indicator');
      if (title)  title.textContent  = 'Step 3 of 3 · Choose Opponent 2';
      if (stepEl) stepEl.textContent =
        `🤝 ${this.selectedTeammate?.name}  ·  ⚔️ Opp 1: ${this.selectedOpponent?.name}`;
      this._renderTeamsGrid();
    }
  },

  launchGame() {
    if (!this.selectedOpponent) return;
    if (this.mode === 'teams' && (!this.selectedTeammate || !this.selectedOpponent2)) return;

    const params = new URLSearchParams({
      mode:      this.mode,
      opponent:  this.selectedOpponent.id,
      partner:   this.selectedTeammate?.id || '',
      opponent2: this.selectedOpponent2?.id || '',
      format:    this.selectedFormat,
    });
    window.location.href = `game.html?${params}`;
  },

  // ── Install / Add to Home Screen ───────────────────
  installApp() {
    if (_installPrompt) {
      _installPrompt.prompt();
      _installPrompt.userChoice.then(() => { _installPrompt = null; });
      return;
    }
    // iOS Safari: no API — show tooltip
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) {
      document.getElementById('install-ios-tip')?.classList.remove('hidden');
    }
  },

  closeInstallTip() {
    document.getElementById('install-ios-tip')?.classList.add('hidden');
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

  // ── Playstyle analyst ──────────────────────────────
  _buildPlaystyleSummary() {
    const g      = Storage.getGlobalStats();
    const recs   = Storage.getAllRecords();
    const wins   = g.wins   || 0;
    const losses = g.losses || 0;
    const total  = wins + losses;

    if (total < 3) return 'Play a few more matches to unlock your playstyle profile.';

    const pct    = Math.round(wins / total * 100);
    const avgPts = Math.round((g.totalPoints || 0) / total);
    const streak = g.bestStreak || 0;

    // Scan per-opponent records
    let nemesisId = null, nemesisL = 0, champId = null, champW = 0;
    Object.entries(recs).forEach(([id, r]) => {
      if ((r.losses || 0) > nemesisL) { nemesisL = r.losses; nemesisId = id; }
      if ((r.wins   || 0) > champW)   { champW   = r.wins;   champId   = id; }
    });
    const nemesis = nemesisId ? CharacterDB.getById(nemesisId) : null;
    const champ   = champId   ? CharacterDB.getById(champId)   : null;

    // Opening line — win-rate archetype
    const opens = pct >= 75
      ? `A ${pct}% win rate marks you as elite — patient, precise, and rarely rattled.`
      : pct >= 60
      ? `Consistent at ${pct}% wins. You read the table well and almost never waste a tile.`
      : pct >= 45
      ? `A true competitor at ${pct}% — every match is hard-fought and you know it.`
      : pct >= 30
      ? `${pct}% wins and still climbing. The losses are sharpening your instincts.`
      : `${total} matches played with pure fire. The reads will come.`;

    // Middle — streak or depth
    const mids = streak >= 10
      ? ` A ${streak}-game streak proves you can lock in and dominate.`
      : streak >= 5
      ? ` A ${streak}-win streak shows the ceiling is high when you find your rhythm.`
      : total >= 25
      ? ` ${total} matches of table time gives you an edge most players don't have yet.`
      : avgPts > 35
      ? ` Averaging ${avgPts} pts per match — you play for maximum damage, not just survival.`
      : '';

    // Closer — opponent callout
    const close = (nemesis && nemesisL >= 2 && nemesisId !== champId)
      ? ` ${nemesis.name} is still in your head.`
      : (champ && champW >= 2)
      ? ` ${champ.name} has felt your best.`
      : '';

    const summary = opens + mids + close;
    return summary.length > 250 ? summary.slice(0, 247) + '…' : summary;
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

    // Playstyle analyst card — always shown at bottom, based on local stats
    const summary = this._buildPlaystyleSummary();
    html += `
      <div class="lb-playstyle-card">
        <div class="lb-playstyle-label">&#9670; Your Playstyle</div>
        <p class="lb-playstyle-text">${summary}</p>
      </div>`;

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
