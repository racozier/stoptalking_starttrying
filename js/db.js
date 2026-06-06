// IndexedDB via idb library (loaded from CDN before this script)
const DB_NAME = 'st2_db';
const DB_VERSION = 3;

let _db = null;

async function getDB() {
  if (_db) return _db;
  _db = await idb.openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('weight')) {
        const ws = db.createObjectStore('weight', { keyPath: 'id', autoIncrement: true });
        ws.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('workouts')) {
        const wo = db.createObjectStore('workouts', { keyPath: 'id', autoIncrement: true });
        wo.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('runs')) {
        const rs = db.createObjectStore('runs', { keyPath: 'id', autoIncrement: true });
        rs.createIndex('date', 'date');
        rs.createIndex('stravaId', 'stravaId');
      }
      if (!db.objectStoreNames.contains('study_sessions')) {
        const ss = db.createObjectStore('study_sessions', { keyPath: 'id', autoIncrement: true });
        ss.createIndex('date', 'date');
        ss.createIndex('classId', 'classId');
      }
      if (!db.objectStoreNames.contains('classes')) {
        db.createObjectStore('classes', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('notes')) {
        const ns = db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
        ns.createIndex('updated', 'updated');
        ns.createIndex('pinned', 'pinned');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
      if (!db.objectStoreNames.contains('strava_tokens')) {
        db.createObjectStore('strava_tokens');
      }
      if (!db.objectStoreNames.contains('events')) {
        const ev = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
        ev.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('habits')) {
        db.createObjectStore('habits', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('habitLogs')) {
        const hl = db.createObjectStore('habitLogs', { keyPath: 'id', autoIncrement: true });
        hl.createIndex('habitId', 'habitId');
        hl.createIndex('date', 'date');
        hl.createIndex('habitDate', ['habitId', 'date'], { unique: true });
      }
    },
  });
  return _db;
}

window.db = {
  weight: {
    async add(entry) {
      const d = await getDB();
      return d.add('weight', { ...entry, date: entry.date || new Date().toISOString() });
    },
    async get(id) {
      const d = await getDB();
      return d.get('weight', id);
    },
    async getAll() {
      const d = await getDB();
      const all = await d.getAllFromIndex('weight', 'date');
      return all.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    async getRecent(n = 14) {
      const all = await window.db.weight.getAll();
      return all.slice(0, n);
    },
    async update(entry) {
      const d = await getDB();
      return d.put('weight', entry);
    },
    async delete(id) {
      const d = await getDB();
      return d.delete('weight', id);
    },
  },

  workouts: {
    async add(workout) {
      const d = await getDB();
      return d.add('workouts', { ...workout, date: workout.date || new Date().toISOString() });
    },
    async get(id) {
      const d = await getDB();
      return d.get('workouts', id);
    },
    async getAll() {
      const d = await getDB();
      const all = await d.getAllFromIndex('workouts', 'date');
      return all.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    async getRecent(n = 20) {
      const all = await window.db.workouts.getAll();
      return all.slice(0, n);
    },
    async getForDate(dateStr) {
      const all = await window.db.workouts.getAll();
      return all.filter((w) => w.date.startsWith(dateStr));
    },
    async update(workout) {
      const d = await getDB();
      return d.put('workouts', workout);
    },
    async delete(id) {
      const d = await getDB();
      return d.delete('workouts', id);
    },
  },

  runs: {
    async add(run) {
      const d = await getDB();
      return d.add('runs', { ...run, date: run.date || new Date().toISOString() });
    },
    async get(id) {
      const d = await getDB();
      return d.get('runs', id);
    },
    async getAll() {
      const d = await getDB();
      const all = await d.getAllFromIndex('runs', 'date');
      return all.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    async getRecent(n = 20) {
      const all = await window.db.runs.getAll();
      return all.slice(0, n);
    },
    async getByStravaId(stravaId) {
      const d = await getDB();
      return d.getFromIndex('runs', 'stravaId', stravaId);
    },
    async update(run) {
      const d = await getDB();
      return d.put('runs', run);
    },
    async delete(id) {
      const d = await getDB();
      return d.delete('runs', id);
    },
  },

  study: {
    async add(session) {
      const d = await getDB();
      return d.add('study_sessions', { ...session, date: session.date || new Date().toISOString() });
    },
    async get(id) {
      const d = await getDB();
      return d.get('study_sessions', id);
    },
    async getAll() {
      const d = await getDB();
      const all = await d.getAllFromIndex('study_sessions', 'date');
      return all.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    async getByClass(classId) {
      const d = await getDB();
      const all = await d.getAllFromIndex('study_sessions', 'classId', classId);
      return all.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    async getForDate(dateStr) {
      const all = await window.db.study.getAll();
      return all.filter((s) => s.date.startsWith(dateStr));
    },
    async getTotalMinutesForDate(dateStr) {
      const sessions = await window.db.study.getForDate(dateStr);
      return sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    },
    async update(session) {
      const d = await getDB();
      return d.put('study_sessions', session);
    },
    async delete(id) {
      const d = await getDB();
      return d.delete('study_sessions', id);
    },
  },

  classes: {
    async add(cls) {
      const d = await getDB();
      return d.add('classes', cls);
    },
    async getAll() {
      const d = await getDB();
      return d.getAll('classes');
    },
    async get(id) {
      const d = await getDB();
      return d.get('classes', id);
    },
    async update(cls) {
      const d = await getDB();
      return d.put('classes', cls);
    },
    async delete(id) {
      const d = await getDB();
      return d.delete('classes', id);
    },
  },

  notes: {
    async add(note) {
      const now = new Date().toISOString();
      const d = await getDB();
      return d.add('notes', { ...note, created: now, updated: now });
    },
    async getAll() {
      const d = await getDB();
      const all = await d.getAllFromIndex('notes', 'updated');
      return all.sort((a, b) => new Date(b.updated) - new Date(a.updated));
    },
    async get(id) {
      const d = await getDB();
      return d.get('notes', id);
    },
    async search(query) {
      const all = await window.db.notes.getAll();
      const q = query.toLowerCase();
      return all.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.content?.toLowerCase().includes(q) ||
          n.tags?.some((t) => t.toLowerCase().includes(q))
      );
    },
    async update(note, { preserveUpdated = false } = {}) {
      const d = await getDB();
      const data = preserveUpdated ? note : { ...note, updated: new Date().toISOString() };
      return d.put('notes', data);
    },
    async delete(id) {
      const d = await getDB();
      return d.delete('notes', id);
    },
  },

  settings: {
    async get(key, fallback = null) {
      const d = await getDB();
      const val = await d.get('settings', key);
      return val !== undefined ? val : fallback;
    },
    async set(key, value) {
      const d = await getDB();
      return d.put('settings', value, key);
    },
    async getAll() {
      const d = await getDB();
      const keys = await d.getAllKeys('settings');
      const values = await d.getAll('settings');
      const result = {};
      keys.forEach((k, i) => { result[k] = values[i]; });
      return result;
    },
  },

  strava: {
    async getTokens() {
      const d = await getDB();
      return d.get('strava_tokens', 'tokens');
    },
    async setTokens(tokens) {
      const d = await getDB();
      return d.put('strava_tokens', tokens, 'tokens');
    },
    async clearTokens() {
      const d = await getDB();
      return d.delete('strava_tokens', 'tokens');
    },
  },

  events: {
    async add(entry) {
      const d = await getDB();
      return d.add('events', entry);
    },
    async get(id) {
      const d = await getDB();
      return d.get('events', id);
    },
    async getAll() {
      const d = await getDB();
      const all = await d.getAllFromIndex('events', 'date');
      return all.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    async update(entry) {
      const d = await getDB();
      return d.put('events', entry);
    },
    async delete(id) {
      const d = await getDB();
      return d.delete('events', id);
    },
  },

  habits: {
    async add(habit) {
      const d = await getDB();
      return d.add('habits', { ...habit, createdAt: new Date().toISOString() });
    },
    async getAll() {
      const d = await getDB();
      return d.getAll('habits');
    },
    async get(id) {
      const d = await getDB();
      return d.get('habits', id);
    },
    async update(habit) {
      const d = await getDB();
      return d.put('habits', habit);
    },
    async delete(id) {
      const d = await getDB();
      return d.delete('habits', id);
    },
  },

  habitLogs: {
    async log(habitId, date) {
      const d = await getDB();
      // date is YYYY-MM-DD string
      try {
        return await d.add('habitLogs', { habitId, date, loggedAt: new Date().toISOString() });
      } catch (e) {
        // unique constraint — already logged
        return null;
      }
    },
    async unlog(habitId, date) {
      const d = await getDB();
      const existing = await d.getFromIndex('habitLogs', 'habitDate', [habitId, date]);
      if (existing) await d.delete('habitLogs', existing.id);
    },
    async isLogged(habitId, date) {
      const d = await getDB();
      const existing = await d.getFromIndex('habitLogs', 'habitDate', [habitId, date]);
      return !!existing;
    },
    async getForHabit(habitId) {
      const d = await getDB();
      return d.getAllFromIndex('habitLogs', 'habitId', habitId);
    },
    async getForDate(date) {
      const d = await getDB();
      return d.getAllFromIndex('habitLogs', 'date', date);
    },
    async getCount(habitId, date) {
      // For weekly habits: count logs for the week containing `date`
      const logs = await window.db.habitLogs.getForHabit(habitId);
      const d = new Date(date);
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((day + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const monStr = monday.toISOString().split('T')[0];
      const sunStr = sunday.toISOString().split('T')[0];
      return logs.filter(l => l.date >= monStr && l.date <= sunStr).length;
    },
  },

  async exportAll() {
    const d = await getDB();
    const result = {};
    const stores = ['weight', 'workouts', 'runs', 'study_sessions', 'classes', 'notes', 'events', 'habits', 'habitLogs'];
    for (const store of stores) {
      result[store] = await d.getAll(store);
    }
    // Export settings as key-value pairs
    const settingsKeys = await d.getAllKeys('settings');
    const settingsVals = await d.getAll('settings');
    result.settings = settingsKeys.map((k, i) => ({ key: k, value: settingsVals[i] }));
    return result;
  },

  async importAll(data) {
    const d = await getDB();
    const stores = ['weight', 'workouts', 'runs', 'study_sessions', 'classes', 'notes', 'events', 'habits', 'habitLogs'];
    for (const store of stores) {
      if (!data[store]) continue;
      const tx = d.transaction(store, 'readwrite');
      await tx.store.clear();
      for (const item of data[store]) {
        await tx.store.add(item);
      }
      await tx.done;
    }
    // settings store uses explicit keys — skip in import to preserve current preferences
  },
};

// ─── Sample Data Cleanup ──────────────────────────────────────────────────────

async function clearSampleData() {
  const hadSample = await window.db.settings.get('sampleDataV3');
  const alreadyCleared = await window.db.settings.get('sampleCleared');
  if (!hadSample || alreadyCleared) return;

  const d = await getDB();
  const stores = ['weight', 'workouts', 'runs', 'study_sessions', 'classes', 'notes', 'events', 'habits', 'habitLogs'];
  for (const store of stores) {
    if (d.objectStoreNames.contains(store)) {
      const tx = d.transaction(store, 'readwrite');
      await tx.objectStore(store).clear();
      await tx.done;
    }
  }
  await window.db.settings.set('sampleCleared', true);
}

(async () => {
  try {
    await clearSampleData();
  } catch (e) {
    console.warn('Sample data clear error:', e);
  }
})();
