window.Notes = {
  _currentNoteId: null,
  _speechRecognition: null,
  _isRecording: false,
  _drawingCanvas: null,
  _drawingCtx: null,
  _isDrawing: false,
  _drawingColor: '#7C3AED',
  _drawingMode: 'pen',
  _photos: [],
  _audioBlob: null,
  _saveTimer: null,

  async init() {
    const searchInput = document.getElementById('notes-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.renderGrid(searchInput.value));
    }
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

    // Pinned row
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

    // Masonry 2-col grid
    gridContainer.innerHTML = unpinned.map((n) => this.renderNoteCard(n)).join('');

    // Click handlers
    gridContainer.querySelectorAll('.note-card').forEach((card) => {
      card.addEventListener('click', () => this.openEditor(Number(card.dataset.id)));
    });
    if (pinnedContainer) {
      pinnedContainer.querySelectorAll('.note-card-small').forEach((card) => {
        card.addEventListener('click', () => this.openEditor(Number(card.dataset.id)));
      });
    }
  },

  renderNoteCard(note) {
    const preview = note.content ? note.content.substring(0, 120) + (note.content.length > 120 ? '…' : '') : '';
    const tagsHtml = (note.tags || []).map((t) => `<span class="tag-chip">${App.escapeHtml(t)}</span>`).join('');
    const photoThumb = note.photos?.length > 0 ? '<div class="note-photo-indicator">📷</div>' : '';
    return `
    <div class="note-card" data-id="${note.id}">
      ${photoThumb}
      ${note.title ? `<div class="note-card-title">${App.escapeHtml(note.title)}</div>` : ''}
      ${preview ? `<div class="note-card-preview">${App.escapeHtml(preview)}</div>` : ''}
      ${tagsHtml ? `<div class="note-tags">${tagsHtml}</div>` : ''}
      <div class="note-card-date">${App.formatDate(note.updated, { relative: true })}</div>
    </div>`;
  },

  renderNoteCardSmall(note) {
    return `
    <div class="note-card-small" data-id="${note.id}">
      <div class="note-card-title">${App.escapeHtml(note.title || 'Untitled')}</div>
      <div class="note-card-date">${App.formatDate(note.updated, { relative: true })}</div>
    </div>`;
  },

  async openEditor(noteId) {
    this._currentNoteId = noteId;
    this._photos = [];
    this._audioBlob = null;

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

    // Drawing
    if (note?.drawing) {
      if (drawingSection) drawingSection.style.display = 'block';
      setTimeout(() => this.initDrawingCanvas(note.drawing), 100);
    }

    App.openModal('modal-note-editor');

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
    const content = body?.innerText || '';
    const contentHtml = body?.innerHTML || '';
    const pinned = document.getElementById('note-pin-btn')?.classList.contains('pinned') || false;
    const tags = this.getTags();

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

    const noteData = { title, content: contentHtml, tags, pinned, photos: this._photos, audio: this._audioBlob, drawing };

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
    document.getElementById('note-body')?.focus();
    document.execCommand(cmd, false, value);
  },

  // ─── Voice Recording ──────────────────────────────────────────────────────

  toggleVoiceRecording() {
    if (this._isRecording) {
      this.stopVoiceRecording();
    } else {
      this.startVoiceRecording();
    }
  },

  startVoiceRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { App.showToast('Voice recognition not supported in this browser.', 'error'); return; }

    this._speechRecognition = new SpeechRecognition();
    this._speechRecognition.continuous = true;
    this._speechRecognition.interimResults = true;
    this._speechRecognition.lang = 'en-GB';

    this._speechRecognition.onresult = (e) => {
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      const body = document.getElementById('note-body');
      if (body) {
        const existingText = body.innerText;
        body.innerText = existingText.replace(/\[listening…\]$/, '') + transcript + (e.results[e.results.length - 1].isFinal ? ' ' : ' [listening…]');
      }
    };

    this._speechRecognition.start();
    this._isRecording = true;
    const btn = document.getElementById('note-voice-btn');
    if (btn) { btn.classList.add('recording'); btn.textContent = '⏹ Stop'; }
  },

  stopVoiceRecording() {
    if (this._speechRecognition) { this._speechRecognition.stop(); this._speechRecognition = null; }
    this._isRecording = false;
    const btn = document.getElementById('note-voice-btn');
    if (btn) { btn.classList.remove('recording'); btn.textContent = '🎤 Voice'; }
    // Clean up [listening…] placeholder
    const body = document.getElementById('note-body');
    if (body) body.innerText = body.innerText.replace(/\s*\[listening…\]$/, '');
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
        <img class="photo-thumb" src="${p.dataUrl}" alt="${App.escapeHtml(p.name)}" />
        <button class="photo-remove" onclick="Notes.removePhoto(${i})">×</button>
      </div>`
    ).join('');
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
};

window.Notes = Notes;
window.NotesSave = () => Notes.saveNote(true);
window.NotesDelete = () => Notes.deleteNote();
window.NotesTogglePin = () => Notes.togglePin();
window.NotesExecFormat = (cmd) => Notes.execFormat(cmd);
window.NotesToggleVoice = () => Notes.toggleVoiceRecording();
window.NotesTriggerPhoto = () => Notes.triggerPhotoInput();
window.NotesHandlePhoto = (input) => Notes.handlePhotoInput(input);
window.NotesToggleDrawing = () => Notes.toggleDrawingCanvas();
window.NotesSetDrawColor = (color) => Notes.setDrawingColor(color);
window.NotesSetDrawMode = (mode) => Notes.setDrawingMode(mode);
window.NotesClearDrawing = () => Notes.clearDrawing();
window.NotesHandleTagInput = (e) => Notes.handleTagInput(e);
