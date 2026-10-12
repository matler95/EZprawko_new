# EZprawko — domknięcie UI i przepływów użytkownika

Data: 2026-10-12. Uzupełnienie PLAN_IMPLEMENTACJI.md, nie jego zastąpienie.
EAS/podpisywanie/publikacja pozostają odłożone na życzenie właściciela.

## Zasady i Definition of Done

- Praca w małych, testowalnych etapach. Pierwszy checkpoint dotyczył UX-1;
  przed następnym etapem potwierdzamy zakres z użytkownikiem.
- Nie zmieniamy silnika WORD, podziału 20+12, 74/68 pkt ani limitów czasu.
  Zachowujemy bazę, tłumaczenia, znaki i istniejące postępy.
- Nie tworzymy zdalnych kont/projektów, nie publikujemy i nie zmieniamy
  konfiguracji Supabase/Cloudflare bez osobnej decyzji.
- Każdy etap: testy logiki i stanów błędów, TypeScript, Expo lint;
  checkpoint w IMPLEMENTATION_PROGRESS.md i QA w QA_CHECKLIST.md.
- Testy z atrapami nie zastępują fizycznego telefonu. Nie oznaczamy prac
  urządzeniowych, treści prawnych ani konfiguracji serwerowej jako zakończonych.

## UX-1 — przygotowanie mediów i odzyskiwanie pobierania (priorytet krytyczny)

Zakres: repository.ts, Dashboard/ExamBriefing, media-preload/cache i karta offline.

- Losowanie/hydratacja, następnie serialne przygotowanie mediów dokładnie tej
  próby, weryfikacja lokalnych plików, dopiero potem transakcja startu i 25 minut.
- Brak konfiguracji/sesji/sieci/pliku blokuje nową próbę zamiast zabierać czas
  pytania na pobieranie. Poprzednia próba pozostaje nietknięta po błędzie/anulowaniu.
- Odprawa pokazuje postęp, retry oraz anulowanie; brak dublowania startu.
- Offline: jawny stan busy zamiast wnioskowania z licznika, retry po częściowej
  awarii, anulowanie pomiędzy plikami, ochrona callbacków po opuszczeniu ekranu.
- Nie liczymy braku URI jako sukcesu. Sprawdzamy obecność i niezerowy rozmiar;
  ukończenie pobierania nie jest gwarancją poprawności kodeka ani trwałości cache.
- Nadal limit 250 plików kategorii / cache 1 GB; nie obiecujemy pełnego offline.
  Nie resetujemy zegara wznowionej próby. Trwałe pakiety offline i dekodowanie
  materiałów są osobnym rozszerzeniem wymagającym QA.

Odbiór: wolne/odrzucone pobieranie nie tworzy nowej próby; zegar liczy od
zatwierdzenia startu, retry działa, anulowanie/reset/zmiana kategorii nie zapisują
spóźnionej próby; próby 32/74 i tłumaczenia zachowane.

## UX-2 — onboarding prowadzący do pierwszej sesji

- Jawny wybór jednej kategorii (bez cichego zatwierdzenia domyślnej B), język.
- Krótkie objaśnienie Nauka vs Egzamin oraz lokalnego postępu/dostępu do mediów.
- Pierwsza sesja pięciu pytań jako jasny krok; opcjonalne przypomnienie dopiero
  po wyjaśnieniu korzyści, bez wymuszania zgody systemowej przy pierwszym starcie.
- Wznowienie nieukończonego onboardingu, idempotentny zapis i recovery błędów;
  nie zmieniamy ustawień użytkowników z ukończonym onboardingiem bez ich decyzji.

Odbiór: pierwsze uruchomienie/reset/powrót po zamknięciu/każda kategoria i język,
brak podwójnego zapisu; pierwsza sesja ma prawidłowy zakres.

## UX-3 — konto i uwierzytelnianie

- Lokalnie: uporządkowany ekran/formularz konta, widoczność hasła, walidacja,
  klawiatura/autofill, stan sesji, retry i powrót do przerwanego działania.
- Wyraźne odróżnienie logowania od synchronizacji: postępy obecnie tylko na
  urządzeniu; nie obiecujemy backupu/chmury. Konto nie może obiecywać pobrania,
  gdy backend odrzuca dostęp.
- Osobny podetap wymagający decyzji: otwarta rejestracja vs zaproszenia, e-mail
  confirmation, reset/change password i link powrotny na telefonie.
- Usunięcie konta serwerowego wymaga autoryzowanego endpointu; nie nazywamy
  obecnego usuwania lokalnych danych usunięciem konta.

Odbiór: offline/błędne hasło/wygaśnięta sesja/anulowanie/brak dostępu oraz
realne linki mailowe dopiero po konfiguracji Supabase; bez logowania sekretów.

## UX-4 — spójne Ustawienia

- Sekcje: nauka, wygląd, konto, multimedia, przypomnienia, dane i informacje.
- Ujednolicone zapisywanie/busy/retry i statusy języka/motywu/cache.
- Odświeżanie zajętości cache po pobraniu/powrocie; bez fałszywej wartości zero
  po błędzie odczytu. Potwierdzenie czyszczenia, blokada konfliktujących operacji.
- Większe pola dotykowe, role dostępności i czytelne opisy opcji destrukcyjnych.

Odbiór: błędy SQLite/FS, szybkie kliknięcia, powrót z innych ekranów, duże fonty,
oba motywy; istniejący eksport/reset zachowuje wszystkie kontrakty.

## UX-5 — Nauka jako ciągły proces

- Wyraźny start sesji i wybór długości (np. 5/10/20), kolejne partie pytań;
  nie przedstawiamy pojedynczej losowej partii jako całej bazy/działu.
- Czytelne filtry, kontekst działu/znaku, akcje w pustych wynikach i błędach.
- Zachowanie odpowiedzi/podsumowania w ramach sesji i precyzyjna powtórka błędów.
- Trwałe wznowienie i historia sesji Nauki dopiero ze schematem migracji,
  kontraktem resetu/eksportu i decyzją o ich zakresie; nie oznaczamy tego jako istniejące.

Odbiór: żadna kategoria/partia nie miesza się, brak podwójnego naliczania,
poprawna nawigacja/pominięte pytania/filtry/tłumaczenia i mastery 24 h.

## UX-6 — Dashboard i statystyki aktualnej kategorii

- Gotowość i domyślne trendy dotyczą wybranej kategorii; historia globalna
  pozostaje dostępna i jednoznacznie oznaczona.
- Przerobiona baza vs opanowanie vs seria dni to trzy różne wskaźniki.
- Jasne rekomendacje i CTA przy braku historii; nie twierdzimy, że wskaźnik
  gotowości gwarantuje zdanie państwowego egzaminu.

Odbiór: wyniki A/B/PT nie wpływają na wskaźnik innej wybranej kategorii,
globalny streak zachowany, zmiana kategorii/zerowa historia nie tworzą fałszywych danych.

## UX-7 — dostępność i końcowa kontrola przepływów

- Przegląd pól dotykowych, focus/etykiet/ról, dużych fontów, małych ekranów,
  klawiatury, kontrastów i ograniczania ruchu; brak komunikatów tylko kolorem.
- Usunięcie technicznych instrukcji CDN/sekretów z komunikatów dla kursanta,
  przy zachowaniu diagnostyki dla dewelopera bez tokenów/hasła.
- Fizyczne Android/iPhone: pierwsze uruchomienie → konto → nauka → egzamin →
  przegląd → postęp → ustawienia; slow network/offline/background/recovery.
- Dzielenie wyniku 5.1 nadal odłożone; nie wraca automatycznie do zakresu.

## Stan

- UX-1: wdrożony i zweryfikowany lokalnie (2026-10-12); fizyczne QA otwarte.
- UX-2: wdrożony i zweryfikowany lokalnie (2026-10-12); fizyczne QA otwarte.
- UX-3: lokalny formularz/sesja/powrót do materiału wdrożone i zweryfikowane
  (2026-10-12). Rejestracja, e-maile/linki i usunięcie konta serwerowego nadal
  wymagają osobnego zakresu i decyzji; nie oznaczamy całego uwierzytelniania jako gotowego.
- UX-4–UX-7: zaplanowane, niewdrożone w tym etapie.
- Zewnętrzne: EAS, konfiguracja rejestracji/maili/linków/usuwania konta,
  prawne zatwierdzenie treści i multimedia, fizyczne QA.
