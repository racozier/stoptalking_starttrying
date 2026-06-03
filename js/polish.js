const POLISH_WORDS = [
  { word: "zrozumieć", translation: "to understand", pos: "verb", sentence_pl: "Staram się zrozumieć, jak działa ten system.", sentence_en: "I'm trying to understand how this system works." },
  { word: "wytłumaczyć", translation: "to explain", pos: "verb", sentence_pl: "Czy możesz mi to wytłumaczyć wolniej?", sentence_en: "Can you explain that to me more slowly?" },
  { word: "przyzwyczaić się", translation: "to get used to", pos: "verb", sentence_pl: "Trzeba się przyzwyczaić do nowego rytmu życia.", sentence_en: "You have to get used to the new rhythm of life." },
  { word: "tęsknić", translation: "to miss (someone/a place)", pos: "verb", sentence_pl: "Bardzo tęsknię za rodziną.", sentence_en: "I miss my family very much." },
  { word: "martwić się", translation: "to worry", pos: "verb", sentence_pl: "Nie martw się — wszystko będzie dobrze.", sentence_en: "Don't worry — everything will be fine." },
  { word: "zastanawiać się", translation: "to wonder, to think over", pos: "verb", sentence_pl: "Zastanawiam się, co zrobię w przyszłości.", sentence_en: "I'm wondering what I'll do in the future." },
  { word: "udać się", translation: "to succeed, to manage", pos: "verb", sentence_pl: "Udało mi się zdać egzamin za pierwszym razem.", sentence_en: "I managed to pass the exam on the first try." },
  { word: "przekonać", translation: "to convince, to persuade", pos: "verb", sentence_pl: "Nie mogłem go przekonać do zmiany zdania.", sentence_en: "I couldn't convince him to change his mind." },
  { word: "starać się", translation: "to try, to make an effort", pos: "verb", sentence_pl: "Zawsze się staram dawać z siebie wszystko.", sentence_en: "I always try to give my best." },
  { word: "wyobrażać sobie", translation: "to imagine", pos: "verb", sentence_pl: "Nie mogę sobie wyobrazić życia bez muzyki.", sentence_en: "I can't imagine life without music." },
  { word: "zgadzać się", translation: "to agree", pos: "verb", sentence_pl: "Zgadzam się z twoją opinią w tej sprawie.", sentence_en: "I agree with your opinion on this matter." },
  { word: "wybaczać", translation: "to forgive", pos: "verb", sentence_pl: "Trudno mu wybaczyć to, co zrobił.", sentence_en: "It's hard to forgive him for what he did." },
  { word: "obiecać", translation: "to promise", pos: "verb", sentence_pl: "Obiecał, że będzie na czas.", sentence_en: "He promised that he would be on time." },
  { word: "zdecydować", translation: "to decide", pos: "verb", sentence_pl: "Zdecydowałem, że zostanę w Polsce na dłużej.", sentence_en: "I decided to stay in Poland for longer." },
  { word: "spóźnić się", translation: "to be late", pos: "verb", sentence_pl: "Przepraszam, że się spóźniłem — były korki.", sentence_en: "Sorry I'm late — there was traffic." },
  { word: "dotrzeć", translation: "to reach, to arrive", pos: "verb", sentence_pl: "Wiadomość dotarła do mnie zbyt późno.", sentence_en: "The message reached me too late." },
  { word: "naprawić", translation: "to fix, to repair", pos: "verb", sentence_pl: "Czy wiesz, jak naprawić ten błąd?", sentence_en: "Do you know how to fix this error?" },
  { word: "przygotować", translation: "to prepare", pos: "verb", sentence_pl: "Muszę się dobrze przygotować do rozmowy kwalifikacyjnej.", sentence_en: "I need to prepare well for the job interview." },
  { word: "denerwować się", translation: "to get nervous, to get annoyed", pos: "verb", sentence_pl: "Denerwuję się, gdy czekam zbyt długo.", sentence_en: "I get annoyed when I wait too long." },
  { word: "cieszyć się", translation: "to be happy, to enjoy", pos: "verb", sentence_pl: "Cieszę się, że tu jesteś.", sentence_en: "I'm glad you're here." },
  { word: "przyznać", translation: "to admit, to award", pos: "verb", sentence_pl: "Muszę przyznać, że miałeś rację.", sentence_en: "I have to admit that you were right." },
  { word: "osiągnąć", translation: "to achieve, to reach", pos: "verb", sentence_pl: "Chcę osiągnąć płynność w ciągu roku.", sentence_en: "I want to achieve fluency within a year." },
  { word: "zrezygnować", translation: "to give up, to resign", pos: "verb", sentence_pl: "Nie poddawaj się — nie rezygnuj z marzeń.", sentence_en: "Don't give up — don't abandon your dreams." },
  { word: "rozwiązać", translation: "to solve, to resolve", pos: "verb", sentence_pl: "Razem możemy rozwiązać każdy problem.", sentence_en: "Together we can solve any problem." },
  { word: "unikać", translation: "to avoid", pos: "verb", sentence_pl: "Stara się unikać trudnych rozmów.", sentence_en: "She tries to avoid difficult conversations." },
  { word: "polegać na", translation: "to rely on, to depend on", pos: "verb", sentence_pl: "Możesz na mnie polegać w każdej sytuacji.", sentence_en: "You can rely on me in any situation." },
  { word: "nalegać", translation: "to insist", pos: "verb", sentence_pl: "Nalegał, żebyśmy zostali na kolację.", sentence_en: "He insisted that we stay for dinner." },
  { word: "żałować", translation: "to regret", pos: "verb", sentence_pl: "Żałuję, że nie nauczyłem się tego wcześniej.", sentence_en: "I regret not learning this earlier." },
  { word: "zaproponować", translation: "to propose, to suggest", pos: "verb", sentence_pl: "Chciałbym zaproponować inne rozwiązanie.", sentence_en: "I'd like to suggest a different solution." },
  { word: "spełnić", translation: "to fulfil, to meet (a goal)", pos: "verb", sentence_pl: "Chcę spełnić wszystkie swoje marzenia.", sentence_en: "I want to fulfil all my dreams." },
  { word: "możliwość", translation: "possibility, opportunity", pos: "noun", sentence_pl: "Mam możliwość pracy za granicą.", sentence_en: "I have the opportunity to work abroad." },
  { word: "doświadczenie", translation: "experience", pos: "noun", sentence_pl: "To doświadczenie wiele mnie nauczyło.", sentence_en: "This experience taught me a lot." },
  { word: "odpowiedzialność", translation: "responsibility", pos: "noun", sentence_pl: "Wziął na siebie dużą odpowiedzialność.", sentence_en: "He took on a great responsibility." },
  { word: "wysiłek", translation: "effort", pos: "noun", sentence_pl: "Każdy sukces wymaga wysiłku.", sentence_en: "Every success requires effort." },
  { word: "nadzieja", translation: "hope", pos: "noun", sentence_pl: "Nie tracę nadziei, że mi się uda.", sentence_en: "I don't lose hope that I'll succeed." },
  { word: "wyzwanie", translation: "challenge", pos: "noun", sentence_pl: "Nauka języka to prawdziwe wyzwanie.", sentence_en: "Learning a language is a real challenge." },
  { word: "marzenie", translation: "dream, wish", pos: "noun", sentence_pl: "Moim marzeniem jest podróżować po całym świecie.", sentence_en: "My dream is to travel the whole world." },
  { word: "wspomnienie", translation: "memory, recollection", pos: "noun", sentence_pl: "Mam piękne wspomnienia z dzieciństwa.", sentence_en: "I have beautiful memories from childhood." },
  { word: "zaufanie", translation: "trust", pos: "noun", sentence_pl: "Zaufanie jest podstawą każdego związku.", sentence_en: "Trust is the foundation of every relationship." },
  { word: "odwaga", translation: "courage", pos: "noun", sentence_pl: "Potrzeba odwagi, żeby zacząć od nowa.", sentence_en: "It takes courage to start over." },
  { word: "wytrwałość", translation: "perseverance, persistence", pos: "noun", sentence_pl: "Dzięki wytrwałości można osiągnąć wszystko.", sentence_en: "With perseverance you can achieve anything." },
  { word: "ciekawość", translation: "curiosity", pos: "noun", sentence_pl: "Ciekawość to jeden z moich największych atutów.", sentence_en: "Curiosity is one of my greatest strengths." },
  { word: "świadomość", translation: "awareness, consciousness", pos: "noun", sentence_pl: "Świadomość własnych błędów to pierwszy krok.", sentence_en: "Awareness of your own mistakes is the first step." },
  { word: "samodzielność", translation: "independence, self-reliance", pos: "noun", sentence_pl: "Samodzielność jest bardzo ważna w dorosłym życiu.", sentence_en: "Self-reliance is very important in adult life." },
  { word: "duma", translation: "pride", pos: "noun", sentence_pl: "Czuję dumę z tego, co osiągnąłem.", sentence_en: "I feel pride in what I have achieved." },
  { word: "wstyd", translation: "shame, embarrassment", pos: "noun", sentence_pl: "Poczuł wstyd za swoje zachowanie.", sentence_en: "He felt shame for his behaviour." },
  { word: "zazdrość", translation: "jealousy, envy", pos: "noun", sentence_pl: "Zazdrość niszczy przyjaźnie.", sentence_en: "Jealousy destroys friendships." },
  { word: "współczucie", translation: "sympathy, compassion", pos: "noun", sentence_pl: "Okazał jej dużo współczucia.", sentence_en: "He showed her a lot of compassion." },
  { word: "cierpliwość", translation: "patience", pos: "noun", sentence_pl: "Cierpliwość jest kluczem do nauki języka.", sentence_en: "Patience is the key to language learning." },
  { word: "przyszłość", translation: "future", pos: "noun", sentence_pl: "Martwię się o swoją przyszłość zawodową.", sentence_en: "I'm worried about my professional future." },
  { word: "przeszłość", translation: "past", pos: "noun", sentence_pl: "Nie można żyć przeszłością.", sentence_en: "You can't live in the past." },
  { word: "zmiana", translation: "change", pos: "noun", sentence_pl: "Zmiana jest jedyną stałą rzeczą w życiu.", sentence_en: "Change is the only constant thing in life." },
  { word: "cel", translation: "goal, aim, target", pos: "noun", sentence_pl: "Wyznaczyłem sobie konkretny cel na ten rok.", sentence_en: "I set myself a specific goal for this year." },
  { word: "powód", translation: "reason, cause", pos: "noun", sentence_pl: "Jaki jest powód twojej decyzji?", sentence_en: "What is the reason for your decision?" },
  { word: "wybór", translation: "choice, selection", pos: "noun", sentence_pl: "Masz wolny wybór — nikt cię nie zmusza.", sentence_en: "It's your free choice — nobody is forcing you." },
  { word: "rozwiązanie", translation: "solution", pos: "noun", sentence_pl: "Zawsze istnieje jakieś rozwiązanie.", sentence_en: "There is always some solution." },
  { word: "podejście", translation: "approach, attitude", pos: "noun", sentence_pl: "Twoje podejście do problemu jest bardzo dobre.", sentence_en: "Your approach to the problem is very good." },
  { word: "związek", translation: "relationship, connection", pos: "noun", sentence_pl: "Ich związek oparty jest na zaufaniu.", sentence_en: "Their relationship is based on trust." },
  { word: "granica", translation: "border, limit, boundary", pos: "noun", sentence_pl: "Każdy człowiek powinien znać swoje granice.", sentence_en: "Every person should know their limits." },
  { word: "nawyk", translation: "habit", pos: "noun", sentence_pl: "Codzienna nauka to dobry nawyk.", sentence_en: "Daily study is a good habit." },
  { word: "skutek", translation: "effect, result, consequence", pos: "noun", sentence_pl: "Każda decyzja ma swoje skutki.", sentence_en: "Every decision has its consequences." },
  { word: "zmęczony", translation: "tired, exhausted", pos: "adjective", sentence_pl: "Jestem zbyt zmęczony, żeby dziś ćwiczyć.", sentence_en: "I'm too tired to work out today." },
  { word: "zaskoczony", translation: "surprised, astonished", pos: "adjective", sentence_pl: "Byłem zaskoczony tym, jak szybko czas minął.", sentence_en: "I was surprised by how quickly the time passed." },
  { word: "zawiedziony", translation: "disappointed", pos: "adjective", sentence_pl: "Czuję się zawiedziony swoimi wynikami.", sentence_en: "I feel disappointed with my results." },
  { word: "podekscytowany", translation: "excited", pos: "adjective", sentence_pl: "Jestem podekscytowany nowym projektem.", sentence_en: "I'm excited about the new project." },
  { word: "dumny", translation: "proud", pos: "adjective", sentence_pl: "Jestem dumny z tego, jak daleko zaszedłem.", sentence_en: "I'm proud of how far I've come." },
  { word: "wdzięczny", translation: "grateful, thankful", pos: "adjective", sentence_pl: "Jestem wdzięczny za każdą szansę, którą dostaję.", sentence_en: "I'm grateful for every chance I get." },
  { word: "spokojny", translation: "calm, peaceful", pos: "adjective", sentence_pl: "Staram się być spokojny w trudnych sytuacjach.", sentence_en: "I try to stay calm in difficult situations." },
  { word: "niecierpliwy", translation: "impatient", pos: "adjective", sentence_pl: "Bywa niecierpliwy, gdy coś nie idzie po jego myśli.", sentence_en: "He can be impatient when things don't go his way." },
  { word: "odważny", translation: "brave, courageous", pos: "adjective", sentence_pl: "Trzeba być odważnym, żeby zacząć od nowa.", sentence_en: "You have to be brave to start over." },
  { word: "szczery", translation: "honest, sincere", pos: "adjective", sentence_pl: "Cenię ludzi, którzy są szczerzy.", sentence_en: "I value people who are honest." },
  { word: "uprzejmy", translation: "polite, kind", pos: "adjective", sentence_pl: "Zawsze staram się być uprzejmy wobec innych.", sentence_en: "I always try to be polite to others." },
  { word: "pewny", translation: "certain, confident, sure", pos: "adjective", sentence_pl: "Jestem pewny, że podejmuję właściwą decyzję.", sentence_en: "I'm certain that I'm making the right decision." },
  { word: "skromny", translation: "modest, humble", pos: "adjective", sentence_pl: "Mimo sukcesów pozostał skromny.", sentence_en: "Despite his successes he remained modest." },
  { word: "samotny", translation: "lonely, alone", pos: "adjective", sentence_pl: "Czuł się samotny w nowym mieście.", sentence_en: "He felt lonely in the new city." },
  { word: "zazdrosny", translation: "jealous, envious", pos: "adjective", sentence_pl: "Nie bądź zazdrosny o sukcesy innych.", sentence_en: "Don't be jealous of others' successes." },
  { word: "poważny", translation: "serious, grave", pos: "adjective", sentence_pl: "To poważna sprawa i wymaga uwagi.", sentence_en: "This is a serious matter and requires attention." },
  { word: "zdenerwowany", translation: "nervous, irritated", pos: "adjective", sentence_pl: "Był zdenerwowany przed ważną prezentacją.", sentence_en: "He was nervous before the important presentation." },
  { word: "niestety", translation: "unfortunately", pos: "adverb", sentence_pl: "Niestety nie mogę przyjść na spotkanie.", sentence_en: "Unfortunately I can't come to the meeting." },
  { word: "natychmiast", translation: "immediately, at once", pos: "adverb", sentence_pl: "Zadzwoń do mnie natychmiast, jak dojedziesz.", sentence_en: "Call me immediately when you arrive." },
  { word: "nagle", translation: "suddenly, all of a sudden", pos: "adverb", sentence_pl: "Nagle zrozumiałem, gdzie popełniłem błąd.", sentence_en: "Suddenly I understood where I had made a mistake." },
  { word: "prawdopodobnie", translation: "probably, likely", pos: "adverb", sentence_pl: "Prawdopodobnie będę gotowy za godzinę.", sentence_en: "I'll probably be ready in an hour." },
  { word: "szczerze", translation: "honestly, sincerely", pos: "adverb", sentence_pl: "Szczerze mówiąc, nie wiem, co zrobić.", sentence_en: "Honestly speaking, I don't know what to do." },
  { word: "oczywiście", translation: "of course, obviously", pos: "adverb", sentence_pl: "Oczywiście, że ci pomogę — nie pytaj.", sentence_en: "Of course I'll help you — don't even ask." },
  { word: "jednak", translation: "however, yet, still", pos: "adverb", sentence_pl: "Było trudno, jednak nie poddałem się.", sentence_en: "It was hard, however I didn't give up." },
  { word: "dlatego", translation: "therefore, that's why", pos: "adverb", sentence_pl: "Uczę się polskiego, dlatego słucham polskiej muzyki.", sentence_en: "I'm learning Polish, that's why I listen to Polish music." },
  { word: "właśnie", translation: "just, exactly, precisely", pos: "adverb", sentence_pl: "Właśnie o to mi chodziło.", sentence_en: "That's exactly what I meant." },
  { word: "dopiero", translation: "only just, not until", pos: "adverb", sentence_pl: "Dopiero teraz rozumiem, jak ważna jest praktyka.", sentence_en: "Only now do I understand how important practice is." },
  { word: "mimo to", translation: "despite that, nevertheless", pos: "expression", sentence_pl: "Było zimno, mimo to wyszliśmy na spacer.", sentence_en: "It was cold, despite that we went for a walk." },
  { word: "chociaż", translation: "although, even though", pos: "conjunction", sentence_pl: "Chociaż jestem zmęczony, muszę skończyć zadanie.", sentence_en: "Although I'm tired, I have to finish the task." },
  { word: "ponieważ", translation: "because, since", pos: "conjunction", sentence_pl: "Lubię polskie kino, ponieważ jest bardzo autentyczne.", sentence_en: "I like Polish cinema because it's very authentic." },
  { word: "skoro", translation: "since, given that", pos: "conjunction", sentence_pl: "Skoro to wiesz, dlaczego nic nie powiedziałeś?", sentence_en: "Since you knew this, why didn't you say anything?" },
  { word: "zamiast", translation: "instead of", pos: "preposition", sentence_pl: "Zamiast narzekać, lepiej działaj.", sentence_en: "Instead of complaining, it's better to take action." },
  { word: "poza tym", translation: "besides, moreover, apart from that", pos: "expression", sentence_pl: "Poza tym mam jeszcze kilka innych planów.", sentence_en: "Besides that I have a few other plans." },
  { word: "nastawienie", translation: "attitude, mindset", pos: "noun", sentence_pl: "Pozytywne nastawienie pomaga w trudnych momentach.", sentence_en: "A positive mindset helps in difficult moments." },
  { word: "przełom", translation: "breakthrough, turning point", pos: "noun", sentence_pl: "Ten rok był dla mnie prawdziwym przełomem.", sentence_en: "This year was a real breakthrough for me." },
  { word: "codzienność", translation: "everyday life, daily routine", pos: "noun", sentence_pl: "Polszczyzna stała się częścią mojej codzienności.", sentence_en: "Polish has become part of my everyday life." },
  { word: "umiejętność", translation: "skill, ability", pos: "noun", sentence_pl: "Każda nowa umiejętność wymaga czasu.", sentence_en: "Every new skill requires time." },
  { word: "postęp", translation: "progress", pos: "noun", sentence_pl: "Widzę realny postęp w swoim mówieniu.", sentence_en: "I can see real progress in my speaking." },
  { word: "zaangażowanie", translation: "commitment, engagement, involvement", pos: "noun", sentence_pl: "Zaangażowanie w naukę to klucz do sukcesu.", sentence_en: "Commitment to learning is the key to success." },
  { word: "przyzwyczajenie", translation: "habit, custom (ingrained)", pos: "noun", sentence_pl: "Stare przyzwyczajenia trudno zmienić.", sentence_en: "Old habits are hard to change." },
  { word: "równowaga", translation: "balance, equilibrium", pos: "noun", sentence_pl: "Szukam równowagi między pracą a odpoczynkiem.", sentence_en: "I'm looking for balance between work and rest." },
];

window.Polish = {
  _flipped: false,
  _expanded: false,

  _getWordOfDay() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / 86400000);
    return POLISH_WORDS[dayOfYear % POLISH_WORDS.length];
  },

  async render() {
    this._flipped = false;
    this._expanded = false;
    const inner = document.getElementById('polish-flip-inner');
    const panel = document.getElementById('polish-expand-panel');
    const chevron = document.getElementById('polish-chevron');
    if (inner) inner.classList.remove('flipped');
    if (panel) panel.classList.remove('open');
    if (chevron) chevron.classList.remove('open');

    // Date label
    const today = new Date();
    const dateEl = document.getElementById('polish-wotd-date');
    if (dateEl) {
      dateEl.textContent = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }

    // Pre-load word onto back face silently
    this._displayWord(this._getWordOfDay());

    await this.renderStats();
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

  _displayWord(data) {
    const wordEl = document.getElementById('polish-wotd-word');
    const transEl = document.getElementById('polish-wotd-trans');
    const posEl = document.getElementById('polish-wotd-pos');
    const sentPlEl = document.getElementById('polish-wotd-sent-pl');
    const sentEnEl = document.getElementById('polish-wotd-sent-en');
    if (wordEl) wordEl.textContent = data.word;
    if (transEl) transEl.textContent = data.translation;
    if (posEl) posEl.textContent = data.pos;
    if (sentPlEl) sentPlEl.textContent = data.sentence_pl;
    if (sentEnEl) sentEnEl.textContent = data.sentence_en;
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
};

window.PolishFlip = () => Polish.flipCard();
window.PolishToggleExpand = () => Polish.toggleExpand();
window.PolishOpenLog = () => openQuickStudyModal('Polish Language');
