# Przygotowanie mediów przed kliknięciem

## Zasady

- Egzamin: jeden zapisany draft w SQLite, komplet plików lokalnie i weryfikacja
  cache przed startem zegara. Nie przygotowujemy niezależnego pełnego następcy
  podczas aktywnej próby. Nowa próba po porzuceniu zachowuje niewidziane ID,
  wymienia pokazane i uzupełnia wyłącznie brakujące pliki. Wznów zachowuje próbę.
- Nauka: przygotowujemy jeden aktualny zakres lub rekomendowane ćwiczenie
  Startu, nie równoczesne 5/12/rekomendacja. Ekran korzysta z dokładnie tej samej partii, bez nowego losowania.
  Klucz obejmuje kategorię, język, filtr, temat, znak, historię, wyszukiwanie,
  długość, poprzednie IDs i generację danych.
- Cztery drafty Nauki są trzymane tylko w pamięci, przez maksymalnie pięć minut.
  To nie jest trwałe wznowienie ani nowa historia. Reset/restart aplikacji usuwa
  tę kolejkę; pliki cache mogą nadal istnieć. Zmiana zakresu wybiera inny draft.
- Start Nauki wymaga tylko materiału bieżącego pytania. Jeśli jest w cache,
  ekran przygotowania jest pomijany. Native image/video readiness nadal blokuje
  odpowiedzi do dekodowania; URI nie oznacza gotowego odtwarzacza.
- Bufor trzech kolejnych pytań przesuwa się podczas sesji. W połowie partii
  wybieramy następną z tym samym zakresem i preferencją niepowtarzania IDs;
  przy kliknięciu „Kolejna partia” używamy dokładnie tego draftu. To prefetch
  tekstu, nie mediów przyszłej partii. Okno mediów ma też budżet 12 MiB.
- Powtórka błędów konkretnego egzaminu nie rozszerza się na ogólną kolejną partię.
- Globalny limit to dwa transfery. Bieżący plik/start ma pierwszeństwo przed
  oczekującym tłem; już rozpoczęte transfery nie są przerywane.
- Działa podczas otwartej aplikacji, nie jest usługą pobierania przy zamkniętej
  aplikacji. Spekulacyjne pierwsze materiały są ograniczone do małych okien.

## Indeks cache

Pierwszy zapis buduje inwentarz plików. Następne pobrania aktualizują rozmiary,
bez ponownego odczytu statystyk całego katalogu. Eviction jest serializowane,
chroni aktywny egzamin/bieżące okno Nauki i ma limit 200 MiB. Rezerwacja bajtów
poprzedza transfer, wspólny plik rezerwujemy raz. Nieudany nowy zapis ponad limit jest
cofany, aby retry nie uznał go za poprawnie przygotowany plik.

Każde użycie pliku nadal sprawdza jego istnienie/niepusty rozmiar. System może
usunąć cache: ta optymalizacja nie zastępuje weryfikacji przed egzaminem.
Ręczny odczyt rozmiaru w Ustawieniach nadal mierzy rzeczywisty katalog.
Znany plik musi odpowiadać rozmiarowi dostawy, nie źródłowego WMV. Mniejsze
warianty są wersjonowane; oryginałów nie nadpisujemy. Pełny checkpoint i bramki
odbioru: [MEDIA_OPTIMIZATION_STATUS.md](MEDIA_OPTIMIZATION_STATUS.md).

## Autoryzacja paczkowa

Endpoint przyjmuje POST z body:

    { "filenames": ["zdjecia/example.jpg", "wideo/example.mp4"] }

Do ośmiu nazw, deduplikacja, walidacja ścieżek, jedno sprawdzenie sesji i jedna
inicjalizacja klucza podpisu. Zwraca grants z filename/token/expiresAt.
Stary format filename nadal działa. TTL pozostaje 120 s; aud/sub/key/exp i
sprawdzenie przez aktywny Worker src/index.js pozostają bez zmian.

Aplikacja łączy pobliskie żądania w oknie 8 ms, współdzieli to samo żądanie pliku
i przechowuje maksymalnie 256 ważnych grantów tylko w RAM. Odnawia tokeny z
30-sekundowym marginesem. Wylogowanie/zmiana sesji/reset unieważniają cache;
spóźniona odpowiedź nie trafia do nowej sesji. Cache plików nie wymaga grantów.
Przygotowanie primuje do ośmiu nadchodzących brakujących grantów przez ten sam
mechanizm; nie ogranicza paczki do dwóch zajętych slotów downloadu. Zegar jeszcze
nie działa. Gotowe pliki nie wywołują autoryzacji.

Nie ma wspólnego tokenu do całego bucketu. Autoryzacja użytkownika zachowuje
dotychczasową politykę — nie dodaje abonamentów ani entitlementów/rate limitów.

## Wdrożenie i odbiór — pozostają do wykonania

1. Wdrożyć zmieniony infrastructure/supabase/functions/media-token/index.ts
   do właściwego projektu. Zachować verify_jwt=false z istniejącego configu:
   handler nadal sam sprawdza sesję przez Supabase Auth. Nie zmieniać sekretów.
2. Aktualny Worker nie potrzebuje zmiany dla tokenów paczkowych.
3. Zaktualizować/przeładować aplikację. Starszy endpoint odpowiadający 400 na
   filenames uruchamia fallback pojedynczych żądań na czas procesu aplikacji;
   po wdrożeniu backendu restart pozwala ponownie użyć paczek.

Poprawka zgodności: żądanie wysyła również filename pierwszego pliku. Stary
endpoint może od razu zwrócić jego pojedynczy token (HTTP 200); aplikacja używa
go tylko do tego pliku i pobiera pozostałe granty osobno. Status HTTP odczytujemy
również z natywnych obiektów odpowiedzi niebędących instancją globalnego Response.
401/403 nie uruchamiają obejścia ani nie są zamieniane na „brak pliku”.
4. Sprawdzić anonimowe 401, poprawną paczkę, inny plik odrzucany przez ten sam
   token, odnowienie i wylogowanie podczas żądania. Nie wypisywać tokenów w logach.
5. Zmierzyć zimny/ciepły Start → Nauka/egzamin na Android/iOS i wolnej sieci.
   Pusty cache i brak sieci nadal wymagają odzyskiwania — brak gwarancji zera
   oczekiwania przy pierwszym uruchomieniu.

Testy lokalne: test-prepared-study.cjs, test-prepared-exam.cjs,
test-media-grants.cjs, test-media-cache-index.cjs, test-study-session.cjs
i cała istniejąca regresja. Testy operacji FS i podpisów nie są pomiarem telefonu.
