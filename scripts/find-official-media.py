"""Bounded read-only search of official ZIP indexes via HTTP Range. No extraction."""
import io
import hashlib
import json
import re
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = [
    ('https://www.gov.pl/pliki/mi/multimedia_do_pytan.zip', 'multimedia_do_pytan.zip'),
    ('https://www.gov.pl/attachment/10d143bf-9e93-4d82-935d-48c89353d3ce', 'Multimedia_do_pytań_-_cz_2_02042026.zip'),
    ('https://www.gov.pl/pliki/mi/pytania_egzaminacyjne_na_prawo_jazdy_tlumaczenia_migowe_12_2025.zip', 'pytania_egzaminacyjne_na_prawo_jazdy_tlumaczenia_migowe_12_2025.zip'),
]
TARGETS = ['DSC_0055.JPG', '5-9.2021.wmv']

class RemoteZip(io.RawIOBase):
    def __init__(self, url):
        self.url, self.position, self.transferred, self.requests = url, 0, 0, 0
        with urllib.request.urlopen(urllib.request.Request(url, method='HEAD'), timeout=25) as response:
            self.length = int(response.headers['Content-Length'])
            self.modified = response.headers.get('Last-Modified')

    def seekable(self):
        return True

    def tell(self):
        return self.position

    def seek(self, offset, whence=0):
        position = offset if whence == 0 else self.position + offset if whence == 1 else self.length + offset
        if position < 0 or position > self.length:
            raise ValueError('Seek outside archive')
        self.position = position
        return position

    def read(self, size=-1):
        size = min(self.length - self.position, size if size >= 0 else self.length - self.position)
        if size == 0:
            return b''
        if size > 2 * 1024 * 1024 or self.transferred + size > 8 * 1024 * 1024:
            raise ValueError('Archive-index transfer budget exceeded')
        end = self.position + size - 1
        request = urllib.request.Request(self.url, headers={'Range': f'bytes={self.position}-{end}'})
        with urllib.request.urlopen(request, timeout=25) as response:
            expected = f'bytes {self.position}-{end}/{self.length}'
            if response.status != 206 or response.headers.get('Content-Range') != expected:
                raise ValueError('Server did not honor bounded Range; full download refused')
            if response.headers.get('Last-Modified') != self.modified:
                raise ValueError('Archive changed during index read')
            data = response.read(size + 1)
            if len(data) != size:
                raise ValueError('Unexpected Range length')
        self.requests += 1
        self.transferred += size
        self.position += size
        return data

def signature(entries):
    return sorted((entry.filename, entry.file_size, entry.CRC, entry.compress_size) for entry in entries)

reports = []
for url, local_name in SOURCES:
    remote = RemoteZip(url)
    with zipfile.ZipFile(remote) as archive:
        entries = archive.infolist()
    local_path = ROOT / local_name
    local_matches = None
    if local_path.exists():
        with zipfile.ZipFile(local_path) as archive:
            local_matches = signature(entries) == signature(archive.infolist())
    files = [entry for entry in entries if not entry.is_dir()]
    matches = {target: [entry.filename for entry in files if entry.filename.rsplit('/', 1)[-1] == target] for target in TARGETS}
    variants = [entry.filename for entry in files if 'dsc_0055' in entry.filename.lower() or '5-9.2021' in entry.filename.lower()]
    reports.append({'url': url, 'lastModified': remote.modified, 'archiveBytes': remote.length,
                    'indexBytesTransferred': remote.transferred, 'rangeRequests': remote.requests,
                    'fileEntries': len(files), 'centralDirectoryMatchesLocal': local_matches,
                    'exactMatches': matches, 'similarNames': variants,
                    'questionIdNameCandidates': [entry.filename for entry in files if re.search(r'(?<!\d)(11150|13074)(?!\d)', entry.filename)],
                    'fileContentsVerified': False})
source_url = 'https://www.gov.pl/attachment/a5c6c329-28a5-4274-a1a8-e2813f0a51bd'
with urllib.request.urlopen(source_url, timeout=25) as response:
    source_bytes = response.read(2 * 1024 * 1024 + 1)
    if len(source_bytes) > 2 * 1024 * 1024:
        raise ValueError('Source catalog transfer budget exceeded')
source_hash = hashlib.sha256(source_bytes).hexdigest()
local_source = ROOT / 'gov-attachment.xlsx'
catalog = {'url': source_url, 'bytes': len(source_bytes), 'sha256': source_hash,
           'matchesLocalSource': local_source.exists() and hashlib.sha256(local_source.read_bytes()).hexdigest() == source_hash}
print(json.dumps({'archives': reports, 'catalogBinaryIdentity': catalog}, ensure_ascii=True, indent=2))
