const POLISH_WORDS = [
  // ── A2 ──────────────────────────────────────────────────────────────────────
  { word: "rozmawiać", translation: "to talk, to chat", pos: "verb", sentence_pl: "Lubię rozmawiać z tobą o wszystkim.", sentence_en: "I like talking to you about everything." },
  { word: "zapytać", translation: "to ask", pos: "verb", sentence_pl: "Chciałem zapytać, czy możesz mi pomóc.", sentence_en: "I wanted to ask if you could help me." },
  { word: "odpowiedzieć", translation: "to answer, to reply", pos: "verb", sentence_pl: "Proszę, odpowiedz na moje pytanie.", sentence_en: "Please answer my question." },
  { word: "wrócić", translation: "to return, to come back", pos: "verb", sentence_pl: "Wrócę do domu o siódmej wieczór.", sentence_en: "I'll come back home at seven in the evening." },
  { word: "zostać", translation: "to stay, to remain", pos: "verb", sentence_pl: "Chcę zostać tutaj trochę dłużej.", sentence_en: "I want to stay here a little longer." },
  { word: "woleć", translation: "to prefer", pos: "verb", sentence_pl: "Wolę kawę od herbaty.", sentence_en: "I prefer coffee to tea." },
  { word: "zacząć", translation: "to start, to begin", pos: "verb", sentence_pl: "Kiedy zacząłeś uczyć się polskiego?", sentence_en: "When did you start learning Polish?" },
  { word: "skończyć", translation: "to finish, to end", pos: "verb", sentence_pl: "Muszę skończyć tę książkę do piątku.", sentence_en: "I need to finish this book by Friday." },
  { word: "spotkać się", translation: "to meet up, to get together", pos: "verb", sentence_pl: "Możemy spotkać się jutro w kawiarni.", sentence_en: "We can meet up tomorrow at the café." },
  { word: "pomóc", translation: "to help", pos: "verb", sentence_pl: "Czy mogę ci jakoś pomóc?", sentence_en: "Can I help you somehow?" },
  { word: "przeprosić", translation: "to apologize", pos: "verb", sentence_pl: "Chcę cię przeprosić za moje zachowanie.", sentence_en: "I want to apologize for my behaviour." },
  { word: "dziękować", translation: "to thank", pos: "verb", sentence_pl: "Chcę ci podziękować za wszystko.", sentence_en: "I want to thank you for everything." },
  { word: "czekać", translation: "to wait", pos: "verb", sentence_pl: "Czekam na ciebie od godziny.", sentence_en: "I've been waiting for you for an hour." },
  { word: "myśleć", translation: "to think", pos: "verb", sentence_pl: "Myślę, że masz rację.", sentence_en: "I think you're right." },
  { word: "czuć się", translation: "to feel (oneself)", pos: "verb", sentence_pl: "Jak się czujesz dzisiaj?", sentence_en: "How do you feel today?" },
  { word: "brakować", translation: "to miss, to lack", pos: "verb", sentence_pl: "Brakuje mi codziennych rozmów po polsku.", sentence_en: "I miss the daily conversations in Polish." },
  { word: "zapomnieć", translation: "to forget", pos: "verb", sentence_pl: "Zapomniałem wziąć parasol.", sentence_en: "I forgot to take an umbrella." },
  { word: "pamiętać", translation: "to remember", pos: "verb", sentence_pl: "Pamiętaj, żeby zadzwonić do mnie wieczorem.", sentence_en: "Remember to call me in the evening." },
  { word: "śmiać się", translation: "to laugh", pos: "verb", sentence_pl: "Zawsze się śmieje, gdy coś idzie nie tak.", sentence_en: "He always laughs when something goes wrong." },
  { word: "płakać", translation: "to cry", pos: "verb", sentence_pl: "Płakała ze szczęścia na swoim ślubie.", sentence_en: "She cried with happiness at her wedding." },
  { word: "zgubić", translation: "to lose, to misplace", pos: "verb", sentence_pl: "Zgubiłem klucze — nie mogę ich znaleźć.", sentence_en: "I lost my keys — I can't find them." },
  { word: "znaleźć", translation: "to find", pos: "verb", sentence_pl: "W końcu znalazłem to, czego szukałem.", sentence_en: "I finally found what I was looking for." },
  { word: "kupić", translation: "to buy", pos: "verb", sentence_pl: "Chcę kupić nowe słuchawki.", sentence_en: "I want to buy new headphones." },
  { word: "sprzedać", translation: "to sell", pos: "verb", sentence_pl: "Sprzedał swój stary telefon.", sentence_en: "He sold his old phone." },
  { word: "wytłumaczyć", translation: "to explain", pos: "verb", sentence_pl: "Czy możesz mi to wytłumaczyć wolniej?", sentence_en: "Can you explain that to me more slowly?" },
  { word: "pokazać", translation: "to show", pos: "verb", sentence_pl: "Pokaż mi, jak to działa.", sentence_en: "Show me how it works." },
  { word: "wysłać", translation: "to send", pos: "verb", sentence_pl: "Wyślę ci tę wiadomość zaraz.", sentence_en: "I'll send you that message right away." },
  { word: "odebrać", translation: "to pick up, to receive", pos: "verb", sentence_pl: "Odbierz telefon — ktoś dzwoni.", sentence_en: "Pick up the phone — someone is calling." },
  { word: "poczuć", translation: "to feel (once), to sense", pos: "verb", sentence_pl: "Poczułem ulgę, gdy skończyłem egzamin.", sentence_en: "I felt relief when I finished the exam." },
  { word: "wyjść", translation: "to go out, to leave", pos: "verb", sentence_pl: "Wyszedł z domu bez słowa.", sentence_en: "He left the house without a word." },
  { word: "wiadomość", translation: "message, news", pos: "noun", sentence_pl: "Dostałem wiadomość od starego znajomego.", sentence_en: "I got a message from an old acquaintance." },
  { word: "spotkanie", translation: "meeting, get-together", pos: "noun", sentence_pl: "Mam ważne spotkanie w pracy jutro.", sentence_en: "I have an important meeting at work tomorrow." },
  { word: "podróż", translation: "journey, trip", pos: "noun", sentence_pl: "Każda podróż uczy mnie czegoś nowego.", sentence_en: "Every trip teaches me something new." },
  { word: "urlop", translation: "holiday, vacation, leave", pos: "noun", sentence_pl: "Jestem na urlopie przez cały przyszły tydzień.", sentence_en: "I'm on holiday all of next week." },
  { word: "szansa", translation: "chance, opportunity", pos: "noun", sentence_pl: "To moja ostatnia szansa, żeby to naprawić.", sentence_en: "This is my last chance to fix it." },
  { word: "pomysł", translation: "idea", pos: "noun", sentence_pl: "Mam świetny pomysł na weekend.", sentence_en: "I have a great idea for the weekend." },
  { word: "plan", translation: "plan", pos: "noun", sentence_pl: "Jaki jest twój plan na ten rok?", sentence_en: "What is your plan for this year?" },
  { word: "historia", translation: "history, story", pos: "noun", sentence_pl: "To jest bardzo ciekawa historia.", sentence_en: "This is a very interesting story." },
  { word: "pogoda", translation: "weather", pos: "noun", sentence_pl: "Pogoda dzisiaj jest idealna do spaceru.", sentence_en: "The weather today is perfect for a walk." },
  { word: "zdrowie", translation: "health", pos: "noun", sentence_pl: "Zdrowie jest najważniejsze w życiu.", sentence_en: "Health is the most important thing in life." },
  { word: "ból", translation: "pain, ache", pos: "noun", sentence_pl: "Czuję ból w plecach po treningu.", sentence_en: "I feel pain in my back after the workout." },
  { word: "sen", translation: "sleep, dream", pos: "noun", sentence_pl: "Potrzebuję co najmniej ośmiu godzin snu.", sentence_en: "I need at least eight hours of sleep." },
  { word: "przyjaciel", translation: "friend (close)", pos: "noun", sentence_pl: "On jest moim najlepszym przyjacielem od dziecka.", sentence_en: "He has been my best friend since childhood." },
  { word: "znajomy", translation: "acquaintance", pos: "noun", sentence_pl: "To tylko znajomy — nie znamy się zbyt dobrze.", sentence_en: "It's just an acquaintance — we don't know each other that well." },
  { word: "kolega", translation: "colleague, mate", pos: "noun", sentence_pl: "Poszedłem na lunch z kolegą z pracy.", sentence_en: "I went for lunch with a colleague from work." },
  { word: "szef", translation: "boss, manager", pos: "noun", sentence_pl: "Mój szef jest bardzo wymagający.", sentence_en: "My boss is very demanding." },
  { word: "obiad", translation: "lunch, dinner (main meal)", pos: "noun", sentence_pl: "Zjem obiad o drugiej po południu.", sentence_en: "I'll have lunch at two in the afternoon." },
  { word: "śniadanie", translation: "breakfast", pos: "noun", sentence_pl: "Zawsze jem śniadanie przed wyjściem z domu.", sentence_en: "I always eat breakfast before leaving the house." },
  { word: "kolacja", translation: "dinner, supper", pos: "noun", sentence_pl: "Zapraszam cię na kolację w sobotę.", sentence_en: "I invite you to dinner on Saturday." },
  { word: "przepis", translation: "recipe, regulation", pos: "noun", sentence_pl: "Masz dobry przepis na bigos?", sentence_en: "Do you have a good recipe for bigos?" },
  { word: "trudny", translation: "difficult, hard", pos: "adjective", sentence_pl: "Ten egzamin był naprawdę trudny.", sentence_en: "That exam was really difficult." },
  { word: "łatwy", translation: "easy, simple", pos: "adjective", sentence_pl: "Myślałem, że to będzie łatwe.", sentence_en: "I thought it would be easy." },
  { word: "ważny", translation: "important", pos: "adjective", sentence_pl: "To jest bardzo ważna decyzja.", sentence_en: "This is a very important decision." },
  { word: "ciekawy", translation: "interesting, curious", pos: "adjective", sentence_pl: "To jest ciekawy punkt widzenia.", sentence_en: "That's an interesting point of view." },
  { word: "nudny", translation: "boring", pos: "adjective", sentence_pl: "Spotkanie było długie i nudne.", sentence_en: "The meeting was long and boring." },
  { word: "głośny", translation: "loud, noisy", pos: "adjective", sentence_pl: "Muzyka była zbyt głośna.", sentence_en: "The music was too loud." },
  { word: "cichy", translation: "quiet, silent", pos: "adjective", sentence_pl: "Potrzebuję cichego miejsca do pracy.", sentence_en: "I need a quiet place to work." },
  { word: "drogi", translation: "expensive, dear", pos: "adjective", sentence_pl: "Ten hotel jest zbyt drogi.", sentence_en: "This hotel is too expensive." },
  { word: "tani", translation: "cheap, affordable", pos: "adjective", sentence_pl: "Znalazłem tanie bilety na pociąg.", sentence_en: "I found cheap train tickets." },
  { word: "zdrowy", translation: "healthy", pos: "adjective", sentence_pl: "Staram się jeść zdrowo i regularnie ćwiczyć.", sentence_en: "I try to eat healthily and exercise regularly." },
  { word: "szczęśliwy", translation: "happy, lucky", pos: "adjective", sentence_pl: "Jestem szczęśliwy, że tu jestem.", sentence_en: "I'm happy to be here." },
  { word: "smutny", translation: "sad", pos: "adjective", sentence_pl: "Był smutny po przegranym meczu.", sentence_en: "He was sad after the lost match." },
  { word: "głodny", translation: "hungry", pos: "adjective", sentence_pl: "Jestem głodny — kiedy jemy?", sentence_en: "I'm hungry — when do we eat?" },
  { word: "wolny", translation: "free, slow", pos: "adjective", sentence_pl: "Czy jesteś wolny w sobotę wieczorem?", sentence_en: "Are you free on Saturday evening?" },
  { word: "zajęty", translation: "busy, occupied", pos: "adjective", sentence_pl: "Byłem bardzo zajęty przez ostatnie dwa tygodnie.", sentence_en: "I've been very busy for the last two weeks." },

  // ── B1 / B2 ─────────────────────────────────────────────────────────────────
  { word: "zrozumieć", translation: "to understand (fully)", pos: "verb", sentence_pl: "Staram się zrozumieć, jak działa ten system.", sentence_en: "I'm trying to understand how this system works." },
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
  { word: "poza tym", translation: "besides, moreover", pos: "expression", sentence_pl: "Poza tym mam jeszcze kilka innych planów.", sentence_en: "Besides that I have a few other plans." },
  { word: "nastawienie", translation: "attitude, mindset", pos: "noun", sentence_pl: "Pozytywne nastawienie pomaga w trudnych momentach.", sentence_en: "A positive mindset helps in difficult moments." },
  { word: "przełom", translation: "breakthrough, turning point", pos: "noun", sentence_pl: "Ten rok był dla mnie prawdziwym przełomem.", sentence_en: "This year was a real breakthrough for me." },
  { word: "codzienność", translation: "everyday life, daily routine", pos: "noun", sentence_pl: "Polszczyzna stała się częścią mojej codzienności.", sentence_en: "Polish has become part of my everyday life." },
  { word: "umiejętność", translation: "skill, ability", pos: "noun", sentence_pl: "Każda nowa umiejętność wymaga czasu.", sentence_en: "Every new skill requires time." },
  { word: "postęp", translation: "progress", pos: "noun", sentence_pl: "Widzę realny postęp w swoim mówieniu.", sentence_en: "I can see real progress in my speaking." },
  { word: "zaangażowanie", translation: "commitment, engagement", pos: "noun", sentence_pl: "Zaangażowanie w naukę to klucz do sukcesu.", sentence_en: "Commitment to learning is the key to success." },
  { word: "przyzwyczajenie", translation: "ingrained habit, custom", pos: "noun", sentence_pl: "Stare przyzwyczajenia trudno zmienić.", sentence_en: "Old habits are hard to change." },
  { word: "równowaga", translation: "balance, equilibrium", pos: "noun", sentence_pl: "Szukam równowagi między pracą a odpoczynkiem.", sentence_en: "I'm looking for balance between work and rest." },
];

const POLISH_DAILY_GOAL_MIN = 20;
const POLISH_WEEKLY_GOAL_MIN = POLISH_DAILY_GOAL_MIN * 7;
const POLISH_TIMER_KEY = 'st2_polish_timer';

window.Polish = {
  _flipped: false,
  _expanded: false,
  _timerInterval: null,
  _savedOpen: false,

  // ── Word of the Day ────────────────────────────────────────────────────────

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
    if (inner) { inner.classList.remove('flipped'); inner.style.minHeight = ''; }
    if (panel) panel.classList.remove('open');
    if (chevron) chevron.classList.remove('open');

    const today = new Date();
    const dateEl = document.getElementById('polish-wotd-date');
    if (dateEl) {
      dateEl.textContent = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }

    this._displayWord(this._getWordOfDay());
    this.restoreTimer();
    await this.renderStats();
    await this.renderFavoritesSection();
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
    this._updateStarBtn(data.word);
  },

  async _getFavorites() {
    return (await window.db.settings.get('polishFavorites')) || [];
  },

  async _updateStarBtn(word) {
    const btn = document.getElementById('polish-star-btn');
    if (!btn) return;
    const favs = await this._getFavorites();
    const saved = favs.includes(word);
    btn.textContent = saved ? '★' : '☆';
    btn.classList.toggle('starred', saved);
  },

  async toggleFavorite() {
    const word = this._getWordOfDay().word;
    const favs = await this._getFavorites();
    const idx = favs.indexOf(word);
    if (idx === -1) {
      favs.push(word);
      App.showToast('Word saved!', 'success');
    } else {
      favs.splice(idx, 1);
      App.showToast('Word removed', 'info');
    }
    await window.db.settings.set('polishFavorites', favs);
    this._updateStarBtn(word);
    await this.renderFavoritesSection();
  },

  _savedWords: [],

  async renderFavoritesSection() {
    const favs = await this._getFavorites();
    this._savedWords = favs.map((w) => POLISH_WORDS.find((x) => x.word === w)).filter(Boolean);

    const countEl = document.getElementById('polish-saved-count');
    if (countEl) countEl.textContent = favs.length;

    const searchEl = document.getElementById('polish-saved-search');
    this._renderSavedList(searchEl?.value || '');
  },

  _renderSavedList(query) {
    const list = document.getElementById('polish-saved-list');
    if (!list) return;

    if (this._savedWords.length === 0) {
      list.innerHTML = '<div class="polish-saved-empty">No saved words yet — star a word to save it.</div>';
      return;
    }

    const q = query.trim().toLowerCase();
    const filtered = q
      ? this._savedWords.filter((d) => d.word.toLowerCase().includes(q) || d.translation.toLowerCase().includes(q) || d.pos.toLowerCase().includes(q))
      : this._savedWords;

    if (filtered.length === 0) {
      list.innerHTML = `<div class="polish-saved-no-results">No matches for "${App.escapeHtml(query)}"</div>`;
      return;
    }

    list.innerHTML = filtered.map((data) => `
      <div class="polish-saved-row">
        <div class="polish-saved-word-info">
          <span class="polish-saved-word">${App.escapeHtml(data.word)}</span>
          <span class="polish-saved-trans">${App.escapeHtml(data.translation)}</span>
          <span class="polish-pos-badge">${App.escapeHtml(data.pos)}</span>
        </div>
        <button class="polish-saved-remove" onclick="PolishRemoveFavorite('${App.escapeHtml(data.word)}')" title="Remove">★</button>
      </div>`).join('');
  },

  filterSaved(query) {
    this._renderSavedList(query);
  },

  async removeFavorite(word) {
    const favs = await this._getFavorites();
    const idx = favs.indexOf(word);
    if (idx !== -1) favs.splice(idx, 1);
    await window.db.settings.set('polishFavorites', favs);
    this._updateStarBtn(this._getWordOfDay().word);
    await this.renderFavoritesSection();
  },

  toggleSavedPanel() {
    this._savedOpen = !this._savedOpen;
    const body = document.getElementById('polish-saved-body');
    const chevron = document.getElementById('polish-saved-chevron');
    if (body) body.classList.toggle('open', this._savedOpen);
    if (chevron) chevron.classList.toggle('open', this._savedOpen);
    if (this._savedOpen) {
      const searchEl = document.getElementById('polish-saved-search');
      if (searchEl) { searchEl.value = ''; this._renderSavedList(''); }
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
      inner.style.minHeight = '';
    }
  },

  toggleExpand() {
    this._expanded = !this._expanded;
    const panel = document.getElementById('polish-expand-panel');
    const chevron = document.getElementById('polish-chevron');
    const inner = document.getElementById('polish-flip-inner');
    if (panel) panel.classList.toggle('open', this._expanded);
    if (chevron) chevron.classList.toggle('open', this._expanded);
    // Grow the flip card to reveal the expanded content
    if (inner) inner.style.minHeight = this._expanded ? '185px' : '';
  },

  // ── Stats ──────────────────────────────────────────────────────────────────

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

    // Today card
    const todayEl = document.getElementById('polish-today-total');
    if (todayEl) {
      const h = Math.floor(todayMin / 60);
      const m = todayMin % 60;
      todayEl.innerHTML = h > 0
        ? `<span class="study-total-h">${h}</span><span class="study-total-unit">h </span><span class="study-total-h">${m}</span><span class="study-total-unit">m</span>`
        : `<span class="study-total-h">${m}</span><span class="study-total-unit">m</span>`;
    }

    const dailyRaw = Math.round((todayMin / POLISH_DAILY_GOAL_MIN) * 100);
    const dailyOnFire = dailyRaw >= 100;
    const dailyBar = document.getElementById('polish-daily-goal-bar');
    if (dailyBar) {
      dailyBar.style.width = Math.min(dailyRaw, 100) + '%';
      dailyBar.style.background = dailyOnFire ? '#EAB308' : '#78B86C';
    }
    const dailyPct = document.getElementById('polish-daily-goal-pct');
    if (dailyPct) {
      dailyPct.textContent = dailyRaw + '%' + (dailyOnFire ? ' 🔥' : '');
      dailyPct.style.color = dailyOnFire ? '#EAB308' : '#78B86C';
    }

    // Week card
    const weekEl = document.getElementById('polish-week-total');
    if (weekEl) {
      const h = Math.floor(weekMin / 60);
      const m = weekMin % 60;
      weekEl.innerHTML = h > 0
        ? `<span class="study-week-num">${h}</span><span class="study-week-unit">h </span><span class="study-week-num">${m}</span><span class="study-week-unit">m</span>`
        : `<span class="study-week-num">${m}</span><span class="study-week-unit">m</span>`;
    }

    const weekRaw = Math.round((weekMin / POLISH_WEEKLY_GOAL_MIN) * 100);
    const weekOnFire = weekRaw >= 100;
    const weekBar = document.getElementById('polish-week-goal-bar');
    if (weekBar) {
      weekBar.style.width = Math.min(weekRaw, 100) + '%';
      weekBar.style.background = weekOnFire ? '#EAB308' : '#78B86C';
    }
    const weekPct = document.getElementById('polish-week-goal-pct');
    if (weekPct) {
      weekPct.textContent = weekRaw + '%' + (weekOnFire ? ' 🔥' : '');
      weekPct.style.color = weekOnFire ? '#EAB308' : '#78B86C';
    }

    const polishPerDay = weekDates.map((d) =>
      Math.round(polishSessions.filter((s) => s.date.startsWith(d)).reduce((t, s) => t + s.durationMinutes, 0) / 60 * 10) / 10
    );
    Charts.createStudyWeekBars('polish-week-chart', ['M', 'T', 'W', 'T', 'F', 'S', 'S'], polishPerDay, POLISH_DAILY_GOAL_MIN / 60);
  },

  // ── Timer ──────────────────────────────────────────────────────────────────

  _getTimerState() {
    try { return JSON.parse(localStorage.getItem(POLISH_TIMER_KEY) || 'null'); } catch { return null; }
  },
  _setTimerState(s) { localStorage.setItem(POLISH_TIMER_KEY, JSON.stringify(s)); },
  _clearTimerState() { localStorage.removeItem(POLISH_TIMER_KEY); },

  restoreTimer() {
    const state = this._getTimerState();
    if (state && state.running) this._startTick();
    this._updateTimerDisplay();
  },

  _updateTimerDisplay() {
    const display = document.getElementById('polish-timer-display');
    if (!display) return;
    const state = this._getTimerState();
    if (!state) { display.textContent = '00:00:00'; this._setTimerButtons('idle'); return; }
    const elapsed = state.running
      ? state.elapsedOnPause + Math.floor((Date.now() - state.startTime) / 1000)
      : state.elapsedOnPause;
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    display.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (state.running) this._setTimerButtons('running');
    else if (state.elapsedOnPause > 0) this._setTimerButtons('paused');
    else this._setTimerButtons('idle');
  },

  _setTimerButtons(state) {
    const startBtn = document.getElementById('polish-timer-start-btn');
    const controls = document.getElementById('polish-timer-controls');
    const pauseBtn = document.getElementById('polish-timer-pause-btn');
    if (state === 'idle') {
      if (startBtn) startBtn.style.display = '';
      if (controls) controls.style.display = 'none';
    } else if (state === 'running') {
      if (startBtn) startBtn.style.display = 'none';
      if (controls) controls.style.display = 'flex';
      if (pauseBtn) pauseBtn.textContent = '⏸ Pause';
    } else if (state === 'paused') {
      if (startBtn) startBtn.style.display = 'none';
      if (controls) controls.style.display = 'flex';
      if (pauseBtn) pauseBtn.textContent = '▶ Resume';
    }
  },

  startTimer() {
    const existing = this._getTimerState();
    this._setTimerState({
      running: true,
      startTime: Date.now(),
      elapsedOnPause: existing?.elapsedOnPause || 0,
    });
    this._startTick();
    this._updateTimerDisplay();
  },

  pauseTimer() {
    const state = this._getTimerState();
    if (!state || !state.running) return;
    const elapsed = state.elapsedOnPause + Math.floor((Date.now() - state.startTime) / 1000);
    this._setTimerState({ ...state, running: false, elapsedOnPause: elapsed });
    clearInterval(this._timerInterval);
    this._timerInterval = null;
    this._updateTimerDisplay();
  },

  async stopTimer() {
    const state = this._getTimerState();
    if (!state) return;
    this.pauseTimer();
    const finalState = this._getTimerState();
    const elapsed = finalState.elapsedOnPause;
    if (elapsed < 60) {
      App.showToast('Session too short (< 1 min). Discarded.', 'info');
      this._clearTimerState();
      this._updateTimerDisplay();
      return;
    }
    const minutes = Math.round(elapsed / 60);
    await window.db.study.add({
      date: new Date().toISOString(),
      classId: null,
      subject: 'Polish Language',
      durationMinutes: minutes,
      notes: '',
    });
    this._clearTimerState();
    clearInterval(this._timerInterval);
    this._timerInterval = null;
    this._updateTimerDisplay();
    App.showToast(`Polish session saved: ${App.formatMinutes(minutes)}`, 'success');
    await this.renderStats();
    if (App.currentTab === 'dashboard') await Dashboard.render();
  },

  _startTick() {
    clearInterval(this._timerInterval);
    this._timerInterval = setInterval(() => this._updateTimerDisplay(), 1000);
  },
};

window.PolishFlip = () => Polish.flipCard();
window.PolishToggleExpand = () => Polish.toggleExpand();
window.PolishStartTimerFlow = () => Polish.startTimer();
window.PolishPauseTimer = () => Polish.pauseTimer();
window.PolishStopTimer = () => Polish.stopTimer();
window.PolishOpenLog = () => openQuickStudyModal('Polish Language');
window.PolishToggleFavorite = () => Polish.toggleFavorite();
window.PolishToggleSaved = () => Polish.toggleSavedPanel();
window.PolishRemoveFavorite = (w) => Polish.removeFavorite(w);
window.PolishFilterSaved = (q) => Polish.filterSaved(q);
