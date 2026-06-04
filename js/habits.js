const HABIT_COLORS = [
  '#3B82F6','#2563EB','#60A5FA','#93C5FD',
  '#10B981','#059669','#34D399','#6EE7B7',
  '#F59E0B','#D97706','#FBBF24','#FDE68A',
  '#F97316','#EA580C','#FB923C','#FED7AA',
  '#EF4444','#DC2626','#F87171','#FECACA',
  '#EC4899','#DB2777','#F472B6','#FBCFE8',
  '#8B5CF6','#7C3AED','#A78BFA','#DDD6FE',
  '#06B6D4','#0891B2','#22D3EE','#A5F3FC',
  '#14B8A6','#0D9488','#2DD4BF',
];

const HABIT_EMOJIS = [
  '💧','🏃','💪','📚','🧘','🥗','😴','🎯',
  '✍️','🏋️','🚴','🧠','💊','🥤','🌟','🔥',
  '⚡','🎵','🧹','💰','🛌','☀️','🌿','🍎',
  '🚶','🧗','⏰','📝','🎨','🏊','🤸','🧘',
];

window.Habits = {
  _habits: [],
  _logs: {},
  _initialized: false,
  _noteHabitId: null,

  async init() {
    this._initialized = true;
  },

  async render() {
    const el = document.getElementById('tab-habits');
    if (!el) return;
    this._habits = await window.db.habits.getAll();
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
        ${this._habits.length === 0
          ? `<div class="habits-empty">No habits yet.<br>Tap ＋ to add your first habit.</div>`
          : this._habits.map(h => this._renderHabitCard(h)).join('')}
      </div>
    `;
  },

  _renderHabitCard(habit) {
    const today = new Date().toISOString().split('T')[0];
    const logs = this._logs[habit.id] || [];
    const logSet = new Set(logs);
    const isDaily = habit.frequency === 'daily';
    const color = habit.color || '#3B82F6';
    const emoji = habit.emoji || '⭐';

    let isDone, checkLabel;
    if (isDaily) {
      isDone = logSet.has(today);
      checkLabel = isDone ? '✓' : '';
    } else {
      const weekDates = App.getWeekDates();
      const doneCount = weekDates.filter(d => logSet.has(d)).length;
      const target = habit.targetPerWeek || 1;
      isDone = doneCount >= target;
      checkLabel = `<span class="habit-weekly-badge">${doneCount}/${target}</span>`;
    }

    const freq = isDaily ? 'Daily' : `${habit.targetPerWeek}× / week`;
    const desc = habit.description ? App.escapeHtml(habit.description) : freq;
    const hasNote = !!habit.note;
    const dotGrid = this._buildDotGrid(logs);

    const toggleFn = isDaily
      ? `Habits.toggleToday(${habit.id})`
      : `Habits.toggleWeekly(${habit.id})`;

    return `
      <div class="habit-card" style="--habit-color:${color}" data-id="${habit.id}">
        <div class="habit-card-top">
          <div class="habit-card-left">
            <div class="habit-emoji-circle">${emoji}</div>
            <div class="habit-info">
              <div class="habit-name">${App.escapeHtml(habit.name)}</div>
              <div class="habit-freq">${desc}</div>
            </div>
          </div>
          <div class="habit-card-actions">
            <button class="habit-note-btn${hasNote ? ' has-note' : ''}" onclick="Habits.openNotePanel(${habit.id})" title="Note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/>
                <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
            </button>
            <button class="habit-check-circle${isDone ? ' done' : ''}" onclick="${toggleFn}" style="--habit-color:${color}">
              ${isDone ? '✓' : checkLabel}
            </button>
            <button class="habit-dots-btn" onclick="Habits.showMenu(event,${habit.id})">···</button>
          </div>
        </div>
        <div class="habit-dot-grid">${dotGrid}</div>
      </div>
    `;
  },

  _buildDotGrid(logs) {
    const logSet = new Set(logs);
    const today = new Date();
    const dayOfWeek = (today.getDay() + 6) % 7; // 0=Mon
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - dayOfWeek - 12 * 7);

    let html = '';
    for (let week = 0; week < 13; week++) {
      html += '<div class="habit-dot-col">';
      for (let day = 0; day < 7; day++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + week * 7 + day);
        const dateStr = d.toISOString().split('T')[0];
        const isLogged = logSet.has(dateStr);
        const isFuture = d > today;
        html += `<div class="habit-dot${isLogged ? ' logged' : ''}${isFuture ? ' future' : ''}"></div>`;
      }
      html += '</div>';
    }
    return html;
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

  async toggleWeekly(habitId) {
    const today = new Date().toISOString().split('T')[0];
    const habit = await window.db.habits.get(habitId);
    const target = habit?.targetPerWeek || 1;
    const weekDates = App.getWeekDates();
    const logs = await window.db.habitLogs.getForHabit(habitId);
    const logSet = new Set(logs.map(l => l.date));
    const doneCount = weekDates.filter(d => logSet.has(d)).length;

    if (doneCount >= target) {
      // All done — undo the most recent log this week
      for (let i = weekDates.length - 1; i >= 0; i--) {
        if (logSet.has(weekDates[i])) {
          await window.db.habitLogs.unlog(habitId, weekDates[i]);
          break;
        }
      }
    } else {
      // Add a log for today or next available day this week
      if (!logSet.has(today) && weekDates.includes(today)) {
        await window.db.habitLogs.log(habitId, today);
      } else {
        for (const d of weekDates) {
          if (!logSet.has(d)) {
            await window.db.habitLogs.log(habitId, d);
            break;
          }
        }
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
    const logs = await window.db.habitLogs.getForHabit(habitId);
    for (const log of logs) await window.db.habitLogs.unlog(log.habitId, log.date);
    await this.render();
  },

  // ── Add / Edit Modal ──────────────────────────────────────────────────────

  openAddModal() {
    document.getElementById('habit-modal-title').textContent = 'Add Habit';
    document.getElementById('habit-modal-id').value = '';
    document.getElementById('habit-modal-name').value = '';
    document.getElementById('habit-modal-desc').value = '';
    document.getElementById('habit-modal-freq').value = 'daily';
    document.getElementById('habit-modal-target').value = '3';
    document.getElementById('habit-modal-target-row').style.display = 'none';
    this._setSelectedColor('#3B82F6');
    this._setSelectedEmoji('💧');
    // Collapse pickers
    document.getElementById('habit-color-palette').style.display = 'none';
    document.getElementById('habit-emoji-palette').style.display = 'none';
    App.openModal('modal-habit');
  },

  async openEditModal(habitId) {
    const habit = await window.db.habits.get(habitId);
    if (!habit) return;
    document.getElementById('habit-modal-title').textContent = 'Edit Habit';
    document.getElementById('habit-modal-id').value = habitId;
    document.getElementById('habit-modal-name').value = habit.name;
    document.getElementById('habit-modal-desc').value = habit.description || '';
    document.getElementById('habit-modal-freq').value = habit.frequency;
    document.getElementById('habit-modal-target').value = habit.targetPerWeek || 3;
    document.getElementById('habit-modal-target-row').style.display = habit.frequency === 'weekly' ? '' : 'none';
    this._setSelectedColor(habit.color || '#3B82F6');
    this._setSelectedEmoji(habit.emoji || '💧');
    document.getElementById('habit-color-palette').style.display = 'none';
    document.getElementById('habit-emoji-palette').style.display = 'none';
    App.openModal('modal-habit');
  },

  _setSelectedColor(color) {
    document.querySelectorAll('.habit-color-option').forEach(s => {
      s.classList.toggle('selected', s.dataset.color === color);
    });
    document.getElementById('habit-modal-color').value = color;
    const preview = document.getElementById('habit-color-preview');
    if (preview) preview.style.background = color;
  },

  _setSelectedEmoji(emoji) {
    document.querySelectorAll('.habit-emoji-option').forEach(s => {
      s.classList.toggle('selected', s.dataset.emoji === emoji);
    });
    document.getElementById('habit-modal-emoji').value = emoji;
    const preview = document.getElementById('habit-emoji-preview');
    if (preview) preview.textContent = emoji;
  },

  selectColor(color) {
    this._setSelectedColor(color);
  },

  selectEmoji(emoji) {
    this._setSelectedEmoji(emoji);
  },

  toggleColorPicker() {
    const palette = document.getElementById('habit-color-palette');
    const isVisible = palette.style.display !== 'none';
    palette.style.display = isVisible ? 'none' : 'flex';
    document.getElementById('habit-emoji-palette').style.display = 'none';
  },

  toggleEmojiPicker() {
    const palette = document.getElementById('habit-emoji-palette');
    const isVisible = palette.style.display !== 'none';
    palette.style.display = isVisible ? 'none' : 'grid';
    document.getElementById('habit-color-palette').style.display = 'none';
  },

  freqChanged(val) {
    document.getElementById('habit-modal-target-row').style.display = val === 'weekly' ? '' : 'none';
  },

  async saveHabit() {
    const id = document.getElementById('habit-modal-id').value;
    const name = document.getElementById('habit-modal-name').value.trim();
    if (!name) { alert('Please enter a habit name.'); return; }
    const description = document.getElementById('habit-modal-desc').value.trim();
    const frequency = document.getElementById('habit-modal-freq').value;
    const targetPerWeek = parseInt(document.getElementById('habit-modal-target').value) || 3;
    const color = document.getElementById('habit-modal-color').value || '#3B82F6';
    const emoji = document.getElementById('habit-modal-emoji').value || '💧';

    const habit = { name, description, frequency, targetPerWeek, color, emoji };
    if (id) {
      const existing = await window.db.habits.get(parseInt(id));
      await window.db.habits.update({ ...existing, ...habit });
    } else {
      await window.db.habits.add(habit);
    }
    App.closeAllModals();
    await this.render();
  },

  // ── Habit Note Panel ──────────────────────────────────────────────────────

  openNotePanel(habitId) {
    this._noteHabitId = habitId;
    const habit = this._habits.find(h => h.id === habitId);
    if (!habit) return;
    const panel = document.getElementById('habit-note-panel');
    document.getElementById('habit-note-panel-title').textContent = habit.name;
    document.getElementById('habit-note-textarea').value = habit.note || '';
    panel.classList.add('open');
    setTimeout(() => document.getElementById('habit-note-textarea').focus(), 300);
  },

  closeNotePanel() {
    document.getElementById('habit-note-panel').classList.remove('open');
    this._noteHabitId = null;
  },

  async saveNote() {
    const habitId = this._noteHabitId;
    if (!habitId) return;
    const note = document.getElementById('habit-note-textarea').value.trim();
    const habit = await window.db.habits.get(habitId);
    if (!habit) return;
    await window.db.habits.update({ ...habit, note });
    this.closeNotePanel();
    await this.render();
  },
};
