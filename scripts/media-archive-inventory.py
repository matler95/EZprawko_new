"""Read ZIP central-directory metadata only; no extraction, decoding or writes."""
import json
import sys
import zipfile
from pathlib import Path

entries = []
for filename in sys.argv[1:]:
    with zipfile.ZipFile(filename) as archive:
        for item in archive.infolist():
            if not item.is_dir():
                entries.append({"archive": Path(filename).name, "path": item.filename,
                                "filename": item.filename.rsplit("/", 1)[-1],
                                "size": item.file_size, "crc": item.CRC})
print(json.dumps(entries, ensure_ascii=True))
