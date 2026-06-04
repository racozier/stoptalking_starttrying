window.Fitness = {
  _filter: 'all',
  _expandedWorkouts: new Set(),
  _stravaActivities: [],
  _leafletMaps: {},

  _defaultUpper: ['Bench Press', 'Incline DB Press', 'Shoulder Press', 'Lateral Raises', 'Pull-ups', 'Barbell Rows', 'Bicep Curls', 'Tricep Pushdowns'],
  _defaultLower: ['Squat', 'Deadlift', 'Romanian Deadlift', 'Leg Press', 'Lunges', 'Leg Curl', 'Calf Raises'],

  _loadQuickExercises() {
    try {
      const stored = JSON.parse(localStorage.getItem('st2_quick_exercises') || '{}');
      this._upperExercises = stored.upper || [...this._defaultUpper];
      this._lowerExercises = stored.lower || [...this._defaultLower];
    } catch (e) {
      this._upperExercises = [...this._defaultUpper];
      this._lowerExercises = [...this._defaultLower];
    }
  },

  _saveQuickExercises() {
    localStorage.setItem('st2_quick_exercises', JSON.stringify({ upper: this._upperExercises, lower: this._lowerExercises }));
  },

  _populateQuickDropdowns() {
    ['upper', 'lower'].forEach((type) => {
      const sel = document.getElementById(`quick-${type}-select`);
      if (!sel) return;
      const list = type === 'upper' ? this._upperExercises : this._lowerExercises;
      sel.innerHTML = `<option value="">Select…</option>` +
        list.map((e) => `<option value="${App.escapeHtml(e)}">${App.escapeHtml(e)}</option>`).join('') +
        `<option value="__add__">＋ Add to list…</option>`;
      sel.value = '';
    });
  },

  toggleManageList(type) {
    const panel = document.getElementById(`manage-${type}`);
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    if (isOpen) { panel.style.display = 'none'; return; }
    const list = type === 'upper' ? this._upperExercises : this._lowerExercises;
    panel.innerHTML = list.map((e, i) =>
      `<div class="workout-ex-manage-row">
        <span>${App.escapeHtml(e)}</span>
        <button class="workout-ex-manage-del" onclick="Fitness.removeFromList('${type}',${i})" title="Remove">✕</button>
      </div>`
    ).join('') || '<div style="font-size:0.75rem;color:var(--subtext);padding:4px 6px">No exercises yet</div>';
    panel.style.display = 'flex';
  },

  removeFromList(type, index) {
    const list = type === 'upper' ? this._upperExercises : this._lowerExercises;
    list.splice(index, 1);
    this._saveQuickExercises();
    this._populateQuickDropdowns();
    this.toggleManageList(type); // close
    this.toggleManageList(type); // re-open refreshed
  },

  quickAddFromSelect(type) {
    const sel = document.getElementById(`quick-${type}-select`);
    if (!sel || !sel.value) return;
    if (sel.value === '__add__') {
      const name = prompt(`New ${type === 'upper' ? 'upper' : 'lower'} body exercise:`);
      if (name?.trim()) {
        const list = type === 'upper' ? this._upperExercises : this._lowerExercises;
        if (!list.includes(name.trim())) { list.push(name.trim()); this._saveQuickExercises(); }
        this._populateQuickDropdowns();
        this.addExerciseRow(name.trim());
      }
      sel.value = '';
      return;
    }
    this.addExerciseRow(sel.value);
    sel.value = '';
  },

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

    // Destroy existing Leaflet maps so they re-initialise after innerHTML is replaced
    Object.values(this._leafletMaps).forEach((m) => { try { m.remove(); } catch (e) {} });
    this._leafletMaps = {};

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

    // Re-initialise Lucide icons for freshly injected HTML
    if (window.lucide) setTimeout(() => lucide.createIcons(), 0);

    // Initialise Leaflet maps for runs with polylines
    runs.filter((r) => r.polyline && r.polyline.length > 0).forEach((r) => {
      setTimeout(() => this.initRunMap(r), 0);
    });

    // Expand/collapse handlers
    container.querySelectorAll('.workout-expand-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = Number(btn.dataset.id);
        const list = document.getElementById(`workout-detail-${id}`);
        if (list) {
          const open = list.classList.toggle('expanded');
          btn.textContent = open ? 'View Less ‹' : 'View Full Workout ›';
        }
      });
    });
  },

  renderWorkoutCard(w) {
    const dateLabel = App.formatDate(w.date, { relative: true });
    const timeLabel = App.formatTime(w.date);
    const durH = Math.floor((w.durationMinutes || 0) / 60);
    const durM = (w.durationMinutes || 0) % 60;
    const durStr = durH > 0 ? `${durH}:${String(durM).padStart(2, '0')}:00` : `${durM}m`;
    const allEx = w.exercises || [];

    return `
    <div class="activity-card workout-card" data-id="${w.id}">
      <div class="activity-card-header">
        <div class="activity-icon-wrap icon-workout"><i data-lucide="dumbbell" style="width:18px;height:18px;stroke:#FDA4AF;fill:none"></i></div>
        <div class="activity-meta">
          <div class="activity-date-label">${dateLabel} · ${timeLabel}</div>
          <div class="activity-title run-title">${App.escapeHtml(w.name)}</div>
        </div>
        <div class="activity-menu" onclick="Fitness.showActivityMenu('workout', ${w.id})">···</div>
      </div>
      <div class="run-stats-row">
        <div class="run-stat-col">${w.setCount || 0}<span>Sets</span></div>
        <div class="run-stat-col">${w.exerciseCount || 0}<span>Exercises</span></div>
        <div class="run-stat-col">${durStr}<span>Duration</span></div>
      </div>
      ${allEx.length > 0 ? `
      <div class="exercise-list" id="workout-detail-${w.id}">
        ${allEx.map((ex) => this.renderExerciseRow(ex, true)).join('')}
      </div>
      <button class="workout-expand-btn link-btn" data-id="${w.id}">View Full Workout ›</button>
      ` : ''}
      ${this.renderCardNotes('workout', w.id, w.notes)}
    </div>`;
  },

  renderExerciseRow(ex, hidden = false) {
    const sets = (ex.sets || []).map((s) =>
      `<div class="set-line">${s.weight > 0 ? `${s.weight} kg × ${s.reps}` : `BW × ${s.reps}`}</div>`
    ).join('');

    return `
    <div class="exercise-row${hidden ? ' ex-hidden' : ''}">
      <div class="exercise-name">${App.escapeHtml(ex.name)}</div>
      <div class="exercise-sets">${sets}</div>
    </div>`;
  },

  renderCardNotes(type, id, notes) {
    const hasNote = notes && notes.trim();
    return `
    <div class="card-notes-section" id="card-notes-${type}-${id}">
      <div class="card-notes-header">
        <button class="card-notes-toggle" onclick="Fitness.toggleCardNotes('${type}', ${id})">
          <span class="card-notes-label">${hasNote ? 'Notes' : 'Add note'}</span>
          <span class="card-notes-chevron">${hasNote ? '›' : '+'}</span>
        </button>
        ${hasNote ? `<button class="card-note-dots" onclick="Fitness.showNoteMenu(event,'${type}',${id})">···</button>` : ''}
      </div>
      <div class="card-notes-body" id="card-notes-body-${type}-${id}">
        ${hasNote ? `<div class="card-note-text" id="card-note-text-${type}-${id}">${App.escapeHtml(notes)}</div>` : ''}
      </div>
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
        <div class="activity-menu" onclick="Fitness.showActivityMenu('run', ${r.id})">···</div>
      </div>
      <div class="run-stats-row">
        <div class="run-stat-col">${r.distance} km<span>Distance</span></div>
        <div class="run-stat-col">${App.formatDuration(r.durationSeconds)}<span>Time</span></div>
        <div class="run-stat-col">${r.paceFormatted} /km<span>Avg Pace</span></div>
        <div class="run-stat-col">${r.calories || '--'}<span>Calories</span></div>
      </div>
      ${hasMap
        ? `<div class="run-map" id="run-map-${r.id}"></div>`
        : r.source !== 'manual' ? `<div class="run-map-placeholder"><span>No route data</span></div>` : ''
      }
      ${(r.elevation || r.avgHR) ? `<div class="run-map-stats">
        ${r.elevation ? `<span>↑ ${r.elevation} m elev</span>` : ''}
        ${r.avgHR ? `<span>❤ ${r.avgHR} bpm avg</span>` : ''}
      </div>` : ''}
      ${this.renderCardNotes('run', r.id, r.notes)}
    </div>`;
  },

  initRunMap(run) {
    const mapEl = document.getElementById(`run-map-${run.id}`);
    if (!mapEl || !run.polyline || this._leafletMaps[run.id]) return;
    const coords = run.polyline;
    const map = L.map(mapEl, { zoomControl: false, dragging: false, scrollWheelZoom: false, attributionControl: false });
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    L.tileLayer(tileUrl, { maxZoom: 18 }).addTo(map);
    const polyline = L.polyline(coords, { color: '#38BDF8', weight: 4 }).addTo(map);
    map.fitBounds(polyline.getBounds(), { padding: [10, 10] });
    this._leafletMaps[run.id] = map;
  },

  // ─── Activity action sheet ──────────────────────────────────────────────
  showActivityMenu(type, id) {
    document.getElementById('activity-action-sheet')?.remove();
    const sheet = document.createElement('div');
    sheet.id = 'activity-action-sheet';
    sheet.className = 'action-sheet-backdrop';
    sheet.innerHTML = `
      <div class="action-sheet">
        <button class="action-sheet-item" onclick="Fitness._menuAct('edit','${type}',${id})">Edit</button>
        <button class="action-sheet-item action-sheet-danger" onclick="Fitness._menuAct('delete','${type}',${id})">Delete</button>
        <button class="action-sheet-cancel" onclick="document.getElementById('activity-action-sheet').remove()">Cancel</button>
      </div>`;
    sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.remove(); });
    document.body.appendChild(sheet);
    requestAnimationFrame(() => sheet.classList.add('open'));
  },

  async _menuAct(action, type, id) {
    document.getElementById('activity-action-sheet')?.remove();
    if (action === 'edit') {
      if (type === 'workout') await this.openEditWorkoutModal(id);
      else await this.openEditRunModal(id);
    } else if (action === 'note') {
      this.openCardNoteFromMenu(type, id);
    } else if (action === 'delete') {
      if (!confirm(`Delete this ${type}?`)) return;
      if (type === 'workout') await window.db.workouts.delete(id);
      else await window.db.runs.delete(id);
      App.showToast(`${type === 'workout' ? 'Workout' : 'Run'} deleted.`, 'success');
      await this.render();
    }
  },

  openCardNoteFromMenu(type, id) {
    const body = document.getElementById(`card-notes-body-${type}-${id}`);
    if (!body) return;
    body.classList.add('open');
    this.editCardNote(type, id);
  },

  // ─── Card-level notes ──────────────────────────────────────────────────
  toggleCardNotes(type, id) {
    const body = document.getElementById(`card-notes-body-${type}-${id}`);
    const section = document.getElementById(`card-notes-${type}-${id}`);
    if (!body) return;
    const hasNote = !!document.getElementById(`card-note-text-${type}-${id}`);
    const inEdit = !!body.querySelector('.card-note-textarea');
    if (!hasNote && !inEdit) {
      body.classList.add('open');
      this.editCardNote(type, id);
      return;
    }
    const isOpen = body.classList.toggle('open');
    const chevron = section?.querySelector('.card-notes-chevron');
    if (chevron) chevron.style.transform = isOpen ? 'rotate(90deg)' : '';
  },

  showNoteMenu(e, type, id) {
    e.stopPropagation();
    document.getElementById('activity-action-sheet')?.remove();
    const sheet = document.createElement('div');
    sheet.id = 'activity-action-sheet';
    sheet.className = 'action-sheet-backdrop';
    sheet.innerHTML = `
      <div class="action-sheet">
        <button class="action-sheet-item" onclick="Fitness.editCardNote('${type}',${id});document.getElementById('activity-action-sheet').remove()">Edit Note</button>
        <button class="action-sheet-item action-sheet-danger" onclick="Fitness.deleteCardNote('${type}',${id});document.getElementById('activity-action-sheet').remove()">Delete Note</button>
        <button class="action-sheet-cancel" onclick="document.getElementById('activity-action-sheet').remove()">Cancel</button>
      </div>`;
    sheet.addEventListener('click', (ev) => { if (ev.target === sheet) sheet.remove(); });
    document.body.appendChild(sheet);
    requestAnimationFrame(() => sheet.classList.add('open'));
  },

  editCardNote(type, id) {
    const body = document.getElementById(`card-notes-body-${type}-${id}`);
    if (!body) return;
    body.classList.add('open');
    const existing = document.getElementById(`card-note-text-${type}-${id}`)?.textContent || '';
    body.dataset.origNote = existing;
    body.innerHTML = `
      <textarea class="card-note-textarea" id="card-note-input-${type}-${id}" rows="3" placeholder="Add a note...">${App.escapeHtml(existing)}</textarea>
      <div class="card-note-actions">
        <button class="card-note-btn" onclick="Fitness.saveCardNote('${type}', ${id})">Save</button>
        <button class="card-note-btn" onclick="Fitness.cancelCardNote('${type}', ${id})">Cancel</button>
      </div>`;
    setTimeout(() => document.getElementById(`card-note-input-${type}-${id}`)?.focus(), 50);
  },

  async saveCardNote(type, id) {
    const input = document.getElementById(`card-note-input-${type}-${id}`);
    if (!input) return;
    const notes = input.value.trim();
    const db = type === 'workout' ? window.db.workouts : window.db.runs;
    const existing = await db.get(id);
    if (existing) await db.update({ ...existing, notes });
    this._refreshNoteSection(type, id, notes);
    App.showToast('Note saved.', 'success');
  },

  async deleteCardNote(type, id) {
    const db = type === 'workout' ? window.db.workouts : window.db.runs;
    const existing = await db.get(id);
    if (existing) await db.update({ ...existing, notes: '' });
    this._refreshNoteSection(type, id, '');
    App.showToast('Note deleted.', 'success');
  },

  cancelCardNote(type, id) {
    const body = document.getElementById(`card-notes-body-${type}-${id}`);
    if (!body) return;
    const orig = body.dataset.origNote || '';
    this._refreshNoteSection(type, id, orig);
  },

  _refreshNoteSection(type, id, notes) {
    const body = document.getElementById(`card-notes-body-${type}-${id}`);
    const section = document.getElementById(`card-notes-${type}-${id}`);
    if (!body) return;
    const hasNote = !!(notes && notes.trim());
    body.classList.toggle('open', hasNote);
    body.innerHTML = hasNote
      ? `<div class="card-note-text" id="card-note-text-${type}-${id}">${App.escapeHtml(notes)}</div>`
      : '';
    if (section) {
      const header = section.querySelector('.card-notes-header');
      const label = section.querySelector('.card-notes-label');
      const chevron = section.querySelector('.card-notes-chevron');
      // Sync dots button
      section.querySelector('.card-note-dots')?.remove();
      if (hasNote && header) {
        const dots = document.createElement('button');
        dots.className = 'card-note-dots';
        dots.textContent = '···';
        dots.onclick = (e) => Fitness.showNoteMenu(e, type, id);
        header.appendChild(dots);
      }
      if (label) label.textContent = hasNote ? 'Notes' : 'Add note';
      if (chevron) { chevron.textContent = hasNote ? '›' : '+'; chevron.style.transform = hasNote ? 'rotate(90deg)' : ''; }
    }
  },

  // ─── Edit Run Modal ─────────────────────────────────────────────────────
  _editRunId: null,

  async openEditRunModal(id) {
    const r = await window.db.runs.get(id);
    if (!r) return;
    this._editRunId = id;
    await this.openLogRunModal();
    this.switchRunTab('manual');
    const modal = document.getElementById('modal-log-run');
    if (!modal) return;
    modal.querySelector('#run-date-input').value = new Date(r.date).toISOString().slice(0, 16);
    modal.querySelector('#run-distance-input').value = r.distance;
    const mins = Math.floor(r.durationSeconds / 60);
    const secs = r.durationSeconds % 60;
    modal.querySelector('#run-time-input').value = `${mins}:${String(secs).padStart(2, '0')}`;
    if (modal.querySelector('#run-calories-input')) modal.querySelector('#run-calories-input').value = r.calories || '';
    if (modal.querySelector('#run-elevation-input')) modal.querySelector('#run-elevation-input').value = r.elevation || '';
    modal.querySelector('#run-name-input').value = r.name || '';
    const h3 = modal.querySelector('.modal-header h3');
    if (h3) h3.textContent = 'Edit Run';
  },

  // ─── Log Workout Modal ──────────────────────────────────────────────────

  async openLogWorkoutModal() {
    const modal = document.getElementById('modal-log-workout');
    if (!modal) return;
    this._editWorkoutId = null;
    // Reset title in case it was changed by edit mode
    const h3 = modal.querySelector('.modal-header h3');
    if (h3) h3.textContent = 'Log Workout';

    // Reset form
    modal.querySelector('#workout-name-input').value = '';
    modal.querySelector('#workout-date-input').value = new Date().toISOString().slice(0, 16);
    modal.querySelector('#workout-notes-input').value = '';
    modal.querySelector('#workout-exercises-list').innerHTML = '';

    // Populate quick-add dropdowns
    this._loadQuickExercises();
    this._populateQuickDropdowns();

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
    this._editRunId = null;
    const h3 = modal.querySelector('.modal-header h3');
    if (h3) h3.textContent = 'Log Run';
    this.switchRunTab('gpx');
    this.resetGpx();
    modal.querySelector('#run-date-input').value = new Date().toISOString().slice(0, 16);
    modal.querySelector('#run-distance-input').value = '';
    modal.querySelector('#run-time-input').value = '';
    modal.querySelector('#run-calories-input').value = '';
    modal.querySelector('#run-elevation-input').value = '';
    modal.querySelector('#run-name-input').value = '';
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

    const runData = {
      date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
      name, distance: dist, durationSeconds: totalSecs,
      paceSecsPerKm, paceFormatted: `${paceMin}:${String(paceSec).padStart(2, '0')}`,
      calories: cal, elevation: elev, avgHR: null, polyline: null, source: 'manual', notes,
    };

    if (this._editRunId) {
      const existing = await window.db.runs.get(this._editRunId);
      if (existing) await window.db.runs.update({ ...existing, ...runData });
      this._editRunId = null;
      App.showToast('Run updated!', 'success');
    } else {
      await window.db.runs.add(runData);
      App.showToast('Run logged!', 'success');
    }

    App.closeAllModals();
    if (App.currentTab === 'fitness') await Fitness.render();
    else if (App.currentTab === 'dashboard') await Dashboard.render();
  },

  // ─── GPX Import ────────────────────────────────────────────────────────────
  _gpxData: null,

  _haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const toR = Math.PI / 180;
    const dLat = (lat2 - lat1) * toR;
    const dLon = (lon2 - lon1) * toR;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  _parseGpx(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Invalid GPX file — could not parse XML');

    const trkpts = [...doc.querySelectorAll('trkpt')];
    if (trkpts.length < 2) throw new Error('GPX file contains no track points');

    const points = trkpts.map((pt) => {
      const lat = parseFloat(pt.getAttribute('lat'));
      const lon = parseFloat(pt.getAttribute('lon'));
      const ele = parseFloat(pt.querySelector('ele')?.textContent) || 0;
      const time = pt.querySelector('time')?.textContent || null;
      const hrEl = pt.getElementsByTagNameNS('*', 'hr')[0] || pt.querySelector('hr');
      const hr = hrEl ? parseInt(hrEl.textContent) : null;
      return { lat, lon, ele, time, hr };
    });

    // Distance
    let dist = 0;
    for (let i = 1; i < points.length; i++) {
      dist += this._haversine(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
    }
    dist = Math.round(dist * 100) / 100;
    if (dist <= 0) throw new Error('Could not calculate distance — check track points');

    // Duration
    const t0 = points[0].time ? new Date(points[0].time) : null;
    const t1 = points[points.length - 1].time ? new Date(points[points.length - 1].time) : null;
    const durationSeconds = (t0 && t1 && t1 > t0) ? Math.round((t1 - t0) / 1000) : null;

    // Elevation gain
    let elevGain = 0;
    for (let i = 1; i < points.length; i++) {
      const d = points[i].ele - points[i - 1].ele;
      if (d > 0.1) elevGain += d;
    }
    elevGain = Math.round(elevGain);

    // Avg HR
    const hrVals = points.map((p) => p.hr).filter((h) => h !== null && !isNaN(h) && h > 0);
    const avgHR = hrVals.length > 0 ? Math.round(hrVals.reduce((a, b) => a + b, 0) / hrVals.length) : null;

    // Downsample polyline to ~300 points max
    const step = Math.max(1, Math.floor(points.length / 300));
    const polyline = [];
    for (let i = 0; i < points.length; i += step) polyline.push([points[i].lat, points[i].lon]);
    const last = points[points.length - 1];
    if (polyline[polyline.length - 1][0] !== last.lat) polyline.push([last.lat, last.lon]);

    const gpxName = doc.querySelector('trk > name')?.textContent?.trim()
      || doc.querySelector('metadata > name')?.textContent?.trim()
      || '';

    return { dist, durationSeconds, elevGain, avgHR, date: t0 ? t0.toISOString() : new Date().toISOString(), polyline, gpxName };
  },

  handleGpxFile(input) {
    const file = input.files?.[0];
    if (!file) return;
    const rawName = file.name.replace(/\.gpx$/i, '').replace(/[_-]/g, ' ');
    input.value = '';

    if (file.size === 0) {
      this._showGpxError('This GPX file is empty (0 bytes). In FitoTrack, make sure GPS is enabled and the workout was recorded before exporting.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        this._gpxData = this._parseGpx(e.target.result);
        this._showGpxPreview(rawName);
      } catch (err) {
        this._showGpxError(err.message);
      }
    };
    reader.readAsText(file);
  },

  _showGpxPreview(fallbackName) {
    const d = this._gpxData;
    const pane = document.getElementById('gpx-pane');
    if (pane) pane.dataset.gpxState = 'preview';

    document.getElementById('gpx-dist').textContent = d.dist;
    const dur = d.durationSeconds;
    if (dur) {
      const h = Math.floor(dur / 3600);
      const m = Math.floor((dur % 3600) / 60);
      const s = dur % 60;
      document.getElementById('gpx-time').textContent = h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${m}:${String(s).padStart(2, '0')}`;
    } else {
      document.getElementById('gpx-time').textContent = '--';
    }
    if (dur && d.dist > 0) {
      const paceS = dur / d.dist;
      const pm = Math.floor(paceS / 60);
      const ps = Math.round(paceS % 60);
      document.getElementById('gpx-pace').textContent = `${pm}:${String(ps).padStart(2, '0')}`;
    } else {
      document.getElementById('gpx-pace').textContent = '--';
    }
    document.getElementById('gpx-elev').textContent = d.elevGain > 0 ? `+${d.elevGain}` : '--';

    const hrRow = document.getElementById('gpx-hr-row');
    if (hrRow) hrRow.innerHTML = d.avgHR ? `<span class="gpx-hr-badge">♥ ${d.avgHR} bpm avg</span>` : '';

    const nameInput = document.getElementById('gpx-name-input');
    if (nameInput) {
      const autoName = d.gpxName || fallbackName || `Run ${new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
      nameInput.value = autoName;
    }
    const notesInput = document.getElementById('gpx-notes-input');
    if (notesInput) notesInput.value = '';
  },

  _showGpxError(msg) {
    const pane = document.getElementById('gpx-pane');
    if (pane) pane.dataset.gpxState = 'error';
    const el = document.getElementById('gpx-error-msg');
    if (el) el.textContent = msg || 'Could not parse GPX file.';
  },

  resetGpx() {
    this._gpxData = null;
    const pane = document.getElementById('gpx-pane');
    if (pane) pane.dataset.gpxState = 'idle';
  },

  async saveGpxRun() {
    if (!this._gpxData) { App.showToast('Please select a GPX file first.', 'error'); return; }
    const name = document.getElementById('gpx-name-input')?.value.trim() || 'Run';
    const notes = document.getElementById('gpx-notes-input')?.value.trim() || '';
    const d = this._gpxData;

    const paceSecsPerKm = d.durationSeconds ? d.durationSeconds / d.dist : 0;
    const pm = Math.floor(paceSecsPerKm / 60);
    const ps = Math.round(paceSecsPerKm % 60);

    await window.db.runs.add({
      date: d.date,
      name,
      distance: d.dist,
      durationSeconds: d.durationSeconds || 0,
      paceSecsPerKm,
      paceFormatted: d.durationSeconds ? `${pm}:${String(ps).padStart(2, '0')}` : '--',
      calories: null,
      elevation: d.elevGain || null,
      avgHR: d.avgHR || null,
      polyline: d.polyline,
      source: 'gpx',
      notes,
    });

    this._gpxData = null;
    App.closeAllModals();
    App.showToast('Run imported!', 'success');
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
window.FitnessSaveRun = () => {
  const modal = document.getElementById('modal-log-run');
  const activeTab = modal?.querySelector('.run-tab-btn.active')?.dataset?.runTab;
  if (activeTab === 'gpx') Fitness.saveGpxRun();
  else Fitness.saveManualRun();
};
window.FitnessSwitchRunTab = (t) => Fitness.switchRunTab(t);
window.FitnessUpdatePace = () => Fitness.updatePacePreview();
window.FitnessHandleGpx = (input) => Fitness.handleGpxFile(input);
window.FitnessResetGpx = () => Fitness.resetGpx();
window.FitnessLoadStrava = () => Fitness.loadStravaActivities();
window.FitnessImportStrava = () => Fitness.importSelectedStrava();
window.FitnessConnectStrava = () => Strava.startOAuth();
