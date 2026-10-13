# EZprawko — plan usprawnień UI, UX i ścieżek użytkownika

Data: 2026-10-13. Status: wdrożenie częściowe; lokalna regresja zaliczona.

## Aktualny status realizacji

Status lokalny nie oznacza odbioru na fizycznych urządzeniach ani gotowości publikacji.
Historia checkpointów pozostaje w `IMPLEMENTATION_PROGRESS.md`.

| Faza | Wdrożone lokalnie | Pozostały zakres |
| --- | --- | --- |
| F0 | Baseline i kontrakty regresji | Pomiary czasu oraz zadania na telefonach |
| F1 | F1.1 gotowość dekodera i recovery; F1.2 bufor Nauki i look-ahead, pełny cache egzaminu, retry/cancel/login; kwarantanna dwóch potwierdzonych braków | P0 F1.0 dekodowanie/dostęp i pomiary na telefonach; F1.3 polityka dostępu; F1.4 rejestracja/odzyskiwanie po decyzji i konfiguracji serwera |
| F2 | F2.4 retry odczytu; F2.5 wyjaśnienie od razu i rozwijane szczegóły; F2.6 raport globalny, per kategoria i punktacja z kontrolą źródła | F2.2–F2.3 kwalifikowana redakcja/import; odbiór urządzeniowy. Pakiet nadal ma 0 wyjaśnień |
| F3 | Czytelny start i zakres, rozwijane filtry, reset, jawne pomijanie, F3.6 kolejna partia z informacją o powtórkach | Odbiór ergonomii na telefonach; kontrola wszystkich informacji zakresu i dolnych CTA |
| F4 | Rekomendacje z danych, ostatnie wyniki per dział i próbka, osobne opanowanie, akcje ćwiczenia | F4.1 uzgodniona definicja kolejki powtórek; część F4.2 dotycząca wznowienia Nauki |
| F5 | Wspólne tokeny i kontrolki; F5.1 nagłówki i tokeny Start/Nauka/onboarding/Ustawienia/Postęp, formatowanie locale; F5.3 krótszy onboarding i wybór kategorii przed partią; F5.4 dostępność ekranów | F5.2 porównanie nawigacji; fizyczna dostępność i odbiór |
| F6 | Nie rozpoczęto — opcjonalne rozszerzenie | Trwałe wznowienie jednej sesji wymaga osobnej decyzji; bez nowej historii/trybów |
| F7 | 38 skryptów regresji, dotychczasowe 34 pary kontrastów, lint i TypeScript zaliczone | Pełna macierz Android/iOS, największe fonty, keyboard, VoiceOver/TalkBack, rzeczywiste dekodowanie/cache i pomiary startu |

### Kolejne zadania według priorytetu

P0 — pierwszy kolejny checkpoint: F1.0, pełna weryfikacja kompletności i dostępności
multimediów do pytań. Obejmuje źródło, mapowanie, rzeczywisty storage, dostęp przez
aplikację, integralność/dekodowanie i QA Android/iOS. Źródło i pełny inwentarz R2
porównano; dwa potwierdzone braki są na prośbę właściciela wykluczone z nowych pul.
Status: część katalogowa wykonana, dekodowanie/dostęp i pomiary zimnego/ciepłego
startu na Android/iOS pozostają P0. Szczegóły: docs/MEDIA_AUDIT.md.

1. P0: uzgodnić politykę dostępu F1.3 oraz recenzenta/pilotaż treści F2.2.
   Nie wykonywać zmian kont, maili ani chmury bez tej decyzji.
2. P1: F2.5 wdrożone lokalnie; odbiór rozwijanych szczegółów na telefonach
   z zatwierdzoną treścią lub oznaczoną lokalną próbką testową pozostaje otwarty.
3. P1: F5.3 wdrożone lokalnie — odbiór układu, gestów i focusu na telefonach.
   Kategoria zmieniana tylko przed partią; brak synchronizacji nadal widoczny.
4. P1: fizyczny odbiór krytycznych ścieżek F0/F1/F3/F5/F7 według `QA_CHECKLIST.md`.
   Testy z mockami nie zastępują sprawdzenia czytnika ani dekodera.
5. P2: uzgodnić regułę powtórek F4.1; zakończyć ocenę nawigacji F5.2 oraz
   pozostałe porządki typografii/formatów. Nie zmieniać historycznego filtra bez decyzji.
6. Opcjonalnie: F6 po osobnej akceptacji. EAS/publikacja nadal odłożone.

## 1. Cel i ustalony zakres

Cel: użytkownik potrafi rozpocząć naukę, wrócić do niej, zrozumieć błąd,
wybrać kolejne ćwiczenie i ocenić postęp bez szukania po ekranach.

Dokument uzupełnia PLAN_DOPRACOWANIA_UX.md i PLAN_UX_IMPLEMENTACJI.md.
Nie otwiera ponownie ukończonych prac i nie zmienia wcześniejszych decyzji:

- Bez gamifikacji, odznak, serii dni, wyzwań, dźwięków nagród i celebracji.
- Zachowany silnik egzaminu: 20+12 pytań, 74 punkty, próg 68, istniejące limity czasu.
- Zachowane oficjalne treści, tłumaczenia, historia, oznaczenia i dane użytkownika.
- Nowe długości/tryby nauki oraz trwała historia sesji pozostają odłożone.
  Trwałe wznowienie jednej aktywnej sesji jest opisane osobno jako opcja rozszerzenia.
- EAS i publikacja pozostają odłożone. Plan nie stanowi zgody na zmiany w chmurze.
- Projekt używa Expo SDK 57 i package-lock.json. Przed implementacją dotykającą
  Expo/React Native należy sprawdzić aktualny package.json, przeczytać dokumentację
  https://docs.expo.dev/versions/v57.0.0/ oraz właściwe strony z indeksu
  https://docs.expo.dev/llms.txt. Nawigacja pozostaje w Expo Router.
- Nowe zależności tylko przy realnej potrzebie, instalowane przez expo install.

## 2. Stan wyjściowy i korekta wniosków audytu

Potwierdzone w kodzie i dokumentach:

| Obszar | Aktualny stan | Znaczenie dla planu |
| --- | --- | --- |
| Multimedia | Pobieranie wymaga istniejącego konta; błędy materiału blokują odpowiedzi w Nauce | Najpierw domknąć dostęp i odzyskiwanie |
| Konto | Logowanie jest; rejestracji i odzyskiwania hasła w aplikacji brak | Potrzebna decyzja o dostępie oraz konfiguracja backendu |
| Wyjaśnienia | `assets/data/question-explanations.json` ma 0 wpisów | Wysoki priorytet treści, nie tylko wyglądu kart |
| Sesja Nauki | Stan w pamięci; powrót między tabami działa, restart procesu nie odtwarza partii | Opcjonalna trwałość jednej sesji |
| Partie | 5 pytań przy krótkiej sesji, zwykle do 12; błędy próby do 32 | Usprawniać istniejące partie bez nowych trybów |
| Błędy | Filtr obejmuje historyczne pomyłki; poprawna odpowiedź nie usuwa automatycznie pytania z tego zbioru | Ustalić znaczenie „do powtórki” |
| Offline | Do 250 materiałów kategorii, cache 1 GB; pliki mogą zostać usunięte | Nie deklarować pełnego offline |
| Postęp | Przerobiona baza, opanowanie i zdawalność mają różne definicje | Połączyć z działaniem, zachować uczciwe etykiety |
| UI | Wspólne kolory; style typografii, kart i przycisków definiowane lokalnie | Ujednolicić tokeny i podstawowe komponenty |
| Nawigacja | Pięć natywnych tabów; wariant web ma osobną implementację | Sprawdzić na urządzeniach przed zmianą struktury |

Blokada odpowiedzi bez materiału chroni przed zgadywaniem. Nie należy jej usuwać
dla pytań zależnych od zdjęcia/filmu. Problemem jest brak drogi do uzyskania
materiału, a nie sama blokada. Nie wprowadzamy pozornego „trybu tekstowego”
ani zmiany egzaminu na zestaw bez multimediów.

Pięć tabów to hipoteza ryzyka przy małym ekranie i długich tłumaczeniach,
nie potwierdzony błąd. Zmiana na cztery taby wymaga porównania wariantów.
Poprzedni audyt był oparty na kodzie, nie na pełnym teście wizualnym telefonu.

## 3. Kolejność i zależności

P0: blokada głównego zadania lub utrata danych. P1: skuteczność nauki i orientacja.
P2: optymalizacja i rozszerzenia. Nakład jest szacunkiem dni roboczych dla jednej
osoby; nie obejmuje oczekiwania na treści, decyzje, dostępy i urządzenia.

| Kolejność | Faza | Priorytet | Nakład | Warunek rozpoczęcia |
| --- | --- | --- | --- | --- |
| 0 | Pomiar stanu i scenariusze QA | P0 | 1–2 dni | Brak |
| 1 | Dostęp do multimediów i domknięcie konta | P0 | 4–7 dni | F0; część serwerowa po decyzji o dostępie |
| 2 | Wyjaśnienia i odzyskiwanie ich odczytu | P1 | 1–2 dni kodu + praca redakcyjna | F0; redakcja może trwać równolegle do F1 |
| 3 | Jasny początek i koniec istniejącej sesji Nauki | P1 | 3–5 dni | F1, wspólne stany materiałów |
| 4 | Dashboard, powtórki i postęp prowadzące do działania | P1 | 3–5 dni | F3; definicja kolejki powtórek |
| 5 | Spójność UI, nawigacja i dostępność | P1 | 3–5 dni | F0 dla pomiaru; docelowy układ po F3/F4 |
| 6 | Trwałe wznowienie jednej sesji Nauki — opcja | P2 | 3–5 dni | Osobne rozszerzenie zakresu; F3 |
| 7 | Pełna regresja urządzeniowa i odbiór | P0 dla wydania | 2–4 dni + poprawki | Gotowe fazy objęte wydaniem |

Przy jednej osobie F0 → F1 → F2 (kod) → F3 → F4 → F5 → F7.
Przegląd treści F2 zaczyna się po F0 i nie powinien czekać na ukończenie UI.
F6 nie blokuje pozostałych prac. Nie czekać ze sprawdzaniem urządzeń do F7:
każda faza ma własny mały odbiór na telefonie.

## 4. Faza 0 — punkty odniesienia i kontrakty

### Zadania

- F0.1: przejść świeżą instalację i konto istniejącego użytkownika na Androidzie
  i iPhonie. Zapisać zrzuty kluczowych ekranów w obu motywach oraz przy dużym foncie.
- F0.2: zmierzyć czas od końca onboardingu do pierwszej zapisanej odpowiedzi,
  liczbę kroków, czas zimnego/ciepłego startu egzaminu i napotkane blokady.
- F0.3: spisać stany dla nowych i powracających osób: konto/brak konta,
  dostęp/odmowa, online/offline, materiały gotowe/brak/uszkodzenie.
- F0.4: potwierdzić źródło i wersję bazy, rzeczywisty stan wyjaśnień,
  tłumaczeń i pakietu mediów. Odróżnić dostępne UI od dostępnej treści.
- F0.5: dopisać scenariusze do QA_CHECKLIST.md. Przygotować kopię testowej bazy
  do sprawdzania migracji; nie używać rzeczywistych danych kursanta.

### Odbiór

Jest lista odtwarzalnych problemów, bazowe pomiary i macierz stanów.
Nieudostępnione urządzenie oznacza otwarty odbiór danej platformy.
Pomiary mogą być ręczne; zdalna analityka nie jest potrzebna do tej fazy.

## 5. Faza 1 — multimedia i konto

### F1.0 — P0: kompletność i dostępność multimediów

Nowy priorytet na prośbę użytkownika. Status: częściowy audyt wykonany, usterki otwarte; nie oznaczać jako
zaliczone na podstawie testów ze stubami ani obecności nazwy pliku w bazie.

Checkpoint lokalny: raport `scripts/audit-media.cjs` uzgadnia bazę/manifest
i indeksy ZIP; 2633/2635 referencji znaleziono lokalnie. Braki dotyczą pytań
13074 i 11150. Wiersze arkusza uzgodnione (3518/3518, także puste referencje).
Pełny inwentarz R2: 2631/2635 dokładnych kluczy obecnych; dodatkowe 11179/11180
mają pliki pod równoważnymi nazwami NFC. Mapowanie NFC naprawione lokalnie;
ponowny audyt potwierdza 2633/2635 kluczy. Pozostały braki 11150/13074 oraz
fizyczna weryfikacja naprawy; nie podmieniono materiałów innymi filmami.
Pełne ustalenia: `docs/MEDIA_AUDIT.md`. Dostęp aplikacyjny, dekodowanie/konwersje
i zgodność treści pozostają nieweryfikowane; F1.0 otwarte.

1. Utworzyć pełny manifest referencji z aktualnej bazy i porównać z oficjalnym
   źródłem importu: ID pytania, kategorie, nazwa oryginalna, typ i docelowy klucz.
   Rozróżnić pytania celowo bez materiału od utraconego powiązania. Objąć wszystkie
   kategorie, nie tylko B; deduplikować pliki, zachować wszystkie zależne pytania.
2. Sprawdzić mapowanie nazw, wielkość liter, znaki specjalne i konwersję WMV → MP4.
   Wykryć puste/nieobsługiwane referencje, kolizje docelowych kluczy i duplikaty.
3. Porównać manifest z rzeczywistym inwentarzem docelowego storage: brakujące,
   zerobajtowe i osierocone obiekty; format, rozmiar, Content-Type i sumy kontrolne,
   jeśli istnieje zaufany manifest źródłowy. Osieroconych plików nie usuwać automatycznie.
4. Sprawdzić rzeczywistą dostępność przez ścieżkę aplikacji: podpis/autoryzacja,
   HEAD/GET, 401/403/404/5xx, wygasły grant i Range dla filmów. Nie mylić braku
   dostępu do konta z brakującym plikiem. Użyć konta testowego bez ujawniania tokenów;
   odczyty sieciowe wykonywać z ograniczoną współbieżnością i ruchem.
5. Sprawdzić integralność/dekodowanie wszystkich unikalnych plików odpowiednim
   narzędziem oraz natywne odtwarzanie reprezentatywnych formatów na Android/iOS.
   Potwierdzić zgodność obrazu/filmu z pytaniem, także klatki po konwersji. Kontrola
   HTTP i metadanych nie wystarcza do potwierdzenia poprawnej treści materiału.
6. Zweryfikować ciepły cache/offline, częściowe pobranie, retry i usunięcie pliku
   z cache. Przy brakującym lub niedekodowalnym materiale odpowiedź pozostaje
   zablokowana, a odzyskiwanie nie losuje innego pytania.
7. Zapisać raport globalny/per kategoria/per typ: oczekiwane, obecne, dostępne,
   zdekodowane i zgodne; osobno nieweryfikowane. Każda usterka ma klucz, ID pytań,
   przyczynę, priorytet i sposób ponownego sprawdzenia. Nie sumować współdzielonych
   kategorii jako liczby unikalnych plików.

Odbiór: 100% oczekiwanych referencji zmapowanych; brak niewyjaśnionych braków,
kolizji i uszkodzeń; dostęp potwierdzony dla uprawnionego konta; wyniki kontroli
kodeków i obu platform zapisane. Niewykonane kontrole mają status nieweryfikowane,
nie OK. Naprawy źródła, upload/konwersja oraz zmiany praw dostępu są osobnymi
czynnościami — audyt nie upoważnia do masowych zapisów ani usuwania w chmurze.

### F1.1 — jednoznaczne stany materiałów

Wprowadzić wspólny model: sprawdzanie, gotowe lokalnie, pobieranie, wymagane
logowanie, brak uprawnień, brak sieci, błąd pliku/odtwarzania, niedostępna usługa.
Każdy stan pokazuje przyczynę oraz właściwą akcję. Unikać wspólnego „spróbuj
ponownie” dla odmowy dostępu i chwilowego błędu połączenia.

Zakres: `question-media.tsx`, `media-error.ts`, `media-auth.ts`,
`media-preload.ts`, `media-cache.ts`, `media-download-card.tsx`.

### F1.2 — przygotowanie materiałów konkretnej partii

- Po wyborze partii zachować dokładny zestaw pytań i sprawdzić potrzebne pliki.
- Aktualizacja 2026-10-13: Nauka czeka na wybrane pytanie i dwa następne, nie całą
  partię. Pierwsze trzy przygotowuje w menu, podczas nauki pobiera trzy kolejne.
  Komunikat gotowości dotyczy bufora startowego, nie pełnej dostępności offline.
- Egzamin nadal wymaga wszystkich plików dokładnego zestawu przed startem zegara.
- Wspólna kolejka: maksymalnie dwa transfery; oczekujący materiał bieżący/start
  ma pierwszeństwo przed tłem. Dołączenie do prefetchu podnosi jego priorytet.
- Pokazać postęp, ponowienie i anulowanie przed otwarciem pierwszego pytania.
- Przy braku konta kierować do konta z zapamiętanym celem powrotu.
- Po logowaniu kontynuować tę samą partię; nie losować innej.
- Przy częściowej awarii wykorzystać pobrane pliki, wskazać brakujące materiały.
- Jeśli użytkownik chce przeglądać pytania bez startu sesji, zachować podgląd
  i jasne oznaczenie niedostępnego materiału. Nie naliczać odpowiedzi bez niego.
- „Gotowe” powinno uwzględniać rzeczywiste załadowanie obrazu/odtwarzacza,
  nie tylko uzyskanie URI. Błąd dekodowania nadal ma drogę odzyskiwania.
- Usunięcie cache/zmiana kategorii/reset/anulowanie unieważnia spóźniony start.

Zakres: `study.tsx`, nowa logika przygotowania poza `src/app/`, istniejące
usługi mediów. Wykorzystać zabezpieczenia przygotowania egzaminu; nie przebudowywać
jego działającego silnika i zegara.

### F1.3 — decyzja o dostępie przed integracją z serwerem

Rekomendowany wariant dla publicznej aplikacji: samodzielna rejestracja,
potwierdzenie e-maila i odzyskiwanie hasła. Jeżeli produkt pozostaje zamknięty:
czytelna informacja „Dostęp na zaproszenie” i ustalona droga uzyskania konta.
Nie implementować formularza rejestracji, którego serwer nie obsługuje.

Do ustalenia: model kont, sposób nadawania uprawnień do mediów, konfiguracja
maili i adresów powrotnych, obsługa wygasłych linków, ścieżka usunięcia konta.
Sama aktywna sesja logowania nie dowodzi uprawnienia do pobierania.

### F1.4 — pełna ścieżka konta po ustaleniu F1.3

- Utworzenie konta → potwierdzenie e-maila → logowanie → powrót do partii/egzaminu.
- Odzyskiwanie hasła → e-mail → otwarcie aplikacji → nowe hasło → powrót.
- Obsługa anulowania, wygasłego linku, ponownego wysłania i już zalogowanej osoby.
- Ograniczenie powtarzanych żądań i komunikaty zgodne z zachowaniem serwera.
- Osobno: usunięcie konta serwerowego, jeśli konta są udostępniane publicznie;
  potwierdzenie skutków i endpoint sprawdzający tożsamość użytkownika.
- Opis lokalnych postępów pozostaje widoczny; konto nie sugeruje synchronizacji.

Zakres: `media-account-card.tsx`, `services/account.ts`, `domain/account.ts`,
nowe ekrany konta w Expo Router, konfiguracja Supabase/maili/linków po decyzji.
Sekrety serwerowe pozostają poza aplikacją. Nie tworzyć drugiego formularza
logowania dla każdego miejsca wejścia.

### Odbiór F1

Nowa osoba ma osiągalną drogę do pierwszej odpowiedzi zgodną z polityką dostępu.
Retry zachowuje partię; anulowanie nie zapisuje odpowiedzi ani nie uruchamia zegara.
Odmowa dostępu ma inną akcję niż brak sieci. Zdjęcie/film odtwarza się na obu
platformach. Sprawdzić prawdziwe konto/uprawnienia i prawdziwy e-mail, oprócz testów
z atrapami. Ponowny start egzaminu nadal używa przygotowanej próby.

## 6. Faza 2 — rzeczywiste wyjaśnienia

### Zadania

- F2.1: wygenerować kolejkę redakcyjną istniejącym `prepare-explanations.cjs`.
  Zacząć od pytań za 3 punkty i sytuacji pierwszeństwa; pytania zależne od obrazu
  wymagają obejrzenia materiału, nie tylko tekstu.
- F2.2: ustalić partię pilotażową, np. 50–100 pytań, i kwalifikowanego recenzenta.
  Dla każdego wpisu: powód poprawności, typowa pułapka, podstawa prawna, źródło,
  osoba i data przeglądu. Kolejne partie rozszerzają pokrycie.
- F2.3: zaimportować zatwierdzony pakiet istniejącym procesem; wersjonować i
  sprawdzać zgodność z pytaniem, kluczem odpowiedzi oraz materiałem.
- F2.4: dodać retry wyjaśnienia bez ponownego otwierania pytania i bez ponownego
  naliczania odpowiedzi. Brak treści i awaria odczytu mają różne komunikaty.
- F2.5: pokazywać krótkie wyjaśnienie najpierw, podstawę i źródło jako szczegóły.
  Dla pozostałych języków zachować uczciwe oznaczenie treści polskiej.
- F2.6: raportować pokrycie globalne, per kategoria i per punktacja w dokumentacji
  projektu. Nie obiecywać „wyjaśnień do każdego pytania” przed pełnym pokryciem.

Zakres: `EXPLANATIONS_CONTENT.md`, pakiet JSON, `explanations.ts`,
`explanation-card.tsx`, `study.tsx`, `exam/review.tsx`.

### Odbiór

Pilot zawiera zatwierdzone, zgodne wpisy; brak wyjaśnienia nie udaje treści.
Retry nie zapisuje drugiej odpowiedzi. Aktywny egzamin nie ujawnia wyjaśnienia.
Walidator sprawdza strukturę i zgodność danych; poprawność nauczania ocenia recenzent.
Nakład redakcji wycenić po pilocie, bez utożsamiania go z 1–2 dniami kodowania.

## 7. Faza 3 — sesja Nauki z czytelnym początkiem i zakończeniem

### Zadania

- F3.1: na pierwszym widoku pokazać podstawowe wejścia: „Ucz się”,
  „Powtórz błędy”, „Działy” i „Znaki”. Wyszukiwarka i pełny zestaw filtrów
  są dostępne, lecz nie konkurują od razu z głównym działaniem.
- F3.2: zebrać siedem istniejących filtrów w prosty panel. Pokazać aktywne
  ograniczenia oraz akcję „Wyczyść filtry”. Zachować dział, znak i konkretny
  egzamin w kontekście partii; zmiana filtra nie może zostawić ukrytej kombinacji.
- F3.3: przed startem pokazać rzeczywistą liczbę pytań, kategorię, język i status
  materiałów. Limit partii nie jest liczbą pytań całego działu.
- F3.4: w pytaniu zachować jeden wyraźny przycisk następnego kroku.
  Sprawdzić dolny obszar akcji na małym ekranie; długi tekst/wyjaśnienie
  nie może uniemożliwiać dotarcia do odpowiedzi i przycisku „Następne”.
- F3.5: odróżnić „Następne” po odpowiedzi od „Pomiń” przed odpowiedzią.
  Podsumowanie pokazuje poprawne, błędne i pominięte pytania bez utożsamiania
  braku materiału z pomyłką merytoryczną.
- F3.6: po zakończeniu zaoferować powtórkę pomyłek oraz kolejną istniejącą
  partię z tego samego zakresu. W miarę dostępnej puli unikać pytań poprzedniej
  partii; przy wyczerpaniu zakresu poinformować o powtórce.
- F3.7: sprawdzić szybkie odpowiedzi, zmianę tabów, zmianę języka/kategorii
  i reset. Każda odpowiedź ma być zapisana najwyżej raz w danej próbie pytania.

Zakres: `study.tsx`, `study-filters.ts`, `domain/study-session.ts`, komponenty
panelu filtrów i podsumowania poza `src/app/`.
Nie dodawać wyboru 5/10/20 ani dodatkowych trybów w tej fazie.

### Odbiór

Nowa osoba rozumie zakres i rozpoczyna sesję bez otwierania panelu filtrów.
Powtórka konkretnego egzaminu obejmuje tylko jego błędne/pominięte pytania.
Nowa partia zachowuje kategorię i zakres, a podsumowanie zgadza się z zapisami.
Przy braku wyników jest akcja powrotu do dostępnego zakresu.

## 8. Faza 4 — następny krok i użyteczny postęp

### F4.1 — jasna kolejka powtórek

Obecny filtr „Błędy” oznacza „kiedykolwiek wystąpiła pomyłka”. Zachować możliwość
przeglądu historii, ale nie nazywać jej automatycznie aktywnym zaległym materiałem.

Zaprojektować i uzgodnić regułę „Do powtórki”: np. ostatnia odpowiedź błędna
albo pytanie nieopanowane, którego kolejna zaliczana powtórka jest już możliwa.
Wykorzystać istniejący wymóg trzech poprawnych powtórek w odstępie >=24 h.
Po poprawce natychmiastowej pytanie nie staje się opanowane. Pytania błędne
w egzaminie również muszą wejść do tej kolejki. Nie usuwać historycznych odpowiedzi.

Zakres: `study-filters.ts`, `database/study-session.ts`, `repository.ts`.
Jeżeli reguła wymaga nowych pól: migracja, eksport i reset w tym samym zadaniu.

### F4.2 — jedna rekomendacja na Start

Kolejność rekomendacji:

1. Aktywny egzamin → wznowienie z informacją o faktycznym stanie/czasie.
2. Aktywna Nauka → powrót, jeśli stan istnieje; po restarcie dopiero z F6.
3. Materiał do powtórki → krótka partia z powodem rekomendacji.
4. Brak historii → pierwsze 5 pytań.
5. Pozostałe przypadki → nauka słabszego działu lub egzamin próbny według
   jawnej, testowalnej reguły opartej na danych, bez deklaracji pewnego zdania.

„Rozpocznij egzamin” pozostaje łatwo dostępne także jako działanie dodatkowe.
Przy zerowej liczbie błędów nie pokazywać głównej akcji prowadzącej do pustego ekranu.
Nie wprowadzać nieuzasadnionego progu, np. liczby sesji wystarczającej do zdania.

### F4.3 — statystyki powiązane z nauką

- Ujednolicić opisy: „Przerobiono”, „Opanowano”, „Zdane ostatnie próby”.
- Pokazać podstawę wyniku: kategorię, liczbę prób i okres/zasięg danych.
- Dodać rozbicie słabych obszarów według rzeczywistych działów, nie tylko
  wiedzy podstawowej i specjalistycznej; wyświetlać liczbę odpowiedzi.
- Obszar z małą próbą oznaczyć jako „Za mało danych”, nie jako pewną diagnozę.
- Każdy słabszy dział ma akcję „Ćwicz ten dział”.
- Z podsumowania sesji prowadzić do właściwego kroku: błędy, pominięte lub
  kolejna partia. Z wyniku egzaminu zachować dokładną powtórkę tej próby.
- Zachować osobno oznaczoną historię globalną różnych kategorii.

Zakres: `dashboard-screen.tsx`, `progress.tsx`, `bank-progress.ts`,
`progress-presentation.ts`, `repository.ts`, osobny moduł rekomendacji.

### Odbiór

Rekomendacja jest przewidywalna dla nowych, powracających i wielokategorialnych
osób. Poprawienie błędu zmienia kolejkę zgodnie z regułą, lecz nie kasuje historii.
Statystyki innej kategorii nie zmieniają rekomendacji wybranej kategorii.
Brak danych nie generuje procentu „gotowości” ani pozornej słabości działu.

## 9. Faza 5 — spójność UI i ergonomia

### F5.1 — podstawy wspólnego UI

W `constants/theme.ts` dodać semantyczne tokeny typografii, odstępów,
zaokrągleń i pól dotykowych. Utworzyć podstawowe komponenty przycisku,
karty, nagłówka sekcji i komunikatu stanu. Zacząć od elementów powtarzanych
w Nauce, Dashboardzie, odprawie i Ustawieniach; nie przepisywać wszystkich
ekranów jednocześnie. Zachować specjalną hierarchię ekranu egzaminu.

Ujednolicić główne i drugorzędne CTA, stany disabled/busy, etykiety
„Spróbuj ponownie”, „Wróć”, „Zapisano” oraz formaty liczb/czasu zależne od języka.
Nie mieszać informacji o sukcesie z ostrzegawczą stylistyką wyłącznie z powodu
wspólnego kontenera feedbacku. Błąd jest rozpoznawalny także po tekście/symbolu.

### F5.2 — zweryfikować architekturę nawigacji

Porównać obecną strukturę z wariantem: Start / Nauka / Postęp / Ustawienia,
z leksykonem dostępnie umieszczonym w Nauce. Nazwa „Więcej” jest wariantem,
nie założeniem; nie dodawać pustej sekcji tylko dla krótszej etykiety.

Sprawdzić zadania: znaleźć znak STOP, zmienić język, rozpocząć egzamin,
wrócić do wyniku i bieżącej Nauki. Jeśli pięć tabów jest czytelnych i zadania
wychodzą lepiej, zachować obecną liczbę. Przy zmianie zachować `/signs` i
istniejące linki oraz prawidłowy powrót Znaki → Nauka → Znaki.
Obsłużyć wariant natywny i web spójnie. Regresja gestów wymaga telefonu.

### F5.3 — onboarding i ustawienia

Skrócić objaśnienia do informacji potrzebnej w danym kroku. Przenieść szczegóły
cache i lokalnych danych pod rozwijane informacje, zachowując widoczny fakt,
że konto nie synchronizuje postępów. Podstawowy CTA na dole dostępnego widoku.
Zmianę kategorii ułatwić w kontekście Nauki bez odsyłania do długiej listy ustawień.
W Ustawieniach utrzymać logiczne sekcje, a formularz konta udostępnić również
bezpośrednio z blokady materiałów.

### F5.4 — dostępność i małe ekrany

- Cele dotykowe: minimum 44 pt na iOS / 48 dp na Androidzie, także zamknięcie,
  powrót, linki tekstowe, usunięcie filtra i numer pytania.
- Screen reader: role, nazwy, wybrana odpowiedź, poprawność, focus po otwarciu
  modala i po jego zamknięciu. Nie opierać feedbacku wyłącznie na kolorze/haptyce.
- Zegary mają czytelne nazwy; nie ogłaszać każdej sekundy przez screen reader.
- Duży font i najdłuższe tłumaczenia nie ucinają odpowiedzi, timerów ani CTA.
- Klawiatura nie zasłania logowania/wyszukiwania; safe area chroni dolne akcje.
- Kontrast sprawdzić także dla disabled, błędów, legend i aktywnych filtrów.
- Zdjęcia w Nauce/przeglądzie powinny dać się powiększyć, jeśli QA potwierdzi
  nieczytelność szczegółów. Zmiana egzaminu tylko po sprawdzeniu wpływu na czas.
- Wideo, duże obrazy i modale działają przy ograniczeniu ruchu.

### Odbiór

Spójne komponenty na głównych ekranach i udokumentowany wynik porównania
nawigacji. Brak uciętych akcji przy dużym foncie na obu platformach. TalkBack
i VoiceOver pozwalają przejść główne zadania; wyniki zapisać w QA_CHECKLIST.md.
Przegląd PL/EN/DE/UK obejmuje także statusy konta, materiałów i statystyk.

## 10. Faza 6 — opcjonalne trwałe wznowienie jednej sesji

To rozszerzenie wcześniej odłożonego zakresu. Plan nie przywraca automatycznie
historii sesji ani nowych długości/trybów. Realizować dopiero po wyborze tej opcji.

### Zadania

- Zaprojektować zapis jednej aktywnej sesji: ID, kategoria, język, zakres,
  uporządkowane ID pytań, bieżąca pozycja, odpowiedzi i wersja źródłowej bazy.
- Początek, odpowiedź i zakończenie zapisywać transakcyjnie. Użyć unikalnego
  klucza próby pytania, aby restart/retry nie dublował practice_attempts/mastery.
- Po restarcie pokazać „Kontynuuj” i „Porzuć sesję”; porzucenie pozostawia
  już zapisane odpowiedzi i historię nauki.
- Rozstrzygnąć zmianę kategorii/języka: sesja zachowuje własny kontekst;
  nowa partia nie nadpisuje starej bez wyraźnej decyzji.
- Ponownie sprawdzić materiały po restarcie. Plik utracony z cache nie powoduje
  skasowania odpowiedzi i nie wymusza innego losowania.
- Migracja, reset, eksport, fencing operacji oraz recovery uszkodzonego zapisu
  są częścią wdrożenia. Aktualizacja bazy nie może odtworzyć obcego klucza odpowiedzi.

Zakres: nowy moduł zapisu w `database/`, `study.tsx`, Dashboard,
`database/user-data.ts`, `domain/data-maintenance.ts`, usługi eksportu/resetu.

### Odbiór

Zamknięcie procesu po odpowiedzi i przed nawigacją odtwarza tę samą pozycję,
bez drugiego zapisu odpowiedzi. Reset unieważnia wznowienie. Eksport obejmuje
stan sesji. Nieznana/niezgodna wersja stanu ma czytelne recovery.

## 11. Faza 7 — odbiór całej ścieżki

### Macierz minimum

| Wymiar | Warianty |
| --- | --- |
| Urządzenie | Fizyczny Android i iPhone, mały dostępny ekran |
| Wygląd | Jasny/ciemny/systemowy; zwykły i duży font |
| Język | PL, EN, DE, UK; osobny język pytań i fallback |
| Użytkownik | Świeża instalacja, istniejące postępy, konto/brak konta, odmowa dostępu |
| Sieć | Wi-Fi, wolna sieć, offline, zerwanie pobierania |
| Media | Obraz, wideo, brak pliku, uszkodzony plik, cache gotowy/usunięty |
| Lifecycle | Tło, powrót, zabicie procesu, restart, zmiana preferencji |
| Nawigacja | Tab, systemowe Wstecz, gest powrotu, modal, link do ekranu |
| Dostępność | TalkBack, VoiceOver, ograniczenie ruchu |

Pełne przebiegi: onboarding → dostęp do materiałów → pierwsza partia →
feedback → powtórka → kolejna partia; egzamin → wynik → błędy tej próby →
postęp; znaki → powiązane pytania → powrót; konto → odzyskiwanie → powrót
do zadania; reset/eksport po zapisaniu postępów.

### Warunki zakończenia

- Brak otwartych P0 w zakresie wydania; każdy istotny błąd ma odtwarzalny scenariusz.
- Typecheck i lint przechodzą po każdej fazie kodowej, na końcu także testy
  odpowiednie do zmienionej logiki. Testy migracji używają starej i świeżej bazy.
- Silnik, terminy, idempotencja wyniku i ochrona mediów mają regresję.
- Czasy pierwszej odpowiedzi i startu porównane z F0; brak ukrytego dodatkowego
  losowania/pobierania. Cele czasowe ustalić po pomiarach, nie arbitralnie.
- Materiały, linki mailowe i powiadomienia przetestowane realnie w wymaganym zakresie.
- Instruktor zatwierdził dostarczone wyjaśnienia; tłumaczenia UI po przeglądzie.
- Wpis w IMPLEMENTATION_PROGRESS.md wskazuje co sprawdzono lokalnie i na jakim
  urządzeniu; otwarte warunki odbioru pozostają jawne.
- Decyzja o EAS/publikacji jest osobnym krokiem po odbiorze.

## 12. Co można wdrażać bez rozszerzania wcześniejszego zakresu

Od razu: F0, lokalne stany/recovery F1.1–F1.2, retry wyjaśnień i kolejka
redakcyjna F2, uproszczenie istniejących partii F3, wspólne UI i QA F5/F7.
F4 można zacząć od lepszych etykiet i CTA; zmiana znaczenia kolejki wymaga
przyjęcia jawnej reguły, aby nie zmienić użytkownikowi sposobu liczenia postępu.

Zależności produktowe/zewnętrzne: polityka kont F1.3, konfiguracja serwera
i maili F1.4, zatwierdzenie treści F2, ewentualna zmiana układu tabów po
porównaniu F5.2, opcja wznowienia F6. Brak jednej decyzji nie zatrzymuje
niezależnych zadań lokalnych.

Poza tym planem: synchronizacja/backup w chmurze, trwałe pełne pakiety offline,
nowe tryby i długości, wykłady/czat z instruktorem, gamifikacja i publikacja.
Konkurencyjne funkcje nie są powodem dodania ich bez związku z problemem użytkownika.

## 13. Kontekst konkurencji

Opisy producentów pokazują oczekiwania rynku: wyjaśnienia, egzamin próbny,
analiza postępów i łatwy powrót do nauki. Nie potwierdzają jakości ich rzeczywistego
UI i nie zastępują testu tych aplikacji. Źródła wykorzystane w audycie:

- Prawko.pl — baza, wyjaśnienia, symulacja i postęp:
  https://play.google.com/store/apps/details?hl=pl&id=pl.ekierowca.prawko_pl
- e-Testy — deklarowane wyjaśnienia, działy i offline:
  https://apps.apple.com/pl/app/e-testy-na-prawo-jazdy-2026/id6805808141
- PrawkoNaRaz — deklarowana kontynuacja i postęp na koncie:
  https://prawkoapp.pl/

Priorytet EZprawko: dostępna, ciągła i zrozumiała nauka. Pełniejszy katalog
funkcji konkurencji pozostaje punktem odniesienia, a nie obowiązkowym backlogiem.
