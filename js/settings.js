window.SettingsModule = {
  async init() {},

  async render() {
    await this.loadSettings();
  },

  async loadSettings() {
    const settings = await window.db.settings.getAll();

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('settings-name', settings.displayName || 'Richie');
    set('settings-term-name', settings.currentTermName || '');
    set('settings-timezone', settings.timezone || 'Europe/Warsaw');
    set('settings-units', settings.units || 'metric');

    // Highlight active theme swatch
    const theme = settings.theme || 'dark';
    document.querySelectorAll('.theme-swatch').forEach((s) => {
      s.classList.toggle('active', s.dataset.theme === theme);
    });

    // Show PIN status
    const pin = localStorage.getItem('st2_pin');
    const pinStatusEl = document.getElementById('pin-status-text');
    const pinManageBtn = document.getElementById('pin-manage-btn');
    if (pinStatusEl) pinStatusEl.textContent = pin ? 'PIN is set' : 'Not set';
    if (pinManageBtn) pinManageBtn.textContent = pin ? 'Change / Remove' : 'Set PIN';

    // Show "Clear Sample Data" if sample data is loaded
    const clearBtn = document.getElementById('clear-sample-data-btn');
    if (clearBtn) clearBtn.style.display = settings.sampleDataLoaded ? 'flex' : 'none';
  },

  selectTerm(value) {
    const termEndDates = {
      'Term 1': '2026-04-30',
      'Term 2': '2026-10-31',
      'Term 3': '2027-04-30',
    };
    const end = termEndDates[value];
    if (end) {
      const el = document.getElementById('settings-term-end');
      if (el) el.value = end;
    }
  },

  async saveSettings() {
    const get = (id) => document.getElementById(id)?.value || '';
    const termEndDates = { 'Term 1': '2026-04-30', 'Term 2': '2026-10-31', 'Term 3': '2027-04-30' };
    const termName = get('settings-term-name');
    await window.db.settings.set('displayName', get('settings-name') || 'Richie');
    await window.db.settings.set('currentTermName', termName);
    await window.db.settings.set('currentTermEnd', termEndDates[termName] || '');
    const tz = get('settings-timezone') || 'Europe/Warsaw';
    await window.db.settings.set('timezone', tz);
    App._timezone = tz;
    const units = get('settings-units') || 'metric';
    await window.db.settings.set('units', units);
    App._units = units;
    App.showToast('Settings saved!', 'success');
    App.updateGreeting();
    if (App.currentTab === 'study') await Study.render();
  },

  async setTheme(theme) {
    await window.db.settings.set('theme', theme);
    App.applyTheme(theme);
    document.querySelectorAll('.theme-swatch').forEach((s) => {
      s.classList.toggle('active', s.dataset.theme === theme);
    });
  },

  managePin() {
    const pin = localStorage.getItem('st2_pin');
    const titleEl = document.getElementById('pin-setup-title');
    const currentRow = document.getElementById('pin-current-row');
    const removeBtn = document.getElementById('pin-remove-btn');
    if (titleEl) titleEl.textContent = pin ? 'Change PIN' : 'Set PIN';
    if (currentRow) currentRow.style.display = pin ? 'block' : 'none';
    if (removeBtn) removeBtn.style.display = pin ? 'flex' : 'none';
    ['pin-current', 'pin-new', 'pin-confirm'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const err = document.getElementById('pin-setup-error');
    if (err) err.style.display = 'none';
    App.openModal('modal-pin-setup');
  },

  savePinSetup() {
    const existing = localStorage.getItem('st2_pin');
    const currentEl = document.getElementById('pin-current');
    const newEl = document.getElementById('pin-new');
    const confirmEl = document.getElementById('pin-confirm');
    const errEl = document.getElementById('pin-setup-error');
    const showErr = (msg) => { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } };
    if (existing && currentEl?.value !== existing) { showErr('Current PIN is incorrect.'); return; }
    const newPin = newEl?.value || '';
    if (newPin.length < 4) { showErr('PIN must be at least 4 characters.'); return; }
    if (newPin !== (confirmEl?.value || '')) { showErr('PINs do not match.'); return; }
    localStorage.setItem('st2_pin', newPin);
    App.closeAllModals();
    App.showToast('PIN saved.', 'success');
    this.loadSettings();
  },

  async removePinConfirm() {
    const existing = localStorage.getItem('st2_pin');
    const currentEl = document.getElementById('pin-current');
    const errEl = document.getElementById('pin-setup-error');
    if (existing && (currentEl?.value || '') !== existing) {
      if (errEl) { errEl.textContent = 'Current PIN is incorrect.'; errEl.style.display = 'block'; }
      return;
    }
    if (!confirm('Remove PIN? All locked notes will be unlocked.')) return;
    localStorage.removeItem('st2_pin');
    const notes = await window.db.notes.getAll();
    for (const n of notes.filter((x) => x.locked)) {
      await window.db.notes.update({ ...n, locked: false });
    }
    App.closeAllModals();
    App.showToast('PIN removed.', 'success');
    this.loadSettings();
  },

  async renderStravaStatus() {
    const tokens = await window.db.strava.getTokens();
    const statusEl = document.getElementById('strava-connection-status');
    const disconnectBtn = document.getElementById('strava-disconnect-btn');
    const connectBtn = document.getElementById('strava-connect-btn');

    if (tokens) {
      if (statusEl) {
        statusEl.innerHTML = `<span class="status-connected">● Connected</span>${tokens.athleteName ? ` as ${App.escapeHtml(tokens.athleteName)}` : ''}`;
        if (tokens.lastSync) statusEl.innerHTML += `<br><span class="sub">Last sync: ${App.formatDate(tokens.lastSync, { relative: true })}</span>`;
      }
      if (disconnectBtn) disconnectBtn.style.display = 'flex';
      if (connectBtn) connectBtn.style.display = 'none';
    } else {
      if (statusEl) statusEl.innerHTML = '<span class="status-disconnected">● Not connected</span>';
      if (disconnectBtn) disconnectBtn.style.display = 'none';
      if (connectBtn) connectBtn.style.display = 'flex';
    }
  },

  async disconnectStrava() {
    if (!confirm('Disconnect Strava? Your imported runs will be kept.')) return;
    await Strava.disconnect();
    await this.renderStravaStatus();
  },

  async exportData() {
    try {
      const data = await window.db.exportAll();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `st2-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      App.showToast('Data exported!', 'success');
    } catch (e) {
      App.showToast('Export failed: ' + e.message, 'error');
    }
  },

  triggerImport() {
    document.getElementById('import-file-input')?.click();
  },

  async handleImport(input) {
    const file = input.files?.[0];
    if (!file) return;
    if (!confirm('Import data? This will overwrite your existing data. Continue?')) { input.value = ''; return; }
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await window.db.importAll(data);
      App.showToast('Data imported! Reloading…', 'success');
      setTimeout(() => location.reload(), 1500);
    } catch (e) {
      App.showToast('Import failed: ' + e.message, 'error');
    }
    input.value = '';
  },

  async clearSampleData() {
    if (!confirm('Clear all sample data? This will delete everything and cannot be undone.')) return;
    // Delete all records and reset the flag
    const [allW, allWo, allR, allS, allC, allN] = await Promise.all([
      window.db.weight.getAll(),
      window.db.workouts.getAll(),
      window.db.runs.getAll(),
      window.db.study.getAll(),
      window.db.classes.getAll(),
      window.db.notes.getAll(),
    ]);

    // Delete all
    for (const item of allW) await window.db.weight.delete(item.id);
    for (const item of allWo) await window.db.workouts.delete(item.id);
    for (const item of allR) await window.db.runs.delete(item.id);
    for (const item of allS) await window.db.study.delete(item.id);
    for (const item of allC) await window.db.classes.delete(item.id);
    for (const item of allN) await window.db.notes.delete(item.id);
    await window.db.settings.set('sampleDataLoaded', false);

    App.showToast('Sample data cleared!', 'success');
    const clearBtn = document.getElementById('clear-sample-data-btn');
    if (clearBtn) clearBtn.style.display = 'none';
    if (App.currentTab === 'dashboard') await Dashboard.render();
  },
};

window.SettingsModule = SettingsModule;
window.SettingsManagePin = () => SettingsModule.managePin();
window.SettingsSavePinSetup = () => SettingsModule.savePinSetup();
window.SettingsRemovePin = () => SettingsModule.removePinConfirm();
window.SettingsSave = () => SettingsModule.saveSettings();
window.SettingsSetTheme = (t) => SettingsModule.setTheme(t);
window.SettingsDisconnectStrava = () => SettingsModule.disconnectStrava();
window.SettingsSelectTerm = (v) => SettingsModule.selectTerm(v);
window.SettingsExport = () => SettingsModule.exportData();
window.SettingsTriggerImport = () => SettingsModule.triggerImport();
window.SettingsHandleImport = (input) => SettingsModule.handleImport(input);
window.SettingsClearSampleData = () => SettingsModule.clearSampleData();
