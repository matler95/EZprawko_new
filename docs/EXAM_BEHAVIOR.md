# Egzamin i Nauka — odrębne zachowanie mediów

## Egzamin

- Brak oceny poprawności, wyjaśnień i sumy zdobytych punktów w trakcie próby.
  TAK/NIE mają neutralne kolory; zaznaczenie pokazuje wyłącznie wybór użytkownika.
- Można zmienić wybór w bieżącym pytaniu. Jest zapisany lokalnie bez przejścia
  dalej. „Następne pytanie” zatwierdza wybór; po upływie czasu zachowujemy ostatni
  wybór. Nie ma powrotu do wcześniejszego pytania.
- Nowe pytania podstawowe z filmem: czytanie (20 s), jeden automatyczny przebieg
  filmu, następnie 15 s na odpowiedź od faktycznego zdarzenia końca odtwarzania.
  Podczas czytania media są przygotowane, ale ukryte. Zdjęcie pokazuje się po
  czytaniu; pytania bez filmu nie mają dodatkowej fazy oglądania.
- Film nie ma kontrolek pauzy, przewijania, replay, pełnego ekranu ani PiP.
  Po obejrzeniu pozostaje ostatni kadr. Zegar całej próby nadal ma 25 minut.
- Pytania specjalistyczne zachowują 50 s łącznie; również trzy filmowe referencje
  występujące w aktualnej źródłowej bazie nie dostają dodatkowych 15 s.
- URI nie wystarcza do odblokowania odpowiedzi: wymagamy gotowości dekodera,
  a dla filmu również zakończenia jego odtwarzania.
- Czas filmu i jego zakończenie zapisujemy w istniejących settings egzaminu.
  Retry zapisu jest idempotentne i nie restartuje filmu/deadline.
- Przy wznowieniu/wyjściu z tła nie odtwarzamy obejrzanej części od początku;
  zegar globalny biegnie nadal. Upłynięty w tle film prowadzi do stop-klatki
  i pierwotnego końca czasu odpowiedzi, nie nowych 15 s przy każdym powrocie.
- Wynik i przegląd z kluczem pojawiają się dopiero po zakończeniu próby.
- Rozpoczęte przed aktualizacją pytania ze starym zegarem zachowują swoje
  terminy. Pełny nowy przebieg należy sprawdzać na nowej próbie.

## Nauka i przegląd zakończonego egzaminu

Native controls pozostają dostępne. Jawne „Odtwórz ponownie” rozpoczyna film od
początku bez ponownego pobrania. Nie dodajemy nowego trybu ani biblioteki.

## Źródła i granice odbioru

Instrukcja WORD Piła opisuje pojedynczy film ze stop-klatką, możliwość zmiany
wyboru przed przejściem dalej oraz podstawowe limity czasu:
https://word.pila.pl/wp-content/uploads/2020/06/wwp_et_2016-02-24.pdf
Opis wyniku po ostatnim pytaniu:
https://archiwum.word.bielsko.pl/?page_id=395

Materiały opisują mechanikę egzaminu, nie certyfikują tej aplikacji. Instrukcja
Piły jest starsza; odbiór dokładnej zgodności aktualnego interfejsu WORD, w tym
opcjonalnego wcześniejszego START przed końcem czytania, pozostaje osobnym QA.
Nie twierdzimy, że odtworzono cały system egzaminacyjny 1:1.

SDK 57: https://docs.expo.dev/versions/v57.0.0/sdk/video/
Pełny ekran wyłączono również dlatego, że native controls mogą być tam aktywne
mimo wyłączenia ich w widoku osadzonym.

Testy: test-exam-flow.cjs, test-exam-media-policy.cjs, test-session-categories.cjs
i test-phase1-ui.cjs. Telefon musi potwierdzić autoplay, ostatnią klatkę, odczyt
duration, zdarzenie playToEnd, zmianę wyboru, tło i wznowienie na Android/iOS.
## Zaznaczenie odpowiedzi — korekta 2026-10-14

W aktywnym egzaminie TAK/NIE i A/B/C używają niebieskiej obwódki, tła
i wypełnionego znacznika wyboru. Kolor nie zależy od poprawności odpowiedzi.
Nie wyświetlamy podpisu „Twój wybór”; czytnik ekranu nadal otrzymuje stan
selected i opis wyboru. Nauka i przegląd wyniku zachowują oznaczenia poprawności.

Oficjalne źródło: https://www.word.poznan.pl/egzaminy/teoretyczny/ —
20 s na zapoznanie, 15 s na odpowiedź, jednokrotna projekcja filmu kończąca
się stop-klatką. Dokument prezentacji WORD Zielona Góra:
https://www.zgora.wordy.pl/system/obj/735_Prezentacja_egzamin_teoretyczny.pdf.
Obecna zmiana wyglądu wyboru nie modyfikuje zegarów ani kolejności faz.
## Wcześniejsze przejście po przeczytaniu pytania — 2026-10-14

Podstawowe: maksymalnie 20 s czytania z opcją „Odtwórz film” lub
„Przejdź do odpowiedzi”. Upływ czasu nadal automatycznie kończy czytanie.
Film odtwarzany raz, po jego końcu pełne 15 s na odpowiedź; zdjęcie/tekst
otrzymuje pełne 15 s od wcześniejszego zakończenia czytania. Specjalistyczne
pozostają przy 50 s, globalny deadline 25 min nie zmienia się.

Wcześniejszy start zapisany transakcyjnie, odporny na double tap, retry,
zmianę pytania, reset i wznowienie. Przycisk filmu czeka na gotowość natywną
i znaną długość filmu. Pytanie znajduje się nad mediami; gotowy odtwarzacz
dekoduje się w ukrytym, przyciętym kontenerze podczas czytania, bez pustego
220-pikselowego pola. Odpowiedzi podstawowe pojawiają się dopiero po filmie
lub zakończeniu czytania. Nauka zachowuje ponowne odtwarzanie.
## Decyzja produktu: zdjęcia od razu — 2026-10-14

Na życzenie użytkownika zdjęcia są widoczne razem z pytaniem, również
w fazie czytania podstawowego egzaminu. Nie wymagają START ani zakończenia
20 s. To świadome uproszczenie odwzorowania WORD. Zegary, blokada odpowiedzi
do fazy odpowiadania, wcześniejsze przejście i gotowość dekodera pozostają.
Ukrywanie oraz jednokrotne odtwarzanie dotyczą wyłącznie wideo.
