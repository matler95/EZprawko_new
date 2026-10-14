# Pierwsze uruchomienie i przygotowanie egzaminu — test telefonu

Data: 2026-10-14. Testuj wersję aplikacji zawierającą najnowsze zmiany lokalne;
nie opublikowano automatycznie nowej wersji ani aktualizacji OTA.

## Nowy przepływ

1. Baza tekstowych pytań jest dołączona do aplikacji; multimedia nie są.
2. Wybór języka i kategorii nie uruchamia pobierania, dopóki użytkownik nie
   potwierdzi kategorii przyciskiem Dalej.
3. Po potwierdzeniu losujemy jeden dokładny zestaw na podstawie roboczej
   kategorii i języka. Nie zapisujemy aktywnej próby i nie uruchamiamy zegara.
4. Na kolejnym kroku można zalogować się przez istniejący formularz konta.
   Bez konta draft zostaje, ale autoryzowane pliki nie są pobierane.
   Formularz obsługuje istniejące konto — ta zmiana nie dodaje rejestracji.
5. Logowanie rozpoczyna/ponawia przygotowanie tego samego zestawu bez czekania
   na cykl minutowy. Pobieranie działa podczas pozostałego onboardingu,
   na panelu i w Ustawieniach, gdy aplikacja jest aktywna.
6. Start egzaminu dołącza do tej samej pracy, wstrzymuje spekulację Nauki
   i nadaje pobieraniu priorytet. Wymagamy wszystkich materiałów przed zegarem.
7. Przejście do Nauki oddaje jej priorytet: nie pobieramy równolegle pełnego
   niezależnego egzaminu. Po powrocie przygotowany draft nadal może być użyty.
8. Anulowanie przed startem zachowuje zestaw i gotowe pliki. Licznik po
   ponownym otwarciu odzwierciedla stan cache, nie zaczyna sztucznie od zera.

## Jak uzyskać stan nowego użytkownika

Najpierw wyeksportuj ważną historię. Reset jest nieodwracalny; eksport
nie jest automatycznie przywracalną kopią.

- W aplikacji: Ustawienia → Usuń wszystkie dane lokalne → potwierdź.
  Usuwa to historię, ustawienia, onboarding, cache i lokalną sesję;
  konto Supabase i dane serwerowe pozostają. To wystarcza do testu przepływu.
- Dla testu rzeczywistej pierwszej instalacji użyj osobnego telefonu/profilu
  z czystą instalacją i bez odtworzenia danych z kopii systemowej.
  Sam reload lub reset postępów nie symuluje nowego użytkownika.
- W Expo Go użyj resetu w aplikacji; usuwanie danych całego Expo Go wpłynęłoby
  także na inne projekty. Nie rób tego bez potrzeby.

## Test A — zalogowanie już w onboardingu

1. Uruchom czysty stan z internetem. Wybierz język i kategorię, naciśnij Dalej.
   Dodatkowo przetestuj A1 + English: nie powinien powstać egzamin B/PL.
2. Na kroku opisu trybów zaloguj się istniejącym kontem. Sprawdź, czy ekran
   reaguje na przyciski podczas pobierania. Zanotuj czas udanego logowania.
3. Przejdź dalej i wybierz Na razie przejdź do panelu. Otwórz odprawę egzaminu
   i naciśnij Rozpocznij. Zanotuj czas kliknięcia, pierwszy licznik gotowych
   materiałów i czas wyświetlenia pierwszego pytania.
4. Powtórz czysty test raz szybko, drugi raz pozostając po logowaniu dłużej
   na ekranie. Druga próba powinna mieć więcej gotowych plików albo brak
   oczekiwania na transfer. Nie ustalamy sztucznego obowiązkowego czasu czekania.
5. Jeżeli pobieranie jeszcze trwa, anuluj przed startem pytania. Otwórz ponownie.
   Zestaw i gotowe pliki mają zostać; tylko brakujące wymagają pobrania.

## Test B — pominięcie logowania

1. Zresetuj lokalne dane i przejdź onboarding bez logowania.
2. Start egzaminu powinien wskazać potrzebę zalogowania, nie wyświetlać próby
   z niedostępnymi filmami i nie uruchamiać zegara.
3. Zaloguj się w Ustawieniach. Przygotowanie ma ruszyć na tym ekranie,
   bez konieczności powrotu do panelu i bez minutowego opóźnienia.
4. Wróć do panelu i rozpocznij. Pobierane są tylko brakujące materiały.

## Test C — sieć, zmiana wyboru i ciepły start

- Przed potwierdzeniem kategorii wróć i zmień język/kategorię. Używamy tylko
  zatwierdzonego wyboru, a nie domyślnej B ani wcześniejszej kategorii.
- Po potwierdzeniu cofnij się, zmień kategorię i ponownie zatwierdź.
  Stare przygotowanie nie może uruchomić egzaminu niewłaściwej kategorii.
- Podczas przygotowania odłącz sieć; zegar nie może ruszyć bez pełnego zestawu.
  Przywróć sieć i ponów start — bez utraty ukończonych pobrań.
- Po przygotowaniu i anulowaniu odprawy przeładuj aplikację bez resetu/cache.
  Start powinien wykorzystać ten sam zapisany zestaw; przy zachowanym kompletnym
  cache zadziała też bez sieci. System może niezależnie usunąć pliki cache.
- Po rozpoczęciu odpowiedz na jedno pytanie i porzuć próbę. Nowy egzamin ma
  wykorzystać niewidzianą część, zastąpić pokazane pytania i wyzerować zegar
  oraz odpowiedzi. To osobny przypadek od anulowania samego przygotowania.

## Co zgłosić

Model telefonu, Android/iOS, wersję aplikacji, kategorię/język, Wi-Fi/LTE,
czas logowania→start, czas kliknięcia→pierwsze pytanie, pierwszy licznik
gotowości i dokładny komunikat błędu. Nie przesyłaj haseł, tokenów ani
prywatnych podpisanych adresów multimediów. Lokalna regresja nie zastępuje
pomiarów autoryzacji, pobierania i dekodowania na telefonie.
