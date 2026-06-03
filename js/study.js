window.Study = {
  _subTab: 'overview',
  _timerInterval: null,
  _sessionFilter: { classId: '', dateFrom: '', dateTo: '' },
  _calendarYear: new Date().getFullYear(),
  _calendarMonth: new Date().getMonth(),

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
    const termEnd = await window.db.settings.get('currentTermEnd', '2026-10-31');
    const termName = await window.db.settings.get('currentTermName', 'Term 1');

    const currentTermName = classes.find((x) => x.status === 'in_progress')?.term
      || classes[0]?.term
      || termName;
    const termClasses = classes.filter((c) => c.term === currentTermName);
    const activeTermClasses = termClasses.filter((c) => c.status === 'in_progress' || c.status === 'passed');
    const termTotal = activeTermClasses.length;
    const termPassed = termClasses.filter((c) => c.status === 'passed').length;
    const termPct = termTotal > 0 ? Math.round((termPassed / termTotal) * 100) : 0;

    // Time progress: estimate term start as 6 months before end
    const now = new Date();
    const termEndDate = new Date(termEnd);
    const termStartDate = new Date(termEndDate);
    termStartDate.setMonth(termStartDate.getMonth() - 6);
    const timePct = Math.min(100, Math.max(0, Math.round(((now - termStartDate) / (termEndDate - termStartDate)) * 100)));
    const termEndStr = termEndDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    // Last passed class in this term
    const passedClasses = termClasses
      .filter((c) => c.status === 'passed' && c.passedDate)
      .sort((a, b) => new Date(b.passedDate) - new Date(a.passedDate));
    const lastPassed = passedClasses[0] || null;
    const lastPassedName = lastPassed ? lastPassed.name : null;
    const lastPassedDateStr = lastPassed
      ? new Date(lastPassed.passedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;

    // SVG circle ring
    const r = 24;
    const circ = +(2 * Math.PI * r).toFixed(2);
    const offset = +(circ * (1 - termPct / 100)).toFixed(2);

    const lastPassedDisplay = lastPassed
      ? `${App.escapeHtml(lastPassed.name)} - ${App.escapeHtml(lastPassed.code || '')}`
      : null;

    const rightHtml = lastPassed
      ? `<div class="term-last-class">${lastPassedDisplay}</div>
         <div class="term-passed-row">🎉 <span class="term-passed-label">Passed</span></div>
         <div class="term-passed-date">Completed on ${lastPassedDateStr}</div>
         <button class="link-btn term-view-all" onclick="Study.switchSubTab('classes')">View All Classes ›</button>`
      : `<div class="term-no-pass">No classes passed yet</div>
         <button class="link-btn term-view-all" onclick="Study.switchSubTab('classes')">View All Classes ›</button>`;

    const el = document.getElementById('study-progress-card');
    if (!el) return;
    el.innerHTML = `
      <div class="term-section-label">CURRENT TERM PROGRESS</div>
      <div class="term-card-body">
        <div class="term-left">
          <div class="term-circle-row">
            <svg class="term-circle-svg" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
              <circle cx="28" cy="28" r="${r}" fill="none" stroke="var(--border)" stroke-width="4"/>
              <circle cx="28" cy="28" r="${r}" fill="none" stroke="var(--accent)" stroke-width="4"
                stroke-linecap="round"
                stroke-dasharray="${circ}"
                stroke-dashoffset="${offset}"
                transform="rotate(-90 28 28)"/>
              <text x="28" y="33" text-anchor="middle" fill="var(--text)" font-size="11" font-weight="700" font-family="Outfit,sans-serif">${termPct}%</text>
            </svg>
            <div class="term-count-wrap">
              <div class="term-count">${termPassed}/${termTotal}</div>
              <div class="term-count-label">CLASSES COMPLETED</div>
            </div>
          </div>
          <div class="term-time-wrap">
            <div class="term-time-bar"><div class="term-time-fill" style="width:${timePct}%"></div></div>
            <div class="term-time-label">Term ends ${termEndStr}</div>
          </div>
        </div>
        <div class="term-divider">|</div>
        <div class="term-right">${rightHtml}</div>
      </div>
    `;
  },

  async renderTimerCard() {
    // Pre-populate the timer class picker modal with in-progress classes
    const classes = await window.db.classes.getAll();
    const inProgress = classes.filter((c) => c.status === 'in_progress');
    const select = document.getElementById('timer-class-select');
    if (select) {
      select.innerHTML = '<option value="">No class (general study)</option>' +
        inProgress.map((c) => `<option value="${c.id}">${c.code} ${c.name}</option>`).join('');
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
    if (!display) return;

    const state = this._getTimerState();
    if (!state) {
      display.textContent = '00:00:00';
      this._setTimerButtons('idle');
      return;
    }

    const elapsed = state.running
      ? state.elapsedOnPause + Math.floor((Date.now() - state.startTime) / 1000)
      : state.elapsedOnPause;

    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    display.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    if (state.running) {
      this._setTimerButtons('running');
    } else if (state.elapsedOnPause > 0) {
      this._setTimerButtons('paused');
    } else {
      this._setTimerButtons('idle');
    }
  },

  _setTimerButtons(state) {
    const startBtn = document.getElementById('timer-start-btn');
    const controls = document.getElementById('study-timer-controls');
    const pauseBtn = document.getElementById('timer-pause-btn');
    const stopBtn = document.getElementById('timer-stop-btn');
    if (state === 'idle') {
      if (startBtn) startBtn.style.display = '';
      if (controls) controls.style.display = 'none';
    } else if (state === 'running') {
      if (startBtn) startBtn.style.display = 'none';
      if (controls) controls.style.display = 'flex';
      if (pauseBtn) pauseBtn.textContent = '⏸ Pause';
      if (stopBtn) stopBtn.style.display = '';
    } else if (state === 'paused') {
      if (startBtn) startBtn.style.display = 'none';
      if (controls) controls.style.display = 'flex';
      if (pauseBtn) pauseBtn.textContent = '▶ Resume';
      if (stopBtn) stopBtn.style.display = '';
    }
  },

  startTimer(classId, subjectName) {
    const existing = this._getTimerState();
    this._setTimerState({
      running: true,
      startTime: Date.now(),
      elapsedOnPause: existing?.elapsedOnPause || 0,
      classId: classId || null,
      subject: subjectName || 'Study',
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

    // Update today total display
    const el = document.getElementById('study-today-total');
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (el) el.innerHTML = h > 0
      ? `<span class="study-total-h">${h}</span><span class="study-total-unit">h </span><span class="study-total-h">${m}</span><span class="study-total-unit">m</span>`
      : `<span class="study-total-h">${m}</span><span class="study-total-unit">m</span>`;

    // Daily goal: default 4h (240 min), from settings
    const dailyGoalMin = (await window.db.settings.get('dailyStudyGoalHours', 4)) * 60;
    const goalH = Math.floor(dailyGoalMin / 60);
    const goalM = dailyGoalMin % 60;
    const goalLabel = document.getElementById('study-daily-goal-label');
    if (goalLabel) goalLabel.textContent = `${goalH}h ${String(goalM).padStart(2, '0')}m`;

    const rawPct = Math.round((totalMin / dailyGoalMin) * 100);
    const isOnFire = rawPct >= 100;
    const bar = document.getElementById('study-daily-goal-bar');
    if (bar) {
      bar.style.width = Math.min(rawPct, 100) + '%';
      bar.style.background = isOnFire ? '#F97316' : '#22C55E';
    }
    const pctEl = document.getElementById('study-daily-goal-pct');
    if (pctEl) {
      pctEl.textContent = rawPct + '%' + (isOnFire ? ' 🔥' : '');
      pctEl.style.color = isOnFire ? '#F97316' : '#22C55E';
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
      totalEl.innerHTML = `<span class="study-week-num">${h}</span><span class="study-week-unit">h </span><span class="study-week-num">${m}</span><span class="study-week-unit">m</span>`;
    }

    const weeklyGoal = 20 * 60; // 20h in minutes
    const rawPct = Math.round((thisTotal / weeklyGoal) * 100);
    const isOnFire = rawPct >= 100;
    const goalBar = document.getElementById('study-week-goal-bar');
    if (goalBar) {
      goalBar.style.width = Math.min(rawPct, 100) + '%';
      goalBar.style.background = isOnFire ? '#F97316' : '#22C55E';
    }
    const goalPct = document.getElementById('study-week-goal-pct');
    if (goalPct) {
      goalPct.textContent = rawPct + '%' + (isOnFire ? ' 🔥' : '');
      goalPct.style.color = isOnFire ? '#F97316' : '#22C55E';
    }

    const dailyGoalHours = (await window.db.settings.get('dailyStudyGoalHours', 4));
    const studyPerDay = weekDates.map((d) =>
      Math.round(allSessions.filter((s) => s.date.startsWith(d)).reduce((sum, x) => sum + x.durationMinutes, 0) / 60 * 10) / 10
    );
    Charts.createStudyWeekBars('study-week-chart', ['M', 'T', 'W', 'T', 'F', 'S', 'S'], studyPerDay, dailyGoalHours);
  },

  calPrevMonth() {
    if (this._calendarMonth === 0) { this._calendarMonth = 11; this._calendarYear--; }
    else this._calendarMonth--;
    this.renderStreakCalendar();
  },

  calNextMonth() {
    if (this._calendarMonth === 11) { this._calendarMonth = 0; this._calendarYear++; }
    else this._calendarMonth++;
    this.renderStreakCalendar();
  },

  async renderStreakCalendar() {
    const allSessions = await window.db.study.getAll();

    // Build active day map: date → minutes
    const dayMinutes = {};
    allSessions.forEach((s) => {
      const d = s.date.split('T')[0];
      dayMinutes[d] = (dayMinutes[d] || 0) + s.durationMinutes;
    });

    // Streak (always calculated from today regardless of displayed month)
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

    // Month metrics
    const year = this._calendarYear;
    const month = this._calendarMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let daysStudied = 0;
    let monthTotalMins = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const mins = dayMinutes[ds] || 0;
      if (mins > 0) daysStudied++;
      monthTotalMins += mins;
    }
    const daysEl = document.getElementById('study-days-studied');
    if (daysEl) daysEl.textContent = daysStudied;
    const monthTotalEl = document.getElementById('study-month-total');
    if (monthTotalEl) {
      const mh = Math.floor(monthTotalMins / 60);
      const mm = monthTotalMins % 60;
      monthTotalEl.textContent = mh > 0 ? `${mh}h ${mm}m` : `${mm}m`;
    }

    // Month label
    const monthName = new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
    const monthEl = document.getElementById('study-calendar-month');
    if (monthEl) monthEl.textContent = monthName;

    // Calendar grid
    const calEl = document.getElementById('study-calendar');
    if (!calEl) return;

    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = (firstDay + 6) % 7; // Mon=0

    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push('<div class="cal-cell empty"></div>');
    for (let day = 1; day <= daysInMonth; day++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const mins = dayMinutes[ds] || 0;
      const isToday = ds === todayStr;
      let dotClass = 'dot-none';
      if (mins >= 360) dotClass = 'dot-gold';
      else if (mins >= 180) dotClass = 'dot-dark';
      else if (mins >= 60) dotClass = 'dot-mid';
      else if (mins >= 1) dotClass = 'dot-light';
      cells.push(`<div class="cal-cell ${isToday ? 'cal-today' : ''}"><div class="cal-dot ${dotClass}"></div><span class="cal-day-num">${day}</span></div>`);
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
      const isPassed = cls.status === 'passed';
      return `
      <div class="class-swipe-row" id="class-swipe-${cls.id}">
        <div class="class-card ${isPassed ? 'class-card-passed' : ''}">
          <div class="class-card-header">
            <div>
              <div class="class-name">${App.escapeHtml(cls.name)}</div>
              <div class="class-meta">${cls.code} · ${cls.credits} credits · ${cls.term}</div>
            </div>
            <span class="status-badge ${statusClass[cls.status] || ''}">${statusLabels[cls.status] || cls.status}</span>
          </div>
          <div class="class-hours">${App.formatMinutes(totalMin)} studied</div>
          ${isPassed && cls.passedDate
            ? `<div class="class-passed-date">Completed ${App.formatDate(cls.passedDate)}</div>`
            : ''}
          ${!isPassed
            ? `<button class="btn-mark-passed" onclick="Study.markPassed(${cls.id})">Mark as Passed ✓</button>`
            : ''}
        </div>
        <button class="class-delete-btn" onclick="Study.confirmDeleteClass(${cls.id})">🗑</button>
      </div>`;
    }).join('');

    // Wire up swipe-to-reveal-delete on each row
    container.querySelectorAll('.class-swipe-row').forEach((row) => {
      let startX = 0;
      let startY = 0;
      let swiping = false;
      const card = row.querySelector('.class-card');
      const deleteBtn = row.querySelector('.class-delete-btn');

      row.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        swiping = false;
      }, { passive: true });

      row.addEventListener('touchmove', (e) => {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (!swiping && Math.abs(dy) > Math.abs(dx)) return;
        swiping = true;
        if (dx < -10) row.classList.add('swiping');
        if (dx < 0) {
          const shift = Math.max(-72, dx);
          card.style.transform = `translateX(${shift}px)`;
        } else if (dx > 0) {
          card.style.transform = 'translateX(0)';
          row.classList.remove('swiping');
        }
      }, { passive: true });

      row.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - startX;
        if (dx < -50) {
          card.style.transform = 'translateX(-72px)';
          row.classList.add('swipe-open');
        } else {
          card.style.transform = '';
          row.classList.remove('swipe-open');
          row.classList.remove('swiping');
        }
      });

      // Tap elsewhere to close
      document.addEventListener('touchstart', (e) => {
        if (!row.contains(e.target)) {
          card.style.transform = '';
          row.classList.remove('swipe-open');
        }
      }, { passive: true });
    });
  },

  async confirmDeleteClass(classId) {
    const cls = await window.db.classes.get(classId);
    if (!cls) return;
    const label = `"${cls.name}${cls.code ? ' - ' + cls.code : ''}"`;
    if (!confirm(`Are you sure you wish to remove ${label}?`)) return;
    await window.db.classes.delete(classId);
    await this.renderClasses();
    await this.renderTermProgress();
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
    const now = new Date();
    const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const oneHourAgo = new Date(now - 3600000);
    const startInput = modal.querySelector('#study-start-input');
    const endInput = modal.querySelector('#study-end-input');
    if (startInput) startInput.value = iso(oneHourAgo);
    if (endInput) endInput.value = iso(now);
    if (modal.querySelector('#study-notes-input')) modal.querySelector('#study-notes-input').value = '';

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
    const startVal = document.getElementById('study-start-input')?.value;
    const endVal = document.getElementById('study-end-input')?.value;
    const notes = document.getElementById('study-notes-input')?.value.trim() || '';

    if (!startVal || !endVal) { App.showToast('Enter start and end times.', 'error'); return; }
    const startDate = new Date(startVal);
    const endDate = new Date(endVal);
    const durationMin = Math.round((endDate - startDate) / 60000);
    if (durationMin <= 0) { App.showToast('End time must be after start time.', 'error'); return; }

    await window.db.study.add({
      date: startDate.toISOString(),
      classId,
      subject: subjectName,
      durationMinutes: durationMin,
      notes,
    });
    App.closeAllModals();
    App.showToast('Session logged!', 'success');
    await this.renderSubTab(this._subTab);
    if (App.currentTab === 'dashboard') await Dashboard.render();
  },

  async openTimerClassPicker() {
    const classes = await window.db.classes.getAll();
    const inProgress = classes.filter((c) => c.status === 'in_progress');
    const select = document.getElementById('timer-class-select');
    if (select) {
      select.innerHTML = '<option value="">No class (general study)</option>' +
        inProgress.map((c) => `<option value="${c.id}">${c.code} ${c.name}</option>`).join('');
    }
    App.openModal('modal-timer-class');
  },

  confirmStartTimer() {
    const select = document.getElementById('timer-class-select');
    const classId = select?.value ? Number(select.value) : null;
    const subjectName = select?.options[select.selectedIndex]?.text || 'Study';
    App.closeAllModals();
    this.startTimer(classId, subjectName);
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
window.StudyStartTimerFlow = () => Study.openTimerClassPicker();
window.StudyConfirmStartTimer = () => Study.confirmStartTimer();
