window.Dashboard = {
  async init() {
    initWeekCardSwipe();
  },

  async render() {
    App.updateGreeting();
    await Promise.all([
      this.renderWeightCard(),
      this.renderStreakCard(),
      this.renderThisWeek(),
      this.renderTimeline(),
    ]);
    // Re-size swipe panels now that layout is settled
    setTimeout(() => {
      const card = document.getElementById('this-week-card');
      if (card) { const w = card.offsetWidth; if (w) card.querySelectorAll('.week-panel').forEach((p) => { p.style.width = w + 'px'; }); }
    }, 0);
  },

  async renderWeightCard() {
    const weights = await window.db.weight.getRecent(30);
    const el = document.getElementById('dash-weight');
    const lossEl = document.getElementById('dash-weight-loss');
    if (!el) return;

    if (weights.length > 0) {
      const latest = weights[0];
      el.textContent = latest.value.toFixed(1);

      const all = await window.db.weight.getAll();
      if (all.length > 1) {
        const oldest = all[all.length - 1];
        const loss = oldest.value - latest.value;
        if (lossEl) {
          lossEl.innerHTML = loss > 0
            ? `<span class="trend-down">↓ ${loss.toFixed(1)} kg total loss</span>`
            : `<span class="trend-up">↑ ${Math.abs(loss).toFixed(1)} kg gained</span>`;
        }
      }

      Charts.createWeightSparkline('weight-sparkline', weights);
    } else {
      el.textContent = '--';
      if (lossEl) lossEl.textContent = 'No data yet';
    }
  },

  async renderStreakCard() {
    const streakEl = document.getElementById('dash-streak');
    const taglineEl = document.getElementById('dash-streak-tagline');
    const dotsEl = document.getElementById('dash-streak-dots');
    if (!streakEl) return;

    const weekDates = App.getWeekDates();
    const today = new Date().toISOString().split('T')[0];

    // Calculate streak: consecutive days with ≥30 min study OR any workout/run
    const allStudy = await window.db.study.getAll();
    const allWorkouts = await window.db.workouts.getAll();
    const allRuns = await window.db.runs.getAll();

    const activeDays = new Set();
    for (const s of allStudy) {
      if (s.durationMinutes >= 30) activeDays.add(s.date.split('T')[0]);
    }
    for (const w of allWorkouts) activeDays.add(w.date.split('T')[0]);
    for (const r of allRuns) activeDays.add(r.date.split('T')[0]);

    let streak = 0;
    const checkDate = new Date();
    // If today has no activity yet, start checking from yesterday
    if (!activeDays.has(today)) checkDate.setDate(checkDate.getDate() - 1);
    while (true) {
      const ds = checkDate.toISOString().split('T')[0];
      if (activeDays.has(ds)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else break;
    }

    streakEl.textContent = streak;
    if (taglineEl) {
      taglineEl.textContent = streak >= 7 ? 'On fire! 🔥' : streak >= 3 ? 'Keep it going! 💪' : streak > 0 ? 'Building momentum!' : 'Start today!';
    }

    if (dotsEl) {
      const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
      dotsEl.innerHTML = weekDates.map((dateStr, i) => {
        const isActive = activeDays.has(dateStr);
        const isToday = dateStr === today;
        return `<div class="streak-dot-item">
          <div class="streak-dot ${isActive ? 'active' : ''} ${isToday ? 'today' : ''}"></div>
          <span class="streak-day-label">${days[i]}</span>
        </div>`;
      }).join('');
    }
  },

  async renderThisWeek() {
    const weekDates = App.getWeekDates();
    const prevWeekDates = weekDates.map((d) => {
      const dt = new Date(d);
      dt.setDate(dt.getDate() - 7);
      return dt.toISOString().split('T')[0];
    });

    const [allWorkouts, allRuns, allStudy, allWeight] = await Promise.all([
      window.db.workouts.getAll(),
      window.db.runs.getAll(),
      window.db.study.getAll(),
      window.db.weight.getRecent(14),
    ]);

    const inWeek = (dateStr, dates) => dates.some((d) => dateStr.startsWith(d));

    const thisWorkouts = allWorkouts.filter((w) => inWeek(w.date, weekDates));
    const prevWorkouts = allWorkouts.filter((w) => inWeek(w.date, prevWeekDates));

    const thisRuns = allRuns.filter((r) => inWeek(r.date, weekDates));
    const prevRuns = allRuns.filter((r) => inWeek(r.date, prevWeekDates));

    const thisDist = thisRuns.reduce((s, r) => s + r.distance, 0);
    const prevDist = prevRuns.reduce((s, r) => s + r.distance, 0);

    const thisStudy = allStudy.filter((s) => inWeek(s.date, weekDates) && s.subject !== 'Polish Language');
    const prevStudy = allStudy.filter((s) => inWeek(s.date, prevWeekDates) && s.subject !== 'Polish Language');
    const thisStudyHours = Math.round(thisStudy.reduce((s, x) => s + x.durationMinutes, 0) / 60 * 10) / 10;
    const prevStudyHours = Math.round(prevStudy.reduce((s, x) => s + x.durationMinutes, 0) / 60 * 10) / 10;

    const thisPolish = allStudy.filter((s) => inWeek(s.date, weekDates) && s.subject === 'Polish Language');
    const prevPolish = allStudy.filter((s) => inWeek(s.date, prevWeekDates) && s.subject === 'Polish Language');
    const thisPolishHours = Math.round(thisPolish.reduce((s, x) => s + x.durationMinutes, 0) / 60 * 10) / 10;
    const prevPolishHours = Math.round(prevPolish.reduce((s, x) => s + x.durationMinutes, 0) / 60 * 10) / 10;

    // Weight change this week
    const weekWeights = allWeight.filter((w) => inWeek(w.date, weekDates));
    let weightDelta = null;
    if (weekWeights.length >= 2) {
      const sorted = [...weekWeights].sort((a, b) => new Date(a.date) - new Date(b.date));
      weightDelta = sorted[sorted.length - 1].value - sorted[0].value;
    } else if (allWeight.length >= 2) {
      const sorted = [...allWeight].sort((a, b) => new Date(a.date) - new Date(b.date));
      weightDelta = sorted[sorted.length - 1].value - sorted[sorted.length - 8 < 0 ? 0 : sorted.length - 8]?.value || 0;
    }

    const delta = (curr, prev, format = (v) => v) => {
      if (prev === 0 && curr === 0) return '';
      const diff = curr - prev;
      const sign = diff > 0 ? '+' : '';
      const cls = diff > 0 ? 'delta-up' : diff < 0 ? 'delta-down' : 'delta-neutral';
      return `<span class="${cls}">${sign}${format(diff)} vs last week</span>`;
    };

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };
    set('week-workouts', `<strong>${thisWorkouts.length}</strong>`);
    set('week-workouts-delta', delta(thisWorkouts.length, prevWorkouts.length));
    set('week-km', `<strong>${thisDist.toFixed(1)}</strong>`);
    set('week-km-delta', delta(thisDist, prevDist, (v) => `${Math.abs(v).toFixed(1)}km`));
    set('week-study', `<strong>${thisStudyHours}h</strong>`);
    set('week-study-delta', delta(thisStudyHours, prevStudyHours, (v) => `${Math.abs(v).toFixed(1)}h`));
    set('week-polish', `<strong>${thisPolishHours}h</strong>`);

    // Mini bar charts per day of week
    const dayWorkouts = weekDates.map((d) => allWorkouts.filter((w) => w.date.startsWith(d)).length);
    const dayKm = weekDates.map((d) => allRuns.filter((r) => r.date.startsWith(d)).reduce((s, r) => s + r.distance, 0));
    const dayStudy = weekDates.map((d) => allStudy.filter((s) => s.date.startsWith(d) && s.subject !== 'Polish Language').reduce((t, s) => t + s.durationMinutes, 0) / 60);
    const dayPolish = weekDates.map((d) => allStudy.filter((s) => s.date.startsWith(d) && s.subject === 'Polish Language').reduce((t, s) => t + s.durationMinutes, 0) / 60);
    Charts.createMiniBarChart('week-workout-mini-chart', dayWorkouts, '#7C3AED');
    Charts.createMiniBarChart('week-run-mini-chart', dayKm, '#0EA5E9');
    Charts.createMiniBarChart('week-study-mini-chart', dayStudy, '#A78BFA');
    Charts.createMiniBarChart('week-polish-mini-chart', dayPolish, '#CA8A04');

    // ── Month stats ──────────────────────────────────────────────────────────
    const monthPrefix = new Date().toISOString().slice(0, 7); // "2026-06"
    const monthWorkouts = allWorkouts.filter((w) => w.date.startsWith(monthPrefix));
    const monthRuns = allRuns.filter((r) => r.date.startsWith(monthPrefix));
    const monthStudy = allStudy.filter((s) => s.date.startsWith(monthPrefix) && s.subject !== 'Polish Language');
    const monthPolish = allStudy.filter((s) => s.date.startsWith(monthPrefix) && s.subject === 'Polish Language');
    const monthDist = monthRuns.reduce((s, r) => s + r.distance, 0);
    const monthStudyHours = Math.round(monthStudy.reduce((s, x) => s + x.durationMinutes, 0) / 60 * 10) / 10;
    const monthPolishHours = Math.round(monthPolish.reduce((s, x) => s + x.durationMinutes, 0) / 60 * 10) / 10;

    set('month-workouts', `<strong>${monthWorkouts.length}</strong>`);
    set('month-km', `<strong>${monthDist.toFixed(1)}</strong>`);
    set('month-study', `<strong>${monthStudyHours}h</strong>`);
    set('month-polish', `<strong>${monthPolishHours}h</strong>`);

    // Month mini charts: one bar per week of current month
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const weeksInMonth = [];
    let weekStart = new Date(firstOfMonth);
    while (weekStart.getMonth() === now.getMonth()) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weeksInMonth.push({ start: weekStart.toISOString().split('T')[0], end: weekEnd.toISOString().split('T')[0] });
      weekStart = new Date(weekStart);
      weekStart.setDate(weekStart.getDate() + 7);
    }
    const mWorkoutBars = weeksInMonth.map(({ start, end }) => allWorkouts.filter((w) => w.date >= start && w.date <= end + 'T').length);
    const mRunBars = weeksInMonth.map(({ start, end }) => allRuns.filter((r) => r.date >= start && r.date <= end + 'T').reduce((s, r) => s + r.distance, 0));
    const mStudyBars = weeksInMonth.map(({ start, end }) => allStudy.filter((s) => s.date >= start && s.date <= end + 'T' && s.subject !== 'Polish Language').reduce((t, s) => t + s.durationMinutes, 0) / 60);
    const mPolishBars = weeksInMonth.map(({ start, end }) => allStudy.filter((s) => s.date >= start && s.date <= end + 'T' && s.subject === 'Polish Language').reduce((t, s) => t + s.durationMinutes, 0) / 60);
    Charts.createMiniBarChart('month-workout-mini-chart', mWorkoutBars, '#7C3AED');
    Charts.createMiniBarChart('month-run-mini-chart', mRunBars, '#0EA5E9');
    Charts.createMiniBarChart('month-study-mini-chart', mStudyBars, '#A78BFA');
    Charts.createMiniBarChart('month-polish-mini-chart', mPolishBars, '#CA8A04');

    // ── All Time stats ────────────────────────────────────────────────────────
    const atStudy = allStudy.filter((s) => s.subject !== 'Polish Language');
    const atPolish = allStudy.filter((s) => s.subject === 'Polish Language');
    const atDist = allRuns.reduce((s, r) => s + r.distance, 0);
    const atStudyHours = Math.round(atStudy.reduce((s, x) => s + x.durationMinutes, 0) / 60 * 10) / 10;
    const atPolishHours = Math.round(atPolish.reduce((s, x) => s + x.durationMinutes, 0) / 60 * 10) / 10;

    set('alltime-workouts', `<strong>${allWorkouts.length}</strong>`);
    set('alltime-km', `<strong>${atDist.toFixed(1)}</strong>`);
    set('alltime-study', `<strong>${atStudyHours}h</strong>`);
    set('alltime-polish', `<strong>${atPolishHours}h</strong>`);

    // All time mini charts: last 6 months
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push(d.toISOString().slice(0, 7));
    }
    const atWorkoutBars = last6Months.map((m) => allWorkouts.filter((w) => w.date.startsWith(m)).length);
    const atRunBars = last6Months.map((m) => allRuns.filter((r) => r.date.startsWith(m)).reduce((s, r) => s + r.distance, 0));
    const atStudyBars = last6Months.map((m) => allStudy.filter((s) => s.date.startsWith(m) && s.subject !== 'Polish Language').reduce((t, s) => t + s.durationMinutes, 0) / 60);
    const atPolishBars = last6Months.map((m) => allStudy.filter((s) => s.date.startsWith(m) && s.subject === 'Polish Language').reduce((t, s) => t + s.durationMinutes, 0) / 60);
    Charts.createMiniBarChart('alltime-workout-mini-chart', atWorkoutBars, '#7C3AED');
    Charts.createMiniBarChart('alltime-run-mini-chart', atRunBars, '#0EA5E9');
    Charts.createMiniBarChart('alltime-study-mini-chart', atStudyBars, '#A78BFA');
    Charts.createMiniBarChart('alltime-polish-mini-chart', atPolishBars, '#CA8A04');

    // Today's activity checklist (panel 0)
    const todayStr = new Date().toISOString().split('T')[0];
    const checkList = document.getElementById('today-activity-list');
    if (checkList) {
      const todayPolish = allStudy.filter((s) => s.date.startsWith(todayStr) && s.subject === 'Polish Language');
      const todayStudy  = allStudy.filter((s) => s.date.startsWith(todayStr) && s.subject !== 'Polish Language');
      const items = [
        { label: 'Workout',      done: allWorkouts.some((w) => w.date.startsWith(todayStr)), lucide: 'dumbbell',   cls: 'icon-workout' },
        { label: 'Run',          done: allRuns.some((r) => r.date.startsWith(todayStr)),     lucide: 'footprints', cls: 'icon-run' },
        { label: 'WGU Study',    done: todayStudy.length > 0,                                lucide: 'book-open',  cls: 'icon-study' },
        { label: 'Learn Polish', done: todayPolish.length > 0,                               lucide: null,         cls: 'icon-polish' },
      ];
      checkList.innerHTML = items.map((it) => `
        <div class="today-act-row">
          <div class="today-act-icon ${it.cls}">${
            it.lucide
              ? `<i data-lucide="${it.lucide}" style="width:12px;height:12px"></i>`
              : `<svg viewBox="0 0 18 12" width="18" height="12" style="border-radius:2px;display:block"><rect width="18" height="6" style="fill:#FFFFFF;stroke:none"/><rect y="6" width="18" height="6" style="fill:#DC143C;stroke:none"/></svg>`
          }</div>
          <span class="today-act-label">${it.label}</span>
          <div class="today-act-check${it.done ? ' done' : ''}">✓</div>
        </div>`).join('');
      if (window.lucide) lucide.createIcons();
    }
  },

  async renderTimeline() {
    const container = document.getElementById('timeline-list');
    if (!container) return;

    const today = new Date().toISOString().split('T')[0];

    const [weights, workouts, runs, study, notes] = await Promise.all([
      window.db.weight.getAll(),
      window.db.workouts.getAll(),
      window.db.runs.getAll(),
      window.db.study.getAll(),
      window.db.notes.getAll(),
    ]);

    const events = [];

    weights.filter((w) => w.date.startsWith(today)).forEach((w) => {
      events.push({ time: w.date, lucide: 'scale', iconClass: 'icon-weight', title: 'Weight Logged', sub: `${w.value} kg`, type: 'weight', id: w.id, hasNotes: !!(w.notes && w.notes.trim()) });
    });
    runs.filter((r) => r.date.startsWith(today)).forEach((r) => {
      events.push({ time: r.date, lucide: 'footprints', iconClass: 'icon-run', title: r.name, sub: `${r.distance} km • ${r.paceFormatted} /km`, type: 'run', id: r.id, polyline: r.polyline, hasNotes: !!(r.notes && r.notes.trim()) });
    });
    workouts.filter((w) => w.date.startsWith(today)).forEach((w) => {
      events.push({ time: w.date, lucide: 'dumbbell', iconClass: 'icon-workout', title: w.name, sub: `${w.setCount} sets • ${w.exerciseCount} exercises`, type: 'workout', id: w.id, hasNotes: !!(w.notes && w.notes.trim()) });
    });
    study.filter((s) => s.date.startsWith(today)).forEach((s) => {
      const isPolish = s.subject === 'Polish Language';
      events.push({ time: s.date, lucide: isPolish ? null : 'book-open', iconClass: isPolish ? 'icon-polish' : 'icon-study', title: s.subject, sub: App.formatMinutes(s.durationMinutes), type: 'study', id: s.id, hasNotes: !!(s.notes && s.notes.trim()), isPolish });
    });
    notes.filter((n) => n.created.startsWith(today)).forEach((n) => {
      events.push({ time: n.created, lucide: 'notebook-pen', iconClass: 'icon-note', title: 'Note Added', sub: n.title, type: 'note', id: n.id });
    });

    events.sort((a, b) => new Date(a.time) - new Date(b.time));

    if (events.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>Nothing logged today yet.</p><p class="sub">Use the Quick Actions above to get started.</p></div>';
      return;
    }

    container.innerHTML = events.map((e) => {
      const hasMap = e.polyline && e.polyline.length;
      return `
      <div class="timeline-item${hasMap ? ' has-map' : ''}" data-type="${e.type}" data-id="${e.id}">
        <div class="timeline-icon-col">
          <div class="timeline-connector"></div>
          <div class="timeline-icon ${e.iconClass}">${
            e.isPolish
              ? `<svg viewBox="0 0 20 14" width="16" height="11" style="border-radius:2px;display:block"><rect width="20" height="7" style="fill:#FFFFFF;stroke:none"/><rect y="7" width="20" height="7" style="fill:#DC143C;stroke:none"/></svg>`
              : `<i data-lucide="${e.lucide}"></i>`
          }</div>
        </div>
        <div class="timeline-time">${App.formatTime(e.time)}</div>
        <div class="timeline-body">
          <div class="timeline-title">${App.escapeHtml(e.title)}${e.hasNotes ? '<span class="tl-note-dot" title="Has notes">·</span>' : ''}</div>
          <div class="timeline-sub">${App.escapeHtml(e.sub)}</div>
        </div>
        ${hasMap ? `<div class="timeline-mini-map" id="tl-map-${e.id}"></div>` : ''}
        <div class="timeline-arrow">›</div>
      </div>`;
    }).join('');
    if (window.lucide) lucide.createIcons();

    // Initialise Leaflet mini-maps for run events that have GPS polylines
    events.filter((e) => e.polyline && e.polyline.length).forEach((e) => {
      const mapDiv = document.getElementById(`tl-map-${e.id}`);
      if (!mapDiv || !window.L) return;
      if (mapDiv._leaflet_id) return; // already initialised
      const map = L.map(mapDiv, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        touchZoom: false,
        doubleClickZoom: false,
        keyboard: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { opacity: 0.65 }).addTo(map);
      const line = L.polyline(e.polyline, { color: '#4ADE80', weight: 3, opacity: 0.95 }).addTo(map);
      map.fitBounds(line.getBounds(), { padding: [8, 8] });
    });
  },
};

// ─── Weight Expand Panel ──────────────────────────────────────────────────────
async function openWeightExpand() {
  const panel = document.getElementById('weight-expand-panel');
  if (!panel) return;
  panel.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Populate header values from the dashboard card
  const cur = document.getElementById('dash-weight');
  const loss = document.getElementById('dash-weight-loss');
  const weCur = document.getElementById('we-current');
  const weLoss = document.getElementById('we-loss');
  if (cur && weCur) weCur.textContent = cur.textContent;
  if (loss && weLoss) weLoss.innerHTML = loss.innerHTML;

  await renderWeightExpandChart('3M');
  if (window.lucide) lucide.createIcons();

  // Period button wiring
  panel.querySelectorAll('.period-btn').forEach((btn) => {
    btn.onclick = async () => {
      panel.querySelectorAll('.period-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      await renderWeightExpandChart(btn.dataset.period);
    };
  });
}

async function renderWeightExpandChart(period) {
  const allWeights = await window.db.weight.getAll();
  const sorted = [...allWeights].sort((a, b) => new Date(a.date) - new Date(b.date));
  const now = new Date();
  let cutoff = null;
  if (period === '3D') cutoff = new Date(now - 3 * 864e5);
  else if (period === '1W') cutoff = new Date(now - 7 * 864e5);
  else if (period === '1M') cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  else if (period === '3M') cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  const data = cutoff ? sorted.filter((w) => new Date(w.date) >= cutoff) : sorted;
  Charts.createWeightHistory('weight-expand-chart', data);
}

function closeWeightExpand() {
  const panel = document.getElementById('weight-expand-panel');
  if (!panel) return;
  panel.classList.remove('open');
  document.body.style.overflow = '';
  const canvas = document.getElementById('weight-expand-chart');
  if (canvas && canvas._chart) { canvas._chart.destroy(); canvas._chart = null; }
}

function closeWeightExpandBackdrop(e) {
  if (e.target.classList.contains('weight-expand-backdrop')) closeWeightExpand();
}

window.openWeightExpand = openWeightExpand;
window.closeWeightExpand = closeWeightExpand;
window.closeWeightExpandBackdrop = closeWeightExpandBackdrop;

// ─── Quick Actions — open proper modals ──────────────────────────────────────
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  quickLog(btn.dataset.action);
});

function quickLog(action) {
  if (action === 'log-workout') {
    Fitness.openLogWorkoutModal();
  } else if (action === 'log-run') {
    Fitness.openLogRunModal();
  } else if (action === 'log-study') {
    openQuickStudyModal('Study Session');
  } else if (action === 'log-polish') {
    openQuickStudyModal('Polish Language');
  } else if (action === 'log-weight') {
    openLogWeightModal();
  } else if (action === 'new-note') {
    Notes.openEditor(null);
  }
}
window.quickLog = quickLog;

// ─── Quick Study / Polish Modal ───────────────────────────────────────────────
let _quickStudySubject = '';

async function openQuickStudyModal(subject) {
  _quickStudySubject = subject;
  const modal = document.getElementById('modal-quick-study');
  if (!modal) return;
  modal.querySelector('#qs-subject-label').textContent = subject;
  modal.querySelector('#qs-notes-input').value = '';

  // Default start = now, end = now + 1h
  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000);
  modal.querySelector('#qs-start-input').value = toLocalDatetimeInput(now);
  modal.querySelector('#qs-end-input').value = toLocalDatetimeInput(later);
  qsUpdateElapsed();

  // Populate class dropdown (only shown for Study, not Polish)
  const classGroup = modal.querySelector('#qs-class-group');
  if (subject === 'Polish Language') {
    if (classGroup) classGroup.style.display = 'none';
  } else {
    if (classGroup) classGroup.style.display = '';
    const classes = await window.db.classes.getAll();
    const select = modal.querySelector('#qs-class-select');
    if (select) {
      select.innerHTML = '<option value="">General / no class</option>' +
        classes.map((c) => `<option value="${c.id}">${App.escapeHtml(c.code + ' ' + c.name)}</option>`).join('');
    }
  }

  App.openModal('modal-quick-study');
}
window.openQuickStudyModal = openQuickStudyModal;

function toLocalDatetimeInput(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function qsUpdateElapsed() {
  const startEl = document.getElementById('qs-start-input');
  const endEl = document.getElementById('qs-end-input');
  const row = document.getElementById('qs-elapsed-row');
  const val = document.getElementById('qs-elapsed-val');
  if (!startEl || !endEl || !row || !val) return;
  const start = new Date(startEl.value);
  const end = new Date(endEl.value);
  const diffMs = end - start;
  if (!isNaN(diffMs) && diffMs > 0) {
    const totalMin = Math.round(diffMs / 60000);
    row.style.display = 'flex';
    val.textContent = App.formatMinutes(totalMin);
  } else {
    row.style.display = 'none';
  }
}
window.qsUpdateElapsed = qsUpdateElapsed;

async function saveQuickStudy() {
  const modal = document.getElementById('modal-quick-study');
  if (!modal) return;
  const startVal = modal.querySelector('#qs-start-input').value;
  const endVal = modal.querySelector('#qs-end-input').value;
  const start = new Date(startVal);
  const end = new Date(endVal);
  const diffMs = end - start;
  if (!startVal || !endVal || isNaN(diffMs) || diffMs <= 0) {
    App.showToast('Set a valid start and end time.', 'error'); return;
  }
  const durationMinutes = Math.round(diffMs / 60000);
  const notes = modal.querySelector('#qs-notes-input').value.trim();

  const select = modal.querySelector('#qs-class-select');
  const classId = select?.value ? Number(select.value) : null;
  let subject = _quickStudySubject;
  if (classId && select) {
    subject = select.options[select.selectedIndex]?.text || subject;
  }

  await window.db.study.add({
    date: start.toISOString(),
    classId,
    subject,
    durationMinutes,
    notes,
  });
  App.closeAllModals();
  App.showToast(`${_quickStudySubject} logged!`, 'success');
  if (App.currentTab === 'dashboard') await Dashboard.render();
}
window.saveQuickStudy = saveQuickStudy;

// ─── Timeline item tap → detail/edit sheet ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const tl = document.getElementById('timeline-list');
  if (tl) {
    tl.addEventListener('click', (e) => {
      const item = e.target.closest('.timeline-item');
      if (!item) return;
      openTlDetail(item.dataset.type, parseInt(item.dataset.id, 10));
    });
  }
});

let _tlDetailType = '', _tlDetailId = 0;
let _tlCurrentNotes = '';

const _pencilSvg = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const _trashSvg  = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;

function renderTlNoteSection() {
  const section = document.getElementById('tl-notes-section');
  if (!section) return;
  if (_tlCurrentNotes) {
    section.innerHTML = `
      <div class="tl-note-swipe-wrap">
        <button class="tl-note-edit-reveal" onclick="tlEditNote()" aria-label="Edit note">
          ${_pencilSvg}
        </button>
        <div class="tl-note-card" id="tl-note-card-inner">
          <div class="tl-note-card-text">${App.escapeHtml(_tlCurrentNotes)}</div>
        </div>
        <button class="tl-note-delete-reveal" onclick="tlDeleteNote()" aria-label="Delete note">${_trashSvg}</button>
      </div>`;
    initNoteSwipe();
  } else {
    section.innerHTML = `<button class="tl-add-note-btn" onclick="tlEditNote()">+ Add note</button>`;
  }
}
window.renderTlNoteSection = renderTlNoteSection;

function initNoteSwipe() {
  const wrap = document.querySelector('.tl-note-swipe-wrap');
  const card = document.getElementById('tl-note-card-inner');
  if (!wrap || !card) return;
  let startX = 0, dragging = false;
  const THRESHOLD = 55;

  card.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    dragging = true;
    card.style.transition = 'none';
  }, { passive: true });

  card.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const dx = e.touches[0].clientX - startX; // positive = right, negative = left
    if (dx < 0) {
      card.style.transform = `translateX(${Math.max(dx, -(THRESHOLD + 10))}px)`;
    } else if (dx > 0) {
      card.style.transform = `translateX(${Math.min(dx, THRESHOLD + 10)}px)`;
    }
  }, { passive: true });

  card.addEventListener('touchend', (e) => {
    dragging = false;
    card.style.transition = 'transform 0.2s ease';
    const dx = e.changedTouches[0].clientX - startX;
    if (dx < -(THRESHOLD / 2)) {
      // Snapped left → delete
      card.style.transform = `translateX(-${THRESHOLD}px)`;
    } else if (dx > THRESHOLD / 2) {
      // Swiped right past threshold → edit
      card.style.transform = '';
      tlEditNote();
    } else {
      card.style.transform = '';
    }
  }, { passive: true });
}

async function openTlDetail(type, id) {
  _tlDetailType = type;
  _tlDetailId = id;
  const modal = document.getElementById('modal-tl-detail');
  if (!modal) return;

  const statsEl = modal.querySelector('#tl-detail-stats');
  const titleEl = modal.querySelector('#tl-detail-title');
  const editBtn = modal.querySelector('#tl-edit-btn');
  if (editBtn) editBtn.style.display = '';
  statsEl.innerHTML = '<p style="color:var(--subtext);font-size:0.85rem">Loading…</p>';
  App.openModal('modal-tl-detail');

  if (type === 'workout') {
    const w = await window.db.workouts.get(id);
    if (!w) return;
    titleEl.textContent = w.name || 'Workout';
    const exList = (w.exercises || []).map((ex) => `
      <div class="tl-exercise-row">
        <div class="tl-ex-name">${App.escapeHtml(ex.name)}</div>
        <div class="tl-ex-sets">${(ex.sets || []).map((s) => `${s.reps}×${s.weight}kg`).join('  ')}</div>
      </div>`).join('');
    statsEl.innerHTML = `
      <div class="tl-detail-stat-row"><span>${w.setCount || 0} sets</span><span>${w.exerciseCount || 0} exercises</span></div>
      ${exList || '<p class="tl-no-data">No exercises recorded.</p>'}`;
    _tlCurrentNotes = w.notes || '';
  } else if (type === 'run') {
    const r = await window.db.runs.get(id);
    if (!r) return;
    titleEl.textContent = r.name || 'Run';
    statsEl.innerHTML = `
      <div class="tl-detail-stat-row">
        <span>${r.distance} km</span>
        <span>${r.paceFormatted} /km</span>
        <span>${App.formatSeconds ? App.formatSeconds(r.durationSeconds) : Math.round(r.durationSeconds / 60) + ' min'}</span>
      </div>`;
    _tlCurrentNotes = r.notes || '';
  } else if (type === 'study') {
    const s = await window.db.study.get(id);
    if (!s) return;
    titleEl.textContent = s.subject || 'Study';
    statsEl.innerHTML = `
      <div class="tl-detail-stat-row"><span>${App.formatMinutes(s.durationMinutes)}</span></div>`;
    _tlCurrentNotes = s.notes || '';
  } else if (type === 'weight') {
    const w = await window.db.weight.get(id);
    if (!w) return;
    titleEl.textContent = 'Weight Entry';
    statsEl.innerHTML = `
      <div class="tl-detail-stat-row"><span class="tl-big-val">${w.value} kg</span></div>`;
    _tlCurrentNotes = w.notes || '';
  } else {
    titleEl.textContent = 'Entry';
    statsEl.innerHTML = '';
    _tlCurrentNotes = '';
  }
  renderTlNoteSection();
}
window.openTlDetail = openTlDetail;

// ─── Timeline edit mode ───────────────────────────────────────────────────────

async function tlEnterEditMode() {
  const type = _tlDetailType, id = _tlDetailId;
  const statsEl = document.getElementById('tl-detail-stats');
  const editBtn = document.getElementById('tl-edit-btn');
  if (!statsEl) return;

  if (type === 'workout') {
    // Open the full workout modal pre-populated for editing
    App.closeAllModals();
    await Fitness.openEditWorkoutModal(id);
    return;
  }

  if (editBtn) editBtn.style.display = 'none';

  if (type === 'run') {
    const r = await window.db.runs.get(id);
    if (!r) return;
    const totalSecs = r.durationSeconds || 0;
    const mm = Math.floor(totalSecs / 60);
    const ss = String(totalSecs % 60).padStart(2, '0');
    statsEl.innerHTML = `
      <div class="form-group">
        <label>Run Name</label>
        <input type="text" class="form-input" id="tl-edit-name" value="${App.escapeHtml(r.name || '')}" />
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label>Distance (km)</label>
          <input type="number" class="form-input" id="tl-edit-distance" value="${r.distance}" step="0.01" min="0" />
        </div>
        <div class="form-group">
          <label>Time (MM:SS)</label>
          <input type="text" class="form-input" id="tl-edit-time" value="${mm}:${ss}" placeholder="29:14" />
        </div>
      </div>
      <div class="tl-edit-actions">
        <button class="btn btn-secondary" onclick="tlCancelEdit()">Cancel</button>
        <button class="btn btn-primary" onclick="tlSaveEdit()">Save</button>
      </div>`;
  } else if (type === 'study') {
    const s = await window.db.study.get(id);
    if (!s) return;
    const startDate = new Date(s.date);
    const endDate = new Date(startDate.getTime() + s.durationMinutes * 60000);
    const toInput = (d) => { const pad=(n)=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
    statsEl.innerHTML = `
      <div class="form-group">
        <label>Subject</label>
        <input type="text" class="form-input" id="tl-edit-subject" value="${App.escapeHtml(s.subject || '')}" />
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label>Start</label>
          <input type="datetime-local" class="form-input" id="tl-edit-start" value="${toInput(startDate)}" />
        </div>
        <div class="form-group">
          <label>End</label>
          <input type="datetime-local" class="form-input" id="tl-edit-end" value="${toInput(endDate)}" />
        </div>
      </div>
      <div class="tl-edit-actions">
        <button class="btn btn-secondary" onclick="tlCancelEdit()">Cancel</button>
        <button class="btn btn-primary" onclick="tlSaveEdit()">Save</button>
      </div>`;
  } else if (type === 'weight') {
    const w = await window.db.weight.get(id);
    if (!w) return;
    statsEl.innerHTML = `
      <div class="form-group">
        <label>Weight (kg)</label>
        <input type="number" class="form-input" id="tl-edit-value" value="${w.value}" step="0.1" min="0" style="font-size:1.4rem;font-weight:700;text-align:center" />
      </div>
      <div class="tl-edit-actions">
        <button class="btn btn-secondary" onclick="tlCancelEdit()">Cancel</button>
        <button class="btn btn-primary" onclick="tlSaveEdit()">Save</button>
      </div>`;
  }
}
window.tlEnterEditMode = tlEnterEditMode;

function tlCancelEdit() {
  // Re-open detail to restore read-only view
  openTlDetail(_tlDetailType, _tlDetailId);
}
window.tlCancelEdit = tlCancelEdit;

async function tlSaveEdit() {
  const type = _tlDetailType, id = _tlDetailId;
  if (!id) return;

  if (type === 'run') {
    const r = await window.db.runs.get(id);
    if (!r) return;
    const name = document.getElementById('tl-edit-name')?.value.trim() || r.name;
    const dist = parseFloat(document.getElementById('tl-edit-distance')?.value) || r.distance;
    const timeStr = document.getElementById('tl-edit-time')?.value || '';
    const [mm, ss] = timeStr.split(':').map(Number);
    const totalSecs = (mm || 0) * 60 + (ss || 0) || r.durationSeconds;
    const paceSecsPerKm = totalSecs / dist;
    const pm = Math.floor(paceSecsPerKm / 60);
    const ps = Math.round(paceSecsPerKm % 60);
    await window.db.runs.update({ ...r, name, distance: dist, durationSeconds: totalSecs, paceSecsPerKm, paceFormatted: `${pm}:${String(ps).padStart(2,'0')}` });
  } else if (type === 'study') {
    const s = await window.db.study.get(id);
    if (!s) return;
    const subject = document.getElementById('tl-edit-subject')?.value.trim() || s.subject;
    const start = new Date(document.getElementById('tl-edit-start')?.value);
    const end = new Date(document.getElementById('tl-edit-end')?.value);
    const durationMinutes = (end - start > 0) ? Math.round((end - start) / 60000) : s.durationMinutes;
    await window.db.study.update({ ...s, subject, date: start.toISOString(), durationMinutes });
  } else if (type === 'weight') {
    const w = await window.db.weight.get(id);
    if (!w) return;
    const value = parseFloat(document.getElementById('tl-edit-value')?.value) || w.value;
    await window.db.weight.update({ ...w, value });
  }

  App.showToast('Saved!', 'success');
  if (App.currentTab === 'dashboard') await Dashboard.render();
  openTlDetail(type, id); // refresh detail view
}
window.tlSaveEdit = tlSaveEdit;

function tlEditNote() {
  const section = document.getElementById('tl-notes-section');
  if (!section) return;
  section.innerHTML = `
    <textarea class="form-textarea" id="tl-detail-notes" rows="3" placeholder="Add notes…">${App.escapeHtml(_tlCurrentNotes)}</textarea>
    <div class="tl-note-edit-actions">
      <button class="btn btn-primary btn-sm" onclick="tlSaveNote()">Save Note</button>
      <button class="btn btn-secondary btn-sm" onclick="tlCancelNoteEdit()">Cancel</button>
    </div>`;
}
window.tlEditNote = tlEditNote;

function tlCancelNoteEdit() {
  renderTlNoteSection();
}
window.tlCancelNoteEdit = tlCancelNoteEdit;

async function tlSaveNote() {
  const newNotes = document.getElementById('tl-detail-notes')?.value.trim() || '';
  const type = _tlDetailType, id = _tlDetailId;
  if (!id) return;
  if (type === 'workout') {
    const w = await window.db.workouts.get(id);
    if (w) await window.db.workouts.update({ ...w, notes: newNotes });
  } else if (type === 'run') {
    const r = await window.db.runs.get(id);
    if (r) await window.db.runs.update({ ...r, notes: newNotes });
  } else if (type === 'study') {
    const s = await window.db.study.get(id);
    if (s) await window.db.study.update({ ...s, notes: newNotes });
  } else if (type === 'weight') {
    const w = await window.db.weight.get(id);
    if (w) await window.db.weight.update({ ...w, notes: newNotes });
  }
  _tlCurrentNotes = newNotes;
  renderTlNoteSection();
  App.showToast('Note saved!', 'success');
  // Update note dot on timeline row if on dashboard tab
  if (App.currentTab === 'dashboard') {
    const row = document.querySelector(`.timeline-item[data-id="${id}"]`);
    if (row) {
      let dot = row.querySelector('.tl-note-dot');
      if (newNotes && !dot) {
        const label = row.querySelector('.tl-item-label');
        if (label) { dot = document.createElement('span'); dot.className = 'tl-note-dot'; label.appendChild(dot); }
      } else if (!newNotes && dot) {
        dot.remove();
      }
    }
  }
}
window.tlSaveNote = tlSaveNote;

async function tlDeleteNote() {
  const type = _tlDetailType, id = _tlDetailId;
  if (!id) return;
  if (type === 'workout') {
    const w = await window.db.workouts.get(id);
    if (w) await window.db.workouts.update({ ...w, notes: '' });
  } else if (type === 'run') {
    const r = await window.db.runs.get(id);
    if (r) await window.db.runs.update({ ...r, notes: '' });
  } else if (type === 'study') {
    const s = await window.db.study.get(id);
    if (s) await window.db.study.update({ ...s, notes: '' });
  } else if (type === 'weight') {
    const w = await window.db.weight.get(id);
    if (w) await window.db.weight.update({ ...w, notes: '' });
  }
  _tlCurrentNotes = '';
  renderTlNoteSection();
  App.showToast('Note deleted.', 'success');
  // Remove note dot on timeline row
  if (App.currentTab === 'dashboard') {
    const row = document.querySelector(`.timeline-item[data-id="${id}"]`);
    if (row) { const dot = row.querySelector('.tl-note-dot'); if (dot) dot.remove(); }
  }
}
window.tlDeleteNote = tlDeleteNote;

async function deleteTlEntry() {
  const type = _tlDetailType, id = _tlDetailId;
  if (!id) return;
  if (type === 'workout') await window.db.workouts.delete(id);
  else if (type === 'run') await window.db.runs.delete(id);
  else if (type === 'study') await window.db.study.delete(id);
  else if (type === 'weight') await window.db.weight.delete(id);
  App.closeAllModals();
  App.showToast('Entry deleted.', 'success');
  if (App.currentTab === 'dashboard') await Dashboard.render();
}
window.deleteTlEntry = deleteTlEntry;

function initWeekCardSwipe() {
  const card = document.getElementById('this-week-card');
  if (!card) return;
  const slider = card.querySelector('.week-card-slider');
  const panels = card.querySelectorAll('.week-panel');
  if (!slider || panels.length < 2) return;

  let startX = 0, currentView = 0;

  function resize() {
    // Use the full card offsetWidth — card padding is now 0 so slider
    // spans the entire card, and panels must match exactly to prevent bleed.
    const w = card.offsetWidth;
    if (!w) { setTimeout(resize, 50); return; }
    panels.forEach((p) => { p.style.width = w + 'px'; });
    slider.style.transition = 'none';
    slider.style.transform = currentView === 0 ? '' : `translateX(-${currentView * w}px)`;
    requestAnimationFrame(() => { slider.style.transition = ''; });
  }

  function goTo(n) {
    currentView = n;
    const w = card.offsetWidth;
    slider.style.transform = n === 0 ? '' : `translateX(-${n * w}px)`;
    card.querySelectorAll('.week-swipe-dot').forEach((d, i) => d.classList.toggle('active', i === n));
  }

  setTimeout(resize, 0);
  window.addEventListener('resize', resize);

  card.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  card.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    if (dx < -35 && currentView < panels.length - 1) goTo(currentView + 1);
    else if (dx > 35 && currentView > 0) goTo(currentView - 1);
  }, { passive: true });
}

function openLogWeightModal() {
  const modal = document.getElementById('modal-log-weight');
  if (!modal) return;
  const input = modal.querySelector('#weight-value-input');
  if (input) input.value = '';
  const dateInput = modal.querySelector('#weight-date-input');
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 16);
  App.openModal('modal-log-weight');
}

async function saveWeight() {
  const val = parseFloat(document.getElementById('weight-value-input')?.value);
  const dateVal = document.getElementById('weight-date-input')?.value;
  const notes = document.getElementById('weight-notes-input')?.value || '';
  if (isNaN(val) || val <= 0) { App.showToast('Enter a valid weight.', 'error'); return; }
  await window.db.weight.add({ date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(), value: val, notes });
  App.closeAllModals();
  App.showToast('Weight logged!', 'success');
  if (App.currentTab === 'dashboard') await Dashboard.render();
}
window.saveWeight = saveWeight;
window.openLogWeightModal = openLogWeightModal;
