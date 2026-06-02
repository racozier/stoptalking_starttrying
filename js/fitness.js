window.Fitness = {
  _filter: 'all',
  _expandedWorkouts: new Set(),
  _stravaActivities: [],
  _leafletMaps: {},

  async init() {
    document.querySelectorAll('.fitness-filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.fitness-filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this._filter = btn.dataset.filter;
        this.renderFeed();
      });
    });
  },

  async render() {
    await this.renderWeeklySummary();
    await this.renderFeed();
  },

  async renderWeeklySummary() {
    const weekDates = App.getWeekDates();
    const [workouts, runs, allWeight] = await Promise.all([
      window.db.workouts.getAll(),
      window.db.runs.getAll(),
      window.db.weight.getRecent(14),
    ]);

    const thisWorkouts = workouts.filter((w) => weekDates.some((d) => w.date.startsWith(d)));
    const thisRuns = runs.filter((r) => weekDates.some((d) => r.date.startsWith(d)));
    const thisDist = thisRuns.reduce((s, r) => s + r.distance, 0);

    let weightDelta = null;
    if (allWeight.length >= 2) {
      const sorted = [...allWeight].sort((a, b) => new Date(a.date) - new Date(b.date));
      const start = sorted[0]?.value;
      const end = sorted[sorted.length - 1]?.value;
      weightDelta = end - start;
    }

    const el = document.getElementById('fitness-weekly-summary');
    if (el) {
      const wStr = weightDelta !== null
        ? `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg`
        : '--';
      el.textContent = `${thisWorkouts.length} workouts  •  ${thisDist.toFixed(1)} km  •  ${wStr}`;
    }
  },

  async renderFeed() {
    const container = document.getElementById('fitness-feed');
    if (!container) return;

    const [workouts, runs] = await Promise.all([
      window.db.workouts.getAll(),
      window.db.runs.getAll(),
    ]);

    let items = [];
    if (this._filter === 'all' || this._filter === 'workouts') {
      items.push(...workouts.map((w) => ({ ...w, _type: 'workout' })));
    }
    if (this._filter === 'all' || this._filter === 'runs') {
      items.push(...runs.map((r) => ({ ...r, _type: 'run' })));
    }
    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No activities yet.</p><p class="sub">Log a workout or run to get started.</p></div>';
      return;
    }

    container.innerHTML = items.map((item) =>
      item._type === 'workout' ? this.renderWorkoutCard(item) : this.renderRunCard(item)
    ).join('');

    // Initialise Leaflet maps for runs with polylines
    runs.filter((r) => r.polyline && r.polyline.length > 0).forEach((r) => {
      setTimeout(() => this.initRunMap(r), 0);
    });

    // Expand/collapse handlers
    container.querySelectorAll('.workout-expand-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = Number(btn.dataset.id);
        const detail = document.getElementById(`workout-detail-${id}`);
        if (detail) {
          const open = detail.classList.toggle('open');
          btn.textContent = open ? 'View Less ‹' : 'View Full Workout ›';
          this._expandedWorkouts[open ? 'add' : 'delete'](id);
        }
      });
    });
  },

  renderWorkoutCard(w) {
    const date = new Date(w.date);
    const dateLabel = App.formatDate(w.date, { relative: true });
    const timeLabel = App.formatTime(w.date);
    const durH = Math.floor((w.durationMinutes || 0) / 60);
    const durM = (w.durationMinutes || 0) % 60;
    const durStr = durH > 0 ? `${durH}:${String(durM).padStart(2, '0')}:00` : `${durM}m`;

    const previewExercises = (w.exercises || []).slice(0, 3);

    return `
    <div class="activity-card workout-card" data-id="${w.id}">
      <div class="activity-card-header">
        <div class="activity-icon-wrap icon-workout"><i data-lucide="dumbbell" style="width:18px;height:18px;stroke:#C084FC;fill:none"></i></div>
        <div class="activity-meta">
          <div class="activity-date-label">${dateLabel} · ${timeLabel}</div>
          <div class="activity-title">${App.escapeHtml(w.name)}</div>
        </div>
        <div class="activity-menu" onclick="Fitness.showWorkoutMenu(${w.id})">···</div>
      </div>
      <div class="workout-stats-row">
        <div class="stat-col"><strong>${w.setCount || 0}</strong><span>Sets</span></div>
        <div class="stat-divider"></div>
        <div class="stat-col"><strong>${w.exerciseCount || 0}</strong><span>Exercises</span></div>
        <div class="stat-divider"></div>
        <div class="stat-col"><strong>${durStr}</strong><span>Duration</span></div>
      </div>
      <div class="exercise-preview">
        ${previewExercises.map((ex) => this.renderExerciseRow(ex)).join('')}
      </div>
      <div class="workout-detail" id="workout-detail-${w.id}">
        ${(w.exercises || []).slice(3).map((ex) => this.renderExerciseRow(ex)).join('')}
      </div>
      ${(w.exercises || []).length > 3 ? `
        <button class="workout-expand-btn link-btn" data-id="${w.id}">View Full Workout ›</button>
      ` : ''}
    </div>`;
  },

  renderExerciseRow(ex) {
    const sets = (ex.sets || []).map((s) =>
      s.weight > 0 ? `${s.weight} kg × ${s.reps}` : `BW × ${s.reps}`
    ).join('<br>');

    return `
    <div class="exercise-row">
      <div class="exercise-name">${App.escapeHtml(ex.name)}</div>
      <div class="exercise-sets">${sets}</div>
    </div>`;
  },

  renderRunCard(r) {
    const dateLabel = App.formatDate(r.date, { relative: true });
    const timeLabel = App.formatTime(r.date);
    const hasMap = r.polyline && r.polyline.length > 0;

    return `
    <div class="activity-card run-card" data-id="${r.id}">
      <div class="activity-card-header">
        <div class="activity-icon-wrap icon-run"><i data-lucide="footprints" style="width:18px;height:18px;stroke:#38BDF8;fill:none"></i></div>
        <div class="activity-meta">
          <div class="activity-date-label">${dateLabel} · ${timeLabel}${r.temp ? ` · ${r.temp}°C` : ''}</div>
          <div class="activity-title run-title">${App.escapeHtml(r.name)}</div>
        </div>
        <div class="activity-menu" onclick="Fitness.showRunMenu(${r.id})">···</div>
      </div>
      <div class="run-stats-row">
        <div class="run-stat-col">${r.distance} km<span>Distance</span></div>
        <div class="run-stat-col">${App.formatDuration(r.durationSeconds)}<span>Time</span></div>
        <div class="run-stat-col">${r.paceFormatted} /km<span>Avg Pace</span></div>
        <div class="run-stat-col">${r.calories || '--'}<span>Calories</span></div>
      </div>
      ${hasMap
        ? `<div class="run-map" id="run-map-${r.id}"></div>`
        : `<div class="run-map-placeholder"><span>No route data</span></div>`
      }
      ${(r.elevation || r.avgHR) ? `<div class="run-map-stats">
        ${r.elevation ? `<span>↑ ${r.elevation} m elev</span>` : ''}
        ${r.avgHR ? `<span>❤ ${r.avgHR} bpm avg</span>` : ''}
      </div>` : ''}
      ${r.notes ? `<div class="activity-notes">${App.escapeHtml(r.notes)}</div>` : ''}
    </div>`;
  },

  initRunMap(run) {
    const mapEl = document.getElementById(`run-map-${run.id}`);
    if (!mapEl || !run.polyline || this._leafletMaps[run.id]) return;
    const coords = run.polyline;
    const map = L.map(mapEl, { zoomControl: false, dragging: false, scrollWheelZoom: false, attributionControl: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 18 }).addTo(map);
    const polyline = L.polyline(coords, { color: '#38BDF8', weight: 4 }).addTo(map);
    map.fitBounds(polyline.getBounds(), { padding: [10, 10] });
    this._leafletMaps[run.id] = map;
  },

  showWorkoutMenu(id) { /* TODO: edit/delete */ App.showToast('Edit coming soon.', 'info'); },
  showRunMenu(id) { App.showToast('Edit coming soon.', 'info'); },

  // ─── Log Workout Modal ──────────────────────────────────────────────────

  async openLogWorkoutModal() {
    const modal = document.getElementById('modal-log-workout');
    if (!modal) return;
    this._editWorkoutId = null;
    // Reset title in case it was changed by edit mode
    const h3 = modal.querySelector('.modal-header h3');
    if (h3) h3.textContent = 'Log Workout';

    // Populate quick-add exercise chips from history
    const allWorkouts = await window.db.workouts.getAll();
    const exerciseFreq = {};
    allWorkouts.forEach((w) => (w.exercises || []).forEach((ex) => {
      exerciseFreq[ex.name] = (exerciseFreq[ex.name] || 0) + 1;
    }));
    const topExercises = Object.entries(exerciseFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);

    const chipsContainer = modal.querySelector('.quick-add-chips');
    if (chipsContainer) {
      chipsContainer.innerHTML = topExercises.map((name) =>
        `<button class="chip" onclick="Fitness.quickAddExercise('${App.escapeHtml(name)}')">${App.escapeHtml(name)}</button>`
      ).join('');
    }

    // Reset form
    modal.querySelector('#workout-name-input').value = '';
    modal.querySelector('#workout-date-input').value = new Date().toISOString().slice(0, 16);
    modal.querySelector('#workout-notes-input').value = '';
    modal.querySelector('#workout-exercises-list').innerHTML = '';

    // Add one empty exercise to start
    this.addExerciseRow();

    App.openModal('modal-log-workout');
  },

  _editWorkoutId: null,

  async openEditWorkoutModal(id) {
    const w = await window.db.workouts.get(id);
    if (!w) return;
    await this.openLogWorkoutModal(); // sets up chips, clears form, opens modal
    // Now pre-fill with existing data
    this._editWorkoutId = id;
    const modal = document.getElementById('modal-log-workout');
    if (!modal) return;
    modal.querySelector('#workout-name-input').value = w.name || '';
    modal.querySelector('#workout-date-input').value = new Date(w.date).toISOString().slice(0, 16);
    modal.querySelector('#workout-notes-input').value = w.notes || '';
    // Replace the empty exercise row with existing exercises
    modal.querySelector('#workout-exercises-list').innerHTML = '';
    (w.exercises || []).forEach((ex) => {
      this.addExerciseRow(ex.name);
      // Fill in the sets that were added (last exercise entry)
      const entries = modal.querySelectorAll('#workout-exercises-list .exercise-entry');
      const entry = entries[entries.length - 1];
      const eid = entry?.dataset.eid;
      if (!eid) return;
      // Remove the default empty set row
      entry.querySelectorAll('.set-row').forEach((r) => r.remove());
      (ex.sets || []).forEach((set) => {
        this.addSetRow(Number(eid));
        const setsList = document.getElementById(`sets-list-${eid}`);
        if (!setsList) return;
        const rows = setsList.querySelectorAll('.set-row');
        const lastRow = rows[rows.length - 1];
        if (lastRow) {
          lastRow.querySelector('.set-weight').value = set.weight;
          lastRow.querySelector('.set-reps').value = set.reps;
        }
      });
    });
    // Update modal title to show editing
    const h3 = modal.querySelector('.modal-header h3');
    if (h3) h3.textContent = 'Edit Workout';
  },

  _exerciseCounter: 0,

  addExerciseRow(name = '') {
    const id = ++this._exerciseCounter;
    const list = document.getElementById('workout-exercises-list');
    if (!list) return;
    const div = document.createElement('div');
    div.className = 'exercise-entry';
    div.dataset.eid = id;
    div.innerHTML = `
      <div class="exercise-entry-header">
        <input type="text" class="exercise-name-input" placeholder="Exercise name" value="${App.escapeHtml(name)}" />
        <button class="icon-btn danger-btn" onclick="this.closest('.exercise-entry').remove()">✕</button>
      </div>
      <div class="sets-list" id="sets-list-${id}">
        <div class="set-row-header"><span>Set</span><span>kg</span><span>Reps</span><span></span></div>
      </div>
      <button class="link-btn add-set-btn" onclick="Fitness.addSetRow(${id})">+ Add Set</button>
    `;
    list.appendChild(div);
    this.addSetRow(id);
  },

  _setCounters: {},
  addSetRow(exerciseId) {
    const list = document.getElementById(`sets-list-${exerciseId}`);
    if (!list) return;
    this._setCounters[exerciseId] = (this._setCounters[exerciseId] || 0) + 1;
    const setNum = this._setCounters[exerciseId];
    const row = document.createElement('div');
    row.className = 'set-row';
    row.innerHTML = `
      <span class="set-number">${setNum}</span>
      <input type="number" class="set-weight" placeholder="0" min="0" step="0.5" />
      <input type="number" class="set-reps" placeholder="0" min="0" step="1" />
      <button class="icon-btn" onclick="this.closest('.set-row').remove()">✕</button>
    `;
    list.appendChild(row);
  },

  quickAddExercise(name) {
    this.addExerciseRow(name);
  },

  async saveWorkout() {
    const name = document.getElementById('workout-name-input')?.value.trim() || 'Workout';
    const dateVal = document.getElementById('workout-date-input')?.value;
    const notes = document.getElementById('workout-notes-input')?.value.trim() || '';

    const entries = document.querySelectorAll('#workout-exercises-list .exercise-entry');
    const exercises = [];
    entries.forEach((entry) => {
      const exName = entry.querySelector('.exercise-name-input')?.value.trim();
      if (!exName) return;
      const setRows = entry.querySelectorAll('.set-row');
      const sets = [];
      setRows.forEach((row) => {
        const weight = parseFloat(row.querySelector('.set-weight')?.value || 0) || 0;
        const reps = parseInt(row.querySelector('.set-reps')?.value || 0) || 0;
        if (reps > 0) sets.push({ weight, reps });
      });
      if (sets.length > 0) exercises.push({ name: exName, sets });
    });

    if (exercises.length === 0) { App.showToast('Add at least one exercise with sets.', 'error'); return; }

    const totalVolume = exercises.reduce((sum, ex) => sum + ex.sets.reduce((s2, set) => s2 + set.weight * set.reps, 0), 0);
    const setCount = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

    if (this._editWorkoutId) {
      const existing = await window.db.workouts.get(this._editWorkoutId);
      if (existing) {
        await window.db.workouts.update({ ...existing, name, exercises, totalVolume, setCount, exerciseCount: exercises.length, notes, date: dateVal ? new Date(dateVal).toISOString() : existing.date });
      }
      this._editWorkoutId = null;
      App.closeAllModals();
      App.showToast('Workout updated!', 'success');
    } else {
      await window.db.workouts.add({
        date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
        name, exercises, totalVolume, setCount, exerciseCount: exercises.length,
        durationMinutes: null, notes,
      });
      App.closeAllModals();
      App.showToast('Workout saved!', 'success');
    }
    if (App.currentTab === 'fitness') await Fitness.render();
    else if (App.currentTab === 'dashboard') await Dashboard.render();
  },

  // ─── Log Run Modal ──────────────────────────────────────────────────────

  async openLogRunModal() {
    const modal = document.getElementById('modal-log-run');
    if (!modal) return;
    // Default to manual tab
    this.switchRunTab('manual');
    modal.querySelector('#run-date-input').value = new Date().toISOString().slice(0, 16);
    modal.querySelector('#run-distance-input').value = '';
    modal.querySelector('#run-time-input').value = '';
    modal.querySelector('#run-calories-input').value = '';
    modal.querySelector('#run-elevation-input').value = '';
    modal.querySelector('#run-name-input').value = '';

    // Check if Strava is connected
    const tokens = await window.db.strava.getTokens();
    const stravaConnected = modal.querySelector('.strava-connected');
    const stravaDisconnected = modal.querySelector('.strava-disconnected');
    if (stravaConnected) stravaConnected.style.display = tokens ? 'block' : 'none';
    if (stravaDisconnected) stravaDisconnected.style.display = tokens ? 'none' : 'block';

    if (tokens) {
      const syncStatus = modal.querySelector('#strava-sync-status');
      if (syncStatus) {
        syncStatus.textContent = tokens.lastSync
          ? `Last synced ${App.formatDate(tokens.lastSync, { relative: true })}`
          : 'Never synced';
      }
    }

    App.openModal('modal-log-run');
  },

  switchRunTab(tab) {
    const modal = document.getElementById('modal-log-run');
    if (!modal) return;
    modal.querySelectorAll('.run-tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.runTab === tab));
    modal.querySelectorAll('.run-tab-pane').forEach((p) => p.classList.toggle('active', p.dataset.runPane === tab));
  },

  updatePacePreview() {
    const dist = parseFloat(document.getElementById('run-distance-input')?.value);
    const timeStr = document.getElementById('run-time-input')?.value;
    const paceEl = document.getElementById('run-pace-preview');
    if (!paceEl) return;
    if (!dist || !timeStr) { paceEl.textContent = '--:-- /km'; return; }
    const [mins, secs] = timeStr.split(':').map(Number);
    if (isNaN(mins)) { paceEl.textContent = '--:-- /km'; return; }
    const totalSecs = (mins || 0) * 60 + (secs || 0);
    const paceTotal = totalSecs / dist;
    const pm = Math.floor(paceTotal / 60);
    const ps = Math.round(paceTotal % 60);
    paceEl.textContent = `${pm}:${String(ps).padStart(2, '0')} /km`;
  },

  async saveManualRun() {
    const name = document.getElementById('run-name-input')?.value.trim() || 'Run';
    const dateVal = document.getElementById('run-date-input')?.value;
    const dist = parseFloat(document.getElementById('run-distance-input')?.value);
    const timeStr = document.getElementById('run-time-input')?.value;
    const cal = parseInt(document.getElementById('run-calories-input')?.value) || null;
    const elev = parseInt(document.getElementById('run-elevation-input')?.value) || null;
    const notes = document.getElementById('run-notes-input')?.value.trim() || '';

    if (!dist || dist <= 0) { App.showToast('Enter a valid distance.', 'error'); return; }
    if (!timeStr) { App.showToast('Enter run time.', 'error'); return; }

    const [mins, secs] = timeStr.split(':').map(Number);
    const totalSecs = (mins || 0) * 60 + (secs || 0);
    if (totalSecs <= 0) { App.showToast('Enter a valid time.', 'error'); return; }

    const paceSecsPerKm = totalSecs / dist;
    const paceMin = Math.floor(paceSecsPerKm / 60);
    const paceSec = Math.round(paceSecsPerKm % 60);

    await window.db.runs.add({
      date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
      name,
      distance: dist,
      durationSeconds: totalSecs,
      paceSecsPerKm,
      paceFormatted: `${paceMin}:${String(paceSec).padStart(2, '0')}`,
      calories: cal,
      elevation: elev,
      avgHR: null,
      polyline: null,
      source: 'manual',
      notes,
    });

    App.closeAllModals();
    App.showToast('Run logged!', 'success');
    if (App.currentTab === 'fitness') await Fitness.render();
    else if (App.currentTab === 'dashboard') await Dashboard.render();
  },

  async loadStravaActivities() {
    const btn = document.getElementById('strava-load-btn');
    if (btn) btn.disabled = true;
    try {
      App.showToast('Fetching from Strava...', 'info');
      const activities = await Strava.fetchActivities(1, 20);
      this._stravaActivities = activities.filter((a) => a.type === 'Run');
      this.renderStravaList();
    } catch (e) {
      App.showToast('Failed to load Strava activities: ' + e.message, 'error');
    }
    if (btn) btn.disabled = false;
  },

  renderStravaList() {
    const container = document.getElementById('strava-activities-list');
    if (!container) return;
    if (this._stravaActivities.length === 0) {
      container.innerHTML = '<p class="sub">No recent Strava runs found.</p>';
      return;
    }
    container.innerHTML = this._stravaActivities.map((act) => `
      <label class="strava-activity-item">
        <input type="checkbox" value="${act.id}" class="strava-checkbox" />
        <div>
          <strong>${App.escapeHtml(act.name)}</strong>
          <span class="sub"> · ${(act.distance / 1000).toFixed(2)} km · ${App.formatDate(act.start_date_local, { relative: true })}</span>
        </div>
      </label>
    `).join('');
  },

  async importSelectedStrava() {
    const checked = document.querySelectorAll('.strava-checkbox:checked');
    if (checked.length === 0) { App.showToast('Select at least one activity.', 'error'); return; }
    const toImport = this._stravaActivities.filter((a) =>
      [...checked].some((c) => c.value === String(a.id))
    );
    const btn = document.getElementById('strava-import-btn');
    if (btn) btn.disabled = true;
    App.showToast('Importing...', 'info');
    const count = await Strava.importActivities(toImport);
    App.showToast(`Imported ${count} run${count !== 1 ? 's' : ''}!`, 'success');
    App.closeAllModals();
    if (App.currentTab === 'fitness') await Fitness.render();
    if (btn) btn.disabled = false;
  },
};

window.Fitness = Fitness;

// Expose helpers to HTML
window.FitnessAddExercise = () => Fitness.addExerciseRow();
window.FitnessSaveWorkout = () => Fitness.saveWorkout();
window.FitnessSaveRun = () => Fitness.saveManualRun();
window.FitnessSwitchRunTab = (t) => Fitness.switchRunTab(t);
window.FitnessUpdatePace = () => Fitness.updatePacePreview();
window.FitnessLoadStrava = () => Fitness.loadStravaActivities();
window.FitnessImportStrava = () => Fitness.importSelectedStrava();
window.FitnessConnectStrava = () => Strava.startOAuth();
