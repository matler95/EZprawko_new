# Dopracowanie istniejących funkcji EZprawko

2026-10-12. Źródło: audyt flow/UI/UX i zgoda właściciela na samodzielną
realizację do zakończenia lub krytycznego blokera. Zastępuje konieczność
potwierdzania kolejnych lokalnych checkpointów. Rozbudowa UX-5 o nowe długości
sesji i tryby pozostaje pominięta. EAS/publikacja nadal odłożone.

## Kolejność

1. Egzamin: odporność zapisu, atomowy/idempotentny wynik, terminy pytań,
   powrót systemowy, jedna wcześniej przygotowana próba i ochrona mediów.
2. Nauka/wyniki: zachowanie miejsca w bieżącej sesji, dokładna powtórka próby,
   klikalna historia, odzyskiwanie błędów, wskaźniki wybranej kategorii.
3. Język/pierwszy kontakt: wspólny język interfejsu i domyślnie pytań,
   język przed kategorią, spójne komunikaty i droga do pierwszego pytania.
   Rejestracja/e-maile wymagają uzgodnienia polityki dostępu i konfiguracji
   serwera; nie otwieramy prywatnego backendu samą zmianą UI.
4. Polish: kontekst partii/filtrów, Dashboard, powiązania znaków, brak
   wyjaśnień, komunikaty multimediów i dostępność.

## Odbiór

- Silnik 20+12/74/68 i oficjalna treść/tłumaczenia pozostają integralne.
- Przygotowanie następnej próby nie tworzy aktywnej próby ani zegara.
- Start z gotowymi plikami nie pobiera nowych materiałów. Pierwsze użycie,
  zmiana kategorii/języka i usunięty cache mają jawny stan przygotowania.
- Błąd zapisu nie blokuje UI; retry nie dubluje wyniku/odpowiedzi.
- Reset danych unieważnia opóźnione operacje; eksport zachowuje kontrakt.
- Każdy checkpoint: znaczące testy, TypeScript, lint, wpis postępu.
- Testy fizycznego urządzenia, rzeczywistego dostępu i zatwierdzonych
  tłumaczeń/treści są osobnymi warunkami odbioru, bez fikcyjnego zaliczenia.

## Status

- Checkpoint 1: lokalne zmiany/testy zakończone; gesty i wideo wymagają fizycznego QA.
- Checkpoint 2: lokalne zmiany/testy zakończone; powroty urządzeniowe wymagają QA.
- Checkpoint 3: wdrożony i zweryfikowany lokalnie (2026-10-13). Wspólny język
  interfejsu PL/EN/DE/UK, atomowy zapis z domyślnym językiem pytań, język jako
  pierwszy krok onboardingu i odświeżanie włączonych przypomnień. Tłumaczenia
  UI są redakcyjne, nie urzędowe; wymagają przeglądu językowego przed publikacją.
- Checkpoint 4: wdrożony i zweryfikowany lokalnie (2026-10-13). Dashboard
  prowadzi najpierw do nauki, filtry/partie mają kontekst i recovery, wyniki
  oznaczają błędy również symbolami, komunikaty nie ujawniają szczegółów CDN.
  Oba motywy i kontrasty sprawdzone lokalnie; rzeczywisty layout, gesty,
  klawiatura, screen reader i dekodowanie mediów wymagają telefonu.
- Lokalny zakres tego planu zakończony. Nie oznacza to zakończenia fizycznego QA,
  zatwierdzenia treści, otwarcia rejestracji ani gotowości do publikacji.
