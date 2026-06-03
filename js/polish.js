window.Polish = {
  _flipped: false,
  _expanded: false,

  async render() {
    this._flipped = false;
    this._expanded = false;
    const inner = document.getElementById('polish-flip-inner');
    const panel = document.getElementById('polish-expand-panel');
    const chevron = document.getElementById('polish-chevron');
    if (inner) inner.classList.remove('flipped');
    if (panel) panel.classList.remove('open');
    if (chevron) chevron.classList.remove('open');

    await Promise.all([this.renderStats(), this.renderWotd()]);
  },

  async renderStats() {
    const allSessions = await window.db.study.getAll();
    const polishSessions = allSessions.filter((s) => s.subject === 'Polish Language');

    const today = new Date().toISOString().split('T')[0];
    const todayMin = polishSessions
      .filter((s) => s.date.startsWith(today))
      .reduce((sum, s) => sum + s.durationMinutes, 0);

    const weekDates = App.getWeekDates();
    const weekSessions = polishSessions.filter((s) => weekDates.some((d) => s.date.startsWith(d)));
    const weekMin = weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const weekDaysCount = new Set(weekSessions.map((s) => s.date.split('T')[0])).size;

    const todayEl = document.getElementById('polish-today-val');
    if (todayEl) {
      const h = Math.floor(todayMin / 60);
      const m = todayMin % 60;
      todayEl.innerHTML = h > 0
        ? `${h}<span class="polish-stat-unit">h </span>${m}<span class="polish-stat-unit">m</span>`
        : `${m}<span class="polish-stat-unit">m</span>`;
    }

    const weekEl = document.getElementById('polish-week-val');
    if (weekEl) {
      const h = Math.floor(weekMin / 60);
      const m = weekMin % 60;
      weekEl.innerHTML = h > 0
        ? `${h}<span class="polish-stat-unit">h </span>${m}<span class="polish-stat-unit">m</span>`
        : `${m}<span class="polish-stat-unit">m</span>`;
    }

    const subEl = document.getElementById('polish-week-sub');
    if (subEl) subEl.textContent = `${weekDaysCount} of 7 days`;
  },

  async renderWotd() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const dateEl = document.getElementById('polish-wotd-date');
    if (dateEl) {
      dateEl.textContent = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }

    const cacheKey = `st2_wotd_${todayStr}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        this._displayWord(JSON.parse(cached));
        return;
      } catch {}
    }

    const apiKey = await window.db.settings.get('claudeApiKey', null);
    if (!apiKey) {
      this._setStatus('Add a Gemini API key in Settings → Polish to get your daily word.');
      return;
    }

    await this._fetchWord(apiKey, cacheKey);
  },

  _setStatus(msg) {
    const el = document.getElementById('polish-wotd-status');
    if (el) el.textContent = msg;
  },

  _displayWord(data) {
    this._setStatus('');
    const wordEl = document.getElementById('polish-wotd-word');
    const transEl = document.getElementById('polish-wotd-trans');
    const posEl = document.getElementById('polish-wotd-pos');
    const sentPlEl = document.getElementById('polish-wotd-sent-pl');
    const sentEnEl = document.getElementById('polish-wotd-sent-en');
    if (wordEl) wordEl.textContent = data.word || '---';
    if (transEl) transEl.textContent = data.translation || '---';
    if (posEl) posEl.textContent = data.pos || '---';
    if (sentPlEl) sentPlEl.textContent = data.sentence_pl || '';
    if (sentEnEl) sentEnEl.textContent = data.sentence_en || '';
  },

  async _fetchWord(apiKey, cacheKey) {
    this._setStatus('Fetching word of the day…');
    const prompt = 'Give me a Polish word of the day for an intermediate learner. Include the word, its English translation, the part of speech, an example sentence in Polish, and the English translation of that sentence. Respond with ONLY a JSON object in this exact format: {"word": "...", "translation": "...", "pos": "...", "sentence_pl": "...", "sentence_en": "..."}';
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 300 },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        this._setStatus(`API error: ${err.error?.message || res.statusText}`);
        return;
      }

      const body = await res.json();
      const text = body.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) { this._setStatus('Unexpected response. Try again.'); return; }

      const data = JSON.parse(match[0]);
      if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(data));
      this._displayWord(data);
    } catch (e) {
      this._setStatus(`Error: ${e.message}`);
    }
  },

  flipCard() {
    const inner = document.getElementById('polish-flip-inner');
    if (!inner) return;
    this._flipped = !this._flipped;
    inner.classList.toggle('flipped', this._flipped);
    if (!this._flipped) {
      this._expanded = false;
      const panel = document.getElementById('polish-expand-panel');
      const chevron = document.getElementById('polish-chevron');
      if (panel) panel.classList.remove('open');
      if (chevron) chevron.classList.remove('open');
    }
  },

  toggleExpand() {
    this._expanded = !this._expanded;
    const panel = document.getElementById('polish-expand-panel');
    const chevron = document.getElementById('polish-chevron');
    if (panel) panel.classList.toggle('open', this._expanded);
    if (chevron) chevron.classList.toggle('open', this._expanded);
  },

  async fetchNewWord() {
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.removeItem(`st2_wotd_${todayStr}`);

    this._flipped = false;
    this._expanded = false;
    const inner = document.getElementById('polish-flip-inner');
    const panel = document.getElementById('polish-expand-panel');
    const chevron = document.getElementById('polish-chevron');
    if (inner) inner.classList.remove('flipped');
    if (panel) panel.classList.remove('open');
    if (chevron) chevron.classList.remove('open');

    const apiKey = await window.db.settings.get('claudeApiKey', null);
    if (!apiKey) {
      this._setStatus('Add a Gemini API key in Settings → Polish to get your daily word.');
      return;
    }
    await this._fetchWord(apiKey, `st2_wotd_${todayStr}`);
  },
};

window.PolishFlip = () => Polish.flipCard();
window.PolishToggleExpand = () => Polish.toggleExpand();
window.PolishFetchNew = () => Polish.fetchNewWord();
window.PolishOpenLog = () => openQuickStudyModal('Polish Language');
