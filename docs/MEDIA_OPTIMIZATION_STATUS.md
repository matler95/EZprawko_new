# Multimedia — checkpoint implementacji

Data: 2026-10-14. Wdrożenie lokalne, bez publikacji. Pełny odbiór urządzeniowy
NIE jest zakończony. Szczegółowy backlog: PLAN_OPTYMALIZACJI_MULTIMEDIOW.md.

## Co działa w kodzie

- Nauka: jedna intencja multimediów zamiast równoległego 5/12/rekomendacja.
  Pozostałe drafty są lekkim cache tekstu; następna partia nie pobiera swoich
  mediów w połowie bieżącej. Kliknięcie używa zamrożonych ID i kolejności.
- Bieżące pytanie ma pierwszeństwo. Ochrona obejmuje bieżące pytanie i małe okno,
  nie całą partię. Okno ogranicza liczba pytań i 12 MiB; wspólne rezerwacje
  ograniczają także nakładające się transfery spekulacyjne Nauki.
- Jeden dokładny egzamin przygotowywany od zatwierdzenia kategorii w onboardingu,
  na ekranie Start i w Ustawieniach (także po logowaniu). Nie pobieramy
  niezależnego następcy podczas aktywnej próby ani podczas pracy w Nauce.
  Przyjęty do ochrony pełny draft egzaminu korzysta z budżetu cache, nie z 12 MiB
  okna Nauki. Nie jest to obietnica natychmiastowego pierwszego zimnego startu.
- Po porzuceniu: zachowanie niewidzianych ID i wymiana pokazanych, z tymi samymi
  koszykami punktowymi. Nowe ID próby, puste odpowiedzi, zegar po gotowości.
  Zachowane pliki nie są pobierane drugi raz. Wznów nie tworzy nowej próby.
- Jeden seed SQLite, TTL 24 h, kumulacja pokazanych ID krótkiej serii porzuceń.
  Ekspozycja jest zapisana przed udostępnieniem treści. Legacy: konserwatywny
  prefiks do aktualnego indeksu włącznie. Nie liczymy downloadu jako ekspozycji.
- Niezapisana wygasła próba może oddać niewidziane pytania. Próba z zapisanym
  końcowym wynikiem nie jest seedem, nawet po globalnym timeout: jej odpowiedzi
  są dostępne w przeglądzie. Chronimy przed powtórzeniem dostępnego klucza.
- Niedostateczna pula zamienników: zwykły prawidłowy zestaw, jawny lokalny
  powód `insufficient-pool`, nie zmiana kwot lub preferowanie małych plików.
- Wspólna kolejka: dwa transfery. Anulowane oczekujące zadania nie rozpoczynają
  HTTP; już rozpoczęte mogą dokończyć transfer. Aktualny widok może przejąć
  wspólne pobranie. Przejście z tła do foreground promuje dalsze materiały.
- Jedna autoryzacja: porcje do ośmiu nadchodzących brakujących plików przez
  istniejący cache grantów. Batch/legacy 200/400 nadal działają; cache offline
  nie wymaga grantów. Timeout endpointu 30 s; tokeny tylko w RAM.
- Cache: 200 MiB = 209 715 200 bajtów. Rezerwacja przed zapisem pliku tymczasowego,
  wspólny plik rezerwowany raz, kontrola wolnego miejsca z 10 MiB zapasu.
  Nieznany rozmiar: bez prefetchu, foreground kontrolowany do 16 MiB.
- Native download: anulowanie po 90 s lub przekroczeniu przyjętych bajtów;
  jeden retry HTTP 429/5xx, bez retry 401/403/404. Po anulowaniu sprzątamy dopiero
  po zakończeniu tasku. Limity i zachowanie callbacków wymagają telefonu.
- Rozmiar pliku musi odpowiadać inwentarzowi. LRU chroni aktywne media, migracja
  nie resetuje konta/historii. Osierocone `.download` są sprzątane, trwające nie.
- Cache ma wersjonowaną tożsamość pełnego klucza, bez kolizji spacji/underscore.
  Poprawne, jednoznaczne stare pliki nadal są czytane bez masowego kopiowania.
  Nowe warianty nie nadpisują oryginałów ani ich tożsamości cache.
- Dwa pytania mogą współdzielić plik, ale mają osobne odtwarzacze/gotowość.
  To naprawia brak drugiego autoplay przy tym samym filmie w kolejnych pytaniach.
- Egzamin: neutralne odpowiedzi, brak poprawności w trakcie, wynik na końcu;
  jednokrotny autoplay bez pause/replay/fullscreen/PiP. Nauka/przegląd: replay.
  Nie deklarujemy pełnej zgodności wszystkich detali interfejsu z aktualnym WORD.

## Dane rzeczywiste, nie testowe czasy

Read-only R2: 2633 dostępne pliki, 1 735 136 368 bajtów łącznie.
Największy JPG 9 084 331 B; największy MP4 3 870 025 B. Braki 11150/13074
pozostają wykluczone. Rozmiary: assets/data/media-delivery.json.

Raport docs/MEDIA_SIZE_BASELINE.json: 1000 deterministycznych losowań na każdą
z 12 kategorii, deduplikacja plików i konserwatywna suma najcięższych koszyków.
Najwyższa granica 113 357 276 B (AM), nie samo p95. Mediana B około 16,6 MB.
Pozwala to wdrożyć 200 MiB dla obecnych dostarczanych plików, bez czekania na
kompresję M3. Jest to świadome doprecyzowanie zależności poprzedniego planu.
Nie jest to limit całej instalacji, RAM ani osobnego cache systemowego/odtwarzacza.

Pilotaż: osiem zdjęć mniejszych o około 71–95%; cztery warianty filmów WIĘKSZE
od już dostarczanych, dlatego odrzucone. Raport docs/MEDIA_COMPRESSION_PILOT.json.
Zachowana liczba klatek/dźwięk/timeline w sprawdzonych filmach nie oznacza
odbioru jakości na telefonie. Wstępnie obejrzano przykład zdjęcia na komputerze;
nie zatwierdzono czytelności na małym ekranie. Oryginały i archiwa są zachowane.

## Fazy i otwarte bramki

| Faza | Lokalnie | Pozostało |
| --- | --- | --- |
| M0 | Pełny inwentarz, rozmiary, zestawy, diagnostyka i agregator pomiarów | Cold/warm, p95, peak storage na fizycznym Android/iOS; odtworzenie zgłoszonego błędu |
| M1 | Wspólny tor, paczki, legacy, timeout/retry/cancel, disk/decode separation | Rzeczywista sesja i wdrożony endpoint, natywne anulowanie/dekodowanie |
| M2 | Jedna intencja i małe okno; tekst następnej partii | Odbiór UX i transferu na telefonie |
| M2E | SQLite + cache E2E, 31/30 ID, expiry/TTL/rollback, wszystkie kategorie | Przejście na telefonie i rzeczywiste bajty transferu |
| M3 | Pilotaż, odrzucenie cięższych filmów, generator manifestu wariantu | Akceptacja zdjęć, pełny katalog po odbiorze profilu, publikacja po osobnej zgodzie |
| M4 | 200 MiB, admission/reservations, LRU, wersje, stary cache, headroom | Szczyt fizyczny i cache natywny, migracja na istniejącej instalacji |
| M5 | Lokalna regresja, TypeScript i lint | Macierz Android/iOS, pomiary i decyzja o wydaniu |

ADB nie wykazało podłączonego urządzenia. Nie było instalacji/builda EAS,
wdrożenia Supabase/Workera, uploadu mediów ani zmiany sekretów.

## Powtarzalne narzędzia

1. `node scripts/build-media-delivery.cjs` — read-only raport. `--write` generuje
   lokalny manifest rozmiarów i raport; nie publikuje. Wymaga istniejącej sesji CLI.
2. `python scripts/prepare-media-pilot.py --output .media-pilot/NEW_RUN --archives
   multimedia_do_pytan.zip Multimedia_do_pytań_-_cz_2_02042026.zip` — nowe lokalne
   pliki, bez nadpisania; FFmpeg/ffprobe muszą być dostępne. Konflikty źródła są
   pomijane, nie zastępowane podobnym plikiem. Raport wskazuje większe warianty.
3. `node scripts/build-media-variant.cjs REPORT mobile-v1 NEW_OUTPUT_FILE` —
   kandydat manifestu wyłącznie pod `.media-pilot`, tylko mniejsze poprawne
   warianty; `qualityApproved=false`, `published=false`. Nie aktywuje aplikacji.
   Obecny kandydat: `.media-pilot/run2/candidate-manifest.json`.
4. Po odbiorze telefonu: osobna zgoda na upload nowych kluczy, kontrola
   MIME/rozmiaru/auth oraz akceptowany manifest; dopiero potem podmiana manifestu
   aplikacji i pasujący EXPO_PUBLIC_MEDIA_MANIFEST_VERSION. Nigdy nadpisanie
   starych kluczy. Rollback przywraca stary manifest i wersję; historia pozostaje.
   Samo ustawienie zmiennej nie publikuje plików. Nieakceptowany kandydat nie
   aktywuje mapowania wariantów.
5. Diagnostyka na development build: EXPO_PUBLIC_MEDIA_DIAGNOSTICS=1 i restart
   Metro/aplikacji. Lokalne `[media]`: etap, czas, bajty, liczba obiektów, HTTP,
   publiczny ID pytania przy decode. Bez URL-i, tokenów, kont i surowych błędów.
   Domyślnie wyłączona; produkcja nie loguje. Ring RAM ma maksymalnie 128 wpisów.
6. Pomiar telefonu: minimum 20 powtórzeń/scenariusz, te same pytania/sieć.
   Użyć JSON array z polami platform (android/ios), network (wifi/slow/offline),
   flow (study/exam), cacheState (cold/warm/partial), scenario
   (start/abandon-restart), startMs, firstFrameMs, downloadBytes, peakCacheBytes,
   appDataBytes. Wszystkie liczby są rzeczywiście zmierzonymi nieujemnymi
   integerami. `node scripts/media-measurement-summary.cjs MEASUREMENTS.json`
   raportuje medianę, nearest-rank p95, zakres, liczebność i brak minimum prób.
   Testowe wartości nie są pomiarem telefonu. Nie wliczać 20 s czytania jako
   oczekiwania na pobranie filmu.

`.media-pilot` jest wykluczony z Git i EAS; nie dodajemy archiwum do instalatora.
Nie dodano zależności, gamifikacji, kolejnego download managera ani ABR/HLS.

Dokumentacja API użyta przy implementacji: Expo SDK 57 SQLite, FileSystem legacy,
Video i Router; FFmpeg filters/codecs/CLI. Linki:
https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/
https://docs.expo.dev/versions/v57.0.0/sdk/filesystem-legacy/
https://docs.expo.dev/versions/v57.0.0/sdk/video/
https://docs.expo.dev/versions/v57.0.0/sdk/router/
https://ffmpeg.org/ffmpeg.html
https://ffmpeg.org/ffmpeg-filters.html
https://ffmpeg.org/ffmpeg-codecs.html
# Korekta po teście anulowania przygotowania — 2026-10-14

Przy ponownym przygotowaniu licznik rozpoczyna się od faktycznie gotowych plików w cache, a nie od zera. Pobierane są wyłącznie brakujące pliki. Anulowanie przed rozpoczęciem zegara zachowuje dokładny zapisany zestaw i jego ochronę w cache; nie losuje nowego egzaminu. Żywy odbiorca przygotowania w tle może kontynuować tę samą pracę po zamknięciu okna przez użytkownika. Zmiana preferencji lub reset nadal unieważniają poprzednią pracę.

Testy obejmują częściowy błąd, anulowanie/ponowne otwarcie, liczbę rzeczywistych pobrań, gotowy zestaw bez sieci oraz współdzielenie pracy między ekranem i tłem. Nie oznacza to gwarancji natychmiastowego pierwszego startu: zimny cache, wolna sieć lub usunięcie plików przez system wymagają uzupełnienia materiałów. Potwierdzenie zachowania na telefonie pozostaje punktem odbioru.
# Korekta blokady startu i wznowienia — 2026-10-14

Ekrany egzaminu i dokumentów były rodzeństwem zakładek pod NativeTabs,
bez odpowiadających im Trigger. NativeTabs nie zapewnia stosu do otwierania
takich ekranów. Próba mogła zostać zapisana w SQLite, mimo że nawigacja nie
wyświetlała egzaminu, a użytkownik ponownie widział egzamin w toku.

Root korzysta teraz ze Stack; pięć zakładek mieszka w grupie (tabs),
a egzamin, przegląd odpowiedzi i dokumenty są osobnymi ekranami stosu.
Publiczne adresy /study, /settings, /exam/[id] pozostają niezmienione.
Nie usuwamy prób, historii ani pobranych materiałów. Test używa parsera
z zainstalowanego Expo Router, a nie wyłącznie atrap funkcji nawigacji.

Zgłoszone około 60 s przygotowania nie jest uznane za naprawione przez zmianę
nawigacji. Lokalne zdarzenia preparation i screen-load uzupełniają pomiary
grant-request, download, cache i decode. Diagnostykę deweloperską włącza
EXPO_PUBLIC_MEDIA_DIAGNOSTICS=1; nie zapisuje tokenów ani adresów plików.
Potwierdzenie startu/wznowienia i rzeczywistych czasów wymaga telefonu.
