const NOTE_COLORS = [
  { id: 'default', bg: null,      lightBg: null,      label: 'Default' },
  { id: 'red',     bg: '#5c2020', lightBg: '#FFD6D6', label: 'Red' },
  { id: 'coral',   bg: '#5c3315', lightBg: '#FFE0CC', label: 'Coral' },
  { id: 'yellow',  bg: '#4d3c08', lightBg: '#FFF3C4', label: 'Yellow' },
  { id: 'teal',    bg: '#0b3d38', lightBg: '#C8F0EB', label: 'Teal' },
  { id: 'blue',    bg: '#0d2d5e', lightBg: '#CCDEFF', label: 'Blue' },
  { id: 'green',   bg: '#1b3d1b', lightBg: '#C8EDCA', label: 'Green' },
  { id: 'purple',  bg: '#321563', lightBg: '#E4D4FF', label: 'Purple' },
  { id: 'pink',    bg: '#5a1a3a', lightBg: '#FFD4EE', label: 'Pink' },
  { id: 'gray',    bg: '#2d2d2d', lightBg: '#E4E4E4', label: 'Gray' },
];

function resolveNoteColor(stored) {
  if (!stored) return null;
  if (document.documentElement.getAttribute('data-theme') === 'light') {
    const def = NOTE_COLORS.find((c) => c.bg === stored);
    if (def?.lightBg) return def.lightBg;
  }
  return stored;
}

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
  _currentTags: [],
  _globalTags: [],
  _saveTimer: null,
  _noteLocked: false,
  _pinCallback: null,

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
    // When the soft keyboard opens, visualViewport shrinks. Move the fixed
    // bottom toolbar up by the keyboard height so it stays above the keyboard.
    if (window.visualViewport) {
      const onVp = () => {
        const modal = document.getElementById('modal-note-editor');
        const bar = document.querySelector('.note-editor-bottombar');
        if (!bar) return;
        if (!modal || !modal.classList.contains('open')) { bar.style.bottom = ''; return; }
        const vv = window.visualViewport;
        const kbH = Math.max(0, window.innerHeight - Math.round(vv.height) - Math.round(vv.offsetTop));
        bar.style.bottom = kbH + 'px';
      };
      window.visualViewport.addEventListener('resize', onVp);
      window.visualViewport.addEventListener('scroll', onVp);
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
      if (this._selectionMode) { this.toggleNoteSelection(id); return; }
      if (card.dataset.locked === '1') {
        this._showPinEntry(() => this.openEditor(id));
        return;
      }
      this.openEditor(id);
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
          style="${c.bg ? `background:${resolveNoteColor(c.bg)}` : ''}"
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

  async toggleSelectionLock() {
    const pin = localStorage.getItem('st2_pin');
    if (!pin) { App.showToast('Set a PIN in Settings → Security first.', 'info'); return; }
    const ids = [...this._selectedIds];
    const notes = await Promise.all(ids.map((id) => window.db.notes.get(id)));
    const allLocked = notes.every((n) => n?.locked);
    if (allLocked) {
      this._showPinEntry(async () => {
        for (const n of notes) if (n) await window.db.notes.update({ ...n, locked: false }, { preserveUpdated: true });
        this.exitSelectionMode();
        await this.renderGrid();
        App.showToast('Notes unlocked.', 'success');
      });
    } else {
      for (const n of notes) if (n) await window.db.notes.update({ ...n, locked: true }, { preserveUpdated: true });
      this.exitSelectionMode();
      await this.renderGrid();
      App.showToast('Notes locked.', 'success');
    }
  },

  renderNoteCard(note) {
    const bgStyle = note.color ? `background:${resolveNoteColor(note.color)};border-color:${resolveNoteColor(note.color)}` : '';
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

    if (note.locked) {
      return `
    <div class="note-card note-card-locked" data-id="${note.id}" data-locked="1" style="${bgStyle}">
      <div class="note-lock-cover">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span class="note-lock-label">Locked</span>
      </div>
      <div class="note-card-blur-content">
        ${note.title ? `<div class="note-card-title">${App.escapeHtml(note.title)}</div>` : ''}
        ${body}
      </div>
      <div class="note-card-date">${App.formatDate(note.updated, { relative: true })}</div>
    </div>`;
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
    const bgStyle = note.color ? `background:${resolveNoteColor(note.color)};border-color:${resolveNoteColor(note.color)}` : '';
    const hasPhoto = note.photos?.length > 0;
    if (note.locked) {
      return `
    <div class="note-card-small note-card-locked" data-id="${note.id}" data-locked="1" style="${bgStyle}">
      <div class="note-lock-cover">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span class="note-lock-label">Locked</span>
      </div>
      <div class="note-card-blur-content">
        ${hasPhoto ? `<img class="note-card-small-photo" src="${note.photos[0].dataUrl}" alt="">` : ''}
        ${note.title ? `<div class="note-card-title">${App.escapeHtml(note.title)}</div>` : ''}
        <div class="note-card-date">${App.formatDate(note.updated, { relative: true })}</div>
      </div>
    </div>`;
    }
    return `
    <div class="note-card-small" data-id="${note.id}" data-locked="0" style="${bgStyle}">
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

    // Reset any keyboard-adjusted bottombar position from a previous session
    const bar = document.querySelector('.note-editor-bottombar');
    if (bar) bar.style.bottom = '';

    let note = null;
    if (noteId) {
      note = await window.db.notes.get(noteId);
    }

    const titleInput = modal.querySelector('#note-title-input');
    const body = modal.querySelector('#note-body');
    const pinBtn = modal.querySelector('#note-pin-btn');
    const drawingSection = modal.querySelector('#note-drawing-section');

    if (titleInput) titleInput.value = note?.title || '';
    if (body) body.innerHTML = note?.content || '';
    if (pinBtn) pinBtn.classList.toggle('pinned', note?.pinned || false);
    if (drawingSection) drawingSection.style.display = 'none';

    // Upgrade checklist items and set up drag handlers
    this._setupAllTaskHandlers();

    // Tags — load global list and set current note's tags
    this._currentTags = [...(note?.tags || [])];
    this._globalTags = (await window.db.settings.get('globalTags')) || [];
    this._updateTagBtn();

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
    if (sheet) sheet.style.background = resolveNoteColor(note?.color) || '';

    // Set lock button state
    this._noteLocked = note?.locked || false;
    const lockBtn = document.getElementById('note-lock-btn');
    if (lockBtn) lockBtn.classList.toggle('locked', this._noteLocked);

    // Lock body before modal open so keyboard doesn't auto-show during animation
    if (body) body.contentEditable = 'false';
    App.openModal('modal-note-editor');

    // After animation settles, restore editability without focusing
    setTimeout(() => {
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
      const b = document.getElementById('note-body');
      if (b) b.contentEditable = 'true';
    }, 300);

    // Cursor visibility fix: scroll to keep cursor above keyboard as user types
    if (body) {
      const scrollEl = modal.querySelector('.note-editor-body-scroll');
      const scrollCursorIntoView = () => {
        requestAnimationFrame(() => {
          const sel = window.getSelection();
          if (!sel?.rangeCount || !scrollEl) return;
          const rect = sel.getRangeAt(0).getBoundingClientRect();
          const bottomBar = modal.querySelector('.note-editor-bottombar');
          // Use the top of the bottombar as the boundary so cursor never hides behind it
          const boundary = bottomBar
            ? bottomBar.getBoundingClientRect().top
            : (window.visualViewport?.height ?? window.innerHeight);
          if (rect.bottom > boundary - 8) {
            scrollEl.scrollTop += rect.bottom - boundary + 20;
          }
        });
      };
      body._cursorScrollHandler && body.removeEventListener('keyup', body._cursorScrollHandler);
      body._cursorScrollHandler = scrollCursorIntoView;
      body.addEventListener('keyup', scrollCursorIntoView);
      if (window.visualViewport) {
        window.visualViewport.onresize = () => {
          if (!modal.classList.contains('open')) return;
          scrollCursorIntoView();
        };
      }
    }

    // Update tag button indicator
    const tagBtn = document.getElementById('note-tag-btn');
    if (tagBtn) tagBtn.classList.toggle('has-tags', (note?.tags || []).length > 0);

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
        if (!textSpan || textSpan.textContent.trim() === '') {
          const isLast = body.querySelectorAll('.task-item').length === 1;
          taskItem.remove();
          if (isLast) { const ar = body.querySelector('.task-add-row'); if (ar) ar.remove(); }
          return;
        }
        this._addTaskItemAfter(taskItem);
      };
      body.addEventListener('keydown', body._checklistKeyHandler);
    }

    // Auto-save every 30s
    clearInterval(this._saveTimer);
    this._saveTimer = setInterval(() => this.autoSave(), 30000);
  },

  getTags() { return [...this._currentTags]; },

  _updateTagBtn() {
    const btn = document.getElementById('note-tag-btn');
    if (btn) btn.classList.toggle('has-tags', this._currentTags.length > 0);
  },

  toggleTagDropdown() {
    const dd = document.getElementById('note-tag-dropdown');
    if (!dd) return;
    const isOpen = dd.style.display !== 'none';
    if (isOpen) {
      this.closeTagDropdown();
    } else {
      dd.style.display = 'block';
      this._renderTagDropdown();
      setTimeout(() => document.addEventListener('click', this._tagDdOutside, { once: true }), 50);
    }
  },

  _tagDdOutside(e) {
    const dd = document.getElementById('note-tag-dropdown');
    if (dd && !dd.contains(e.target)) Notes.closeTagDropdown();
  },

  closeTagDropdown() {
    const dd = document.getElementById('note-tag-dropdown');
    if (dd) dd.style.display = 'none';
    document.removeEventListener('click', this._tagDdOutside);
  },

  _renderTagDropdown() {
    const list = document.getElementById('note-tag-dd-list');
    if (!list) return;
    if (this._globalTags.length === 0) {
      list.innerHTML = '<div class="note-tag-dd-empty">No tags yet</div>';
      return;
    }
    list.innerHTML = this._globalTags.map(tag => {
      const active = this._currentTags.includes(tag);
      return `<div class="note-tag-dd-item${active ? ' active' : ''}">
        <button class="note-tag-dd-toggle" onclick="Notes._toggleNoteTag('${tag.replace(/'/g,"\\'")}')">
          ${App.escapeHtml(tag)}
        </button>
        <button class="note-tag-dd-del" onclick="Notes._deleteGlobalTag('${tag.replace(/'/g,"\\'")}')">×</button>
      </div>`;
    }).join('');
  },

  _toggleNoteTag(tag) {
    const idx = this._currentTags.indexOf(tag);
    if (idx === -1) this._currentTags.push(tag);
    else this._currentTags.splice(idx, 1);
    this._updateTagBtn();
    this._renderTagDropdown();
  },

  async _deleteGlobalTag(tag) {
    this._globalTags = this._globalTags.filter(t => t !== tag);
    this._currentTags = this._currentTags.filter(t => t !== tag);
    await window.db.settings.set('globalTags', this._globalTags);
    this._updateTagBtn();
    this._renderTagDropdown();
  },

  async addGlobalTag() {
    const input = document.getElementById('note-tag-new-input');
    const tag = input?.value.trim();
    if (!tag) return;
    if (!this._globalTags.includes(tag)) {
      this._globalTags.push(tag);
      await window.db.settings.set('globalTags', this._globalTags);
    }
    if (!this._currentTags.includes(tag)) this._currentTags.push(tag);
    this._updateTagBtn();
    if (input) input.value = '';
    this._renderTagDropdown();
  },

  // kept for backward compat (not used in new UI)
  addTagChip() {},
  handleTagInput() {},

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
    // Strip UI-only task-add-row before saving
    let contentHtml = body?.innerHTML || '';
    if (contentHtml.includes('task-add-row')) {
      const tmp = document.createElement('div');
      tmp.innerHTML = contentHtml;
      tmp.querySelectorAll('.task-add-row').forEach((el) => el.remove());
      contentHtml = tmp.innerHTML;
    }

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

    const noteData = { title, content: contentHtml, tags, pinned, photos: this._photos, audio: this._audioDataUrl, drawing, locked: this._noteLocked };

    if (this._currentNoteId) {
      const existing = await window.db.notes.get(this._currentNoteId);
      await window.db.notes.update({ ...existing, ...noteData });
    } else {
      this._currentNoteId = await window.db.notes.add(noteData);
    }

    if (close) {
      clearInterval(this._saveTimer);
      this.closeTagDropdown();
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
    // Inline toggles (bold/italic/underline/strikethrough) use direct DOM
    // wrapping so the body is never focused and the mobile keyboard stays down.
    const wrapMap = { bold: 'strong', italic: 'em', underline: 'u', strikeThrough: 's' };
    if (!value && wrapMap[cmd]) {
      this._toggleInlineWrap(wrapMap[cmd]);
      return;
    }
    // Block / structural commands still need execCommand
    if (this._savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(this._savedRange);
    }
    document.execCommand(cmd, false, value);
    const sel2 = window.getSelection();
    if (sel2 && sel2.rangeCount > 0) this._savedRange = sel2.getRangeAt(0).cloneRange();
  },

  // Wrap / unwrap selected text in an inline element without using execCommand
  // (avoids auto-focus of contenteditable which shows the mobile keyboard).
  _toggleInlineWrap(tagName) {
    if (this._savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(this._savedRange);
    }
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const body = document.getElementById('note-body');
    if (!body) return;

    // Check if selection is already inside a matching element → unwrap
    let container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) container = container.parentElement;
    let existing = null;
    let el = container;
    while (el && el !== body) {
      if (el.tagName && el.tagName.toLowerCase() === tagName) { existing = el; break; }
      el = el.parentElement;
    }

    if (existing) {
      // Unwrap: replace element with its children
      const frag = document.createDocumentFragment();
      while (existing.firstChild) frag.appendChild(existing.firstChild);
      existing.parentNode.replaceChild(frag, existing);
    } else {
      // Wrap selected content in new element
      try {
        const newEl = document.createElement(tagName);
        newEl.appendChild(range.extractContents());
        range.insertNode(newEl);
        const newRange = document.createRange();
        newRange.selectNodeContents(newEl);
        sel.removeAllRanges();
        sel.addRange(newRange);
      } catch (_) {
        // Fallback for complex cross-element selections
        const fbMap = { strong: 'bold', em: 'italic', u: 'underline', s: 'strikeThrough' };
        if (fbMap[tagName]) document.execCommand(fbMap[tagName], false, null);
      }
    }

    // After wrapping in s/strike, ensure font[size] sits outside, not inside
    if (tagName === 's' || tagName === 'strike') this._fixStrikethroughNesting();

    const updated = window.getSelection();
    if (updated && updated.rangeCount > 0) this._savedRange = updated.getRangeAt(0).cloneRange();
  },

  // When <s> wraps a <font size>, the line-through is positioned at <s>'s
  // (parent) font size, not the larger/smaller font[size] size — causing the
  // line to drift. Restructure <s><font>…</font></s> → <font><s>…</s></font>.
  _fixStrikethroughNesting() {
    const body = document.getElementById('note-body');
    if (!body) return;
    body.querySelectorAll('s > font[size], strike > font[size]').forEach((fontEl) => {
      const strikeEl = fontEl.parentElement;
      if (!strikeEl || !strikeEl.parentElement) return;
      const parent = strikeEl.parentElement;
      const newStrike = document.createElement(strikeEl.tagName.toLowerCase());
      while (fontEl.firstChild) newStrike.appendChild(fontEl.firstChild);
      fontEl.appendChild(newStrike);
      parent.replaceChild(fontEl, strikeEl);
    });
  },

  toggleFormatBar() {
    const bar = document.getElementById('note-format-bar');
    const main = document.getElementById('note-bottombar-main');
    const body = document.getElementById('note-body');
    if (!bar || !main) return;
    const isOpen = bar.classList.contains('open');
    if (isOpen) {
      bar.classList.remove('open');
      main.style.display = 'flex';
    } else {
      this.closeAddMenu();
      // Save selection so execCommand fallback can restore it
      if (body) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          if (body.contains(range.commonAncestorContainer)) {
            this._savedRange = range.cloneRange();
          }
        }
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

  _currentFontSize() {
    const body = document.getElementById('note-body');
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !body) return 3;
    let el = sel.getRangeAt(0).commonAncestorContainer;
    if (el.nodeType === Node.TEXT_NODE) el = el.parentElement;
    while (el && el !== body) {
      if (el.tagName === 'FONT' && el.getAttribute('size')) {
        return parseInt(el.getAttribute('size'), 10);
      }
      el = el.parentElement;
    }
    return 3;
  },

  _fontSizeStep(delta) {
    if (this._savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(this._savedRange);
    }
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const body = document.getElementById('note-body');
    const current = this._currentFontSize();
    const next = Math.max(1, Math.min(7, current + delta));

    // Find an existing <font> ancestor of the selection
    let container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) container = container.parentElement;
    let existingFont = null;
    let el = container;
    while (el && el !== body) {
      if (el.tagName === 'FONT') { existingFont = el; break; }
      el = el.parentElement;
    }

    let targetEl;
    if (existingFont) {
      // Update existing font element in-place — no DOM restructuring, selection intact
      existingFont.setAttribute('size', String(next));
      targetEl = existingFont;
    } else {
      // Wrap the selected content in a new <font size> element
      try {
        const newFont = document.createElement('font');
        newFont.setAttribute('size', String(next));
        newFont.appendChild(range.extractContents());
        range.insertNode(newFont);
        targetEl = newFont;
      } catch (_) {
        return; // bail on complex cross-element selections
      }
    }

    this._fixStrikethroughNesting();

    // Re-select the content of the resized element so text stays highlighted
    const newRange = document.createRange();
    newRange.selectNodeContents(targetEl);
    sel.removeAllRanges();
    sel.addRange(newRange);
    this._savedRange = newRange.cloneRange();
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
    let addRow = body.querySelector('.task-add-row');
    if (!addRow) {
      addRow = this._createTaskAddRow();
      body.appendChild(addRow);
    }
    const newItem = this._createTaskItem('');
    addRow.parentNode.insertBefore(newItem, addRow);
    this._setupTaskDrag(newItem);
    const text = newItem.querySelector('.task-text');
    if (text) text.focus();
    this.closeAddMenu();
  },

  _createTaskItem(textContent) {
    const item = document.createElement('div');
    item.className = 'task-item';
    item.setAttribute('contenteditable', 'false');
    const handle = document.createElement('span');
    handle.className = 'task-drag-handle';
    handle.setAttribute('contenteditable', 'false');
    handle.textContent = '⠿';
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'task-check';
    check.setAttribute('contenteditable', 'false');
    const span = document.createElement('span');
    span.className = 'task-text';
    span.setAttribute('contenteditable', 'true');
    if (textContent) span.textContent = textContent;
    const del = document.createElement('button');
    del.className = 'task-del-btn';
    del.setAttribute('contenteditable', 'false');
    del.textContent = '✕';
    del.addEventListener('pointerdown', (e) => e.preventDefault());
    del.onclick = () => this._deleteTaskItem(del);
    item.appendChild(handle);
    item.appendChild(check);
    item.appendChild(span);
    item.appendChild(del);
    return item;
  },

  _createTaskAddRow() {
    const row = document.createElement('div');
    row.className = 'task-add-row';
    row.setAttribute('contenteditable', 'false');
    row.innerHTML = '<span class="task-add-plus">+</span><span>List item</span>';
    row.addEventListener('pointerdown', (e) => e.preventDefault());
    row.addEventListener('click', () => this._addTaskItem());
    return row;
  },

  _addTaskItem() {
    const body = document.getElementById('note-body');
    if (!body) return;
    let addRow = body.querySelector('.task-add-row');
    if (!addRow) { addRow = this._createTaskAddRow(); body.appendChild(addRow); }
    const newItem = this._createTaskItem('');
    addRow.parentNode.insertBefore(newItem, addRow);
    this._setupTaskDrag(newItem);
    const text = newItem.querySelector('.task-text');
    if (text) text.focus();
  },

  _addTaskItemAfter(afterItem) {
    const body = document.getElementById('note-body');
    if (!body) return;
    const newItem = this._createTaskItem('');
    const next = afterItem.nextSibling;
    afterItem.parentNode.insertBefore(newItem, next || null);
    this._setupTaskDrag(newItem);
    const text = newItem.querySelector('.task-text');
    if (text) text.focus();
  },

  _deleteTaskItem(btn) {
    const item = btn.closest('.task-item');
    if (!item) return;
    const body = item.closest('#note-body');
    item.remove();
    if (body && !body.querySelector('.task-item')) {
      const addRow = body.querySelector('.task-add-row');
      if (addRow) addRow.remove();
    }
  },

  _setupAllTaskHandlers() {
    const body = document.getElementById('note-body');
    if (!body) return;
    body.querySelectorAll('.task-item').forEach((item) => {
      // Ensure task-item is a non-editable atom; task-text is explicitly editable
      item.setAttribute('contenteditable', 'false');

      if (!item.querySelector('.task-drag-handle')) {
        const h = document.createElement('span');
        h.className = 'task-drag-handle';
        h.setAttribute('contenteditable', 'false');
        h.textContent = '⠿';
        item.insertBefore(h, item.firstChild);
      }

      const check = item.querySelector('.task-check');
      if (check) check.setAttribute('contenteditable', 'false');

      const span = item.querySelector('.task-text');
      if (span) span.setAttribute('contenteditable', 'true');

      // Re-attach delete handler (lost when innerHTML is set)
      const existingDel = item.querySelector('.task-del-btn');
      if (existingDel) {
        existingDel.setAttribute('contenteditable', 'false');
        existingDel.addEventListener('pointerdown', (e) => e.preventDefault());
        existingDel.onclick = () => this._deleteTaskItem(existingDel);
      } else {
        const d = document.createElement('button');
        d.className = 'task-del-btn';
        d.setAttribute('contenteditable', 'false');
        d.textContent = '✕';
        d.addEventListener('pointerdown', (e) => e.preventDefault());
        d.onclick = () => this._deleteTaskItem(d);
        item.appendChild(d);
      }

      this._setupTaskDrag(item);
    });

    const hasTasks = body.querySelectorAll('.task-item').length > 0;
    const existingAddRow = body.querySelector('.task-add-row');
    if (hasTasks) {
      if (existingAddRow) {
        existingAddRow.onclick = () => this._addTaskItem();
      } else {
        body.appendChild(this._createTaskAddRow());
      }
    }
  },

  _setupTaskDrag(item) {
    const handle = item.querySelector('.task-drag-handle');
    if (!handle || handle._dragReady) return;
    handle._dragReady = true;
    let dragging = false;
    let startY = 0;
    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
      startY = e.clientY;
      handle.setPointerCapture(e.pointerId);
      item.classList.add('task-dragging');
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      item.style.setProperty('--drag-dy', (e.clientY - startY) + 'px');
      const body = document.getElementById('note-body');
      if (!body) return;
      body.querySelectorAll('.task-item:not(.task-dragging)').forEach((o) => o.classList.remove('task-drag-above'));
      for (const other of body.querySelectorAll('.task-item:not(.task-dragging)')) {
        const rect = other.getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) { other.classList.add('task-drag-above'); break; }
      }
    });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      item.classList.remove('task-dragging');
      item.style.removeProperty('--drag-dy');
      const body = document.getElementById('note-body');
      if (!body) return;
      const target = body.querySelector('.task-item.task-drag-above');
      if (target) {
        body.insertBefore(item, target);
      } else {
        const addRow = body.querySelector('.task-add-row');
        if (addRow) body.insertBefore(item, addRow);
      }
      body.querySelectorAll('.task-item').forEach((o) => o.classList.remove('task-drag-above'));
    };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
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

  toggleLock() {
    const pin = localStorage.getItem('st2_pin');
    if (!pin) {
      App.showToast('Set a PIN in Settings → Security first.', 'info');
      return;
    }
    if (this._noteLocked) {
      this._showPinEntry(() => {
        this._noteLocked = false;
        const btn = document.getElementById('note-lock-btn');
        if (btn) btn.classList.remove('locked');
        this.saveNote(false);
        App.showToast('Note unlocked.', 'success');
      });
    } else {
      this._noteLocked = true;
      const btn = document.getElementById('note-lock-btn');
      if (btn) btn.classList.add('locked');
      App.showToast('Note locked.', 'success');
    }
  },

  _showPinEntry(callback) {
    const pin = localStorage.getItem('st2_pin');
    const input = document.getElementById('pin-entry-input');
    const error = document.getElementById('pin-entry-error');
    if (!pin) {
      if (input) input.style.display = 'none';
      if (error) { error.textContent = 'No PIN set. Go to Settings → Security to configure one.'; error.style.display = 'block'; }
      App.openModal('modal-pin-entry');
      return;
    }
    this._pinCallback = callback;
    if (input) { input.style.display = ''; input.value = ''; }
    if (error) error.style.display = 'none';
    App.openModal('modal-pin-entry');
    setTimeout(() => input?.focus(), 200);
  },

  _confirmPin() {
    const input = document.getElementById('pin-entry-input');
    const error = document.getElementById('pin-entry-error');
    const entered = input?.value || '';
    const correct = localStorage.getItem('st2_pin') || '';
    if (entered === correct && entered !== '') {
      document.getElementById('modal-pin-entry')?.classList.remove('open');
      const cb = this._pinCallback;
      this._pinCallback = null;
      if (cb) cb();
    } else {
      if (error) error.style.display = 'block';
      if (input) { input.value = ''; input.focus(); }
    }
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
window.NotesSelectionLock = () => Notes.toggleSelectionLock();
window.NotesOpenColorPicker = () => Notes.openColorPicker();
window.NotesApplyColor = (id) => Notes.applyColor(id);
window.NotesDeleteSelected = () => Notes.deleteSelected();
window.NotesToggleAddMenu = () => Notes.toggleAddMenu();
window.NotesCloseAddMenu = () => Notes.closeAddMenu();
window.NotesToggleLock = () => Notes.toggleLock();
window.NotesConfirmPin = () => Notes._confirmPin();
