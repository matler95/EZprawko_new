# EZprawko — prostsze przygotowanie i mniejszy koszt multimediów

Data: 2026-10-13. Status: PLAN, nie wdrożenie.

Aktualizacja 2026-10-14: wdrożenie lokalne części kodowych; otwarte bramki
urządzeniowe/chmurowe. Aktualny stan i pomiary:
[docs/MEDIA_OPTIMIZATION_STATUS.md](docs/MEDIA_OPTIMIZATION_STATUS.md).
Poniższy opis stanu wejściowego i zadań zachowuje kontekst pierwotnego planu;
nie oznacza, że limit nadal wynosi 1 GB. Kod ma teraz 200 MiB, uzasadnione
inwentarzem już dostarczanych plików. Pełny odbiór M0/M1/M3/M5 pozostaje otwarty.

## Cel i zakres

Jedna prosta Nauka i jeden wierny przebieg Egzaminu. Ograniczamy niepotrzebny
transfer, oczekiwanie i miejsce na telefonie. Nie dodajemy gamifikacji, nowych
trybów, synchronizacji historii ani rozbudowanego systemu streamingu.

Ten plan koryguje wcześniejszą politykę równoczesnego przygotowywania wariantów
Nauki 5/12/rekomendacja oraz bezwarunkowego pobierania następnego egzaminu.
Obecny kod nadal działa według dotychczasowej polityki; nie obniżono limitu 1 GB.
Rozszerzenie po teście użytkownika: nowy egzamin po porzuceniu ma zachować
niewidzianą część poprzedniego zestawu, zamiast domyślnie losować wszystkie
32 pytania od nowa. To również plan, nie już wdrożone zachowanie.
Przed wykonaniem zadań oznaczonych jako zmiany chmury/wdrożenie potrzebna jest
osobna akceptacja. Przed zmianami Expo/RN czytamy dokumentację SDK projektu.

## Stan wejściowy

- Jedna współdzielona kolejka z maksymalnie dwoma transferami i pierwszeństwem
  foreground; wspólny cache, współdzielenie pobrania tego samego pliku.
- Indeks cache, ochrona zestawów i atomowy zapis poprawnie pobranych plików.
- Paczkowe granty z kompatybilnością starszego endpointu; rzeczywisty deployment
  i zachowanie na urządzeniu trzeba potwierdzić, nie zakładać.
- Domyślne partie Nauki 5/12 i rekomendacja są przygotowywane równolegle.
  Service przechowuje do czterech draftów; ekran ma okno trzech kolejnych pytań.
- Następny egzamin jest przygotowywany natychmiast po starcie aktualnego.
- `consumePreparedExam` uruchamia przygotowanie następcy, a `createExam`
  wybiera pełny zestaw od nowa. `clearActiveExam` usuwa skład porzuconej próby
  bez zachowania niewidzianych pytań do ponownego użycia. Samo porzucenie
  nie czyści plików cache: problem dotyczy wyboru zestawu, nie tylko pobierania.
- Limit plików cache wynosi 1 GB. Pliki w trakcie pobierania wymagają osobnego
  uwzględnienia w budżecie; liczba transferów nie ogranicza ich rozmiaru.
- Nauka obecnie chroni całą aktywną partię przed usunięciem, nie tylko aktualny
  materiał i niewielki bufor. Egzamin musi chronić cały aktywny zestaw.
- Audyt źródła/R2 był wykonany; dwa potwierdzone braki są wykluczone. Nie jest
  to dowód poprawnego dostępu ani dekodowania na Androidzie/iOS.
- Testy lokalne istnieją. Zgłoszenie błędu na telefonie pozostaje scenariuszem
  obowiązkowego odbioru, nie uznajemy go za zamknięte bez ponownego testu.

## Kolejność i zależności

| Faza | Priorytet | Wynik | Warunek wejścia |
| --- | --- | --- | --- |
| M0 — pomiary i diagnoza | P0 | Rozmiary i czasy bazowe, rozpoznanie błędu na urządzeniu | Brak |
| M1 — niezawodny wspólny tor | P0 | Pobieranie, autoryzacja i recovery potwierdzone na telefonach | M0 |
| M2 — jedna intencja Nauki | P1 | Jedna przewidywana partia, brak konkurencyjnego prefetchu | M1 |
| M2E — ponowne użycie niewidzianej części egzaminu | P1, przed dalszym prefetch egzaminu | Nowa próba po porzuceniu wymienia tylko pokazane pytania | M1; budżet docelowy w M4 |
| M3 — lżejsze materiały | P1 | Zweryfikowany profil mediów i wersjonowany manifest | M0; publikacja po akceptacji |
| M4 — bajty i mniejszy cache | P1 | Budżet przed pobraniem, wybrany limit i bezpieczne czyszczenie | M1–M3 |
| M5 — odbiór całości | P0 dla wydania | Porównanie z baseline, telefon, migracja i rollback | M2, M2E, M3, M4 |

M3 można przygotowywać niezależnie od M2 po zebraniu danych. Nie obniżamy
limitu produkcyjnego przed M4. M5 jest warunkiem wydania, nie opcjonalną fazą.
M2E wdrażamy po M1, przed rozbudową przygotowywania następnego egzaminu;
jest niezależne od uproszczenia Nauki w M2. Docelowa polityka egzaminu:
bez bezwarunkowego pobierania pełnego nowego zestawu podczas aktywnej próby.

## M0 — P0: diagnoza i pomiary

### Zadania

1. Rozszerzyć istniejący audyt R2 o rozmiary dostarczanych JPG/MP4, nie rozmiary
   źródłowych WMV w archiwum. Zachować pełną paginację i tryb read-only.
2. Raport: suma, mediana, p90/p95, maksimum, największe pliki, udział zdjęć/
   filmów; raport per kategoria i tylko dla dopuszczonej puli pytań.
3. Wygenerować deterministyczne zestawy 32/74 dla wszystkich kategorii.
   Obliczyć ich rozmiar po deduplikacji plików, percentyle i konserwatywne
   oszacowanie ciężkich zestawów. Percentyl nie zastępuje sprawdzenia konkretnego
   egzaminu przed startem. Zmierzyć także sumę aktywnego zestawu i następcy.
4. Rozdzielić czasy: odczyt pytań, oczekiwanie w kolejce, uzyskanie grantu,
   download, zapis/weryfikacja, image decode/video first frame.
5. Diagnoza telefonu: etap, typ materiału/numer pytania, status HTTP i tryb
   endpointu batch/legacy. Bez tokenów, maili, identyfikatorów kont, podpisanych
   URL-i i zewnętrznej telemetrii. Diagnostyka ograniczona i lokalna.
6. Zmierzyć na fizycznym Androidzie i iOS:
   - pusty cache, rozgrzany cache i częściowo pobrany zestaw;
   - Wi-Fi, kontrolowana wolna sieć, zerwane pobranie i brak sieci;
   - Start → Nauka oraz Start → Egzamin;
   - zużycie po instalacji, po 10/30 minutach nauki i po kilku egzaminach;
   - szczyt zajętego miejsca, pliki tymczasowe i ewentualny cache natywny.
7. Stosować powtarzalne zestawy i warunki sieci. Co najmniej 20 prób scenariusza
   wydajnościowego; raportować medianę, p95, zakres oraz liczebność prób.
8. Dodać baseline zgłoszonego scenariusza: przygotowany egzamin → jedno
   pytanie → porzucenie → nowy egzamin. Osobno sprawdzić pozostanie na pierwszym
   pytaniu i wejście na drugie. Zapisać ID pokazanych/zachowanych/wymienionych
   pytań, trafienia cache, nowe unikalne pliki i rzeczywiście pobrane bajty.

### Odbiór

Raport z pełnego inwentarza rzeczywiście dostarczanych plików i baseline telefonu.
Zgłoszony błąd przypisany do etapu albo precyzyjnie oznaczony jako nieodtworzony,
z brakującym dowodem. Nie przyjmujemy jeszcze docelowego limitu ani gwarancji czasu.

Zakres: scripts/audit-media-remote.cjs, scripts/media-remote-audit.cjs,
scripts/audit-media.cjs oraz istniejące media-auth/media-cache/question-media.
Rezultat pomiarów: docs/MEDIA_BASELINE.md, dopiero po uzyskaniu danych.

## M1 — P0: niezawodność jednego mechanizmu

### Zadania

1. Zweryfikować realny endpoint: sesja, batch, legacy 200/400, brak sesji 401,
   odmowa 403, awaria 5xx. Oddzielić błąd autoryzacji od brakującego pliku.
2. Sprawdzić właściwy projekt/Worker, pełny klucz, NFC, case i mapowanie WMV→MP4.
   Nie zmieniać pytania ani nie podstawiać podobnego pliku.
3. Jeśli wdrożenie paczek jest potrzebne, przygotować smoke test i rollback;
   wykonać deployment osobno po akceptacji, z zachowaniem kontroli dostępu.
4. Wszystkie ścieżki muszą korzystać z tej samej kolejki/cache/grantów:
   Nauka, aktywny egzamin, przygotowanie i obecne pobieranie w Ustawieniach.
   Rozbudować istniejące moduły, nie tworzyć drugiego download managera.
5. Ograniczone retry tylko dla błędów przejściowych. 401/403 kierują do właściwej
   akcji, trwały brak nie wywołuje pętli. Przerwane zadanie nie startuje ponownie
   samo z nieaktualnym zakresem. Pobranie ma limit czasu i jawny stan błędu.
6. Jednoznaczne kontrakty:
   - diskReady: poprawna wersja, kompletny i niepusty plik;
   - displayReady: aktualny obraz/film gotowy w dekoderze.
   Gotowość dekodera pozostaje przy aktualnym widoku, nie w globalnym cache.
7. Zachować coalescing, atomowy commit, fences resetu/konta i brak spóźnionego
   otwarcia pytania lub startu zegara.

### Odbiór

Udokumentowane przejście rzeczywistego obrazu i filmu przez cały tor na obu
platformach; poprawny retry po przerwaniu, właściwe akcje konta i brak fałszywego
„gotowe”. Cała regresja, lint/typecheck. Nie rozszerzamy prefetchu dla zamaskowania
nieznanej przyczyny błędu.

## M2 — P1: jedna przewidywana partia Nauki

### Zadania

1. Zastąpić równoległe 5/12/rekomendacja pojedynczym przygotowywanym intentem.
   Źródło intencji: jawny zakres użytkownika; na ekranie Start główne CTA
   rekomendowanego ćwiczenia; domyślna Nauka dopiero jako fallback.
2. Klucz nadal uwzględnia kategorię, język, filtry/temat/znak, długość i zakres
   powtórki. Kliknięcie otwiera dokładnie ten sam draft, bez nowego losowania.
3. Rozdzielić przechowywanie lekkich danych pytań od kosztownego prefetchu:
   może istnieć cache tekstu kilku zakresów, lecz tylko jeden spekulacyjny
   intent mediów. Nie trzymać ochrony nieużywanych partii bezterminowo.
4. W aktualnej sesji priorytet ma bieżący materiał, potem małe okno kolejnych.
   Po zmianie intencji usunąć oczekujące zadania poprzedniej i zwolnić ich piny.
   Aktualne pytania/odpowiedzi i rozpoczęty egzamin nie zmieniają się.
5. Ustalić jednego właściciela prefetchu. Start i komponent globalny zgłaszają
   intencję do tego samego service; nie uruchamiają niezależnych polityk.
6. Rozdzielić intent token/cancel od obiektu czytanego przez ekran: anulowanie
   spekulacji nie może pozbawić ekranu zamrożonego zestawu.
7. Następną partię Nauki wybierać z dotychczasową preferencją świeżych pytań,
   ale jej media pobierać dopiero po zabezpieczeniu bieżącego okna, w budżecie
   tła. Powtórka konkretnego egzaminu nie rozszerza się na nowy ogólny zestaw.
8. Przy częściowym cache otwierać pytanie, gdy jego materiał jest gotowy.
   Zachować czytelny recovery; nie dodawać nowych trybów ani onboardingów.

### Odbiór

W trace istnieje maksymalnie jeden spekulacyjny intent Nauki, żaden nie pobiera
równolegle alternatywnych wariantów 5/12/rekomendacja. Zero kolejnych uruchomień
starego intentu po anulowaniu. Zmierzyć również bajty już rozpoczętego, nieużytego
transferu — anulowanie kolejki nie gwarantuje zatrzymania aktywnego requestu.

Kliknięcie zachowuje ID/kolejność/zakres; powrót, zmiana języka/kategorii,
podsumowanie, powtórka i replay nie tracą odpowiedzi.

Zakres: prepared-study.ts, exam-preparation.tsx, dashboard-screen.tsx, study.tsx,
media-preload.ts i media-download-queue.ts.

## M2E — P1: nowy egzamin z niewidzianej części porzuconej próby

### Ocena i reguła produktowa

Ponowne użycie niewidzianych pytań ogranicza transfer bez zawężania wyboru
do pytań z małymi plikami. Te pytania zostały już wcześniej wylosowane;
nie trzeba odrzucać ich tylko dlatego, że użytkownik przerwał egzamin.
To świadoma polityka ciągłości między próbami, nie niezależne losowanie
każdego kolejnego pełnego zestawu. Symulacja nadal zachowuje dotychczasową
strukturę, czasy i wynik dopiero na końcu; nie deklarujemy zgodności algorytmu
losowania między próbami z systemem urzędowym.

| Zdarzenie | Zestaw i odpowiedzi | Multimedia |
| --- | --- | --- |
| Tło, zamknięcie aplikacji; następnie Wznów ważną próbę | Ten sam egzamin, odpowiedzi i nieprzedłużany termin | Użycie cache; uzupełnienie tylko brakujących plików |
| Jawne porzucenie; następnie Nowy egzamin | Zachować niewidziane pytania, zastąpić pokazane; nowe ID próby, zegar i puste odpowiedzi | Zachować pliki; pobrać tylko brakujące referencje nowego zestawu |
| Niezapisana wygasła częściowo oglądana próba | Jak po porzuceniu, jeśli istnieje wiarygodny zapis ekspozycji | Nie pobierać od nowa plików nadal poprawnych |
| Ukończenie egzaminu | Zwykły nowy zestaw; nie ma niewidzianej części do zachowania | Zwykłe trafienia cache, bez preferowania pytań tylko dlatego, że są pobrane |
| Zmiana kategorii/języka, reset, niezgodna wersja lub niewiarygodny stan | Unieważnić seed; zwykłe przygotowanie właściwego zakresu | Nadal jeden wersjonowany cache i wspólna kolejka |

Przykład: pokazano wyłącznie pierwsze pytanie → zachowujemy 31, losujemy
1 zamiennik. Jeśli po odpowiedzi wyświetlono też drugie → zachowujemy 30,
losujemy 2. Liczba nowych plików może być mniejsza od liczby zamienników
(pytanie bez medium, istniejący cache, wspólny plik) albo transfer może wzrosnąć,
jeśli system usunął cache. Nie obiecujemy zawsze jednego pobrania ani startu offline.
Próba z zapisanym końcowym wynikiem nie jest seedem także po timeout: jej klucz
odpowiedzi jest dostępny w przeglądzie. To odróżnia ją od surowej wygasłej próby
bez wyniku i nie wymaga śledzenia kolejnego trybu przeglądania.

### Zadania

1. Zdefiniować ekspozycję pytania, nie tylko odpowiedź:
   - tekst pokazany w aktywnym ekranie oznacza pytanie widziane, także podczas
     czytania przed filmem, bez odpowiedzi albo przy błędzie medium;
   - pobranie, grant, ukryte dekodowanie i przygotowanie draftu nie oznaczają
     ekspozycji; ekran poza fokusem nie oznacza pokazania;
   - trwały znacznik przed udostępnieniem treści, idempotentny per próba/ID;
     crash może konserwatywnie odrzucić jedno nieobejrzane pytanie, ale nie
     może pozwolić ponownie użyć pytania, którego użytkownik już się nauczył;
   - dla starszej aktywnej próby przyjąć konserwatywnie wszystkie pozycje
     do `current_index` włącznie jako widziane; nie wyznaczać ich wyłącznie
     na podstawie `selected_answer`. Brak wiarygodnego stanu → zwykły zestaw.
2. Zachować jeden trwały seed ponownego użycia, nie bibliotekę egzaminów:
   ID źródłowej próby, kategoria, język, rewizja danych, wersja bazy/mediów,
   niewidziane ID z ich częściami/punktacją oraz zbiór wykluczonych pokazanych ID.
   Bez kopii tokenów, URL-i, plików ani przenoszenia poprawnych/wybranych odpowiedzi.
   W krótkiej serii porzuceń kumulować pokazane ID tej serii, by nie wracały
   natychmiast jako zamienniki. Jedna seria; kończy się przy pełnym ukończeniu,
   zmianie zakresu, resecie lub TTL. Roboczy TTL 24 h do potwierdzenia w odbiorze,
   bez bezterminowej osobnej historii ekspozycji konta.
3. Przy porzuceniu zapisać seed w tej samej transakcji, w której usuwana jest
   aktywna próba. Błąd zapisu nie może zniszczyć możliwości wznowienia.
   Przy wygaśnięciu odczytać surowy zapis przed jego usunięciem: obecne
   `resumeActiveExam` zwraca null dla wygasłej próby i nie wystarczy jako źródło.
   Nie utożsamiać tła/zabicia procesu z potwierdzonym porzuceniem.
4. Rozszerzyć istniejący selektor, bez drugiego silnika egzaminu:
   - utrzymać dopuszczone niewidziane ID w sześciu koszykach: część × punkty;
   - dopełnić podstawowe 3/2/1 pkt do 10/6/4, specjalistyczne do 6/4/2;
   - zamienniki losować z dopuszczonej puli kategorii, wykluczając zachowane
     i pokazane ID serii; nie wybierać według rozmiaru medium lub obecności cache;
   - przetasować wewnątrz części, zachowując 20 podstawowych + 12 specjalistycznych,
     32 unikalne ID, 74 pkt i `validExamSelection` przed zapisem;
   - brak wystarczającej puli w koszyku → kontrolowany fallback zwykłego selektora,
     zapis lokalnej przyczyny i brak obietnicy braku powtórek w takiej sytuacji;
     nigdy błędna liczba pytań, duplikaty lub zamiana punktacji.
5. Na Nowy egzamin zamrozić jeden wynik selekcji. Retry pobierania ani kolejne
   renderowanie nie losują zamienników ponownie. Rewalidować pytania względem
   aktualnej bazy/wykluczeń; nie ufać starym obiektom tekstu z seeda.
   Nowa sesja ma nowe ID, puste odpowiedzi i nowy zegar dopiero po gotowości;
   anulowanie przygotowania zachowuje seed/draft. Konsumpcja jest atomowa
   i idempotentna; podwójny tap nie tworzy dwóch prób.
6. Zmienić politykę następcy w `consumePreparedExam`/globalnym przygotowaniu:
   podczas aktywnego egzaminu nie pobierać pełnego niezależnego następcy.
   Zachowane pliki aktywnej próby są podstawowym zasobem ponownego użycia.
   Nowy draft tworzyć po porzuceniu/wygaśnięciu lub jawnej intencji nowej próby,
   nie przebudowywać go i nie pobierać zamienników po każdym pytaniu.
   Po ukończeniu przygotowanie zwykłego następcy podlega budżetowi M4.
7. Unieważnić stary draft następcy oraz jego oczekujące zadania po utworzeniu
   seeda. Generacja i rewizja blokują spóźniony zapis/pobranie starego zakresu.
   Nie usuwać poprawnych plików poprzedniego draftu: zostają zwykłym LRU;
   trwające transfery rozliczać jako ewentualne zmarnowane bajty, nie ukrywać.
8. Wspólne cache/granty/kolejka: deduplikować referencje po wersjonowanym kluczu,
   sprawdzać diskReady i pobierać tylko brakujące pliki. Wykluczenie pytania
   nie oznacza usuwania jego pliku: niewidziane pytanie może używać tego samego
   zdjęcia/filmu. To dopuszczalne; odrzucamy ID pytania, nie całe medium.
9. Zapewnić przekazanie ochrony aktywny → seed/draft → nowy aktywny bez okna,
   w którym LRU usuwa wymagane pliki. Seed chroni wyłącznie niewidziane media
   i tylko w ograniczonym czasie/budżecie; nie tworzy nowego wyjątku ponad limit.
   Wznowiona aktywna próba zawsze ma wyższy priorytet; TTL/reset zwalniają piny.
   Po restarcie odbudować ochronę przed czyszczeniem LRU. Utrata pliku przez OS
   daje uzupełnienie tego pliku, nie ponowne losowanie zestawu.
10. UX bez nowego trybu i przełącznika: Wznów kontynuuje, Nowy egzamin zaczyna
    od zera odpowiedzi/czas. Potwierdzenie porzucenia nadal mówi o utracie próby,
    ale nie sugeruje usunięcia pobranych materiałów. Przy potrzebnym transferze
    pokazać uzupełnianie brakujących materiałów, nie pobieranie całego egzaminu.
    Brak sieci umożliwia start tylko gdy wszystkie media nowej próby są gotowe;
    nie podmieniać zamienników na pytania z cache w celu udawania pełnego offline.

### Odbiór

- Deterministyczny test: porzucenie po pierwszym pokazanym pytaniu zachowuje
  dokładnie pozostałe 31 ID; po wejściu na drugie zachowuje 30. Pokazane bez
  odpowiedzi też są wykluczone; prefetche niewidzianych nie są wykluczone.
- Wszystkie kategorie i sześć koszyków: zachowana struktura/unikalność, kwarantanna,
  zero przeniesionych odpowiedzi. Kolejne porzucenia nie cofają ekspozycji serii.
- Restart, wygaśnięcie, legacy index, crash w transakcji, retry, podwójny tap,
  zmiana zakresu, reset/konto, TTL, nieaktualny draft i niedostateczna pula.
- Wspólny plik widzianego i niewidzianego pytania nie jest usuwany ani pobierany
  ponownie. Z cache pobiera się tylko brakujące unikalne referencje zamienników.
- Mierzyć liczbę zachowanych pytań, cache hit bytes, transfer zamienników,
  zmarnowany prefetch i czas nowej próby względem pełnego losowania. W wariancie
  bez eviction/uszkodzeń ponowny transfer zachowanych plików wynosi 0 bajtów.
- Fizyczne Android/iOS: porzucenie po jednym pytaniu i start nowego, także offline
  z gotowymi zamiennikami. Zegar nie działa podczas przygotowania; wynik dopiero
  na końcu; zachowane filmy odtwarzają się raz w obrębie nowej próby.

Zakres: repository.ts (`clearActiveExam`, selekcja, start i wygasanie), exam-selection/
exam-engine, prepared-exam.ts, exam-preparation.tsx, dashboard-screen.tsx,
exam/[id].tsx (ekspozycja), wspólna ochrona cache i testy SQLite/flow.

## M3 — P1: mniejsze pliki, bez utraty informacji

### Zadania

1. Na podstawie M0 wybrać reprezentatywny pilotaż: największe filmy/obrazy,
   małe znaki i napisy, ciemne sceny, ruch, dźwięk i materiały współdzielone.
2. Porównać profile kompresji i rozdzielczości; wybrać jeden profil bazowy
   ze sprawdzoną zgodnością Android/iOS. Nie dodawać HLS/ABR ani wielu wariantów
   jakości tylko po to, żeby obsługiwać kilka formatów.
3. Oryginały zachować. Nie zmieniać kadrowania, kolejności/czasu zdarzeń, końcowej
   klatki, treści znaków ani informacji dźwiękowych potrzebnych do odpowiedzi.
   Weryfikacja jakości na telefonie jest warunkiem, nie tylko procent oszczędności.
4. Utworzyć lekki wersjonowany manifest dostawy: pełny klucz, wersja, rozmiar,
   typ, opcjonalnie sprawdzona długość filmu. Jedna referencja pliku może
   obsługiwać wiele pytań. Nie edytować oficjalnych nazw w źródłowej bazie.
5. Zmiana wersji musi wpływać spójnie na klucz URL/grantu/cache. Nie nadpisywać
   używanego pliku aktywnego egzaminu i nie używać starego cache pod nową wersją.
6. Po odbiorze pilotażu przygotować pozostały dopuszczony katalog. Publikacja
   nowego wariantu/manifestu w storage dopiero po akceptacji, z rollbackiem.
7. Nie dodawać całego archiwum do instalatora; konwersja odbywa się poza telefonem.

### Odbiór

Znane oszczędności bajtów i czasu pobierania, brak utraty czytelności i poprawne
dekodowanie/stop-klatka/replay. Każdy dopuszczony plik ma zweryfikowany rozmiar
w manifeście. Stare i nowe wydanie mogą współistnieć podczas bezpiecznej migracji.

## M4 — P1: budżet bajtowy i mniejszy cache

### Zadania

1. Wprowadzić jedną konfigurację polityki: limit trwałego cache, rezerwa transferu
   i limit spekulacji. 150–250 MB to kandydaci do pomiarów, nie zatwierdzony limit.
   W kodzie używać bajtów i wyraźnie ustalić MB/MiB w raporcie.
2. Przed startem zadania rezerwować oczekiwane bajty z manifestu, po deduplikacji.
   Rozliczać przy commit/anulowaniu/błędzie. Współdzielone pobranie ma jedną
   rezerwację; suma obejmuje także .download i równoczesne dwa transfery.
3. Nieznany rozmiar blokuje spekulację do czasu wyjaśnienia; nie blokuje
   automatycznie intencjonalnej akcji, ale wymaga ograniczonej/monitorowanej
   ścieżki foreground. Nie robić HEAD przed każdym znanym plikiem.
4. Okno Nauki ograniczyć jednocześnie liczbą pytań i bajtami: maksymalnie np.
   trzy kolejne, lecz tylko tyle, ile mieści się w ustalonym budżecie.
   Duży plik foreground nie jest zaniżany/ucięty, aby udawać gotowość.
5. Ochrona: cały aktywny egzamin; w Nauce bieżący materiał i małe przyjęte okno,
   zamiast wszystkich mediów całej partii. Pozostałe pliki zostają zwykłym LRU.
6. Przed przygotowaniem egzaminu policzyć dokładną sumę wymaganych unikalnych
   plików, wolne miejsce i rezerwę transferu. Zachować strukturę 32/74: nie
   losować ponownie, aby wybierać pytania tylko z małymi filmami.
7. Następny egzamin przygotowywać tylko w pozostałym budżecie. Jeśli nie pasuje,
   odroczyć jego media i zwolnić zbędne piny, bez błędu aktywnego egzaminu.
   Sam lekki draft pytań może pozostać zapisany.
   Po porzuceniu najpierw stosować M2E: istniejące niewidziane pliki liczyć raz,
   rezerwować wyłącznie brakujące referencje. Ochrona seeda i draftu to wspólny,
   ograniczony budżet, nie dwa niezależne pakiety. Punkt ten nie przywraca
   bezwarunkowego pobierania następcy podczas aktywnej próby wyłączonego w M2E.
8. Gdy aktywny egzamin nie mieści się w kandydacie limitu: nie usuwać jego
   potrzebnych plików w trakcie. Na etapie wyboru limitu wykluczyć niewykonalną
   wartość albo jawnie uzgodnić ograniczony wyjątek. Nie obiecywać twardego
   limitu 200 MB, jeśli zestawy wymagają więcej.
9. Migracja: na starcie/przy idle usunąć niechronione stare dane przez LRU,
   bez resetu historii/konta i bez całkowitego czyszczenia cache. Po unpin
   wrócić do docelowego budżetu. Rozpoczęte próby mają priorytet.
10. Skontrolować duplikaty, osierocone pliki tymczasowe po crashu i osobny cache
   odtwarzacza. „Limit cache” nie jest limitem całej instalacji ani RAM.
11. Ustawienia: rzeczywiste zużycie i prosta akcja usunięcia pobranych materiałów.
   Bez kilkunastu przełączników zaawansowanego cache. Obecne pobieranie 250 plików
   podlega wspólnej kolejce/budżetowi; nie nazywać go pełnym offline kategorii.

### Odbiór

Wybrany limit uzasadniony rzeczywistymi danymi, nie samym p95 ani średnią.
Testy rezerwacji, shared download, braków rozmiaru, pinów, .download, błędu,
crashu, resetu i migracji. Żaden spekulacyjny plik nie wypiera aktywnego egzaminu.
Próg zajętego miejsca sprawdzony podczas transferu, nie wyłącznie po nim.

Zakres: manifest, media-cache.ts, media-download-queue.ts, media-preload.ts,
prepared-study.ts, prepared-exam.ts i ustawienia.

## M5 — P0 dla wydania: odbiór i porównanie

1. Powtórzyć M0 na tych samych urządzeniach, zestawach i warunkach sieci.
2. Porównać:
   - kliknięcie → ekran pierwszego pytania;
   - planowany start obrazu/filmu → faktyczne wyświetlenie;
   - p95 oczekiwania, transfer/autoryzacje i odsetek błędów;
   - udział użytych plików/bajtów w prefetchu;
   - rozmiar instalacji, cache i szczyt całych danych aplikacji.
3. Roboczy cel warm-startu: p95 do 1 s do ekranu pierwszego pytania. To cel
   do zatwierdzenia po M0, nie dzisiejsza gwarancja. Oficjalnych 20 s czytania
   przed filmem nie zaliczać jako opóźnienia pobierania.
4. Dopuszczamy widoczne pobieranie pierwszego zimnego zestawu. Nie deklarujemy
   pełnego offline dla niepobranej kategorii ani „kliknięcie i gotowe” bez sieci.
5. Zakończyć smoke test Nauki, nowych i wznowionych egzaminów, ostatniej klatki,
   replay, błędów autoryzacji, małego miejsca, języków i zmian zakresu.
   Obowiązkowo zgłoszony scenariusz M2E: jedno pytanie → porzucenie → nowy egzamin,
   z pomiarem zachowanych ID i bajtów oraz kilkoma kolejnymi porzuceniami.
6. Pełna lokalna regresja (obecnie 43 skrypty), lint i typecheck, potem fizyczne
   Android/iOS. Testy stubów nie potwierdzają natywnego odtwarzania.
7. Kontrolowane wydanie po akceptacji. Rollback manifestu/profilu/polityki
   nie usuwa historii, nie zmienia odpowiedzi i nie wymaga nowych sekretów.

### Warunek zakończenia

Nie ma niewyjaśnionego krytycznego błędu pobierania; brak utraty historii i brak
pogorszenia aktywnego egzaminu. Wykazane zmniejszenie miejsca/spekulacyjnego
transferu względem baseline, bez ukrytego przeniesienia kosztu do cache natywnego.
Wyniki i ograniczenia zapisane w raporcie odbioru.

## Poza tym planem

Gamifikacja, nowe tryby, obowiązkowe pobranie całej kategorii, streaming
adaptacyjny, nowe ekrany statystyk i synchronizacja kont. Pełny pakiet offline
może być osobną decyzją po pomiarach; nie jest warunkiem podstawowych usprawnień.
