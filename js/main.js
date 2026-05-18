'use strict';

/* =====================================================
   main.js — Menu navigation, character roster,
   match setup. Runs on index.html only.
   ===================================================== */

const App = {
  mode: '1v1',
  selectedFormat: 'rounds',
  selectedOpponent: null,
  selectedPartner: null,

  // ── Screen navigation ──────────────────────────────
  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
  },

  startModeSelect(mode) {
    this.mode = mode;
    this.selectedOpponent = null;
    this.selectedPartner = null;

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
        <div class="card-name">${char.name === 'TBD' ? 'Coming Soon' : char.name}</div>
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

    if (this.mode === 'teams') {
      this._showPartnerSelect();
    } else {
      this._showMatchOverlay(char);
    }
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

  // ── Match overlay ──────────────────────────────────
  _showMatchOverlay(opponent) {
    const overlay = document.getElementById('match-overlay');
    if (!overlay) return;

    const img = document.getElementById('overlay-npc-img');
    img.innerHTML = `<img src="assets/characters/${opponent.portraitFile}" alt="${opponent.name}" onerror="this.src='assets/characters/silhouette.svg'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;

    document.getElementById('overlay-npc-name').textContent =
      opponent.name === 'TBD' ? `Level ${opponent.level}` : opponent.name;

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

  // ── Init ───────────────────────────────────────────
  init() {
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

    this.showScreen('screen-menu');
  },
};

App.init();
