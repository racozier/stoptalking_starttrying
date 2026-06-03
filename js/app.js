window.App = {
  currentTab: 'dashboard',
  _tabModules: {},

  async init() {
    // Check for Strava OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.has('code') && params.has('state')) {
      await Strava.handleCallback(params.get('code'), params.get('state'));
      history.replaceState({}, '', window.location.pathname);
    }

    // Load and apply saved theme + timezone
    const theme = await window.db.settings.get('theme', 'dark');
    this.applyTheme(theme);
    this._timezone = await window.db.settings.get('timezone', 'Europe/Warsaw');
    this._units = await window.db.settings.get('units', 'metric');

    // Register tab modules
    this._tabModules = {
      dashboard: typeof Dashboard !== 'undefined' ? Dashboard : null,
      fitness: typeof Fitness !== 'undefined' ? Fitness : null,
      study: typeof Study !== 'undefined' ? Study : null,
      notes: typeof Notes !== 'undefined' ? Notes : null,
      settings: typeof SettingsModule !== 'undefined' ? SettingsModule : null,
    };

    // Update greeting
    this.updateGreeting();

    // Bottom nav wiring
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    // Activate initial tab
    await this.switchTab('dashboard');

    // Render Lucide icons in static HTML (nav, etc.)
    if (window.lucide) lucide.createIcons();

    // Close modals on backdrop click
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop')) {
        this.closeAllModals();
      }
    });

    // Keyboard: Escape closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAllModals();
    });
  },

  async switchTab(tab) {
    // Clear Polish accent and restore theme-color when leaving Study tab
    document.documentElement.removeAttribute('data-tab');
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const themeColors = { dark: '#2563EB', darker: '#3B82F6', light: '#1D4ED8', midnight: '#3B82F6' };
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = themeColors[theme] || '#2563EB';
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach((el) => el.classList.remove('active'));

    // Show/hide the app header — only on dashboard and settings
    const showHeader = tab === 'dashboard' || tab === 'settings';
    const appHeader = document.getElementById('app-header');
    if (appHeader) appHeader.style.display = showHeader ? '' : 'none';
    document.getElementById('app').classList.toggle('no-app-header', !showHeader);

    // Show target tab
    const tabEl = document.getElementById(`tab-${tab}`);
    const navEl = document.querySelector(`.nav-item[data-tab="${tab}"]`);
    if (!tabEl) return;
    tabEl.classList.add('active');
    if (navEl) navEl.classList.add('active');
    this.currentTab = tab;

    // Render the module
    const mod = this._tabModules[tab];
    if (mod) {
      try {
        if (!mod._initialized) {
          await mod.init();
          mod._initialized = true;
        }
        await mod.render();
        if (window.lucide) setTimeout(() => lucide.createIcons(), 10);
      } catch (e) {
        console.error(`Error rendering ${tab}:`, e);
      }
    }
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeColors = { dark: '#2563EB', darker: '#3B82F6', light: '#1D4ED8', midnight: '#3B82F6' };
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = themeColors[theme] || themeColors.dark;
  },

  updateGreeting() {
    const el = document.getElementById('greeting-text');
    const dateEl = document.getElementById('greeting-date');
    if (!el) return;
    const hour = new Date().getHours();
    let time = 'Good Morning';
    if (hour >= 12 && hour < 17) time = 'Good Afternoon';
    else if (hour >= 17) time = 'Good Evening';
    el.textContent = `${time}, Richie`;
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    // Flip greeting → motto after 3s, then cycle every 4s
    if (!this._greetingFlipStarted) {
      this._greetingFlipStarted = true;
      setTimeout(() => {
        const card = document.getElementById('greeting-flip');
        if (card) {
          card.classList.add('flipped');
          setInterval(() => card.classList.toggle('flipped'), 4000);
        }
      }, 3000);
    }
  },

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop.open').forEach((m) => {
      m.classList.remove('open');
    });
    document.body.style.overflow = '';
  },

  openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    const first = modal.querySelector('input, select, textarea');
    if (first) setTimeout(() => first.focus(), 100);
  },

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // Shared utility: format seconds as HH:MM:SS or MM:SS
  formatDuration(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  },

  formatMinutes(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  },

  formatDate(isoStr, opts = {}) {
    const d = new Date(isoStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (opts.relative) {
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
    }
    const tz = this._timezone || 'Europe/Warsaw';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: diffDays > 365 ? 'numeric' : undefined, timeZone: tz });
  },

  formatTime(isoStr) {
    const tz = this._timezone || 'Europe/Warsaw';
    return new Date(isoStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz });
  },

  formatWeight(kg) {
    if (this._units === 'imperial') return `${(kg * 2.20462).toFixed(1)} lbs`;
    return `${kg.toFixed(1)} kg`;
  },

  formatDistance(km) {
    if (this._units === 'imperial') return `${(km * 0.621371).toFixed(2)} mi`;
    return `${km.toFixed(2)} km`;
  },

  // Returns Mon–Sun dates for the current week
  getWeekDates() {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  },

  calc1RM(weight, reps) {
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30) * 2) / 2;
  },

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
