window.Study = {
  _subTab: 'overview',
  _timerInterval: null,
  _sessionFilter: { classId: '', dateFrom: '', dateTo: '' },

  async init() {
    document.querySelectorAll('.study-subtab-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.switchSubTab(btn.dataset.subtab));
    });
    this.restoreTimer();
  },

  async render() {
    await this.renderSubTab(this._subTab);
  },

  switchSubTab(tab) {
    this._subTab = tab;
    document.querySelectorAll('.study-subtab-btn').forEach((b) => b.classList.toggle('active', b.dataset.subtab === tab));
    document.querySelectorAll('.study-subtab-pane').forEach((p) => p.classList.toggle('active', p.dataset.subtabPane === tab));
    this.renderSubTab(tab);
  },

  async renderSubTab(tab) {
    if (tab === 'overview') await this.renderOverview();
    else if (tab === 'classes') await this.renderClasses();
    else if (tab === 'sessions') await this.renderSessions();
  },

  // ─── OVERVIEW ──────────────────────────────────────────────────────────────

  async renderOverview() {
    await Promise.all([
      this.renderTermProgress(),
      this.renderTimerCard(),
      this.renderTodayStudy(),
      this.renderThisWeekStudy(),
      this.renderStreakCalendar(),
    ]);
  },

  async renderTermProgress() {
    const classes = await window.db.classes.getAll();
    const termEnd = await window.db.settings.get('currentTermEnd', '2026-08-31');
    const totalCredits = await window.db.settings.get('degreeCreditHours', 120);
    const termName = await window.db.settings.get('currentTermName', 'Term 1');

    const termClasses = classes.filter((c) => c.term === (classes.find((x) => x.status === 'in_progress')?.term || classes[0]?.term));
    const termTotal = termClasses.length;
    const termPassed = termClasses.filter((c) => c.status === 'passed').length;
    const termPct = termTotal > 0 ? Math.round((termPassed / termTotal) * 100) : 0;

    const allPassed = classes.filter((c) => c.status === 'passed');
    const earnedCredits = allPassed.reduce((s, c) => s + (c.credits || 3), 0);
    const degreePct = Math.round((earnedCredits / totalCredits) * 100);

    const termEndDate = new Date(termEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const el = document.getElementById('study-progress-card');
    if (!el) return;
    el.innerHTML = `
      <div class="progress-card-row">
        <div class="progress-label">
          <span>Current Term</span>
          <span class="progress-count">${termPassed} / ${termTotal} classes · ends ${termEndDate}</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar" style="width:${termPct}%"></div>
        </div>
        <span class="progress-pct">${termPct}%</span>
      </div>
      <div class="progress-card-row" style="margin-top:12px">
        <div class="progress-label">
          <span>Overall Degree</span>
          <span class="progress-count">${earnedCredits} / ${totalCredits} credit hours</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar degree-bar" style="width:${degreePct}%"></div>
        </div>
        <span class="progress-pct">${degreePct}%</span>
      </div>
    `;
  },

  async renderTimerCard() {
    // Populate subject dropdown
    const classes = await window.db.classes.getAll();
    const activeClasses = classes.filter((c) => c.status === 'in_progress' || c.status === 'not_started');
    const select = document.getElementById('timer-subject-select');
    if (select) {
      const currentVal = select.value;
      select.innerHTML = '<option value="">Select subject…</option>' +
        activeClasses.map((c) => `<option value="${c.id}" ${String(c.id) === currentVal ? 'selected' : ''}>${c.code} ${c.name}</option>`).join('');
    }
    this.updateTimerDisplay();
  },

  restoreTimer() {
    const state = this._getTimerState();
    if (state && state.running) {
      this._startTimerTick();
    }
    this.updateTimerDisplay();
  },

  _getTimerState() {
    try { return JSON.parse(localStorage.getItem('st2_timer') || 'null'); } catch { return null; }
  },

  _setTimerState(state) {
    localStorage.setItem('st2_timer', JSON.stringify(state));
  },

  _clearTimerState() {
    localStorage.removeItem('st2_timer');
  },

  updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    const ring = document.getElementById('timer-ring');
    if (!display) return;

    const state = this._getTimerState();
    if (!state) {
      display.textContent = '00:00:00';
      if (ring) ring.classList.remove('running');
      return;
    }

    const elapsed = state.running
      ? state.elapsedOnPause + Math.floor((Date.now() - state.startTime) / 1000)
      : state.elapsedOnPause;

    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    display.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (ring) ring.classList.toggle('running', state.running);

    // Update buttons
    const startBtn = document.getElementById('timer-start-btn');
    const pauseBtn = document.getElementById('timer-pause-btn');
    const stopBtn = document.getElementById('timer-stop-btn');
    if (startBtn) startBtn.style.display = state.running ? 'none' : 'inline-flex';
    if (pauseBtn) pauseBtn.style.display = state.running ? 'inline-flex' : 'none';
    if (stopBtn) stopBtn.style.display = state.elapsedOnPause > 0 || state.running ? 'inline-flex' : 'none';
  },

  startTimer() {
    const select = document.getElementById('timer-subject-select');
    const classId = select?.value ? Number(select.value) : null;
    const subjectName = select?.options[select.selectedIndex]?.text || 'Unknown';

    const existing = this._getTimerState();
    this._setTimerState({
      running: true,
      startTime: Date.now(),
      elapsedOnPause: existing?.elapsedOnPause || 0,
      classId,
      subject: subjectName,
    });
    this._startTimerTick();
    this.updateTimerDisplay();
  },

  pauseTimer() {
    const state = this._getTimerState();
    if (!state || !state.running) return;
    const elapsed = state.elapsedOnPause + Math.floor((Date.now() - state.startTime) / 1000);
    this._setTimerState({ ...state, running: false, elapsedOnPause: elapsed });
    clearInterval(this._timerInterval);
    this._timerInterval = null;
    this.updateTimerDisplay();
  },

  async stopTimer() {
    const state = this._getTimerState();
    if (!state) return;
    this.pauseTimer();
    const finalState = this._getTimerState();
    const elapsed = finalState.elapsedOnPause;
    if (elapsed < 60) { App.showToast('Session too short (< 1 min). Discarded.', 'info'); this._clearTimerState(); this.updateTimerDisplay(); return; }
    const minutes = Math.round(elapsed / 60);

    // Determine subject name
    let subjectName = finalState.subject || 'Unknown';
    if (finalState.classId) {
      const cls = await window.db.classes.get(finalState.classId);
      if (cls) subjectName = `${cls.code} ${cls.name}`;
    }

    await window.db.study.add({
      date: new Date().toISOString(),
      classId: finalState.classId,
      subject: subjectName,
      durationMinutes: minutes,
      notes: '',
    });

    this._clearTimerState();
    clearInterval(this._timerInterval);
    this._timerInterval = null;
    this.updateTimerDisplay();
    App.showToast(`Session saved: ${App.formatMinutes(minutes)}`, 'success');
    await this.renderOverview();
    if (App.currentTab === 'dashboard') await Dashboard.render();
  },

  _startTimerTick() {
    clearInterval(this._timerInterval);
    this._timerInterval = setInterval(() => this.updateTimerDisplay(), 1000);
  },

  async renderTodayStudy() {
    const today = new Date().toISOString().split('T')[0];
    const sessions = await window.db.study.getForDate(today);
    const totalMin = sessions.reduce((s, x) => s + x.durationMinutes, 0);
    const el = document.getElementById('study-today-total');
    if (el) el.textContent = App.formatMinutes(totalMin) || '0m';
    const breakdown = document.getElementById('study-today-breakdown');
    if (breakdown) {
      if (sessions.length === 0) { breakdown.innerHTML = '<span class="sub">No sessions yet today.</span>'; return; }
      const bySubject = {};
      sessions.forEach((s) => { bySubject[s.subject] = (bySubject[s.subject] || 0) + s.durationMinutes; });
      breakdown.innerHTML = Object.entries(bySubject).map(([sub, min]) =>
        `<div class="today-session-row"><span>${App.escapeHtml(sub)}</span><span>${App.formatMinutes(min)}</span></div>`
      ).join('');
    }
  },

  async renderThisWeekStudy() {
    const weekDates = App.getWeekDates();
    const prevWeekDates = weekDates.map((d) => { const dt = new Date(d); dt.setDate(dt.getDate() - 7); return dt.toISOString().split('T')[0]; });

    const allSessions = await window.db.study.getAll();
    const thisSessions = allSessions.filter((s) => weekDates.some((d) => s.date.startsWith(d)));
    const prevSessions = allSessions.filter((s) => prevWeekDates.some((d) => s.date.startsWith(d)));

    const thisTotal = thisSessions.reduce((s, x) => s + x.durationMinutes, 0);
    const prevTotal = prevSessions.reduce((s, x) => s + x.durationMinutes, 0);
    const diffMin = thisTotal - prevTotal;

    const totalEl = document.getElementById('study-week-total');
    if (totalEl) {
      const h = Math.floor(thisTotal / 60);
      const m = thisTotal % 60;
      totalEl.textContent = `${h}h ${m}m`;
    }
    const vsEl = document.getElementById('study-week-vs');
    if (vsEl) {
      const sign = diffMin >= 0 ? '+' : '';
      const cls = diffMin >= 0 ? 'trend-up' : 'trend-down';
      vsEl.innerHTML = `<span class="${cls}">${sign}${App.formatMinutes(Math.abs(diffMin))} vs last week</span>`;
    }

    const weeklyGoal = 20 * 60; // 20h in minutes
    const pct = Math.min(Math.round((thisTotal / weeklyGoal) * 100), 100);
    const goalBar = document.getElementById('study-week-goal-bar');
    if (goalBar) goalBar.style.width = pct + '%';
    const goalPct = document.getElementById('study-week-goal-pct');
    if (goalPct) goalPct.textContent = pct + '%';

    const studyPerDay = weekDates.map((d) =>
      Math.round(allSessions.filter((s) => s.date.startsWith(d)).reduce((sum, x) => sum + x.durationMinutes, 0) / 60 * 10) / 10
    );
    Charts.createStudyWeekBars('study-week-chart', ['M', 'T', 'W', 'T', 'F', 'S', 'S'], studyPerDay);
  },

  async renderStreakCalendar() {
    const allSessions = await window.db.study.getAll();
    const classes = await window.db.classes.getAll();

    // Build active day map: date → minutes
    const dayMinutes = {};
    allSessions.forEach((s) => {
      const d = s.date.split('T')[0];
      dayMinutes[d] = (dayMinutes[d] || 0) + s.durationMinutes;
    });

    // Passed dates from classes
    const passedDates = new Set(classes.filter((c) => c.passedDate).map((c) => c.passedDate));

    // Streak
    let streak = 0;
    const today = new Date();
    const checkDate = new Date(today);
    const todayStr = today.toISOString().split('T')[0];
    if (!dayMinutes[todayStr] || dayMinutes[todayStr] < 30) checkDate.setDate(checkDate.getDate() - 1);
    while (true) {
      const ds = checkDate.toISOString().split('T')[0];
      if (dayMinutes[ds] >= 30) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
      else break;
    }

    const streakEl = document.getElementById('study-streak-count');
    if (streakEl) streakEl.textContent = streak;

    // Monthly calendar
    const calEl = document.getElementById('study-calendar');
    if (!calEl) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthName = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const startOffset = (firstDay + 6) % 7; // Mon=0

    const monthEl = document.getElementById('study-calendar-month');
    if (monthEl) monthEl.textContent = monthName;

    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push('<div class="cal-cell empty"></div>');
    for (let day = 1; day <= daysInMonth; day++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const mins = dayMinutes[ds] || 0;
      const passed = passedDates.has(ds);
      const isToday = ds === todayStr;
      let dotClass = 'dot-none';
      if (mins >= 360) dotClass = 'dot-gold';
      else if (mins >= 180) dotClass = 'dot-dark';
      else if (mins >= 60) dotClass = 'dot-mid';
      else if (mins >= 1) dotClass = 'dot-light';
      cells.push(`<div class="cal-cell ${isToday ? 'cal-today' : ''}">
        <div class="cal-dot ${dotClass}"></div>
        <span class="cal-day-num">${day}</span>
      </div>`);
    }
    calEl.innerHTML = cells.join('');
  },

  // ─── CLASSES ───────────────────────────────────────────────────────────────

  _classFilter: 'all',

  async renderClasses() {
    const classes = await window.db.classes.getAll();
    const sessions = await window.db.study.getAll();

    const container = document.getElementById('classes-list');
    if (!container) return;

    let filtered = classes;
    if (this._classFilter !== 'all') {
      filtered = classes.filter((c) => {
        if (this._classFilter === 'in_progress') return c.status === 'in_progress';
        if (this._classFilter === 'passed') return c.status === 'passed';
        if (this._classFilter === 'not_started') return c.status === 'not_started';
        return true;
      });
    }

    filtered.sort((a, b) => {
      const order = { in_progress: 0, not_started: 1, passed: 2 };
      return (order[a.status] || 1) - (order[b.status] || 1);
    });

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No classes found.</p></div>';
      return;
    }

    container.innerHTML = filtered.map((cls) => {
      const classSessions = sessions.filter((s) => s.classId === cls.id);
      const totalMin = classSessions.reduce((s, x) => s + x.durationMinutes, 0);
      const statusLabels = { passed: 'Passed ✓', in_progress: 'In Progress', not_started: 'Not Started' };
      const statusClass = { passed: 'status-passed', in_progress: 'status-active', not_started: 'status-pending' };
      return `
      <div class="class-card">
        <div class="class-card-header">
          <div>
            <div class="class-name">${App.escapeHtml(cls.name)}</div>
            <div class="class-meta">${cls.code} · ${cls.credits} credits · ${cls.term}</div>
          </div>
          <span class="status-badge ${statusClass[cls.status] || ''}">${statusLabels[cls.status] || cls.status}</span>
        </div>
        <div class="class-hours">${App.formatMinutes(totalMin)} studied</div>
        ${cls.status === 'passed' && cls.passedDate
          ? `<div class="class-passed-date">Completed ${App.formatDate(cls.passedDate)}</div>`
          : ''}
        ${cls.status !== 'passed'
          ? `<button class="btn-mark-passed" onclick="Study.markPassed(${cls.id})">Mark as Passed ✓</button>`
          : ''}
      </div>`;
    }).join('');
  },

  setClassFilter(filter) {
    this._classFilter = filter;
    document.querySelectorAll('.class-filter-btn').forEach((b) => b.classList.toggle('active', b.dataset.classFilter === filter));
    this.renderClasses();
  },

  async markPassed(classId) {
    const cls = await window.db.classes.get(classId);
    if (!cls) return;

    // Show confetti
    this._confetti();

    const passedDate = new Date().toISOString().split('T')[0];
    await window.db.classes.update({ ...cls, status: 'passed', passedDate });
    App.showToast(`${cls.code} marked as passed!`, 'success');
    await this.renderClasses();
    await this.renderTermProgress();
    await this.renderStreakCalendar();
  },

  _confetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    const colors = ['#7C3AED', '#22C55E', '#F59E0B', '#EF4444', '#3B82F6'];
    for (let i = 0; i < 60; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.cssText = `left:${Math.random() * 100}%;background:${colors[Math.floor(Math.random() * colors.length)]};animation-delay:${Math.random() * 0.5}s;animation-duration:${1 + Math.random()}s`;
      container.appendChild(piece);
    }
    setTimeout(() => container.remove(), 3000);
  },

  openAddClassModal() {
    const modal = document.getElementById('modal-add-class');
    if (!modal) return;
    modal.querySelector('#class-name-input').value = '';
    modal.querySelector('#class-code-input').value = '';
    modal.querySelector('#class-credits-input').value = '3';
    modal.querySelector('#class-term-input').value = 'Term 1';
    modal.querySelector('#class-status-select').value = 'not_started';
    App.openModal('modal-add-class');
  },

  async saveClass() {
    const name = document.getElementById('class-name-input')?.value.trim();
    const code = document.getElementById('class-code-input')?.value.trim();
    const credits = parseInt(document.getElementById('class-credits-input')?.value) || 3;
    const term = document.getElementById('class-term-input')?.value.trim() || 'Term 1';
    const status = document.getElementById('class-status-select')?.value || 'not_started';

    if (!name) { App.showToast('Enter a class name.', 'error'); return; }
    await window.db.classes.add({ name, code, credits, term, status, startDate: null, passedDate: null });
    App.closeAllModals();
    App.showToast('Class added!', 'success');
    await this.renderClasses();
    await this.renderTermProgress();
  },

  // ─── SESSIONS ──────────────────────────────────────────────────────────────

  async renderSessions() {
    const sessions = await window.db.study.getAll();
    const classes = await window.db.classes.getAll();
    const classMap = {};
    classes.forEach((c) => { classMap[c.id] = c; });

    // Populate class filter
    const select = document.getElementById('session-class-filter');
    if (select) {
      select.innerHTML = '<option value="">All subjects</option>' +
        classes.map((c) => `<option value="${c.id}">${c.code} ${c.name}</option>`).join('');
    }

    let filtered = sessions;
    if (this._sessionFilter.classId) filtered = filtered.filter((s) => String(s.classId) === String(this._sessionFilter.classId));
    if (this._sessionFilter.dateFrom) filtered = filtered.filter((s) => s.date >= this._sessionFilter.dateFrom);
    if (this._sessionFilter.dateTo) filtered = filtered.filter((s) => s.date <= this._sessionFilter.dateTo + 'T23:59:59');

    const totalMin = filtered.reduce((s, x) => s + x.durationMinutes, 0);

    const totalEl = document.getElementById('sessions-total');
    if (totalEl) {
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      totalEl.textContent = `${h}h ${m}m total`;
    }

    const container = document.getElementById('sessions-list');
    if (!container) return;

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No sessions found.</p></div>';
      return;
    }

    container.innerHTML = filtered.map((s) => `
      <div class="session-row">
        <div class="session-icon"><i data-lucide="book-open" style="width:16px;height:16px;stroke:#60A5FA;fill:none"></i></div>
        <div class="session-content">
          <div class="session-subject">${App.escapeHtml(s.subject)}</div>
          <div class="session-meta">${App.formatDate(s.date, { relative: true })} · ${App.formatTime(s.date)}</div>
          ${s.notes ? `<div class="session-notes">${App.escapeHtml(s.notes)}</div>` : ''}
        </div>
        <div class="session-duration">${App.formatMinutes(s.durationMinutes)}</div>
      </div>
    `).join('');
  },

  filterSessions() {
    this._sessionFilter.classId = document.getElementById('session-class-filter')?.value || '';
    this._sessionFilter.dateFrom = document.getElementById('session-date-from')?.value || '';
    this._sessionFilter.dateTo = document.getElementById('session-date-to')?.value || '';
    this.renderSessions();
  },

  async openManualLogModal() {
    const modal = document.getElementById('modal-log-study');
    if (!modal) return;
    modal.querySelector('#study-date-input').value = new Date().toISOString().slice(0, 16);
    modal.querySelector('#study-duration-input').value = '';
    modal.querySelector('#study-notes-input').value = '';

    // Populate subject dropdown
    const classes = await window.db.classes.getAll();
    const select = document.getElementById('study-class-select');
    if (select) {
      select.innerHTML = '<option value="">Select subject…</option>' +
        classes.map((c) => `<option value="${c.id}">${c.code} ${c.name}</option>`).join('');
    }

    App.openModal('modal-log-study');
  },

  async saveManualSession() {
    const select = document.getElementById('study-class-select');
    const classId = select?.value ? Number(select.value) : null;
    const subjectName = select?.options[select.selectedIndex]?.text || 'Unknown';
    const dateVal = document.getElementById('study-date-input')?.value;
    const durationMin = parseInt(document.getElementById('study-duration-input')?.value) || 0;
    const notes = document.getElementById('study-notes-input')?.value.trim() || '';

    if (durationMin <= 0) { App.showToast('Enter a valid duration.', 'error'); return; }

    await window.db.study.add({
      date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
      classId,
      subject: subjectName,
      durationMinutes: durationMin,
      notes,
    });
    App.closeAllModals();
    App.showToast('Session logged!', 'success');
    await this.renderSubTab(this._subTab);
  },
};

window.Study = Study;
window.StudyStartTimer = () => Study.startTimer();
window.StudyPauseTimer = () => Study.pauseTimer();
window.StudyStopTimer = () => Study.stopTimer();
window.StudyMarkPassed = (id) => Study.markPassed(id);
window.StudyOpenAddClass = () => Study.openAddClassModal();
window.StudySaveClass = () => Study.saveClass();
window.StudyFilterSessions = () => Study.filterSessions();
window.StudyOpenManualLog = () => Study.openManualLogModal();
window.StudySaveManualSession = () => Study.saveManualSession();
window.StudySetClassFilter = (f) => Study.setClassFilter(f);
