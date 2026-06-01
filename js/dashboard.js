window.Dashboard = {
  async init() {},

  async render() {
    App.updateGreeting();
    await Promise.all([
      this.renderWeightCard(),
      this.renderStreakCard(),
      this.renderThisWeek(),
      this.renderTimeline(),
    ]);
  },

  async renderWeightCard() {
    const weights = await window.db.weight.getRecent(14);
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
      taglineEl.textContent = streak >= 7 ? 'On fire!' : streak >= 3 ? 'Keep it going!' : streak > 0 ? 'Building momentum!' : 'Start today!';
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
    if (weightDelta !== null) {
      const wStr = weightDelta > 0 ? `+${weightDelta.toFixed(1)}` : weightDelta.toFixed(1);
      const wCls = weightDelta < 0 ? 'trend-down' : 'trend-up';
      set('week-weight-delta', `<strong class="${wCls}">${wStr} kg</strong>`);
    } else {
      set('week-weight-delta', '<strong>-- kg</strong>');
    }

    // Mini bar charts per day of week
    const dayWorkouts = weekDates.map((d) => allWorkouts.filter((w) => w.date.startsWith(d)).length);
    const dayKm = weekDates.map((d) => allRuns.filter((r) => r.date.startsWith(d)).reduce((s, r) => s + r.distance, 0));
    const dayStudy = weekDates.map((d) => allStudy.filter((s) => s.date.startsWith(d)).reduce((t, s) => t + s.durationMinutes, 0) / 60);
    Charts.createMiniBarChart('week-workout-mini-chart', dayWorkouts, '#7C3AED');
    Charts.createMiniBarChart('week-run-mini-chart', dayKm, '#0EA5E9');
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
      events.push({ time: r.date, lucide: 'footprints', iconClass: 'icon-run', title: r.name, sub: `${r.distance} km • ${r.paceFormatted} /km`, type: 'run', id: r.id });
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

    container.innerHTML = events.map((e, idx) => `
      <div class="timeline-item" data-type="${e.type}" data-id="${e.id}">
        <div class="timeline-icon-col">
          <div class="timeline-icon ${e.iconClass}"><i data-lucide="${e.lucide}"></i></div>
          ${idx < events.length - 1 ? '<div class="timeline-connector"></div>' : ''}
        </div>
        <div class="timeline-content">
          <div class="timeline-time">${App.formatTime(e.time)}</div>
          <div class="timeline-title">${App.escapeHtml(e.title)}</div>
          <div class="timeline-sub">${App.escapeHtml(e.sub)}</div>
        </div>
        <div class="timeline-arrow">›</div>
      </div>
    `).join('');
    if (window.lucide) lucide.createIcons();
  },
};

// ─── Quick Actions ────────────────────────────────────────────────────────────
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === 'log-workout') Fitness.openLogWorkoutModal();
  else if (action === 'log-run') Fitness.openLogRunModal();
  else if (action === 'log-weight') openLogWeightModal();
  else if (action === 'new-note') Notes.openEditor(null);
});

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
