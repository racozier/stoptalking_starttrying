window.App = {
  currentTab: 'dashboard',
  _tabModules: {},

  async init() {
    // Check for Strava OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.has('code') && params.has('state')) {
      await Strava.handleCallback(params.get('code'), params.get('state'));
      history.replaceState({}, '', window.location.pathname);
    }

    // Load and apply saved theme + timezone
    const theme = await window.db.settings.get('theme', 'dark');
    this.applyTheme(theme);
    this._timezone = await window.db.settings.get('timezone', 'Europe/Warsaw');
    this._units = await window.db.settings.get('units', 'metric');

    // Register tab modules
    this._tabModules = {
      dashboard: typeof Dashboard !== 'undefined' ? Dashboard : null,
      fitness: typeof Fitness !== 'undefined' ? Fitness : null,
      study: typeof Study !== 'undefined' ? Study : null,
      notes: typeof Notes !== 'undefined' ? Notes : null,
      settings: typeof SettingsModule !== 'undefined' ? SettingsModule : null,
    };

    // Update greeting
    this.updateGreeting();

    // Bottom nav wiring
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    // Activate initial tab
    await this.switchTab('dashboard');

    // Render Lucide icons in static HTML (nav, etc.)
    if (window.lucide) lucide.createIcons();

    // Show splash quote (app is ready behind it, waiting for tap)
    this._setSplashQuote();

    // Close modals on backdrop click
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop')) {
        this.closeAllModals();
      }
    });

    // Keyboard: Escape closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAllModals();
    });
  },

  async switchTab(tab) {
    // Clear Polish accent and restore theme-color when leaving Study tab
    document.documentElement.removeAttribute('data-tab');
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const themeColors = { dark: '#2563EB', darker: '#3B82F6', light: '#1D4ED8', midnight: '#3B82F6' };
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = themeColors[theme] || '#2563EB';
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach((el) => el.classList.remove('active'));

    // Show/hide the app header — only on dashboard and settings
    const showHeader = tab === 'dashboard' || tab === 'settings';
    const appHeader = document.getElementById('app-header');
    if (appHeader) appHeader.style.display = showHeader ? '' : 'none';
    document.getElementById('app').classList.toggle('no-app-header', !showHeader);

    // Show target tab
    const tabEl = document.getElementById(`tab-${tab}`);
    const navEl = document.querySelector(`.nav-item[data-tab="${tab}"]`);
    if (!tabEl) return;
    tabEl.classList.add('active');
    if (navEl) navEl.classList.add('active');
    this.currentTab = tab;

    // Render the module
    const mod = this._tabModules[tab];
    if (mod) {
      try {
        if (!mod._initialized) {
          await mod.init();
          mod._initialized = true;
        }
        await mod.render();
        if (window.lucide) setTimeout(() => lucide.createIcons(), 10);
      } catch (e) {
        console.error(`Error rendering ${tab}:`, e);
      }
    }
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeColors = { dark: '#2563EB', darker: '#3B82F6', light: '#1D4ED8', midnight: '#3B82F6' };
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = themeColors[theme] || themeColors.dark;
  },

  hideSplash() {
    const splash = document.getElementById('app-splash');
    if (!splash || splash.classList.contains('hidden')) return;
    splash.classList.add('hiding');
    setTimeout(() => splash.classList.add('hidden'), 510);
  },

  showSplash() {
    const splash = document.getElementById('app-splash');
    if (!splash) return;
    this._setSplashQuote();
    splash.classList.remove('hidden', 'hiding');
    this._loadSplashWeather();
  },

  _setSplashQuote() {
    const quotes = [
      // Perseverance / Not Giving Up
      "It does not matter how slowly you go as long as you do not stop.",
      "Fall seven times, stand up eight.",
      "Success is not final, failure is not fatal: it is the courage to continue that counts.",
      "The harder the conflict, the greater the triumph.",
      "When you feel like quitting, think about why you started.",
      "Victory belongs to the most persevering.",
      "Don't stop when you're tired. Stop when you're done.",
      "The only way out is through.",
      "Every champion was once a contender that refused to give up.",
      "If you're going through hell, keep going.",
      "Perseverance is not a long race; it is many short races one after the other.",
      "Tough times never last, but tough people do.",
      "Keep going. Everything you need will come to you at the perfect time.",
      "A little progress each day adds up to big results.",
      "When you come to the end of your rope, tie a knot and hang on.",
      "Quitters never win and winners never quit.",
      "The road to success is dotted with many tempting parking spaces.",
      "Through perseverance many people win success out of what seemed destined to be failure.",
      "If you're tired of starting over, stop giving up.",
      "I will win. Not immediately, but definitely.",
      "Be stronger than your excuses.",
      "A river cuts through rock not because of its power, but its persistence.",
      "Your speed doesn't matter. Forward is forward.",
      "Prove them wrong.",
      "Make yourself proud.",
      // Success
      "The only place where success comes before work is in the dictionary.",
      "Success usually comes to those who are too busy to be looking for it.",
      "Success is getting up one more time than you fall down.",
      "The difference between ordinary and extraordinary is that little extra.",
      "Success is never owned. It's rented, and the rent is due every day.",
      "Success is not in what you have, but who you are.",
      "Strive not to be a success, but rather to be of value.",
      "There are no shortcuts to any place worth going.",
      "Success is a journey, not a destination.",
      "Work hard in silence. Let success be your noise.",
      "Success is found in your daily routine.",
      "Success is the sum of small efforts, repeated day in and day out.",
      "The successful warrior is the average man, with laser-like focus.",
      "Success is not for the chosen few but for the few who choose it.",
      "No one is going to hand me success. I must go out and get it myself.",
      "Dreams don't work unless you do.",
      "Success is never magical or mysterious. It is the natural consequence of consistently applying fundamentals.",
      "Be somebody nobody thought you could be.",
      "Work until you no longer have to introduce yourself.",
      "Tell me, what is it you plan to do with your one wild and precious life?",
      // Failure / Learning
      "Failure is simply the opportunity to begin again, this time more intelligently.",
      "I have not failed. I've just found 10,000 ways that won't work.",
      "The master has failed more times than the beginner has even tried.",
      "Every failure is a step to success.",
      "You learn more from failure than from success. Don't let it stop you. Failure builds character.",
      "The only real mistake is the one from which we learn nothing.",
      "Mistakes are proof that you are trying.",
      "I can accept failure; everyone fails at something. But I can't accept not trying.",
      "Failure is not the opposite of success — it's part of success.",
      "Anyone who has never made a mistake has never tried anything new.",
      "Don't be afraid to fail. Be afraid not to try.",
      "There is no failure except in no longer trying.",
      "Our greatest glory is not in never falling, but in rising every time we fall.",
      "We learn wisdom from failure much more than from success.",
      "Every adversity carries with it the seed of an equal or greater benefit.",
      "Turn your wounds into wisdom.",
      "It's not how many times you get knocked down that count, it's how many times you get back up.",
      // Personal Growth
      "The only person you are destined to become is the person you decide to be.",
      "What you get by achieving your goals is not as important as what you become by achieving your goals.",
      "Work harder on yourself than you do on your job.",
      "Growth begins at the end of your comfort zone.",
      "Be not afraid of growing slowly, be afraid only of standing still.",
      "You can't go back and change the beginning, but you can start where you are and change the ending.",
      "Don't limit your challenges. Challenge your limits.",
      "We can't become what we need to be by remaining what we are.",
      "An investment in knowledge pays the best interest.",
      "Life is not about finding yourself. Life is about creating yourself.",
      "If it doesn't challenge you, it won't change you.",
      "Life begins at the end of your comfort zone.",
      "Your life doesn't get better by chance. It gets better by change.",
      "You can't use up creativity. The more you use, the more you have.",
      "There's no elevator to success. You have to take the stairs.",
      "Either you run the day or the day runs you.",
      "Be so good they can't ignore you.",
      "Great things never came from comfort zones.",
      "You are one decision away from a completely different life.",
      "Don't compare your beginning to someone else's middle.",
      // Discipline / Hard Work
      "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
      "Discipline is doing what needs to be done, even when you don't want to do it.",
      "Without commitment, you'll never start. Without consistency, you'll never finish.",
      "Hard work beats talent when talent doesn't work hard.",
      "You don't get what you wish for. You get what you work for.",
      "Discipline is the bridge between goals and accomplishment.",
      "The pain of discipline weighs ounces. The pain of regret weighs tons.",
      "Done is better than perfect.",
      "You don't have to be great to start, but you have to start to be great.",
      "Action is the foundational key to all success.",
      "The most certain way to succeed is always to try just one more time.",
      "Talent without discipline is like an octopus on roller skates.",
      "You have to fight through some bad days to earn the best days of your life.",
      "Nothing worthwhile comes easily. Work, continuous work and hard work, is the only way.",
      "Sweat is just fat crying.",
      "The pain you feel today is the strength you'll feel tomorrow.",
      "Champions aren't made in gyms. Champions are made from something deep inside them.",
      "Opportunities are usually disguised as hard work, so most people don't recognize them.",
      "Push yourself, because no one else is going to do it for you.",
      "The price of excellence is discipline. The cost of mediocrity is disappointment.",
      // Mindset / Attitude
      "Whether you think you can or you think you can't, you're right.",
      "Your attitude, not your aptitude, will determine your altitude.",
      "The mind is everything. What you think you become.",
      "Believe you can and you're halfway there.",
      "Change your thoughts and you change your world.",
      "If you believe it will work out, you'll see opportunities. If you believe it won't, you will see obstacles.",
      "You miss 100% of the shots you don't take.",
      "Don't count the days, make the days count.",
      "Life is 10% what happens to you and 90% how you react to it.",
      "The pessimist sees difficulty in every opportunity. The optimist sees opportunity in every difficulty.",
      "I am not a product of my circumstances. I am a product of my decisions.",
      "You become what you believe.",
      "In the middle of every difficulty lies opportunity.",
      "What we fear doing most is usually what we most need to do.",
      "The question isn't who is going to let me — it's who is going to stop me.",
      "Stop being afraid of what could go wrong and think of what could go right.",
      "Be somebody nobody thought you could be.",
      "Everything you've ever wanted is on the other side of fear.",
      "You are braver than you believe, stronger than you seem, and smarter than you think.",
      "Don't be pushed around by the fears in your mind. Be led by the dreams in your heart.",
      // Time / Consistency
      "You don't have to be extreme, just consistent.",
      "Small daily improvements are the key to staggering long-term results.",
      "The secret of your future is hidden in your daily routine.",
      "Motivation gets you started. Habit keeps you going.",
      "Every morning you have two choices: continue to sleep with your dreams or wake up and chase them.",
      "It's not about having time. It's about making time.",
      "Someday is not a day of the week.",
      "The future depends on what we do in the present.",
      "The way to get started is to quit talking and begin doing.",
      "Don't wait for the perfect moment. Take the moment and make it perfect.",
      "Every day is a new beginning. Take a deep breath and start again.",
      "Begin each day as if it were on purpose.",
      "A year from now you may wish you had started today.",
      "Don't wait. The time will never be just right.",
      "One day or day one. You decide.",
      "Your future is created by what you do today, not tomorrow.",
      "The secret of getting ahead is getting started.",
      "Set a goal that makes you want to jump out of bed in the morning.",
      // Mixed Motivation
      "Do something today that your future self will thank you for.",
      "It's going to be hard, but hard is not impossible.",
      "Make each day your masterpiece.",
      "Dream big and dare to fail.",
      "All our dreams can come true, if we have the courage to pursue them.",
      "Only those who dare to fail greatly can ever achieve greatly.",
      "We may encounter many defeats but we must not be defeated.",
      "You were born to win, but to be a winner, you must plan to win and prepare to win.",
      "Act as if what you do makes a difference. It does.",
      "Knowing is not enough; we must apply. Wishing is not enough; we must do.",
      "The future belongs to those who believe in the beauty of their dreams.",
      "Strength doesn't come from what you can do. It comes from overcoming what you thought you couldn't.",
      "If you want something you've never had, you must be willing to do something you've never done.",
      "You have within you right now everything you need to deal with whatever the world throws at you.",
      "Success doesn't just find you. You have to go out and get it.",
      "The distance between dreams and reality is called action.",
      "You don't have to see the whole staircase, just take the first step.",
      "Stop doubting yourself. Work hard and make it happen.",
      "What you do today can improve all your tomorrows.",
      "It always seems impossible until it's done.",
      "Difficult roads often lead to beautiful destinations.",
      "Don't tell people your dreams. Show them.",
      "When nothing goes right, go left.",
      "You don't have to be perfect to be amazing.",
      "Your only competition is who you were yesterday.",
      "Stop waiting for things to happen. Go out and make them happen.",
      "Start each day with a grateful heart.",
      "Set your goals high, and don't stop till you get there.",
      "Be not afraid of greatness: some are born great, some achieve greatness, and some have greatness thrust upon them.",
      "Wake up with determination. Go to bed with satisfaction.",
      "Focus on your goals, not your fear.",
      "The biggest wall you have to climb is the one you build in your mind.",
      "You are enough. You have enough. You do enough.",
      "Never stop dreaming. Never stop believing. Never give up.",
      "If you don't risk anything, you risk even more.",
      "Success is the result of perfection, hard work, learning from failure, loyalty, and persistence.",
      "Look at the sparrows. They don't know what they will do in the next moment. Let us live from moment to moment.",
      "If you want to live a happy life, tie it to a goal, not to people or objects.",
      "Problems are not stop signs, they are guidelines.",
      "Once you choose hope, anything is possible.",
      "The secret of joy in work is contained in one word — excellence.",
      "There is no substitute for hard work.",
      "Wake up. Kick ass. Repeat.",
      "Be the change you wish to see in the world.",
    ];
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const quote = quotes[dayOfYear % quotes.length];
    const el = document.getElementById('splash-quote');
    if (el) el.textContent = `"${quote}"`;
  },

  async _loadSplashWeather() {
    const apiKey = (typeof WEATHER_CONFIG !== 'undefined') ? WEATHER_CONFIG.API_KEY : '';
    if (!apiKey) return;
    const weatherEl = document.getElementById('splash-weather');
    if (!weatherEl) return;

    // Use cache if fresh (<30 min)
    try {
      const cached = JSON.parse(localStorage.getItem('st2_weather') || 'null');
      if (cached && Date.now() - cached.ts < 30 * 60 * 1000) {
        this._renderSplashWeather(cached);
        return;
      }
    } catch (_) {}

    // Get coords via geolocation, fallback to Warsaw
    const coords = await new Promise((resolve) => {
      if (!navigator.geolocation) { resolve({ lat: 52.23, lon: 21.01 }); return; }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
        () => resolve({ lat: 52.23, lon: 21.01 }),
        { timeout: 5000 }
      );
    });

    try {
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=metric`);
      const d = await res.json();
      const weather = {
        ts: Date.now(),
        temp: Math.round(d.main.temp),
        desc: d.weather[0].description,
        city: d.name,
        icon: d.weather[0].icon,
      };
      localStorage.setItem('st2_weather', JSON.stringify(weather));
      this._renderSplashWeather(weather);
    } catch (_) {}
  },

  _renderSplashWeather(w) {
    const iconMap = {
      '01d':'☀️','01n':'🌙','02d':'⛅','02n':'☁️','03d':'☁️','03n':'☁️',
      '04d':'☁️','04n':'☁️','09d':'🌧️','09n':'🌧️','10d':'🌦️','10n':'🌧️',
      '11d':'⛈️','11n':'⛈️','13d':'❄️','13n':'❄️','50d':'🌫️','50n':'🌫️',
    };
    const emoji = iconMap[w.icon] || '🌡️';
    const desc = w.desc.charAt(0).toUpperCase() + w.desc.slice(1);
    const el = document.getElementById('splash-weather');
    if (el) {
      el.innerHTML = `<span class="splash-weather-emoji">${emoji}</span><span class="splash-weather-info">${w.temp}° · ${desc} · ${w.city}</span>`;
      el.style.display = 'flex';
    }
  },

  updateGreeting() {
    const el = document.getElementById('greeting-text');
    const dateEl = document.getElementById('greeting-date');
    if (!el) return;
    const hour = new Date().getHours();
    let time = 'Good Morning';
    if (hour >= 12 && hour < 17) time = 'Good Afternoon';
    else if (hour >= 17) time = 'Good Evening';
    el.textContent = `${time}, Richie`;
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    // Flip greeting → motto after 3s, then cycle every 4s
    if (!this._greetingFlipStarted) {
      this._greetingFlipStarted = true;
      setTimeout(() => {
        const card = document.getElementById('greeting-flip');
        if (card) {
          card.classList.add('flipped');
          setInterval(() => card.classList.toggle('flipped'), 4000);
        }
      }, 3000);
    }
  },

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop.open').forEach((m) => {
      m.classList.remove('open');
    });
    document.body.style.overflow = '';
  },

  openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    const first = modal.querySelector('input, select, textarea');
    if (first) setTimeout(() => first.focus(), 100);
  },

  showToast() {},

  // Shared utility: format seconds as HH:MM:SS or MM:SS
  formatDuration(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  },

  formatMinutes(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  },

  formatDate(isoStr, opts = {}) {
    const d = new Date(isoStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (opts.relative) {
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
    }
    const tz = this._timezone || 'Europe/Warsaw';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: diffDays > 365 ? 'numeric' : undefined, timeZone: tz });
  },

  formatTime(isoStr) {
    const tz = this._timezone || 'Europe/Warsaw';
    return new Date(isoStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz });
  },

  formatWeight(kg) {
    if (this._units === 'imperial') return `${(kg * 2.20462).toFixed(1)} lbs`;
    return `${kg.toFixed(1)} kg`;
  },

  formatDistance(km) {
    if (this._units === 'imperial') return `${(km * 0.621371).toFixed(2)} mi`;
    return `${km.toFixed(2)} km`;
  },

  // Returns Mon–Sun dates for the current week
  getWeekDates() {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  },

  calc1RM(weight, reps) {
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30) * 2) / 2;
  },

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
