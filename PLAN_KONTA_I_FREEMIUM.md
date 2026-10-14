# EZprawko — konto, powrót do zadania i przyszłe freemium

Data: 2026-10-14. Status: analiza i plan, NIE implementacja ani zgoda na deployment.
Warunek użytkownika: najpierw domknięcie krytycznych problemów istniejącej aplikacji.
Warunek nie jest jeszcze spełniony: zgłoszone około 60 s przygotowania pozostaje otwarte.
Ten dokument opisuje następny zakres, nie przenosi go przed otwarte P0.

## 1. Stan poprawek i bramki

| Zgłoszenie / zakres | Stan | Do zamknięcia |
| --- | --- | --- |
| Nie można otworzyć egzaminu, wraca egzamin w toku | Poprawiony Root Stack; użytkownik potwierdził otwarcie | Odbiór całej próby i jej zakończenia |
| Nie można wznowić | Ta sama poprawka routingu + test parsera | Osobny test wznowienia na telefonie |
| Anulowanie przygotowania wygląda jak start od zera | Licznik z cache, zachowany draft/piny, test liczby pobrań | Telefon: anulowanie, reload, ponowienie |
| Wszystkie nowe pliki po porzuceniu | Zachowanie niewidzianych pytań, wymiana pokazanych | Telefon i pomiar rzeczywistego transferu |
| Około minuta przygotowania po onboardingu | OTWARTE P0; wcześniejszy prefetch i diagnostyka są, brak potwierdzonej poprawy czasu | Pomiary grant/download/cache/decode, poprawka dominującego etapu |
| Niedostępne zdjęcie/film | Poprawki auth/cache/decode i retry lokalnie; dwa potwierdzone braki wykluczone | Rzeczywiste pliki, sesja i dekoder Android/iOS; nie przywrócono brakujących źródeł |
| Poprawność odpowiedzi w trakcie | Brak poprawności przed wynikiem końcowym, testy | Odbiór na telefonie |
| Czytanie, film, wcześniejszy START | Zegar i wcześniejszy start zapisane transakcyjnie | Jednokrotne odtwarzanie, stop-klatka, background/resume na telefonie |
| Nieczytelne zaznaczenie | Niebieskie tło/obwódka/znacznik, bez widocznego Twój wybór | Ocena wizualna, oba motywy i duże fonty |
| Zdjęcia od razu | Wdrożone na życzenie; świadome uproszczenie symulacji | Odbiór na telefonie; czasy odpowiedzi bez zmiany |
| Mniejsze pliki | Pilot ośmiu zdjęć; próby kompresji filmów odrzucone jako większe | Jakość, pełny katalog, publikacja po osobnej zgodzie |
| Kompletność całego wcześniejszego planu UI/UX | NIE zakończona | Brak treści wyjaśnień (0), kolejka powtórek, wznowienie Nauki, QA dostępności i wydanie |

Testy lokalne, lint i TypeScript nie zastępują telefonu ani realnego backendu.
Nie uznajemy 60 s oczekiwania za normalne lub rozwiązane przez sam prefetch.

## 2. Konkretne luki konta

Obecnie MediaAccountCard jest formularzem logowania istniejącym kontem,
powielanym kontekstowo w onboardingu, Ustawieniach i odzyskiwaniu mediów.
services/account.ts obsługuje signInWithPassword oraz lokalne signOut.

Brakuje rejestracji, potwierdzenia e-maila, ponowienia potwierdzenia,
odzyskiwania i zmiany hasła, routingu callbacków, usunięcia konta serwerowego,
wspólnego stanu sesji i uprawnień oraz czytelnego kontynuowania zadania.
Usunięcie danych lokalnych NIE jest usunięciem konta.

Postępy są lokalne i obecnie nie są rozdzielone według kont na tym samym
urządzeniu. Nie wolno obiecywać synchronizacji po zalogowaniu; zmiana konta
nie może dyskretnie kasować historii. Zakres synchronizacji nie wchodzi do MVP.

media-token w repo sprawdza tożsamość i podpisuje klucze plików; nie sprawdza
limitów podejść ani planu. Nie audytowano w tej analizie ustawień produkcyjnych
Supabase: włączenia signup, potwierdzania maili, SMTP, redirectów czy limitów.

## 3. Kierunek UX — prosty, jeden przepływ

Rekomendacja projektowa, nie ustalona polityka biznesowa:

- Onboarding zostaje krótki: język → kategoria → wybór Nauka/Egzamin.
- Zamiast dużego formularza konta w opisie trybów: zwięzłe wejścia
  Utwórz bezpłatne konto / Mam już konto / Później.
- Osobny ekran konta z prostym przełączeniem Zarejestruj/Zaloguj;
  na start e-mail + hasło, bez imienia, telefonu, powtarzania e-maila,
  gamifikacji i obowiązkowych zgód marketingowych.
- Link Nie pamiętam hasła, autofill, pokaż hasło, czytelne błędy przy polu,
  pełna obsługa klawiatury, bez blokady wklejania i menedżera haseł.
- Stan Zalogowany nie jest tym samym co E-mail potwierdzony ani Dostęp płatny.
- Po potwierdzeniu/logowaniu wracamy do zadania, nie domyślnie do Ustawień:
  egzamin → ten sam draft/odprawa, Nauka → te same filtry i partia.
- Przygotowanie materiałów działa w tle dopiero z odpowiednią sesją/dostępem;
  potwierdzenie e-maila, prefetch i otwarcie paywalla nigdy nie uruchamiają zegara.
- Później pozwala obejrzeć panel/znaki/dokumenty. Pełny egzamin z limitem wymaga
  konta w rekomendowanym MVP. Realne demo bez konta wymaga osobnej polityki
  dostępu i ochrony nadużyć; dziś chronione multimedia nie działają jako demo.
- Komunikat konto nie synchronizuje postępów pozostaje prawdziwy.

Nie dodajemy social login ani kilku metod passwordless w pierwszej fazie.
Można rozważyć je później po pomiarze porzuceń i analizie wymagań sklepów.

## 4. Benchmark — czego użyć, czego nie kopiować

[Prawo Jazdy 360](https://www.prawo-jazdy-360.pl/logowanie) pokazuje logowanie,
rejestrację i odzyskanie hasła oraz logowanie zewnętrzne. Bierzemy kompletność
i czytelne przełączenie; nie kopiujemy dublowania e-maila i hasła na telefonie.

[ZdamyTo](https://www.zdamyto.com/darmowy-ebook-i-konto) komunikuje darmowe konto,
oddzielnie od płatnego dostępu. Bierzemy rozdzielenie konto ≠ zakup.
Bezpośredni formularz nie był dostępny do pełnej inspekcji (HTTP 403).
Nie wnioskujemy o niewidocznych ekranach ich aplikacji mobilnej.

To benchmark publicznych stron, nie pomiar ich opóźnień, konwersji ani backendu.

## 5. Fazy według priorytetu

### A0 — P0: zamknąć bieżące blokery, przed implementacją konta

1. Fizyczny test start → odpowiedź → wynik → wznowienie → porzucenie → nowy start.
2. Powtarzalny cold/partial/warm start po zalogowaniu: czas, bajty, granty,
   status batch/legacy i decoder; poprawić największy faktyczny koszt.
3. Odbiór widoczności zdjęć, wcześniejszego START i wyboru w obu motywach.
4. Jakość wariantów zdjęć i oddzielna decyzja o ich publikacji.
5. Ustalić warunki pomiaru i próg akceptacji, np. propozycja:
   warm p95 ≤ 2 s do ekranu pytania, cold po kliknięciu p95 ≤ 10 s na
   uzgodnionym Wi-Fi. To cele do zatwierdzenia, NIE obecne wyniki/gwarancje LTE.

Odbiór: brak pętli nawigacji, odzyskiwalne błędy, zachowany cache i pomiar
potwierdzający redukcję zgłoszonych 60 s. Cały dawny backlog treści nie musi
blokować konta, lecz otwarte blokery podstawowego zadania nie mogą być pominięte.

### A1 — P0 dla konta: kontrakt dostępu i infrastruktura wiadomości

1. Zdecydować: ile darmowych podejść, limit łączny czy okresowy, zakres Nauki,
   wymaganie konta, zachowanie istniejących użytkowników.
2. Rekomendowane pierwsze uproszczenie: N bezpłatnych startów na konto,
   wspólne dla kategorii. N i sposób odnawiania wymagają akceptacji, nie hardcode.
3. Audyt konfiguracji Supabase, własny SMTP/domena nadawcza, szablony maili,
   dostarczalność, rate limits i adresy callbacków osobno dev/staging/prod.
4. Plan usunięcia konta i danych serwerowych oraz aktualizacja prawdziwych
   regulaminu/prywatności. Ustalić retencję wymaganych danych, nie udawać
   że marketingowa zgoda jest zgodą potrzebną do działania konta.
5. Konfiguracje/sekrety serwerowe poza EXPO_PUBLIC; testy staging przed wydaniem.

Odbiór: realny mail do zewnętrznego użytkownika i działający powrót na Android/iOS.
Nie używać domyślnego SMTP Supabase jako gotowej konfiguracji produkcyjnej:
[dokumentacja SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
Zmiany chmury wymagają osobnej autoryzacji; plan nie jest zgodą na deployment.

### A2 — P1: kompletne konto MVP, bez uruchamiania płatności

1. Wspólny AuthProvider: loading/guest/pending-verification/authenticated/error;
   jedna subskrypcja sesji, foreground refresh i ochrona wyścigów logout/reset.
2. Ekrany Expo Router poza (tabs): auth/login, register, verify-email,
   forgot-password, reset-password, callback oraz account.
3. Usługi signup, login, resend, reset i zmiana hasła przez istniejącą kolejkę
   operacji konta. Walidacja zgodna z polityką serwera; bez ujawniania istnienia
   obcego e-maila przy reset/rejestracji. Cooldown zgodny z rate limits.
4. Po signup bez session: ekran potwierdzenia, nie fałszywy sukces logowania.
5. Callback o ograniczonym schemacie/typie: poprawny, wygasły, ponowny,
   przerwany; cold/warm start, inny telefon, link otwarty w przeglądarce.
   Typ sesji/linku zgodny z wybraną konfiguracją Supabase; nie mieszać flowów.
6. Pending action tylko z allowlisty (exam/study/settings), z kategorią,
   językiem i referencją draftu. Nie przechowywać hasła, tokenów ani dowolnego
   return URL; nie pozwolić na open redirect ani auto-start zegara z maila.
7. MediaAccountCard zastąpić kompaktowym statusem/CTA. Wszystkie wejścia konta
   prowadzą do jednego przepływu i zachowują pierwotne zadanie.
8. Wylogowanie, zmiana hasła i usunięcie konta z ponownym potwierdzeniem
   tożsamości; serwer weryfikuje właściciela. Bez service-role w aplikacji.
9. Usuwanie konta, wylogowanie i usuwanie danych telefonu jasno rozdzielone.
   Zmiana konta jawnie informuje o lokalnym charakterze istniejącej historii.

Odbiór: nowa osoba zakłada konto w aplikacji, potwierdza, loguje, resetuje hasło
i wraca do egzaminu/Nauki bez zmiany draftu ani utraty danych. Usunięcie konta
potwierdzone przez serwer; błąd operacji nie jest pokazywany jako sukces.
Wytyczne: [Supabase hasła](https://supabase.com/docs/guides/auth/passwords),
[mobile callbacks](https://supabase.com/docs/guides/auth/native-mobile-deep-linking).
Nie dodawać bibliotek przed sprawdzeniem SDK 57 i potrzeb development builda.

### A3 — P1: licznik podejść i uprawnienia po stronie serwera

Konto, grant dostępu do pliku, przygotowanie draftu i prawo do NOWEGO egzaminu
to cztery różne stany. Freemium nie może polegać na liczbie wyników w SQLite.

1. Serwerowe polityki planów, stan uprawnień, rejestr prób/zdarzeń limitu
   i idempotency key. RLS odcina klientowi zmianę limitów i przyznawanie Premium.
2. Liczenie startów, nie ukończeń: inaczej porzucanie przed wynikiem obchodzi limit.
3. Przygotowanie/sprawdzenie dostępności nie zużywa podejścia. Po gotowości
   materiałów aktywacja tuż przed wejściem na pierwsze pytanie robi atomowy
   check + zapis + odjęcie. Równoległe urządzenia nie mogą wydać ostatniej próby
   dwa razy. Retry używa tego samego klucza i zwraca ten sam ticket/deadline.
4. Po odpowiedzi serwera z utraconym połączeniem klient najpierw odzyskuje
   istniejącą aktywację, nie tworzy nowej. Po błędzie nawigacji start/wznowienie
   odzyskuje ten sam ticket, bez następnej opłaty. Automatycznych zwrotów
   wyłącznie na deklarację klienta nie ma; polityka korekt technicznych osobno.
5. Anulowanie pobierania/odprawy: 0. Wznowienie aktywnej próby: 0 dodatkowych.
   Porzucenie PO aktywacji: próba pozostaje zużyta. Nowy start z ponownie
   wykorzystanymi niewidzianymi pytaniami: nowe podejście, mimo małego transferu.
6. Próba zużyta przy aktywacji może wyprzedzać wyświetlenie pierwszej klatki.
   Nie obiecywać idealnej transakcji obejmującej serwer, SQLite i nawigację.
   Zdefiniować odzyskiwanie ticketu i ewentualne korekty serwerowe.
7. Cache nie daje prawa do nowego egzaminu: limit sprawdzany także przy 32/32
   gotowych materiałach. Wylogowanie, reset lokalny i reinstall nie odnawiają
   limitu. Nie ma gwarancji przeciw nowym kontom albo zmodyfikowanemu klientowi.
8. Proste MVP: nowe limitowane podejście wymaga sieci; już aktywowane można
   kontynuować offline przy kompletnym cache i zachowanym deadline.
   Pełne nowe egzaminy offline wymagają osobnej polityki, nie przypadkowego bypassu.
9. Ustalić obsługę upgrade/downgrade oraz ograniczonej aktywnej próby na innym
   urządzeniu. Komercyjny rejestr prób nie oznacza synchronizacji historii Nauki.
10. UI pokazuje pozostałe podejścia PRZED przygotowaniem; po wyczerpaniu
   wyjaśnia limit i dopiero proponuje dostęp płatny, bez paywalla w trakcie próby.

Odbiór: testy dwóch urządzeń/równoległych żądań, retry po utracie odpowiedzi,
cache bypass, reset/reinstall, porzucenie przed/po aktywacji, reuse M2E, offline,
utrata sesji i zmiana planu. Nie wolno włączyć płatnego limitu tylko w UI.

### A4 — P2: płatności po osobnym wyborze oferty

1. Wybrać jedną ofertę, bez wielu pakietów na start: np. dostęp czasowy lub
   pakiet podejść. Cena, okres, odnawianie i darmowy zakres pozostają decyzją.
2. Sprawdzić aktualne zasady sklepów dla platformy i rynku. Bazowy plan
   cyfrowego dostępu: mechanizmy zakupów sklepów; alternatywy zależą od programu
   i regionu, nie zakładamy że dowolny web checkout jest dopuszczalny.
3. Backend weryfikuje zakup i utrzymuje entitlement. Obsługuje restore,
   zakup pending, refund, expiration, powtórzone webhooki i zmianę urządzenia.
4. Jasno rozdzielić subskrypcję, czasowy dostęp i consumable podejścia:
   nie obiecywać store restore dla już zużytych consumables; saldo utrzymuje konto.
5. Usunięcie konta nie jest automatycznie anulowaniem subskrypcji; komunikat
   i zarządzanie zakupem przed usunięciem bez utrudniania samego usunięcia.

Odbiór: sandbox obu sklepów i serwerowe uprawnienia, brak podwójnej aktywacji.
Źródła: [Apple](https://developer.apple.com/app-store/review/guidelines/),
[Google Payments](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en).

### A5 — P0 dla wydania: pełny odbiór i zgodność

- Android/iOS: nowa instalacja, istniejące konto, restart, OTP/linki w mailu,
  duże fonty, keyboard, TalkBack/VoiceOver, dwa motywy i cztery języki.
- Auth, freemium i media: brak tokenów/PII w logach; brak publicznych sekretów;
  błędy sieci i dostarczalność maili; limit wyłącznie z serwera.
- Rejestracja publiczna dopiero wraz z działającym usunięciem konta w aplikacji.
  Google wymaga także zewnętrznej ścieżki żądania usunięcia:
  [Google account deletion](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en-EN).
- Migration: brak utraty lokalnej historii/cache; quota migracji istniejących
  kont ustalona jawnie, bez domyślnego odbierania wcześniej obiecanego dostępu.
- Lint/TypeScript/skrypty oraz rzeczywiste testy maili, backendu i zakupów.
- Feature flags, staging, zgodność klient-serwer i rollback; osobna zgoda
  na wdrożenie infrastruktury/publikację i komunikację z użytkownikami.

## 6. Decyzje przed realizacją A1–A4

1. N i okres darmowych podejść: łącznie na konto czy odnawiane?
2. Co jest darmowe w Nauce i czy naprawdę potrzebujemy demo bez konta?
3. Premium: czasowy dostęp, subskrypcja czy pakiet podejść?
4. Reguła rozpoczętego/porzuconego egzaminu i korekt po błędzie technicznym.
5. Migracja obecnych użytkowników, wspólny limit kategorii/urządzeń.
6. Nadawca SMTP, domeny callbacków/usunięcia konta, właściciel dokumentów prawnych.

Nie wybieramy liczb/cen, nie publikujemy signup, nie zmieniamy grantów ani
nie tworzymy kont testowych bez dalszej decyzji i zgody na odpowiedni zakres.
