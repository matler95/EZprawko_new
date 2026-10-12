"""Build offline sign assets from the official ELI catalogue (never generated artwork)."""
import argparse
import hashlib
import io
import json
import re
import sqlite3
import urllib.request
from pathlib import Path

import pdfplumber
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.expo' / 'sign-sources'
ACTS = ['2019/2310', '2021/433', '2021/2065', '2022/2372', '2026/133']

# Coordinates reviewed against official rendered pages. Grid coordinates below
# use a 90 dpi reference; irregular layouts are explicitly mapped, not guessed.
BOXES = {}


def row(page, codes, left, top, width, height, act='2019/2310'):
    for i, code in enumerate(codes.split()):
        if code != '_':
            BOXES[code] = (act, page, (left + i * width, top, left + (i + 1) * width, top + height), 90)


def box(code, page, bounds, act='2019/2310', dpi=90):
    BOXES[code] = (act, page, bounds, dpi)


def coordinates():
    a = ['A-1 A-2 A-3 A-4 A-5 A-6a', 'A-6b A-6c A-6d A-6e A-7 A-8',
         'A-9 A-10 A-11 A-11a A-12a A-12b', 'A-12c A-13 A-14 A-15 A-16 A-17',
         'A-18a A-18b A-19 A-20 A-21 A-22', 'A-23 A-24 A-25 A-26 A-27 A-28',
         'A-29 A-30 A-31 A-32 A-33 A-34']
    for r, codes in enumerate(a):
        row(41, codes, 86, 151 + r * 110, 98, 110)
    b = ['B-1 B-2 B-3 B-3a B-4 B-5 B-6', 'B-7 B-8 B-9 B-10 B-11 B-12 B-13',
         'B-13a B-14 B-15 B-16 B-17 B-18 B-19', 'B-20 B-21 B-22 B-23 B-24 B-25 B-26',
         'B-27 B-28 B-29 B-30 B-31 B-32 B-33', 'B-34 B-35 B-36 B-37 B-38 B-39 B-40',
         'B-41 B-42 B-43 B-44']
    for r, codes in enumerate(b):
        row(42, codes, 84, 125 + r * 111, 80, 111)
    for r, codes in enumerate(['C-1 C-2 C-3 C-4 C-5 C-6', 'C-7 C-8 C-9 C-10 C-11 C-12',
                               'C-13 C-13a C-14 C-15 C-16 C-16a']):
        row(43, codes, 89, 121 + r * 107, 94, 107)
    box('C-17', 43, (90, 442, 180, 568))
    box('C-18', 43, (231, 442, 310, 550))
    box('C-19', 43, (325, 442, 405, 550))
    for codes, top, height in [
        ('D-1 D-2 D-3 D-4a D-4b D-5 D-6 D-6a', 118, 83),
        ('D-6b D-7 D-8 D-9 D-10 D-11 D-12 D-13', 201, 91),
        ('D-13a D-14 D-15 D-16 D-17 D-18 D-18a D-18b', 295, 92),
        ('_ D-21 D-21a D-22 D-23 D-23a D-24 D-25', 390, 93),
        ('D-26 D-26a D-26b D-26c D-26d D-27 D-28 D-29', 487, 89),
        ('D-30 D-31 D-32 D-33 D-34 D-34a D-35 D-35a', 580, 92),
    ]:
        row(44, codes, 86, top, 70.5, height)
    box('D-19', 44, (89, 390, 154, 439))
    box('D-20', 44, (89, 440, 154, 484))
    for code, bounds in [('D-36', (89, 705, 155, 756)), ('D-36a', (160, 705, 226, 756)),
                         ('D-37', (89, 756, 155, 843)), ('D-38', (160, 756, 226, 843)),
                         ('D-39a', (446, 677, 648, 870))]:
        box(code, 44, bounds)
    row(44, 'D-40 D-41 D-42 D-43 D-44 D-45', 86, 870, 94, 77)
    row(45, 'D-46 D-47 D-48 D-49 D-50 D-51 D-51a', 80, 91, 81, 95)
    for code, bounds in [('D-51b', (85, 190, 164, 290)), ('D-52', (174, 190, 268, 290)),
                         ('D-53', (278, 190, 360, 290)), ('D-54', (373, 190, 447, 290)),
                         ('D-55', (454, 190, 527, 290))]:
        box(code, 45, bounds)
    for codes, top, height in [
        ('T-1 T-1a T-1b T-2 T-3 T-3a', 120, 57),
        ('T-4 T-5 T-6a T-6b T-6c T-6d', 190, 96),
        ('T-7 T-8 T-9 T-10 T-11 T-12', 297, 126),
        ('T-13 T-14 T-15 T-16 T-17 T-18', 430, 118),
    ]:
        row(49, codes, 80, top, 98, height)
    row(49, 'T-19 T-20 T-21 _ T-23a T-23b T-23c', 80, 576, 84, 96)
    row(49, 'T-23d T-23e T-23f T-23g T-23h T-23i T-23j', 80, 678, 84, 91)
    row(49, 'T-24 T-25a T-25b T-25c T-26 T-27 T-28 T-29', 80, 782, 73.5, 95)
    row(50, 'T-30 T-31 T-32 T-33 T-34', 106, 92, 109, 76)
    # These rows are not equal-width grids. Explicit bounds avoid neighbouring
    # signs leaking into a thumbnail (especially the wide T-11/T-17/T-28).
    for page, top, bottom, cells in [
        (45, 91, 186, [('D-46',82,168),('D-47',179,265),('D-48',273,342),('D-49',350,420),('D-50',427,494),('D-51',505,576),('D-51a',593,661)]),
        (49,297,423,[('T-7',82,160),('T-8',186,259),('T-9',275,343),('T-10',357,428),('T-11',440,571),('T-12',585,664)]),
        (49,430,548,[('T-13',82,162),('T-14',177,263),('T-15',275,359),('T-16',376,460),('T-17',478,587),('T-18',609,664)]),
        (49,576,672,[('T-19',82,180),('T-20',185,264),('T-21',275,353),('T-23a',450,519),('T-23b',523,588),('T-23c',592,664)]),
        (49,678,769,[('T-23d',82,163),('T-23e',176,243),('T-23f',260,326),('T-23g',343,408),('T-23h',428,493),('T-23i',516,585),('T-23j',592,664)]),
        (49,782,877,[('T-24',82,155),('T-25a',166,203),('T-25b',204,241),('T-25c',263,302),('T-26',320,390),('T-27',415,484),('T-28',488,582),('T-29',590,664)]),
        (50,92,168,[('T-30',107,195),('T-31',207,280),('T-32',292,418),('T-33',431,552),('T-34',569,641)]),
    ]:
        for code, left, right in cells:
            box(code, page, (left, top, right, bottom))
    box('D-43', 44, (355, 870, 437, 950))
    box('D-45', 44, (578, 870, 641, 968))
    # New/replaced official artwork: reference render at 110 dpi.
    box('D-23b', 3, (144, 312, 350, 594), '2021/2065', 110)
    box('D-23c', 3, (144, 596, 350, 869), '2021/2065', 110)
    box('D-34b', 3, (140, 871, 344, 1147), '2021/2065', 110)
    box('D-39', 2, (109, 158, 330, 442), '2022/2372', 110)


def build():
    coordinates()
    pdfs = {act: pdfplumber.open(io.BytesIO(source(act))) for act in ACTS}
    names = {}
    for page in pdfs[ACTS[0]].pages[28:38]:
        text = re.sub(r'(?<=\w)-\n(?=\w)', '', page.extract_text() or '')
        text = re.sub(r'\s+', ' ', text)
        for code, name in re.findall(r'\d+[a-z]?\) ([ABCD]-\d+[a-z]?) „([^”]+)”', text):
            names[code] = name
        for code, name in re.findall(r'\d+[a-z]?\) (T-\d+[a-z]?) (.*?);', text):
            names[code] = name.strip('„”')
    # Explicit changes to names in the four reviewed amending acts.
    updates = {
        'B-19': 'zakaz wjazdu pojazdów o nacisku pojedynczej osi napędowej powyżej ..... t',
        'D-23b': 'stacja paliwowa z punktem ładowania pojazdów elektrycznych lub hybrydowych',
        'D-23c': 'punkt ładowania pojazdów elektrycznych lub hybrydowych',
        'D-34b': 'zbiorcza tablica informacyjna',
        'D-44': 'strefa płatnego parkowania lub śródmiejska strefa płatnego parkowania',
        'D-45': 'koniec strefy płatnego parkowania lub śródmiejskiej strefy płatnego parkowania',
        'T-1a': 'tabliczka wskazująca odległość znaku informacyjnego do początku (końca) drogi, odcinka drogi, pasa ruchu lub obiektu',
        'T-32': 'tabliczka wskazująca minimalny odstęp od poprzedzającego pojazdu po zatrzymaniu',
    }
    names.update(updates)
    expected = {code for code in names if code != 'T-22'}
    if expected != set(BOXES):
        raise ValueError(f'Missing artwork {sorted(expected-set(BOXES))}; extra {sorted(set(BOXES)-expected)}')
    out = ROOT / 'assets' / 'signs'
    out.mkdir(parents=True, exist_ok=True)
    renders, entries = {}, []
    for code, (act, page, bounds, dpi) in BOXES.items():
        key = (act, page)
        if key not in renders:
            renders[key] = pdfs[act].pages[page-1].to_image(resolution=240).original
        crop = renders[key].crop(tuple(round(x*240/dpi) for x in bounds))
        crop.thumbnail((360, 360))
        crop.save(out / f'{code}.webp', 'WEBP', quality=92)
        entries.append(dict(code=code, name=names[code], group=code[0],
                            source=f'https://eli.gov.pl/eli/DU/{act}/ogl', sourcePage=page))
    entries.sort(key=lambda x: (x['group'], int(re.search(r'\d+', x['code'])[0]), x['code']))
    provenance = [dict(act=act, sha256=hashlib.sha256(source(act)).hexdigest()) for act in ACTS]
    version = hashlib.sha256(json.dumps([entries, provenance], ensure_ascii=False).encode()).hexdigest()
    (ROOT / 'assets/data/road-signs.json').write_text(json.dumps(dict(version=version, sources=provenance, entries=entries), ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    # Static requires are necessary for Metro asset discovery.
    manifest = '// Generated by scripts/import_road_signs.py; do not edit.\nexport const signImages: Record<string, number> = {\n'
    manifest += ''.join(f'  "{item["code"]}": require("../../assets/signs/{item["code"]}.webp"),\n' for item in entries)
    (ROOT / 'src/constants/sign-images.ts').write_text(manifest+'};\n', encoding='utf-8')
    links = []
    with sqlite3.connect(f'file:{ROOT / "assets/database/questions.db"}?mode=ro', uri=True) as db:
        for question_id, question, filename in db.execute('SELECT id, question, media_filename FROM questions'):
            found = {}
            for match in re.finditer(r'(?<![A-Za-z0-9])([ABCDT])\s*[-–]\s*(\d+[a-z]?)(?![A-Za-z0-9])', question):
                found[f'{match[1]}-{match[2]}'] = 'question-code'
            for match in re.finditer(r'(?<![A-Z0-9])([ABCDT])[-–](\d+)([a-z]?)(?=$|[\s_().-]|org|zT)', filename or ''):
                found.setdefault(f'{match[1]}-{match[2]}{match[3]}', 'media-filename-code')
            for code, evidence in found.items():
                if code in BOXES:
                    links.append(dict(questionId=question_id, code=code, evidence=evidence))
    link_version = hashlib.sha256(json.dumps(links, sort_keys=True).encode()).hexdigest()
    (ROOT / 'assets/data/question-signs.json').write_text(json.dumps(dict(version=link_version, entries=links), indent=2)+'\n', encoding='utf-8')
    montage = Image.new('RGB', (900, ((len(entries)+7)//8)*110), 'white')
    draw = ImageDraw.Draw(montage)
    for i, item in enumerate(entries):
        thumb = Image.open(out / f'{item["code"]}.webp')
        thumb.thumbnail((104, 86))
        x, y = (i % 8)*112, (i//8)*110
        montage.paste(thumb, (x+(104-thumb.width)//2, y))
        draw.text((x+8, y+88), item['code'], fill='black')
    montage.save(CACHE / 'catalog-review.png')
    print(f'{len(entries)} signs; {len(links)} evidenced links; {sum(p.stat().st_size for p in out.glob("*.webp"))} asset bytes', flush=True)


def source(act, kind='pdf'):
    CACHE.mkdir(parents=True, exist_ok=True)
    target = CACHE / (act.replace('/', '-') + '.' + kind)
    if not target.exists():
        url = f'https://eli.gov.pl/api/acts/DU/{act}/text.{kind}'
        with urllib.request.urlopen(url, timeout=60) as response:
            target.write_bytes(response.read())
    return target.read_bytes()


def inspect():
    for act in ACTS:
        with pdfplumber.open(io.BytesIO(source(act))) as pdf:
            print(act, len(pdf.pages), flush=True)
            if act == ACTS[0]:
                for index in [40, 43, 48, 49]:
                    page = pdf.pages[index]
                    print('PAGE', index + 1, page.extract_text(), flush=True)
                    print('IMAGES', len(page.images), [dict(x0=x['x0'], top=x['top'], x1=x['x1'], bottom=x['bottom']) for x in page.images][:5], flush=True)
                    print('WORDS', [(w['text'], round(w['x0']), round(w['top'])) for w in page.extract_words() if re.fullmatch(r'[ABCDT]-\d+[a-z]?', w['text'])][:8], flush=True)
                pdf.pages[40].to_image(resolution=110).save(str(CACHE / 'page-41.png'))
            else:
                print('\n'.join(p.extract_text() or '' for p in pdf.pages), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--inspect', action='store_true')
    args = parser.parse_args()
    if args.inspect:
        inspect()
    else:
        build()
