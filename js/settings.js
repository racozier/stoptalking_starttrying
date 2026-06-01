window.SettingsModule = {
  async init() {},

  async render() {
    await this.loadSettings();
    await this.renderStravaStatus();
  },

  async loadSettings() {
    const settings = await window.db.settings.getAll();

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('settings-name', settings.displayName || 'Richie');
    set('settings-target-weight', settings.targetWeight || '');
    set('settings-degree-credits', settings.degreeCreditHours || 120);
    set('settings-term-name', settings.currentTermName || '');
    set('settings-term-end', settings.currentTermEnd || '');

    // Highlight active theme swatch
    const theme = settings.theme || 'dark';
    document.querySelectorAll('.theme-swatch').forEach((s) => {
      s.classList.toggle('active', s.dataset.theme === theme);
    });

    // Show "Clear Sample Data" if sample data is loaded
    const clearBtn = document.getElementById('clear-sample-data-btn');
    if (clearBtn) clearBtn.style.display = settings.sampleDataLoaded ? 'flex' : 'none';
  },

  async saveSettings() {
    const get = (id) => document.getElementById(id)?.value || '';
    await window.db.settings.set('displayName', get('settings-name') || 'Richie');
    await window.db.settings.set('targetWeight', parseFloat(get('settings-target-weight')) || null);
    await window.db.settings.set('degreeCreditHours', parseInt(get('settings-degree-credits')) || 120);
    await window.db.settings.set('currentTermName', get('settings-term-name'));
    await window.db.settings.set('currentTermEnd', get('settings-term-end'));
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
window.SettingsSave = () => SettingsModule.saveSettings();
window.SettingsSetTheme = (t) => SettingsModule.setTheme(t);
window.SettingsDisconnectStrava = () => SettingsModule.disconnectStrava();
window.SettingsExport = () => SettingsModule.exportData();
window.SettingsTriggerImport = () => SettingsModule.triggerImport();
window.SettingsHandleImport = (input) => SettingsModule.handleImport(input);
window.SettingsClearSampleData = () => SettingsModule.clearSampleData();
