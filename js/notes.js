const NOTE_COLORS = [
  { id: 'default', bg: null,      label: 'Default' },
  { id: 'red',     bg: '#5c2020', label: 'Red' },
  { id: 'coral',   bg: '#5c3315', label: 'Coral' },
  { id: 'yellow',  bg: '#4d3c08', label: 'Yellow' },
  { id: 'teal',    bg: '#0b3d38', label: 'Teal' },
  { id: 'blue',    bg: '#0d2d5e', label: 'Blue' },
  { id: 'green',   bg: '#1b3d1b', label: 'Green' },
  { id: 'purple',  bg: '#321563', label: 'Purple' },
  { id: 'pink',    bg: '#5a1a3a', label: 'Pink' },
  { id: 'gray',    bg: '#2d2d2d', label: 'Gray' },
];

window.Notes = {
  _currentNoteId: null,
  _selectionMode: false,
  _selectedIds: [],
  _longPressTimer: null,
  _mediaRecorder: null,
  _audioChunks: [],
  _audioDataUrl: null,
  _isRecordingAudio: false,
  _drawingCanvas: null,
  _drawingCtx: null,
  _isDrawing: false,
  _drawingColor: '#7C3AED',
  _drawingMode: 'pen',
  _photos: [],
  _saveTimer: null,

  async init() {
    const searchInput = document.getElementById('notes-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.renderGrid(searchInput.value));
    }
    document.addEventListener('selectionchange', () => {
      const body = document.getElementById('note-body');
      if (!body) return;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (body.contains(range.commonAncestorContainer)) {
          this._savedRange = range.cloneRange();
        }
      }
    });
  },

  async render() {
    await this.renderGrid();
  },

  async renderGrid(query = '') {
    const pinnedContainer = document.getElementById('notes-pinned-row');
    const gridContainer = document.getElementById('notes-grid');
    if (!gridContainer) return;

    const notes = query
      ? await window.db.notes.search(query)
      : await window.db.notes.getAll();

    const pinned = notes.filter((n) => n.pinned);
    const unpinned = notes.filter((n) => !n.pinned);

    if (pinnedContainer) {
      if (pinned.length > 0) {
        pinnedContainer.innerHTML = '<div class="pinned-label">📌 Pinned</div>' +
          '<div class="pinned-scroll">' +
          pinned.map((n) => this.renderNoteCardSmall(n)).join('') + '</div>';
        pinnedContainer.style.display = 'block';
      } else {
        pinnedContainer.style.display = 'none';
      }
    }

    if (unpinned.length === 0 && pinned.length === 0) {
      gridContainer.innerHTML = '<div class="empty-state"><p>No notes yet.</p><p class="sub">Tap + to create your first note.</p></div>';
      return;
    }

    gridContainer.innerHTML = unpinned.map((n) => this.renderNoteCard(n)).join('');

    gridContainer.querySelectorAll('.note-card').forEach((card) => {
      this._setupCardHandlers(card, Number(card.dataset.id));
    });
    if (pinnedContainer) {
      pinnedContainer.querySelectorAll('.note-card-small').forEach((card) => {
        this._setupCardHandlers(card, Number(card.dataset.id));
      });
    }

    if (this._selectionMode) this._updateSelectionUI();
  },

  _setupCardHandlers(card, id) {
    let longFired = false;

    const startLong = (e) => {
      longFired = false;
      this._longPressTimer = setTimeout(() => {
        this._longPressTimer = null;
        longFired = true;
        if (!this._selectionMode) this.enterSelectionMode(id);
        else this.toggleNoteSelection(id);
      }, 500);
    };
    const cancelLong = () => { clearTimeout(this._longPressTimer); this._longPressTimer = null; };

    card.addEventListener('touchstart', startLong, { passive: true });
    card.addEventListener('touchend', cancelLong, { passive: true });
    card.addEventListener('touchmove', cancelLong, { passive: true });
    card.addEventListener('mousedown', startLong);
    card.addEventListener('mouseup', cancelLong);
    card.addEventListener('mouseleave', cancelLong);
    card.addEventListener('contextmenu', (e) => e.preventDefault());

    card.addEventListener('click', () => {
      if (longFired) { longFired = false; return; }
      if (this._longPressTimer !== null) return;
      if (this._selectionMode) this.toggleNoteSelection(id);
      else this.openEditor(id);
    });
  },

  // ─── Selection Mode ───────────────────────────────────────────────────────

  enterSelectionMode(id) {
    this._selectionMode = true;
    this._selectedIds = [id];
    document.getElementById('notes-sel-bar').style.display = 'flex';
    document.getElementById('notes-header').style.display = 'none';
    document.getElementById('notes-search').style.display = 'none';
    document.getElementById('notes-fab').style.display = 'none';
    this._updateSelectionUI();
  },

  toggleNoteSelection(id) {
    const idx = this._selectedIds.indexOf(id);
    if (idx >= 0) this._selectedIds.splice(idx, 1);
    else this._selectedIds.push(id);
    if (this._selectedIds.length === 0) { this.exitSelectionMode(); return; }
    this._updateSelectionUI();
  },

  exitSelectionMode() {
    this._selectionMode = false;
    this._selectedIds = [];
    document.getElementById('notes-sel-bar').style.display = 'none';
    document.getElementById('notes-header').style.display = '';
    document.getElementById('notes-search').style.display = '';
    document.getElementById('notes-fab').style.display = '';
    document.querySelectorAll('.note-card.selected, .note-card-small.selected')
      .forEach((c) => c.classList.remove('selected'));
  },

  _updateSelectionUI() {
    const n = this._selectedIds.length;
    const el = document.getElementById('notes-sel-count');
    if (el) el.textContent = `${n} selected`;
    document.querySelectorAll('.note-card[data-id], .note-card-small[data-id]').forEach((card) => {
      card.classList.toggle('selected', this._selectedIds.includes(Number(card.dataset.id)));
    });
  },

  openColorPicker() {
    const grid = document.getElementById('note-color-grid');
    if (grid) {
      grid.innerHTML = NOTE_COLORS.map((c) =>
        `<button class="note-color-swatch${c.bg === null ? ' swatch-default' : ''}"
          style="${c.bg ? `background:${c.bg}` : ''}"
          onclick="NotesApplyColor('${c.id}')"
          title="${c.label}">
          ${c.bg === null ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' : ''}
        </button>`
      ).join('');
    }
    App.openModal('modal-note-color');
  },

  async applyColor(colorId) {
    const colorDef = NOTE_COLORS.find((c) => c.id === colorId);
    const color = colorDef?.bg || null;
    for (const id of this._selectedIds) {
      const note = await window.db.notes.get(id);
      if (note) await window.db.notes.update({ ...note, color }, { preserveUpdated: true });
    }
    App.closeAllModals();
    this.exitSelectionMode();
    await this.renderGrid();
    App.showToast('Color updated.', 'success');
  },

  async deleteSelected() {
    const count = this._selectedIds.length;
    const msg = count === 1
      ? 'Are you sure you want to delete this note?'
      : `Are you sure you want to delete these ${count} notes?`;
    if (!confirm(msg)) return;
    for (const id of this._selectedIds) {
      await window.db.notes.delete(id);
    }
    this.exitSelectionMode();
    await this.renderGrid();
    App.showToast(count === 1 ? 'Note deleted.' : `${count} notes deleted.`, 'success');
  },

  async applySelectionPin() {
    for (const id of this._selectedIds) {
      const note = await window.db.notes.get(id);
      if (note) await window.db.notes.update({ ...note, pinned: !note.pinned });
    }
    this.exitSelectionMode();
    await this.renderGrid();
    App.showToast('Updated.', 'success');
  },

  renderNoteCard(note) {
    const bgStyle = note.color ? `background:${note.color};border-color:${note.color}` : '';
    const hasPhotos = note.photos?.length > 0;
    const hasAudio = !!note.audio;
    const tagsHtml = (note.tags || []).map((t) => `<span class="tag-chip">${App.escapeHtml(t)}</span>`).join('');

    let body = '';
    if (hasPhotos) {
      body += `<div class="note-card-photo"><img src="${note.photos[0].dataUrl}" alt="" /></div>`;
    }
    if (note.content) {
      body += `<div class="note-card-body">${note.content}</div>`;
    }
    if (hasAudio) {
      body += `<div class="note-card-audio-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> Voice note</div>`;
    }

    return `
    <div class="note-card" data-id="${note.id}" style="${bgStyle}">
      ${note.title ? `<div class="note-card-title">${App.escapeHtml(note.title)}</div>` : ''}
      ${body}
      ${tagsHtml ? `<div class="note-tags">${tagsHtml}</div>` : ''}
      <div class="note-card-date">${App.formatDate(note.updated, { relative: true })}</div>
    </div>`;
  },

  renderNoteCardSmall(note) {
    const bgStyle = note.color ? `background:${note.color};border-color:${note.color}` : '';
    const hasPhoto = note.photos?.length > 0;
    return `
    <div class="note-card-small" data-id="${note.id}" style="${bgStyle}">
      ${hasPhoto ? `<img class="note-card-small-photo" src="${note.photos[0].dataUrl}" alt="">` : ''}
      ${note.title ? `<div class="note-card-title">${App.escapeHtml(note.title)}</div>` : ''}
      <div class="note-card-date">${App.formatDate(note.updated, { relative: true })}</div>
    </div>`;
  },

  async openEditor(noteId) {
    this._currentNoteId = noteId;
    this._photos = [];
    this._audioDataUrl = null;
    this._savedRange = null;
    if (this._isRecordingAudio) this._stopRecording();
    this.closeFormatBar();

    const modal = document.getElementById('modal-note-editor');
    if (!modal) return;

    let note = null;
    if (noteId) {
      note = await window.db.notes.get(noteId);
    }

    const titleInput = modal.querySelector('#note-title-input');
    const body = modal.querySelector('#note-body');
    const tagsContainer = modal.querySelector('#note-tags-container');
    const pinBtn = modal.querySelector('#note-pin-btn');
    const drawingSection = modal.querySelector('#note-drawing-section');

    if (titleInput) titleInput.value = note?.title || '';
    if (body) body.innerHTML = note?.content || '';
    if (pinBtn) pinBtn.classList.toggle('pinned', note?.pinned || false);
    if (drawingSection) drawingSection.style.display = 'none';

    // Tags
    if (tagsContainer) {
      tagsContainer.innerHTML = '';
      (note?.tags || []).forEach((t) => this.addTagChip(t));
    }

    // Photos
    this._photos = note?.photos ? [...note.photos] : [];
    this.renderPhotoThumbnails();

    // Audio
    this._audioDataUrl = note?.audio || null;
    this.renderAudioPlayer(this._audioDataUrl);

    // Drawing
    if (note?.drawing) {
      if (drawingSection) drawingSection.style.display = 'block';
      setTimeout(() => this.initDrawingCanvas(note.drawing), 100);
    }

    // Apply note color to editor background
    const sheet = modal.querySelector('.modal-sheet');
    if (sheet) sheet.style.background = note?.color || '';

    App.openModal('modal-note-editor');

    // Checklist Enter key handler
    if (body) {
      body._checklistKeyHandler && body.removeEventListener('keydown', body._checklistKeyHandler);
      body._checklistKeyHandler = (e) => {
        if (e.key !== 'Enter') return;
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        let el = sel.getRangeAt(0).startContainer;
        if (el.nodeType === Node.TEXT_NODE) el = el.parentElement;
        let taskItem = null;
        let curr = el;
        while (curr && curr !== body) {
          if (curr.classList?.contains('task-item')) { taskItem = curr; break; }
          curr = curr.parentElement;
        }
        if (!taskItem) return;
        e.preventDefault();
        const textSpan = taskItem.querySelector('.task-text');
        if (textSpan && textSpan.textContent.replace(/ /g, '').trim() === '') {
          taskItem.remove();
          return;
        }
        const newItem = document.createElement('div');
        newItem.className = 'task-item';
        newItem.innerHTML = '<input type="checkbox" class="task-check"><span class="task-text"> </span>';
        taskItem.after(newItem);
        const newText = newItem.querySelector('.task-text');
        const range = document.createRange();
        range.selectNodeContents(newText);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      };
      body.addEventListener('keydown', body._checklistKeyHandler);
    }

    // Auto-save every 30s
    clearInterval(this._saveTimer);
    this._saveTimer = setInterval(() => this.autoSave(), 30000);
  },

  addTagChip(tag) {
    const container = document.getElementById('note-tags-container');
    if (!container) return;
    const chip = document.createElement('span');
    chip.className = 'tag-chip editable';
    chip.innerHTML = `${App.escapeHtml(tag)} <button onclick="this.parentElement.remove()">×</button>`;
    chip.dataset.tag = tag;
    container.appendChild(chip);
  },

  handleTagInput(e) {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      const input = document.getElementById('note-tag-input');
      const tag = input?.value.trim().replace(',', '');
      if (tag) { this.addTagChip(tag); input.value = ''; }
    }
  },

  getTags() {
    return [...document.querySelectorAll('#note-tags-container .tag-chip.editable')].map((c) => c.dataset.tag).filter(Boolean);
  },

  async autoSave() {
    if (!document.getElementById('modal-note-editor')?.classList.contains('open')) return;
    await this.saveNote(false);
  },

  async saveNote(close = true) {
    const title = document.getElementById('note-title-input')?.value.trim() || '';
    const body = document.getElementById('note-body');
    const pinned = document.getElementById('note-pin-btn')?.classList.contains('pinned') || false;
    const tags = this.getTags();

    // Sync checkbox checked state to HTML attribute so it persists on reload
    if (body) {
      body.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        if (cb.checked) cb.setAttribute('checked', '');
        else cb.removeAttribute('checked');
      });
    }
    const contentHtml = body?.innerHTML || '';

    // Drawing
    let drawing = null;
    if (this._drawingCanvas) {
      const blank = document.createElement('canvas');
      blank.width = this._drawingCanvas.width;
      blank.height = this._drawingCanvas.height;
      if (this._drawingCanvas.toDataURL() !== blank.toDataURL()) {
        drawing = this._drawingCanvas.toDataURL('image/png');
      }
    }

    const noteData = { title, content: contentHtml, tags, pinned, photos: this._photos, audio: this._audioDataUrl, drawing };

    if (this._currentNoteId) {
      const existing = await window.db.notes.get(this._currentNoteId);
      await window.db.notes.update({ ...existing, ...noteData });
    } else {
      this._currentNoteId = await window.db.notes.add(noteData);
    }

    if (close) {
      clearInterval(this._saveTimer);
      App.closeAllModals();
      App.showToast('Note saved.', 'success');
      await this.renderGrid();
    }
  },

  async deleteNote() {
    if (!this._currentNoteId) return;
    if (!confirm('Delete this note?')) return;
    await window.db.notes.delete(this._currentNoteId);
    clearInterval(this._saveTimer);
    App.closeAllModals();
    await this.renderGrid();
  },

  togglePin() {
    const btn = document.getElementById('note-pin-btn');
    if (btn) { btn.classList.toggle('pinned'); }
  },

  execFormat(cmd, value = null) {
    if (this._savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(this._savedRange);
    }
    document.execCommand(cmd, false, value);
  },

  toggleFormatBar() {
    const bar = document.getElementById('note-format-bar');
    const main = document.getElementById('note-bottombar-main');
    if (!bar || !main) return;
    const isOpen = bar.classList.contains('open');
    if (isOpen) {
      bar.classList.remove('open');
      main.style.display = 'flex';
    } else {
      this.closeAddMenu();
      // Save selection then dismiss keyboard before showing format strip
      const body = document.getElementById('note-body');
      if (body) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          if (body.contains(range.commonAncestorContainer)) {
            this._savedRange = range.cloneRange();
          }
        }
        body.blur();
      }
      bar.classList.add('open');
      main.style.display = 'none';
    }
  },

  closeFormatBar() {
    const bar = document.getElementById('note-format-bar');
    const main = document.getElementById('note-bottombar-main');
    if (bar) bar.classList.remove('open');
    if (main) main.style.display = 'flex';
  },

  _fontSizeStep(delta) {
    if (this._savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(this._savedRange);
    }
    const current = parseInt(document.queryCommandValue('fontSize'), 10) || 3;
    const next = Math.max(1, Math.min(7, current + delta));
    document.execCommand('fontSize', false, String(next));
  },

  increaseFontSize() { this._fontSizeStep(1); },
  decreaseFontSize() { this._fontSizeStep(-1); },

  cycleFontSize() { this._fontSizeStep(1); },

  // ─── Audio Recording (MediaRecorder) ─────────────────────────────────────

  toggleVoiceRecording() {
    if (this._isRecordingAudio) this._stopRecording();
    else this._startRecording();
  },

  async _startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this._audioChunks = [];
      this._mediaRecorder = new MediaRecorder(stream);
      this._mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this._audioChunks.push(e.data);
      };
      this._mediaRecorder.onstop = () => {
        const mimeType = this._mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this._audioChunks, { type: mimeType });
        const reader = new FileReader();
        reader.onload = (ev) => {
          this._audioDataUrl = ev.target.result;
          this.renderAudioPlayer(this._audioDataUrl);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      this._mediaRecorder.start();
      this._isRecordingAudio = true;
      this._setRecordingUI(true);
      this.closeAddMenu();
    } catch {
      App.showToast('Microphone access denied.', 'error');
    }
  },

  _stopRecording() {
    if (this._mediaRecorder && this._mediaRecorder.state !== 'inactive') {
      this._mediaRecorder.stop();
    }
    this._isRecordingAudio = false;
    this._setRecordingUI(false);
  },

  _setRecordingUI(isRecording) {
    const addBtn = document.getElementById('note-add-btn');
    if (addBtn) addBtn.classList.toggle('recording', isRecording);
    const voiceBtn = document.getElementById('note-voice-btn');
    if (voiceBtn) {
      voiceBtn.classList.toggle('recording', isRecording);
      const label = voiceBtn.querySelector('.note-voice-label');
      if (label) label.textContent = isRecording ? '⏹ Stop Recording' : 'Recording';
    }
  },

  renderAudioPlayer(dataUrl) {
    const container = document.getElementById('note-audio-container');
    if (!container) return;
    if (!dataUrl) { container.innerHTML = ''; return; }
    const uid = 'aud_' + Date.now();
    container.innerHTML = `
      <div class="audio-player-card">
        <audio id="${uid}" src="${dataUrl}" preload="metadata"></audio>
        <button class="audio-play-btn" id="audio-play-btn" onclick="Notes._toggleAudio('${uid}', this)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </button>
        <div class="audio-track-wrap">
          <div class="audio-progress" onclick="Notes._seekAudio('${uid}', event, this)">
            <div class="audio-progress-fill" id="audio-fill-${uid}" style="width:0%"></div>
          </div>
          <span class="audio-time" id="audio-time-${uid}">0:00</span>
        </div>
        <button class="audio-delete-btn" onclick="Notes._deleteAudio()" title="Remove audio">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>`;

    const audio = document.getElementById(uid);
    const fmtTime = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
    audio.addEventListener('loadedmetadata', () => {
      const el = document.getElementById(`audio-time-${uid}`);
      if (el) el.textContent = fmtTime(audio.duration);
    });
    audio.addEventListener('timeupdate', () => {
      const pct = audio.duration ? (audio.currentTime / audio.duration * 100) : 0;
      const fill = document.getElementById(`audio-fill-${uid}`);
      if (fill) fill.style.width = pct + '%';
      const el = document.getElementById(`audio-time-${uid}`);
      if (el) el.textContent = fmtTime(Math.max(0, audio.duration - audio.currentTime));
    });
    audio.addEventListener('ended', () => {
      const btn = document.getElementById('audio-play-btn');
      if (btn) btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      const fill = document.getElementById(`audio-fill-${uid}`);
      if (fill) fill.style.width = '0%';
      if (audio.duration) {
        const el = document.getElementById(`audio-time-${uid}`);
        if (el) el.textContent = fmtTime(audio.duration);
      }
    });
  },

  _toggleAudio(uid, btn) {
    const audio = document.getElementById(uid);
    if (!audio) return;
    const playIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    const pauseIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    if (audio.paused) { audio.play(); btn.innerHTML = pauseIcon; }
    else { audio.pause(); btn.innerHTML = playIcon; }
  },

  _seekAudio(uid, event, el) {
    const audio = document.getElementById(uid);
    if (!audio || !audio.duration) return;
    const rect = el.getBoundingClientRect();
    audio.currentTime = ((event.clientX - rect.left) / rect.width) * audio.duration;
  },

  _deleteAudio() {
    this._audioDataUrl = null;
    const container = document.getElementById('note-audio-container');
    if (container) container.innerHTML = '';
  },

  // ─── Checklist ────────────────────────────────────────────────────────────

  insertChecklist() {
    const body = document.getElementById('note-body');
    if (!body) return;
    body.focus();
    document.execCommand('insertHTML', false,
      '<div class="task-item"><input type="checkbox" class="task-check"><span class="task-text">&nbsp;New task</span></div>');
    this.closeAddMenu();
    // Move cursor into the task text
    const tasks = body.querySelectorAll('.task-item .task-text');
    const last = tasks[tasks.length - 1];
    if (last) {
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(last);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  },

  // ─── Photos ───────────────────────────────────────────────────────────────

  triggerPhotoInput() {
    document.getElementById('note-photo-input')?.click();
  },

  async handlePhotoInput(input) {
    const files = input.files;
    if (!files || files.length === 0) return;
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this._photos.push({ dataUrl: e.target.result, name: file.name });
        this.renderPhotoThumbnails();
      };
      reader.readAsDataURL(file);
    }
    input.value = '';
  },

  renderPhotoThumbnails() {
    const container = document.getElementById('note-photos-container');
    if (!container) return;
    container.innerHTML = this._photos.map((p, i) =>
      `<div class="photo-thumb-wrap">
        <img class="photo-thumb" src="${p.dataUrl}" alt="${App.escapeHtml(p.name)}" onclick="Notes.openLightbox(${i})" />
        <button class="photo-remove" onclick="Notes.removePhoto(${i})">×</button>
      </div>`
    ).join('');
  },

  openLightbox(index) {
    const photo = this._photos[index];
    if (!photo) return;
    const lb = document.getElementById('photo-lightbox');
    const img = document.getElementById('photo-lightbox-img');
    if (!lb || !img) return;
    img.src = photo.dataUrl;
    lb.style.display = 'flex';
  },

  closeLightbox() {
    const lb = document.getElementById('photo-lightbox');
    if (lb) lb.style.display = 'none';
  },

  removePhoto(index) {
    this._photos.splice(index, 1);
    this.renderPhotoThumbnails();
  },

  // ─── Drawing Canvas ───────────────────────────────────────────────────────

  toggleDrawingCanvas() {
    const section = document.getElementById('note-drawing-section');
    if (!section) return;
    const isVisible = section.style.display !== 'none';
    section.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) setTimeout(() => this.initDrawingCanvas(), 50);
  },

  initDrawingCanvas(existingDataUrl = null) {
    const canvas = document.getElementById('drawing-canvas');
    if (!canvas) return;
    this._drawingCanvas = canvas;
    this._drawingCtx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || 300;
    canvas.height = 200;

    if (existingDataUrl) {
      const img = new Image();
      img.onload = () => this._drawingCtx.drawImage(img, 0, 0);
      img.src = existingDataUrl;
    }

    canvas.addEventListener('mousedown', (e) => this.drawStart(e));
    canvas.addEventListener('mousemove', (e) => this.drawMove(e));
    canvas.addEventListener('mouseup', () => { this._isDrawing = false; });
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.drawStart(e.touches[0]); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); this.drawMove(e.touches[0]); }, { passive: false });
    canvas.addEventListener('touchend', () => { this._isDrawing = false; });
  },

  drawStart(e) {
    this._isDrawing = true;
    const { x, y } = this._getCanvasPos(e);
    this._drawingCtx.beginPath();
    this._drawingCtx.moveTo(x, y);
  },

  drawMove(e) {
    if (!this._isDrawing) return;
    const { x, y } = this._getCanvasPos(e);
    const ctx = this._drawingCtx;
    if (this._drawingMode === 'eraser') {
      ctx.clearRect(x - 10, y - 10, 20, 20);
    } else {
      ctx.lineTo(x, y);
      ctx.strokeStyle = this._drawingColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  },

  _getCanvasPos(e) {
    const rect = this._drawingCanvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  },

  setDrawingColor(color) {
    this._drawingColor = color;
    this._drawingMode = 'pen';
  },

  setDrawingMode(mode) {
    this._drawingMode = mode;
  },

  clearDrawing() {
    if (this._drawingCtx && this._drawingCanvas) {
      this._drawingCtx.clearRect(0, 0, this._drawingCanvas.width, this._drawingCanvas.height);
    }
  },

  // ─── Bottom + Menu ────────────────────────────────────────────────────────

  toggleAddMenu() {
    const menu = document.getElementById('note-add-submenu');
    if (!menu) return;
    const isOpen = menu.classList.contains('open');
    if (isOpen) {
      menu.classList.remove('open');
    } else {
      menu.classList.add('open');
      setTimeout(() => {
        const close = (e) => {
          if (!menu.contains(e.target) && e.target.id !== 'note-add-btn') {
            menu.classList.remove('open');
          }
          document.removeEventListener('click', close, true);
        };
        document.addEventListener('click', close, true);
      }, 0);
    }
  },

  closeAddMenu() {
    const menu = document.getElementById('note-add-submenu');
    if (menu) menu.classList.remove('open');
  },
};

window.Notes = Notes;
window.NotesSave = () => Notes.saveNote(true);
window.NotesDelete = () => Notes.deleteNote();
window.NotesTogglePin = () => Notes.togglePin();
window.NotesExecFormat = (cmd, val) => Notes.execFormat(cmd, val);
window.NotesToggleFormatBar = () => Notes.toggleFormatBar();
window.NotesCloseFormatBar = () => Notes.closeFormatBar();
window.NotesCycleFontSize = () => Notes.cycleFontSize();
window.NotesIncreaseFontSize = () => Notes.increaseFontSize();
window.NotesDecreaseFontSize = () => Notes.decreaseFontSize();
window.NotesToggleVoice = () => Notes.toggleVoiceRecording();
window.NotesInsertChecklist = () => Notes.insertChecklist();
window.NotesTriggerPhoto = () => Notes.triggerPhotoInput();
window.NotesHandlePhoto = (input) => Notes.handlePhotoInput(input);
window.NotesToggleDrawing = () => Notes.toggleDrawingCanvas();
window.NotesSetDrawColor = (color) => Notes.setDrawingColor(color);
window.NotesSetDrawMode = (mode) => Notes.setDrawingMode(mode);
window.NotesClearDrawing = () => Notes.clearDrawing();
window.NotesHandleTagInput = (e) => Notes.handleTagInput(e);
window.NotesExitSelection = () => Notes.exitSelectionMode();
window.NotesSelectionPin = () => Notes.applySelectionPin();
window.NotesOpenColorPicker = () => Notes.openColorPicker();
window.NotesApplyColor = (id) => Notes.applyColor(id);
window.NotesDeleteSelected = () => Notes.deleteSelected();
window.NotesToggleAddMenu = () => Notes.toggleAddMenu();
window.NotesCloseAddMenu = () => Notes.closeAddMenu();
