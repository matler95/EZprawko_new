export type LegalDocument = { title: string; sections: { title: string; paragraphs: string[] }[] };
export const legalRevision = "12.10.2026 · wersja robocza 3";
export const legalNotice = "Prywatna wersja testowa. Dokumenty robocze — nie są zatwierdzonym pakietem do publikacji. Dane operatora, podstawy przetwarzania, retencja usług chmurowych i prawa do treści wymagają uzupełnienia oraz przeglądu prawnego.";
export const ministrySource = "https://www.gov.pl/web/infrastruktura/prawo-jazdy";
export const uodoSource = "https://uodo.gov.pl/pl/493/2254";
export const mediaRightsNotice = "Źródło bazy: Ministerstwo Infrastruktury RP. EZprawko nie jest aplikacją Ministerstwa ani WORD. Publikacja pytań na gov.pl nie stanowi w tej aplikacji potwierdzenia licencji na wszystkie zdjęcia i filmy. Wymagane uprawnienia do publicznego wykorzystania treści nie zostały jeszcze udokumentowane; materiały pozostają w prywatnych testach.";

export const privacy: LegalDocument = {
  title: "Polityka prywatności",
  sections: [
    { title: "1. Zakres i administrator", paragraphs: [
      "Opis dotyczy obecnej prywatnej wersji EZprawko służącej do nauki i symulacji egzaminu teoretycznego. Nie opisuje przyszłych płatności, reklam ani synchronizacji postępu.",
      "Administrator danych i operator aplikacji: do uzupełnienia przed udostępnieniem innym użytkownikom. Nazwa lub imię i nazwisko, adres oraz kontakt do spraw prywatności nie zostały jeszcze ustalone w tym dokumencie. W prywatnym teście kwestie danych zgłaszaj bezpośrednio osobie udostępniającej aplikację.",
    ] },
    { title: "2. Dane nauki na urządzeniu", paragraphs: [
      "SQLite przechowuje odpowiedzi, wyniki i daty egzaminów, historię ćwiczeń, oznaczone pytania, postęp, dni nauki, lokalny dzień aktywności i zdobyte odznaki oraz preferencje kategorii, języka, motywu i przypomnień. Baza pytań i tłumaczeń jest dostarczana z aplikacją.",
      "Obecny kod nie wysyła historii odpowiedzi ani wyników do Supabase i nie synchronizuje ich między urządzeniami. Dane służą do odtworzenia sesji, powtórek i statystyk. Kopie systemowe urządzenia mogą działać zgodnie z ustawieniami Androida lub iOS; nie obiecujemy wyłączenia takich kopii.",
    ] },
    { title: "3. Opcjonalne konto i multimedia", paragraphs: [
      "Do nauki tekstowej konto nie jest wymagane. Pobieranie nowych zdjęć i filmów wymaga internetu oraz zalogowania na konto Supabase udostępnione do testu. Aplikacja wysyła do usługi uwierzytelniania e-mail i hasło; nie zapisuje hasła w bazie postępu. Utrwalona sesja i tokeny są przechowywane przez klienta Supabase w AsyncStorage na urządzeniu.",
      "Przy pobraniu pliku funkcja media-token sprawdza sesję i otrzymuje nazwę pliku. Krótkotrwały token dostępu zawiera identyfikator konta, nazwę pliku i termin ważności (obecnie 120 sekund). Cloudflare Worker weryfikuje token i pobiera materiał z prywatnego R2. Usługi sieciowe otrzymują dane techniczne żądania, w tym adres IP; ich logi mogą obejmować czas żądania i ścieżkę pliku.",
      "Zdjęcia i filmy zapisują się w lokalnym cache. Ustawienia pozwalają wyczyścić cache; ta operacja nie usuwa postępów ani konta. Dostęp do wcześniej pobranych materiałów zależy od obecności pliku w cache, który system może usunąć.",
    ] },
    { title: "4. Przypomnienia i uprawnienia", paragraphs: [
      "Przypomnienia są lokalnie planowane po włączeniu funkcji i udzieleniu zgody systemowej. Można je wyłączyć w Ustawieniach lub cofnąć pozwolenie w systemie. Obecna funkcja nie rejestruje tokenu zdalnego push ani nie wysyła przypomnień z serwera.",
      "Kod aplikacji nie zawiera reklam, zewnętrznej analityki zachowania ani mechanizmu sprzedaży danych. Nie pobiera kontaktów ani lokalizacji dla nauki. Nie oznacza to braku technicznych logów usług infrastrukturalnych.",
    ] },
    { title: "5. Cele i podstawy przetwarzania", paragraphs: [
      "Cele obejmują prowadzenie nauki, obsługę konta i dostępu do materiałów oraz ochronę dostępu do infrastruktury. Przed publicznym wydaniem operator musi określić podstawę prawną osobno dla każdego celu, a przy powołaniu na uzasadniony interes opisać ten interes i ocenić jego dopuszczalność. Zgoda systemowa na powiadomienia nie zastępuje tej analizy.",
    ] },
    { title: "6. Odbiorcy i transfery", paragraphs: [
      "Supabase obsługuje logowanie i funkcję wydającą token; Cloudflare obsługuje Worker i R2. Wyniki nauki nie są przesyłane do tych usług przez obecny kod. Operator musi przed publikacją zweryfikować umowy powierzenia, podwykonawców, region projektu, lokalizacje przetwarzania oraz ewentualne transfery poza EOG i ich zabezpieczenia. Dokument nie potwierdza przetwarzania wyłącznie w UE.",
    ] },
    { title: "7. Okres przechowywania", paragraphs: [
      "Postęp pozostaje w lokalnych danych aplikacji do ich usunięcia. Odinstalowanie zwykle usuwa lokalne dane aplikacji, ale przywrócenie kopii systemowej może je odtworzyć. Cache jest ograniczany przez aplikację i może być czyszczony przez system. Wylogowanie nie usuwa konta Supabase ani logów usług.",
      "Okresy przechowywania kont, logów Supabase/Cloudflare i kopii zapasowych nie zostały potwierdzone. Przed publikacją należy ustalić konkretne okresy lub zrozumiałe kryteria oraz procedurę usuwania danych u dostawców. Ważność tokenu dostępu nie jest okresem retencji konta ani logów.",
    ] },
    { title: "8. Prawa i kontakt", paragraphs: [
      "W zakresie przewidzianym RODO można żądać dostępu do danych, sprostowania, usunięcia, ograniczenia przetwarzania lub przeniesienia, a w odpowiednich przypadkach wnieść sprzeciw albo wycofać zgodę. Można złożyć skargę do Prezesa UODO. Zakres praw zależy od rodzaju danych i podstawy przetwarzania.",
      "Ustawienia oferują eksport lokalnych sesji, odpowiedzi, postępów i preferencji do JSON, reset postępów oraz usunięcie danych lokalnych wraz z cache, przypomnieniami i lokalną sesją. Eksport nie zawiera haseł, tokenów, multimediów ani danych konta z chmury i nie jest kopią do przywrócenia w aplikacji. Kopie udostępnione poza aplikacją trzeba usunąć osobno. Brak nadal funkcji usunięcia konta Supabase; kontakt administratora do żądań dotyczących danych serwerowych musi być uzupełniony przed publikacją.",
    ] },
    { title: "9. Bezpieczeństwo i zmiany", paragraphs: [
      "Dostęp do nowych mediów jest uwierzytelniany. Sesja w AsyncStorage oraz lokalny postęp nie mają w tej wersji osobno wdrożonego szyfrowania przez aplikację; zabezpiecz telefon blokadą ekranu i nie przekazuj nikomu haseł ani tokenów. Nie gwarantujemy całkowitego wyeliminowania ryzyka.",
      "Dodanie synchronizacji, analityki lub płatności wymaga aktualizacji informacji przed uruchomieniem funkcji. Dokument jest zapisany w aplikacji i można go czytać offline; odsyłacze do źródeł wymagają internetu.",
    ] },
  ],
};

export const terms: LegalDocument = {
  title: "Regulamin",
  sections: [
    { title: "1. Status i operator", paragraphs: [
      "EZprawko jest niezależną aplikacją edukacyjną do nauki teorii prawa jazdy. Obecna wersja jest udostępniana wyłącznie do prywatnego testu wskazanemu testerowi; nie stanowi publicznej oferty usługi. Dane operatora i kontakt do zgłoszeń wymagają uzupełnienia przed publikacją.",
    ] },
    { title: "2. Funkcje i wymagania", paragraphs: [
      "Aplikacja oferuje naukę pytań, symulację egzaminu, historię, statystyki i leksykon znaków. Tekstowa baza działa lokalnie. Do nowych mediów potrzeba internetu, konfiguracji usługi i uprawnionego konta. Materiały pobrane wcześniej mogą działać offline, dopóki pozostają w cache. Wyjaśnienia nie są dostępne dla wszystkich pytań.",
      "Do uruchomienia potrzebny jest zgodny telefon i zainstalowana wersja testowa. Operator połączenia może naliczać opłaty za transmisję, zwłaszcza podczas pobierania wielu materiałów. W tej wersji nie ma zakupów ani subskrypcji w aplikacji.",
    ] },
    { title: "3. Symulacja, nie egzamin państwowy", paragraphs: [
      "Symulacja obejmuje 32 pytania, limit 25 minut i próg 68 na 74 punkty, z jednokierunkowym przebiegiem. Wynik służy do oceny nauki; nie jest wynikiem egzaminu WORD, zaświadczeniem ani nadaniem uprawnień. Aplikacja nie gwarantuje zdania egzaminu i nie zastępuje wymaganego szkolenia ani aktualnych przepisów.",
    ] },
    { title: "4. Konto i zasady korzystania", paragraphs: [
      "Konto służy do dostępu do prywatnych materiałów. Nie udostępniaj danych logowania ani tokenów, nie obchodź zabezpieczeń i nie rozpowszechniaj kopii chronionych materiałów. Wylogowanie kończy lokalny dostęp do sesji, lecz nie usuwa konta. Nauka tekstowa nie wymaga zalogowania.",
    ] },
    { title: "5. Źródła i prawa do treści", paragraphs: [mediaRightsNotice,
      "Licencje bibliotek i plik LICENSE w repozytorium dotyczą odpowiednich składników oprogramowania, nie automatycznie bazy pytań, tłumaczeń i multimediów. Informacje o konkretnych uprawnieniach i warunkach wykorzystania treści należy uzupełnić przed publicznym wydaniem.",
    ] },
    { title: "6. Dostępność i zgłoszenia", paragraphs: [
      "Wersja testowa może zawierać błędy i przerwy w dostępie do mediów. Nieaktualną treść, błędny wynik lub problem techniczny zgłoś bezpośrednio osobie udostępniającej test, podając wersję i opis — bez hasła, tokenu czy zbędnych danych osobowych. Formalny kontakt, procedura reklamacji oraz terminy obsługi muszą zostać ustalone przed publikacją.",
      "Niniejszy tekst nie wyłącza praw użytkownika wynikających z bezwzględnie obowiązujących przepisów ani nie ustanawia ogólnego zrzeczenia się odpowiedzialności operatora.",
    ] },
    { title: "7. Dane i zakończenie testu", paragraphs: [
      "Sposób przetwarzania danych opisuje Polityka prywatności. Ustawienia pozwalają eksportować dane lokalne, resetować postępy lub usuwać lokalne dane użytkownika. Usunięcie danych lokalnych zachowuje bazę pytań, lecz usuwa cache i lokalną sesję. Nie usuwa konta Supabase, danych serwerowych ani kopii zapisanych poza aplikacją. Operacje usuwania wymagają potwierdzenia i są nieodwracalne; eksport nie zapewnia przywrócenia postępów w aplikacji.",
    ] },
    { title: "8. Zmiany i publiczne wydanie", paragraphs: [
      "Przed udostępnieniem publicznym wymagane są zgody i weryfikacja praw do materiałów, kompletne dane operatora oraz zatwierdzenie dokumentów odpowiednich do docelowego modelu usługi. Samo wyświetlenie regulaminu nie oznacza zawarcia umowy płatnej, udzielenia zgody marketingowej ani potwierdzenia gotowości prawnej aplikacji.",
    ] },
  ],
};
