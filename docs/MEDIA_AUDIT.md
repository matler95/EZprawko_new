# P0 F1.0 — audyt multimediów

## Poszukiwanie w aktualnym źródle gov.pl — 2026-10-13

Sprawdzono aktualne linki na [stronie Ministerstwa Infrastruktury](https://www.gov.pl/web/infrastruktura/prawo-jazdy)
i odczytano pełne centralne indeksy wszystkich trzech podlinkowanych pakietów ZIP:

| Oficjalny pakiet | Wpisy plików | Dokładne nazwy DSC_0055.JPG / 5-9.2021.wmv |
| --- | ---: | --- |
| [Multimedia do pytań](https://www.gov.pl/pliki/mi/multimedia_do_pytan.zip) | 2636 | Brak obu |
| [Multimedia, część 2](https://www.gov.pl/attachment/10d143bf-9e93-4d82-935d-48c89353d3ce) | 13 | Brak obu; jest tylko 5-9.2021 bis.wmv |
| [Tłumaczenia migowe 12/2025](https://www.gov.pl/pliki/mi/pytania_egzaminacyjne_na_prawo_jazdy_tlumaczenia_migowe_12_2025.zip) | 1976 | Brak obu |

Nie znaleziono także nazw zawierających DSC_0055 ani ID 11150/13074. Jedyne
podobieństwo to znany już plik bis, przypisany do 13080, nie użyty jako zamiennik.
Indeksy dwóch zwykłych pakietów są zgodne z lokalnymi indeksami (nazwy, rozmiary,
CRC i rozmiary skompresowane). Odczytano 591509 B indeksów przez 11 żądań Range,
bez pobierania pełnych archiwów ~9,48 GB i ~11,10 GB ani wypakowywania zawartości.

[Aktualny katalog 07/2026](https://www.gov.pl/attachment/a5c6c329-28a5-4274-a1a8-e2813f0a51bd)
ma ten sam SHA-256 co lokalny plik źródłowy; nie ma tu nowszego podlinkowanego
katalogu rozwiązującego rozbieżność. Porównano binarną tożsamość, bez edycji XLSX.

Powtórzenie kontroli: `python scripts/find-official-media.py`. Skrypt wymaga
obsługi Range/206 z dokładnym Content-Range i stałym Last-Modified, ma ograniczenie
transferu i odmawia przypadkowego pełnego pobrania. Szuka nazw w indeksie, nie
rozpoznaje semantycznej treści obrazów/filmów. Nie zmieniono aplikacji ani chmury.

Wniosek: dwóch wymaganych plików nie odnaleziono w obecnie podlinkowanych
pakietach. Potrzebne jest uzupełnienie albo oficjalne potwierdzenie korekty od
wydawcy źródła. Nie wysłano zapytania do Ministerstwa w imieniu użytkownika.

Checkpoint: 2026-10-13. Status: baza/arkusz/manifest i inwentarz R2 porównane;
naprawiono w kodzie dwa niedopasowania Unicode kluczy dostawy. Obecnie 2633/2635
oczekiwanych kluczy jest obecnych i niepustych; zostały dwa brakujące pliki.
Dostęp przez konto aplikacji, dekodowanie i zgodność treści nadal nieweryfikowane.
Nie zmieniono bazy źródłowej ani plików w chmurze.

## Powtarzalny raport

```powershell
node scripts/audit-media.cjs
node scripts/audit-media.cjs --details
node scripts/test-media-audit.cjs
node scripts/audit-media-remote.cjs
node scripts/test-media-reconciliation.cjs
node scripts/test-media-unicode.cjs
```

Wymagania: Node z `node:sqlite`, zależności projektu i Python 3 (standardowe
`zipfile`; biblioteka `openpyxl` do odczytu arkusza). Lokalny raport czyta SQLite w trybie read-only, JSON manifestu oraz centralne
indeksy obu lokalnych ZIP. Używa rzeczywistych funkcji mapowania z `src/config/media.ts`
bez odczytu konfiguracji kont/sekretów. Nie wypakowuje, nie pobiera ani nie zmienia
plików, bazy czy chmury. Wynik JSON trafia na stdout; znalezione usterki są w
`issueCounts`/`issues`, nie oznaczają błędu wykonania CLI. Pełny wynik zawiera klucze,
ID zależnych pytań, kategorie, nazwy cache, metadane ZIP i wpisy niepowiązane.

## Wynik lokalny

| Metryka | Liczba |
| --- | ---: |
| Pytania | 3518 |
| Pytania z referencją multimediów | 2980 |
| Pytania bez referencji | 538 |
| Unikalne referencje w bazie i manifeście | 2635 |
| Obrazy | 1534 |
| Filmy WMV wymagające dostawy MP4 | 1101 |
| Referencje z dokładną nazwą w lokalnych archiwach | 2633 |
| Referencje bez dokładnej nazwy w lokalnych archiwach | 2 |
| Wpisy archiwów niepowiązane z referencją bazy | 16 |

Nie wykryto rozbieżności zbiorów baza/manifest, nieobsługiwanych rozszerzeń,
kolizji kluczy dostawy/cache ani konfliktów metadanych źródła przy identycznych
nazwach. SHA-256 pliku `gov-attachment.xlsx` odpowiada metadanym bazy i manifestu.
Odczyt arkusza `katalog` potwierdził zgodność wszystkich 3518 ID, referencji mediów
i zbiorów kategorii z bazą, bez brakujących/obcych/zduplikowanych ID.
538 pustych referencji występuje też w źródle; nie utracono ich przy imporcie.
Nie jest to redakcyjna ocena, czy treść każdego pytania powinna mieć obraz.
Kategorie współdzielą pytania i pliki;
liczebności kategorii z raportu nie sumują się do globalnej liczby plików.

## Usterki wymagające rozstrzygnięcia

| Pytanie | Oczekiwana nazwa | Klucz dostawy | Ustalenie |
| --- | --- | --- | --- |
| 13074 | `5-9.2021.wmv` | `wideo/5-9.2021.mp4` | Brak dokładnej nazwy w obu ZIP. W części 2 istnieje `5-9.2021 bis.wmv`; nie jest dowodem równoważności |
| 11150 | `DSC_0055.JPG` | `zdjecia/DSC_0055.JPG` | Brak dokładnej nazwy i brak podobnej nazwy DSC_0055 w obu ZIP |

Nie podmieniono kluczy ani plików. Kandydat z dopiskiem `bis` wymaga kontroli
źródła i treści; może należeć do innego pytania. Brak w lokalnym ZIP nie dowodzi
braku na serwerze. 16 niepowiązanych wpisów archiwów nie jest listą do usunięcia.

## Rzeczywisty inwentarz R2 — 2026-10-13, 18:46:40 UTC

Użyto istniejącej sesji Wrangler i wyłącznie GET do bucketa `ezprawko-media`.
Paginacja potwierdzona do końca: gdy API nie zwraca metadanych kursora, raport
używa udokumentowanego `start_after` i wymaga pustej strony końcowej oraz
ściśle postępujących kluczy. Pierwsza odpowiedź z 649 wpisami NIE była całością.
Pełny odczyt zawiera 2649 obiektów. Token pozostaje w pamięci procesu, bez logów
i zapisu do raportu. [Kontrakt listowania R2](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/objects/methods/list/).

Ponowny pełny odczyt o 18:49:30 UTC potwierdził te same liczby i wskazał
konkretne odpowiedniki dwóch nazw Unicode. Remote CLI wymaga istniejącej sesji
Wrangler, wykonuje wyłącznie GET metadanych i nie loguje tokena ani stderr CLI.

| Oczekiwane obiekty | Obecne i niepuste | Brak dokładnego klucza |
| --- | ---: | ---: |
| Obrazy: 1534 | 1533 | 1 |
| Filmy MP4: 1101 | 1098 | 3 |
| Razem: 2635 | 2631 | 4 |

Obecne obiekty mają dodatni rozmiar i MIME właściwej rodziny image/video.
To nie dowodzi kodeka, zgodności treści ani dostępu przez grant użytkownika.
18 obiektów nie pasuje do oczekiwanych kluczy; nie usunięto ich.

| ID pytania | Brakujący dokładny klucz dostawy |
| --- | --- |
| 13074 | `wideo/5-9.2021.mp4` |
| 11150 | `zdjecia/DSC_0055.JPG` |
| 11180 | `wideo/Ostrozność pkt 13.mp4` |
| 11179 | `wideo/Ostrożność pkt 8.mp4` |

Dwie ostatnie nazwy zawierają znaki łączące Unicode. Klucze porównano dokładnie,
tak jak aplikacja; podobnie wyglądająca nazwa nie jest automatycznie odpowiednikiem.
Kontrola kandydatów NFC/pisowni jest diagnostyczna i nigdy nie zmienia mapowania.

| ID | Rzeczywisty klucz R2 (NFC) | Rozmiar |
| --- | --- | ---: |
| 11180 | `wideo/Ostrozność pkt 13.mp4` | 598763 B |
| 11179 | `wideo/Ostrożność pkt 8.mp4` | 545143 B |

Nazwy są identyczne po normalizacji NFC, nie tylko wizualnie podobne. W momencie
pierwszego audytu mapowanie aplikacji nie normalizowało nazw. Naprawa lokalna
w `deliveredMediaFilename` normalizuje nazwę do NFC przed mapowaniem WMV → MP4.
Grant, URL i cache korzystają z tej samej funkcji. Worker nadal porównuje dokładny
klucz z podpisem; NIE normalizuje dowolnych podpisanych żądań po stronie serwera.
Oficjalne referencje i klucze odpowiedzi pozostają bez zmian.
Źródłowe braki są potwierdzone w komórkach `katalog!H3031` (11150) i `H3243`
(13074). Arkusz nie zawiera błędu importu wymagającego automatycznej korekty bazy.

### Pozostałe kroki P0

1. Pozyskać właściwe materiały dla 11150/13074, sprawdzając źródło i treść.
   Nie przepisywać oficjalnych referencji ani nie uploadować kandydata bez weryfikacji.
2. Dla wszystkich 1101 filmów sprawdzić rzeczywiste wyniki konwersji WMV → MP4,
   kodeki i integralność; metadane inwentarza nie wystarczają.
3. Potwierdzić rzeczywisty dostęp uprawnionego konta przez grant i HEAD/GET/Range;
   odróżnić brak pliku od braku uprawnień. Nie wpisywać tokenów do raportu.
4. Sprawdzić integralność zawartości archiwów oraz dekodowanie rzeczywistych
   plików dostawy i zgodność z pytaniami; zapisać natywny odbiór Android/iOS/offline.

Kontrola obecności w R2 jest wykonana; dostęp aplikacyjny/integrity/content-match
nadal są `unverified`. CRC z indeksu ZIP nie jest sprawdzeniem CRC zawartości.
Wykonano HTTP GET metadanych storage, ale nie pobieranie/odtwarzanie plików ani
transkodowanie. F1.0 nie jest zakończone.

## Weryfikacja naprawy NFC — 2026-10-13, 19:01:54 UTC

Ponowny pełny odczyt R2 z poprawionym mapowaniem: 2633/2635 oczekiwanych
kluczy obecnych/niepustych (1533/1534 obrazów, 1100/1101 filmów). Pozostałe braki:
`zdjecia/DSC_0055.JPG` i `wideo/5-9.2021.mp4`. Nie wykryto nowych kolizji kluczy
w aktualnym katalogu. 16 obiektów nie jest powiązanych z oczekiwaną nazwą.

`5-9.2021 bis.wmv` jest przypisany do innego pytania, 13080. Nie użyto go jako
zamiennika 13074. Potrzebny jest właściwy plik lub oficjalnie potwierdzona korekta,
nie zmiana nazwy na podstawie podobieństwa.

Test używa realnego mapowania i cache: NFD/NFC współdzielą jeden download/grant,
URL wskazuje dokładnie podpisany klucz, a stary niekanoniczny cache nie jest
fałszywie używany. Obiekty cache nie są masowo kasowane; nieaktualne nazwy mogą
pozostać do standardowego LRU. Po tej zmianie trzeba uruchomić aktualny kod aplikacji
i zweryfikować pytania 11179/11180 na telefonach; testy nie są dowodem dekodowania.

## Decyzja produktowa — kwarantanna potwierdzonych braków (2026-10-13)

Na prośbę właściciela pytania 11150 (DSC_0055.JPG) i 13074 (5-9.2021.wmv)
są pomijane w nowych zestawach Nauki, losowaniu/przygotowaniu nowych egzaminów
i pobieraniu offline. Stary, jeszcze nierozpoczęty draft zawierający brak zostaje
zastąpiony. Zestawy nadal zachowują oficjalne proporcje 32 pytań / 74 punkty.
Źródłowa baza, odpowiedzi, historia i rozpoczęte egzaminy nie są modyfikowane.
Liczniki pokrycia/opanowania i rekomendacje odnoszą się do dostępnej puli;
nie oznacza to, że aplikacja udostępnia kompletną bazę ministerialną.

Polityka jest jawna w src/domain/media-eligibility.ts. Usunięcie kwarantanny wymaga
odzyskania dokładnych materiałów, ponownego audytu i testu dekodowania na telefonie.
Błąd sieci, autoryzacji lub chwilowy HTTP 404 nie rozszerza automatycznie tej listy.

Nauka przygotowuje bufor wybranego pytania i dwóch następnych; pierwsze trzy
grzeje już w menu, a w trakcie sesji pobiera trzy kolejne. To zastępuje wcześniejsze
oczekiwanie na całą partię, nie zmienia jej liczebności i nie obiecuje pełnego offline.
Egzamin nadal przygotowuje cały dokładny zestaw przed startem zegara.
Wspólna kolejka ogranicza transfery do dwóch; bieżący materiał/start ma pierwszeństwo
przed oczekującym tłem, również gdy dołącza do tego samego pobrania. Transfer już
rozpoczęty nie jest przerywany. Po anulowaniu nie uruchamiamy nowych plików z
danego preloadu; maksymalnie dwa rozpoczęte mogą zakończyć się w cache.
