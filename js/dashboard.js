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

    const thisStudy = allStudy.filter((s) => inWeek(s.date, weekDates));
    const prevStudy = allStudy.filter((s) => inWeek(s.date, prevWeekDates));
    const thisStudyHours = Math.round(thisStudy.reduce((s, x) => s + x.durationMinutes, 0) / 60 * 10) / 10;
    const prevStudyHours = Math.round(prevStudy.reduce((s, x) => s + x.durationMinutes, 0) / 60 * 10) / 10;

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
    set('week-study', `<strong>${thisStudyHours}h</strong>`);

    // Mini bar charts per day of week
    const dayWorkouts = weekDates.map((d) => allWorkouts.filter((w) => w.date.startsWith(d)).length);
    const dayKm = weekDates.map((d) => allRuns.filter((r) => r.date.startsWith(d)).reduce((s, r) => s + r.distance, 0));
    const dayStudy = weekDates.map((d) => allStudy.filter((s) => s.date.startsWith(d)).reduce((t, s) => t + s.durationMinutes, 0) / 60);
    Charts.createMiniBarChart('week-workout-mini-chart', dayWorkouts, '#7C3AED');
    Charts.createMiniBarChart('week-run-mini-chart', dayKm, '#0EA5E9');
    Charts.createMiniBarChart('week-study-mini-chart', dayStudy, '#A78BFA');

    // Today's activity checklist (panel 0)
    const todayStr = new Date().toISOString().split('T')[0];
    const checkList = document.getElementById('today-activity-list');
    if (checkList) {
      const items = [
        { label: 'Workout', done: allWorkouts.some((w) => w.date.startsWith(todayStr)), icon: 'dumbbell',   cls: 'icon-workout' },
        { label: 'Run',     done: allRuns.some((r) => r.date.startsWith(todayStr)),     icon: 'footprints', cls: 'icon-run' },
        { label: 'Study',   done: allStudy.some((s) => s.date.startsWith(todayStr)),    icon: 'book-open',  cls: 'icon-study' },
      ];
      checkList.innerHTML = items.map((it) => `
        <div class="today-act-row">
          <div class="today-act-icon ${it.cls}"><i data-lucide="${it.icon}" style="width:12px;height:12px"></i></div>
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
      events.push({ time: w.date, lucide: 'scale', iconClass: 'icon-weight', title: 'Weight Logged', sub: `${w.value} kg`, type: 'weight', id: w.id });
    });
    runs.filter((r) => r.date.startsWith(today)).forEach((r) => {
      events.push({ time: r.date, lucide: 'footprints', iconClass: 'icon-run', title: r.name, sub: `${r.distance} km • ${r.paceFormatted} /km`, type: 'run', id: r.id, polyline: r.polyline });
    });
    workouts.filter((w) => w.date.startsWith(today)).forEach((w) => {
      events.push({ time: w.date, lucide: 'dumbbell', iconClass: 'icon-workout', title: w.name, sub: `${w.setCount} sets • ${w.exerciseCount} exercises`, type: 'workout', id: w.id });
    });
    study.filter((s) => s.date.startsWith(today)).forEach((s) => {
      events.push({ time: s.date, lucide: 'book-open', iconClass: 'icon-study', title: s.subject, sub: App.formatMinutes(s.durationMinutes), type: 'study', id: s.id });
    });
    notes.filter((n) => n.created.startsWith(today)).forEach((n) => {
      events.push({ time: n.created, lucide: 'notebook-pen', iconClass: 'icon-note', title: 'Note Added', sub: n.title, type: 'note', id: n.id });
    });

    events.sort((a, b) => new Date(b.time) - new Date(a.time));

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
          <div class="timeline-icon ${e.iconClass}"><i data-lucide="${e.lucide}"></i></div>
        </div>
        <div class="timeline-time">${App.formatTime(e.time)}</div>
        <div class="timeline-body">
          <div class="timeline-title">${App.escapeHtml(e.title)}</div>
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

// ─── Quick Actions — instant timeline logging ─────────────────────────────────
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  quickLog(btn.dataset.action);
});

async function quickLog(action) {
  const now = new Date().toISOString();
  if (action === 'log-workout') {
    await window.db.workouts.add({
      date: now, name: 'Gym Session',
      exercises: [], totalVolume: 0, setCount: 0, exerciseCount: 0,
      durationMinutes: 0, notes: '',
    });
    App.showToast('Workout logged!', 'success');
  } else if (action === 'log-run') {
    await window.db.runs.add({
      date: now, name: 'Run',
      distance: 0, durationSeconds: 0, paceSecsPerKm: 0,
      paceFormatted: '--:--', calories: 0, elevation: 0,
      avgHR: 0, polyline: null, source: 'quick', notes: '',
    });
    App.showToast('Run logged!', 'success');
  } else if (action === 'log-study') {
    await window.db.study.add({
      date: now, classId: null,
      subject: 'Study Session', durationMinutes: 60, notes: '',
    });
    App.showToast('Study logged!', 'success');
  } else if (action === 'log-polish') {
    await window.db.study.add({
      date: now, classId: null,
      subject: 'Polish Language', durationMinutes: 60, notes: '',
    });
    App.showToast('Polish logged!', 'success');
  } else if (action === 'log-weight') {
    openLogWeightModal(); return;
  } else if (action === 'new-note') {
    Notes.openEditor(null); return;
  } else { return; }
  if (App.currentTab === 'dashboard') await Dashboard.render();
}
window.quickLog = quickLog;

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
    slider.style.transform = currentView === 0 ? '' : `translateX(-${w}px)`;
    requestAnimationFrame(() => { slider.style.transition = ''; });
  }

  function goTo(n) {
    currentView = n;
    const w = card.offsetWidth;
    slider.style.transform = n === 0 ? '' : `translateX(-${w}px)`;
    card.querySelectorAll('.week-swipe-dot').forEach((d, i) => d.classList.toggle('active', i === n));
  }

  setTimeout(resize, 0);
  window.addEventListener('resize', resize);

  card.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  card.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    if (dx < -35) goTo(1);
    else if (dx > 35) goTo(0);
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
