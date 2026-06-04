window.Habits = {
  _habits: [],
  _logs: {},
  _initialized: false,

  async init() {
    this._initialized = true;
  },

  async render() {
    const el = document.getElementById('tab-habits');
    if (!el) return;
    this._habits = await window.db.habits.getAll();
    // Load all logs
    this._logs = {};
    for (const h of this._habits) {
      const logs = await window.db.habitLogs.getForHabit(h.id);
      this._logs[h.id] = logs.map(l => l.date);
    }
    el.innerHTML = `
      <div class="habits-header">
        <h2 class="habits-title">Habits</h2>
        <button class="habits-add-btn" onclick="Habits.openAddModal()">＋</button>
      </div>
      <div class="habits-list" id="habits-list">
        ${this._habits.length === 0 ? `<div class="habits-empty">No habits yet.<br>Tap ＋ to add your first habit.</div>` : this._habits.map(h => this._renderHabitCard(h)).join('')}
      </div>
    `;
  },

  _renderHabitCard(habit) {
    const today = new Date().toISOString().split('T')[0];
    const logs = this._logs[habit.id] || [];
    const logSet = new Set(logs);
    const isDaily = habit.frequency === 'daily';

    // Check today status
    let isDoneToday, doneCountThisWeek;
    if (isDaily) {
      isDoneToday = logSet.has(today);
    } else {
      // weekly: count logs this week
      const weekDates = App.getWeekDates();
      doneCountThisWeek = weekDates.filter(d => logSet.has(d)).length;
      isDoneToday = doneCountThisWeek >= (habit.targetPerWeek || 1);
    }

    // Streak calculation
    const streak = isDaily
      ? this._calcDailyStreak(logs, today)
      : this._calcWeeklyStreak(logs, habit.targetPerWeek || 1, today);

    // Dot grid: last 91 days (13 weeks × 7 days), Mon-first
    const dotGrid = this._buildDotGrid(logs, 91);

    const color = habit.color || '#3B82F6';
    const emoji = habit.emoji || '';
    const freq = isDaily ? 'Daily' : `${habit.targetPerWeek}× / week`;

    return `
      <div class="habit-card" style="--habit-color:${color}" data-id="${habit.id}">
        <div class="habit-card-top">
          <div class="habit-card-left">
            ${emoji ? `<span class="habit-emoji">${emoji}</span>` : ''}
            <div class="habit-info">
              <div class="habit-name">${App.escapeHtml(habit.name)}</div>
              <div class="habit-freq">${freq}</div>
            </div>
          </div>
          <div class="habit-card-right">
            <div class="habit-streak">
              <span class="habit-streak-num">${streak}</span>
              <span class="habit-streak-label">${isDaily ? 'day streak' : 'wk streak'}</span>
            </div>
            <button class="habit-dots-btn" onclick="Habits.showMenu(event,${habit.id})">···</button>
          </div>
        </div>
        <div class="habit-dot-grid">${dotGrid}</div>
        <div class="habit-card-bottom">
          ${isDaily
            ? `<button class="habit-check-btn${isDoneToday ? ' done' : ''}" onclick="Habits.toggleToday(${habit.id})" style="--habit-color:${color}">
                ${isDoneToday ? '✓ Done' : '+ Mark Done'}
              </button>`
            : `<div class="habit-weekly-tracker">
                <span class="habit-weekly-count">${doneCountThisWeek} / ${habit.targetPerWeek} this week</span>
                <div class="habit-weekly-btns">
                  <button class="habit-weekly-log" onclick="Habits.logWeekly(${habit.id})" style="--habit-color:${color}">＋</button>
                  <button class="habit-weekly-unlog" onclick="Habits.unlogWeekly(${habit.id})">－</button>
                </div>
              </div>`
          }
        </div>
      </div>
    `;
  },

  _buildDotGrid(logs, days) {
    const logSet = new Set(logs);
    const today = new Date();
    // Start from monday of 13 weeks ago
    const startDate = new Date(today);
    const dayOfWeek = (today.getDay() + 6) % 7; // 0=Mon
    startDate.setDate(today.getDate() - dayOfWeek - (12 * 7));

    let cols = '';
    for (let week = 0; week < 13; week++) {
      let col = '<div class="habit-dot-col">';
      for (let day = 0; day < 7; day++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + week * 7 + day);
        const dateStr = d.toISOString().split('T')[0];
        const isLogged = logSet.has(dateStr);
        const isFuture = d > today;
        col += `<div class="habit-dot${isLogged ? ' logged' : ''}${isFuture ? ' future' : ''}" title="${dateStr}"></div>`;
      }
      col += '</div>';
      cols += col;
    }
    return cols;
  },

  _calcDailyStreak(logs, today) {
    if (!logs.length) return 0;
    const logSet = new Set(logs);
    let streak = 0;
    const d = new Date(today);
    // If not logged today, start from yesterday
    if (!logSet.has(today)) d.setDate(d.getDate() - 1);
    while (true) {
      const dateStr = d.toISOString().split('T')[0];
      if (!logSet.has(dateStr)) break;
      streak++;
      d.setDate(d.getDate() - 1);
      if (streak > 1000) break;
    }
    return streak;
  },

  _calcWeeklyStreak(logs, targetPerWeek, today) {
    if (!logs.length) return 0;
    const logSet = new Set(logs);
    let streak = 0;
    // Get current week's monday
    const d = new Date(today);
    const dayOfWeek = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dayOfWeek);

    while (streak < 1000) {
      const monday = new Date(d);
      const weekDates = Array.from({ length: 7 }, (_, i) => {
        const wd = new Date(monday);
        wd.setDate(monday.getDate() + i);
        return wd.toISOString().split('T')[0];
      });
      const count = weekDates.filter(wd => logSet.has(wd)).length;
      if (count < targetPerWeek) {
        // If it's the current week and we haven't met target yet, don't break streak
        if (streak === 0) {
          d.setDate(d.getDate() - 7);
          continue;
        }
        break;
      }
      streak++;
      d.setDate(d.getDate() - 7);
    }
    return streak;
  },

  async toggleToday(habitId) {
    const today = new Date().toISOString().split('T')[0];
    const isLogged = await window.db.habitLogs.isLogged(habitId, today);
    if (isLogged) {
      await window.db.habitLogs.unlog(habitId, today);
    } else {
      await window.db.habitLogs.log(habitId, today);
    }
    await this.render();
  },

  async logWeekly(habitId) {
    const today = new Date().toISOString().split('T')[0];
    // For weekly habits: log today (or try next available day this week if today already logged)
    const isLogged = await window.db.habitLogs.isLogged(habitId, today);
    if (!isLogged) {
      await window.db.habitLogs.log(habitId, today);
    } else {
      // Find the next unlogged day this week
      const weekDates = App.getWeekDates();
      for (const d of weekDates) {
        const logged = await window.db.habitLogs.isLogged(habitId, d);
        if (!logged) {
          await window.db.habitLogs.log(habitId, d);
          break;
        }
      }
    }
    await this.render();
  },

  async unlogWeekly(habitId) {
    const weekDates = App.getWeekDates();
    // Remove the most recent log this week
    for (let i = weekDates.length - 1; i >= 0; i--) {
      const logged = await window.db.habitLogs.isLogged(habitId, weekDates[i]);
      if (logged) {
        await window.db.habitLogs.unlog(habitId, weekDates[i]);
        break;
      }
    }
    await this.render();
  },

  showMenu(e, habitId) {
    e.stopPropagation();
    document.getElementById('habit-action-sheet')?.remove();
    const sheet = document.createElement('div');
    sheet.id = 'habit-action-sheet';
    sheet.className = 'action-sheet-backdrop';
    sheet.innerHTML = `<div class="action-sheet">
      <button class="action-sheet-item" onclick="document.getElementById('habit-action-sheet')?.remove(); Habits.openEditModal(${habitId})">Edit Habit</button>
      <button class="action-sheet-item action-sheet-danger" onclick="document.getElementById('habit-action-sheet')?.remove(); Habits.deleteHabit(${habitId})">Delete Habit</button>
      <button class="action-sheet-cancel" onclick="document.getElementById('habit-action-sheet').remove()">Cancel</button>
    </div>`;
    sheet.addEventListener('click', (ev) => { if (ev.target === sheet) sheet.remove(); });
    document.body.appendChild(sheet);
    requestAnimationFrame(() => sheet.classList.add('open'));
  },

  async deleteHabit(habitId) {
    if (!confirm('Delete this habit and all its history?')) return;
    await window.db.habits.delete(habitId);
    // Also delete all logs
    const logs = await window.db.habitLogs.getForHabit(habitId);
    for (const log of logs) {
      const d = await window.db.habitLogs.isLogged(log.habitId, log.date);
      if (d) await window.db.habitLogs.unlog(log.habitId, log.date);
    }
    await this.render();
  },

  openAddModal() {
    document.getElementById('habit-modal-title').textContent = 'Add Habit';
    document.getElementById('habit-modal-id').value = '';
    document.getElementById('habit-modal-name').value = '';
    document.getElementById('habit-modal-emoji').value = '';
    document.getElementById('habit-modal-freq').value = 'daily';
    document.getElementById('habit-modal-target').value = '3';
    document.getElementById('habit-modal-target-row').style.display = 'none';
    this._setSelectedColor('#3B82F6');
    App.openModal('modal-habit');
  },

  async openEditModal(habitId) {
    const habit = await window.db.habits.get(habitId);
    if (!habit) return;
    document.getElementById('habit-modal-title').textContent = 'Edit Habit';
    document.getElementById('habit-modal-id').value = habitId;
    document.getElementById('habit-modal-name').value = habit.name;
    document.getElementById('habit-modal-emoji').value = habit.emoji || '';
    document.getElementById('habit-modal-freq').value = habit.frequency;
    document.getElementById('habit-modal-target').value = habit.targetPerWeek || 3;
    document.getElementById('habit-modal-target-row').style.display = habit.frequency === 'weekly' ? '' : 'none';
    this._setSelectedColor(habit.color || '#3B82F6');
    App.openModal('modal-habit');
  },

  _setSelectedColor(color) {
    document.querySelectorAll('.habit-color-swatch').forEach(s => {
      s.classList.toggle('selected', s.dataset.color === color);
    });
    document.getElementById('habit-modal-color').value = color;
  },

  selectColor(color) {
    this._setSelectedColor(color);
  },

  freqChanged(val) {
    document.getElementById('habit-modal-target-row').style.display = val === 'weekly' ? '' : 'none';
  },

  async saveHabit() {
    const id = document.getElementById('habit-modal-id').value;
    const name = document.getElementById('habit-modal-name').value.trim();
    if (!name) { alert('Please enter a habit name.'); return; }
    const frequency = document.getElementById('habit-modal-freq').value;
    const targetPerWeek = parseInt(document.getElementById('habit-modal-target').value) || 3;
    const color = document.getElementById('habit-modal-color').value || '#3B82F6';
    const emoji = document.getElementById('habit-modal-emoji').value.trim();

    const habit = { name, frequency, targetPerWeek, color, emoji };
    if (id) {
      const existing = await window.db.habits.get(parseInt(id));
      await window.db.habits.update({ ...existing, ...habit });
    } else {
      await window.db.habits.add(habit);
    }
    App.closeAllModals();
    await this.render();
  },
};
