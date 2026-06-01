// IndexedDB via idb library (loaded from CDN before this script)
const DB_NAME = 'st2_db';
const DB_VERSION = 1;

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
    async update(note) {
      const d = await getDB();
      return d.put('notes', { ...note, updated: new Date().toISOString() });
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

  async exportAll() {
    const d = await getDB();
    const result = {};
    const stores = ['weight', 'workouts', 'runs', 'study_sessions', 'classes', 'notes'];
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
    const stores = ['weight', 'workouts', 'runs', 'study_sessions', 'classes', 'notes'];
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

// ─── Sample Data Seeder ───────────────────────────────────────────────────────

async function seedSampleData() {
  const already = await window.db.settings.get('sampleDataLoaded');
  if (already) return;

  const today = new Date('2026-06-01');
  const daysAgo = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
  };
  const iso = (d, hour = 8, min = 0) => {
    const x = new Date(d);
    x.setHours(hour, min, 0, 0);
    return x.toISOString();
  };

  // ── Weight: 90 entries trending 91.2 → 83.5 ──────────────────────────────
  const weightEntries = [];
  for (let i = 89; i >= 0; i--) {
    const progress = (89 - i) / 89;
    const trend = 91.2 - (91.2 - 83.5) * progress;
    const noise = (Math.random() - 0.5) * 0.6;
    const val = Math.round((trend + noise) * 10) / 10;
    weightEntries.push({ date: iso(daysAgo(i), 7, 15), value: val, notes: '' });
  }
  for (const w of weightEntries) await window.db.weight.add(w);

  // ── WGU Classes ───────────────────────────────────────────────────────────
  const classData = [
    { name: 'Scripting & Programming Foundations', code: 'C173', credits: 3, term: 'Term 1', status: 'passed', startDate: '2026-01-15', passedDate: '2026-03-10' },
    { name: 'Data Management', code: 'C175', credits: 3, term: 'Term 1', status: 'passed', startDate: '2026-03-15', passedDate: '2026-05-20' },
    { name: 'Business of IT – Applications', code: 'C176', credits: 4, term: 'Term 1', status: 'in_progress', startDate: '2026-05-21', passedDate: null },
    { name: 'Introduction to IT', code: 'C182', credits: 3, term: 'Term 1', status: 'not_started', startDate: null, passedDate: null },
    { name: 'Organizational Behavior and Leadership', code: 'C484', credits: 3, term: 'Term 1', status: 'not_started', startDate: null, passedDate: null },
    { name: 'Data Structures and Algorithms I', code: 'C949', credits: 4, term: 'Term 2', status: 'not_started', startDate: null, passedDate: null },
    { name: 'Discrete Mathematics I', code: 'C959', credits: 4, term: 'Term 2', status: 'not_started', startDate: null, passedDate: null },
    { name: 'Operating Systems for Programmers', code: 'C191', credits: 3, term: 'Term 2', status: 'not_started', startDate: null, passedDate: null },
  ];
  const classIds = [];
  for (const c of classData) {
    const id = await window.db.classes.add(c);
    classIds.push(id);
  }

  // Class IDs: 0=C173(passed), 1=C175(passed), 2=C176(inprogress)
  const c173id = classIds[0];
  const c175id = classIds[1];
  const c176id = classIds[2];

  // ── Study Sessions: 60+ across 3 subjects ────────────────────────────────
  const studySessions = [];
  // C173: completed March 10, ~30 sessions from day 89 to day 83 (Mar 3 to May 10-ish)
  const c173Sessions = [
    { ago: 87, dur: 90, notes: 'Bash scripting basics' },
    { ago: 85, dur: 120, notes: 'Variables and loops' },
    { ago: 83, dur: 75, notes: 'Functions and scripts' },
    { ago: 81, dur: 105, notes: 'File I/O practice' },
    { ago: 79, dur: 90, notes: 'Python intro' },
    { ago: 77, dur: 120, notes: 'OA prep' },
    { ago: 75, dur: 60, notes: 'Review' },
    { ago: 83, dur: 45, notes: 'Final review' },
  ];
  for (const s of c173Sessions) {
    studySessions.push({ date: iso(daysAgo(s.ago), 19, 0), classId: c173id, subject: 'C173 Scripting', durationMinutes: s.dur, notes: s.notes });
  }

  // C175: completed May 20, sessions from day 75 to day 12
  const c175Sessions = [
    { ago: 72, dur: 90, notes: 'Relational databases intro' },
    { ago: 70, dur: 120, notes: 'SQL SELECT queries' },
    { ago: 68, dur: 105, notes: 'JOINs and subqueries' },
    { ago: 65, dur: 90, notes: 'Normalization 1NF 2NF 3NF' },
    { ago: 63, dur: 75, notes: 'ERD diagrams' },
    { ago: 60, dur: 120, notes: 'Transactions and ACID' },
    { ago: 57, dur: 90, notes: 'Indexes and performance' },
    { ago: 54, dur: 105, notes: 'NoSQL overview' },
    { ago: 51, dur: 90, notes: 'Practice exam questions' },
    { ago: 48, dur: 120, notes: 'OA prep mock exam' },
    { ago: 44, dur: 75, notes: 'SQL advanced functions' },
    { ago: 40, dur: 90, notes: 'Review weak areas' },
    { ago: 36, dur: 60, notes: 'Final review pass' },
    { ago: 12, dur: 30, notes: 'Pre-OA last minute review' },
  ];
  for (const s of c175Sessions) {
    studySessions.push({ date: iso(daysAgo(s.ago), 18, 30), classId: c175id, subject: 'C175 Data Management', durationMinutes: s.dur, notes: s.notes });
  }

  // C176: in progress, recent sessions
  const c176Sessions = [
    { ago: 10, dur: 90, notes: 'IT governance frameworks' },
    { ago: 8, dur: 105, notes: 'ITIL service management' },
    { ago: 6, dur: 120, notes: 'Business continuity planning' },
    { ago: 4, dur: 75, notes: 'Risk management concepts' },
    { ago: 2, dur: 135, notes: 'Project management overview' },
    { ago: 1, dur: 90, notes: 'Practice questions ch 1-4' },
    { ago: 0, dur: 95, notes: 'Principles of Management session' },
  ];
  for (const s of c176Sessions) {
    studySessions.push({ date: iso(daysAgo(s.ago), 19, 15), classId: c176id, subject: 'C176 Business of IT', durationMinutes: s.dur, notes: s.notes });
  }

  // Additional sessions to pad to 60+
  const extraSubjects = [
    { classId: c175id, subject: 'C175 Data Management' },
    { classId: c176id, subject: 'C176 Business of IT' },
  ];
  const extraAgos = [73, 71, 66, 62, 58, 55, 52, 49, 46, 43, 39, 35, 30, 25, 20, 15, 9, 7, 5, 3];
  for (let i = 0; i < extraAgos.length; i++) {
    const sub = extraSubjects[i % 2];
    studySessions.push({ date: iso(daysAgo(extraAgos[i]), 20, 0), classId: sub.classId, subject: sub.subject, durationMinutes: 45 + Math.floor(Math.random() * 60), notes: '' });
  }

  for (const s of studySessions) await window.db.study.add(s);

  // ── Gym Workouts: 25+ sessions ────────────────────────────────────────────
  const gymDays = [88, 86, 84, 81, 79, 77, 74, 72, 70, 67, 65, 63, 60, 58, 56, 53, 51, 49, 46, 44, 42, 39, 37, 35, 32, 30, 28, 25, 23, 21];
  const workoutTemplates = [
    {
      name: 'Push Day',
      exercises: [
        { name: 'Bench Press', sets: [[75, 8], [75, 8], [70, 10]] },
        { name: 'Incline Dumbbell Press', sets: [[28, 10], [28, 10], [26, 12]] },
        { name: 'Shoulder Press', sets: [[38, 8], [38, 8], [38, 6]] },
        { name: 'Lateral Raises', sets: [[12, 15], [12, 15], [12, 12]] },
        { name: 'Tricep Pushdowns', sets: [[20, 12], [20, 12], [18, 15]] },
      ],
    },
    {
      name: 'Pull Day',
      exercises: [
        { name: 'Deadlift', sets: [[120, 5], [120, 5], [110, 6]] },
        { name: 'Barbell Rows', sets: [[80, 8], [80, 8], [75, 10]] },
        { name: 'Pull-ups', sets: [[0, 8], [0, 7], [0, 6]] },
        { name: 'Face Pulls', sets: [[15, 15], [15, 15], [15, 12]] },
        { name: 'Dumbbell Curls', sets: [[16, 12], [16, 12], [14, 15]] },
      ],
    },
    {
      name: 'Leg Day',
      exercises: [
        { name: 'Back Squat', sets: [[100, 5], [100, 5], [95, 6]] },
        { name: 'Romanian Deadlift', sets: [[90, 8], [90, 8], [85, 10]] },
        { name: 'Leg Press', sets: [[160, 10], [160, 10], [150, 12]] },
        { name: 'Leg Curl', sets: [[50, 12], [50, 12], [50, 10]] },
        { name: 'Calf Raises', sets: [[80, 20], [80, 20], [80, 15]] },
      ],
    },
  ];

  for (let i = 0; i < gymDays.length; i++) {
    const template = workoutTemplates[i % workoutTemplates.length];
    const progressFactor = 1 + (i / gymDays.length) * 0.12; // ~12% total progression
    const exercises = template.exercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets.map(([w, r]) => ({
        weight: w > 0 ? Math.round(w * progressFactor / 2.5) * 2.5 : 0,
        reps: r,
      })),
    }));
    const totalVolume = exercises.reduce((sum, ex) => sum + ex.sets.reduce((s2, set) => s2 + set.weight * set.reps, 0), 0);
    const setCount = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    await window.db.workouts.add({
      date: iso(daysAgo(gymDays[i]), 18, 30),
      name: template.name,
      exercises,
      totalVolume,
      setCount,
      exerciseCount: exercises.length,
      durationMinutes: 65 + Math.floor(Math.random() * 25),
      notes: '',
    });
  }

  // ── Late push workout with current weights for dashboard to show ──────────
  await window.db.workouts.add({
    date: iso(daysAgo(1), 18, 30),
    name: 'Push Day',
    exercises: [
      { name: 'Bench Press', sets: [{ weight: 80, reps: 8 }, { weight: 80, reps: 8 }, { weight: 75, reps: 10 }] },
      { name: 'Incline Dumbbell Press', sets: [{ weight: 30, reps: 10 }, { weight: 30, reps: 10 }, { weight: 28, reps: 12 }] },
      { name: 'Shoulder Press', sets: [{ weight: 40, reps: 8 }, { weight: 40, reps: 8 }, { weight: 40, reps: 6 }] },
    ],
    totalVolume: 8240,
    setCount: 9,
    exerciseCount: 3,
    durationMinutes: 73,
    notes: '',
  });

  // ── Runs: 12+ sessions ────────────────────────────────────────────────────
  const runData = [
    { ago: 0, name: 'Morning Run', dist: 5.21, timeStr: '29:14', cal: 412, elev: 64, hr: 156, notes: '' },
    { ago: 2, name: 'Easy Run', dist: 8.12, timeStr: '45:21', cal: 612, elev: 72, hr: 148, notes: 'Felt good' },
    { ago: 5, name: 'Tempo Run', dist: 6.5, timeStr: '33:45', cal: 510, elev: 45, hr: 172, notes: '' },
    { ago: 9, name: 'Long Run', dist: 10.2, timeStr: '58:30', cal: 780, elev: 95, hr: 155, notes: 'New distance PB' },
    { ago: 14, name: 'Morning Run', dist: 5.0, timeStr: '28:05', cal: 380, elev: 30, hr: 158, notes: '' },
    { ago: 18, name: 'Easy Run', dist: 7.5, timeStr: '42:00', cal: 565, elev: 60, hr: 145, notes: '' },
    { ago: 23, name: 'Interval Run', dist: 5.5, timeStr: '28:30', cal: 440, elev: 20, hr: 178, notes: '5×1km intervals' },
    { ago: 29, name: 'Morning Run', dist: 6.0, timeStr: '33:10', cal: 455, elev: 55, hr: 160, notes: '' },
    { ago: 35, name: 'Long Run', dist: 9.5, timeStr: '54:20', cal: 720, elev: 88, hr: 152, notes: '' },
    { ago: 42, name: 'Easy Run', dist: 7.0, timeStr: '39:45', cal: 530, elev: 48, hr: 147, notes: '' },
    { ago: 50, name: 'Morning Run', dist: 5.5, timeStr: '31:20', cal: 420, elev: 38, hr: 162, notes: '' },
    { ago: 58, name: 'Easy Run', dist: 6.5, timeStr: '37:15', cal: 490, elev: 52, hr: 149, notes: '' },
    { ago: 66, name: 'Morning Run', dist: 5.0, timeStr: '29:45', cal: 380, elev: 25, hr: 156, notes: '' },
    { ago: 75, name: 'First Run Back', dist: 4.5, timeStr: '28:00', cal: 345, elev: 20, hr: 168, notes: 'Getting back into it' },
  ];

  for (const r of runData) {
    const [mins, secs] = r.timeStr.split(':').map(Number);
    const totalSecs = mins * 60 + secs;
    const paceSecsPerKm = totalSecs / r.dist;
    const paceMin = Math.floor(paceSecsPerKm / 60);
    const paceSec = Math.round(paceSecsPerKm % 60);
    await window.db.runs.add({
      date: iso(daysAgo(r.ago), 7, 15),
      name: r.name,
      distance: r.dist,
      durationSeconds: totalSecs,
      paceSecsPerKm,
      paceFormatted: `${paceMin}:${String(paceSec).padStart(2, '0')}`,
      calories: r.cal,
      elevation: r.elev,
      avgHR: r.hr,
      polyline: null,
      source: 'manual',
      notes: r.notes,
    });
  }

  // ── Notes: 8 notes ────────────────────────────────────────────────────────
  const notesData = [
    {
      title: 'Holiday Planning Ideas',
      content: 'Looking at Portugal or Spain in September. Budget ~£2500 per person. Check flights to Lisbon and Porto. Faro for beach option. Consider road trip from Lisbon → Porto.',
      tags: ['travel', 'planning'],
      pinned: false,
      photos: [], audio: null, drawing: null,
      created: iso(daysAgo(0), 20, 41),
      updated: iso(daysAgo(0), 20, 41),
    },
    {
      title: 'WGU C176 Study Notes',
      content: 'ITIL 4 key concepts: Service Value Chain, Four Dimensions, Guiding Principles. COBIT framework for IT governance. Business continuity vs disaster recovery. RTO vs RPO difference.',
      tags: ['study', 'wgu', 'c176'],
      pinned: true,
      photos: [], audio: null, drawing: null,
      created: iso(daysAgo(4), 20, 0),
      updated: iso(daysAgo(1), 19, 30),
    },
    {
      title: 'Gym Progressive Overload Log',
      content: 'Bench: started at 75kg × 8, now hitting 80kg × 8. Goal: 85kg by end of August. Squat: 100kg feeling solid, aim for 110kg. Need to keep protein at 180g/day minimum.',
      tags: ['fitness', 'gym', 'goals'],
      pinned: true,
      photos: [], audio: null, drawing: null,
      created: iso(daysAgo(20), 21, 0),
      updated: iso(daysAgo(5), 21, 30),
    },
    {
      title: 'Morning Routine Tweaks',
      content: 'Wake 6:30. Quick stretch 10 mins. Log weight immediately after bathroom, before eating. Coffee + 2 eggs. Study block 7:30–9:30 before work distraction kicks in. Journalling 5 mins before bed.',
      tags: ['habits', 'routine'],
      pinned: false,
      photos: [], audio: null, drawing: null,
      created: iso(daysAgo(30), 22, 0),
      updated: iso(daysAgo(30), 22, 0),
    },
    {
      title: 'SQL Notes – Joins & Subqueries',
      content: 'INNER JOIN: only matching rows. LEFT JOIN: all from left + matching right. CROSS JOIN: cartesian product — careful! Correlated subqueries run once per row. CTEs are cleaner than nested subqueries for readability.',
      tags: ['study', 'sql', 'c175'],
      pinned: false,
      photos: [], audio: null, drawing: null,
      created: iso(daysAgo(60), 18, 45),
      updated: iso(daysAgo(60), 18, 45),
    },
    {
      title: 'Running Goals 2026',
      content: 'Sub-25 5km by September. First half marathon attempt in October — Chelmsford Half. Weekly mileage target: 25km by August. Keep easy runs EASY (HR < 155). Two quality sessions per week max.',
      tags: ['running', 'goals', '2026'],
      pinned: false,
      photos: [], audio: null, drawing: null,
      created: iso(daysAgo(45), 21, 0),
      updated: iso(daysAgo(45), 21, 0),
    },
    {
      title: 'Diet Strategy',
      content: 'Current deficit: ~400 cal/day. Protein: 180–200g. Carbs around training. No alcohol weekdays. Meal prep Sunday: rice, chicken, veg. Weigh food raw. Track everything honestly.',
      tags: ['nutrition', 'diet'],
      pinned: false,
      photos: [], audio: null, drawing: null,
      created: iso(daysAgo(75), 20, 0),
      updated: iso(daysAgo(75), 20, 0),
    },
    {
      title: 'Degree Completion Plan',
      content: 'WGU BSCS — 120 credit hours total. Currently: 2 classes passed = 6 credits. Rate: 1–2 classes per term, 6-month terms. If I do 2/term: done in ~5 more terms = ~2.5 years. Push to 3/term when comfortable → could finish in 3 years total.',
      tags: ['study', 'wgu', 'planning'],
      pinned: false,
      photos: [], audio: null, drawing: null,
      created: iso(daysAgo(89), 21, 30),
      updated: iso(daysAgo(10), 21, 30),
    },
  ];

  for (const note of notesData) {
    const d = await getDB();
    await d.add('notes', note);
  }

  // ── Settings defaults ─────────────────────────────────────────────────────
  await window.db.settings.set('theme', 'dark');
  await window.db.settings.set('displayName', 'Richie');
  await window.db.settings.set('targetWeight', 80);
  await window.db.settings.set('degreeCreditHours', 120);
  await window.db.settings.set('currentTermName', 'Term 1 2026');
  await window.db.settings.set('currentTermEnd', '2026-08-31');
  await window.db.settings.set('sampleDataLoaded', true);
}

// Run seeder on load
(async () => {
  try {
    await seedSampleData();
  } catch (e) {
    console.warn('Sample data seed error:', e);
  }
})();
