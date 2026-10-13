# UX baseline — 2026-10-13

## Potwierdzone lokalnie

- Expo SDK 57, React Native 0.86.3; istniejące partie Nauki 5/do 12 pytań.
- Dołączony pakiet wyjaśnień: 0 wpisów, potrzebny zatwierdzony pakiet redakcyjny.
- Multimedia wymagają istniejącego konta; brak rejestracji/resetu hasła w aplikacji.
- Stan aktywnej Nauki jest w pamięci, bez trwałego wznowienia po restarcie.
- Pobieranie offline obejmuje do 250 plików kategorii i cache 1 GB.
- Błąd do odtworzenia: URI odblokowywał odpowiedź przed dekodowaniem materiału.
  Checkpoint F1.1 zmienia warunek na onLoad obrazu / readyToPlay filmu.

## Pomiar urządzeniowy — otwarty

Nie zebrano pomiarów telefonu ani zrzutów fizycznego UI w tym checkpointcie.
Zapisz wersję aplikacji/commit, model, OS, język, font, motyw i stan sieci.

| Scenariusz | Punkt startu → końca | Android | iPhone |
| --- | --- | --- | --- |
| Pierwsza odpowiedź | Koniec onboardingu → zapis pierwszej odpowiedzi | Do pomiaru | Do pomiaru |
| Zimny egzamin | Start w odprawie, bez cache → widoczne pytanie | Do pomiaru | Do pomiaru |
| Ciepły egzamin | Start w odprawie, gotowa próba → widoczne pytanie | Do pomiaru | Do pomiaru |
| Powrót do Nauki | Zmiana tabów → poprzednie pytanie | Do pomiaru | Do pomiaru |

Każdy pomiar powtórz co najmniej 3 razy; zapisz czasy, liczbę kroków i blokady.
Osobno oceniaj wariant bez konta, zalogowany bez uprawnień, wolną sieć i offline.
Nie porównuj zimnego startu bez cache z ciepłym startem jako poprawy wydajności.

## Scenariusze checkpointu F1.1

- Obraz: odpowiedź nieaktywna przed onLoad; błąd odczytu daje retry.
- Film: loading/idle/error blokuje odpowiedź; readyToPlay odblokowuje.
- Buforowanie po odblokowaniu ponownie blokuje niezapisane odpowiedzi.
- Brak URI kończy się błędem zamiast nieskończonym spinnerem.
- Brak konta: akcja logowania; odmowa dostępu: konto i multimedia w Ustawieniach.
- Błąd pobrania: retry; brak miejsca: zarządzanie materiałami w Ustawieniach.
- Szybkie zmiany pytania/anulowanie: spóźniony wynik nie zmienia nowego materiału.
- Egzamin: sprawdzić odtwarzanie i timer na fizycznych urządzeniach.

F0 pozostaje częściowo otwarte do zebrania pomiarów urządzeniowych.
F1.2 (przygotowanie dokładnej partii przed startem) wdrożone lokalnie:
postęp, stały zestaw, retry po logowaniu, anulowanie, reset i ochrona cache.
Pomiary oraz odbiór na fizycznych telefonach pozostają otwarte.
