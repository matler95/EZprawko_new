"""Create a LOCAL, unpublished compression pilot. Originals/archives are never changed.

python scripts/prepare-media-pilot.py --output .media-pilot/run1 --archives A.zip B.zip
Ambiguous archive entries are skipped rather than guessing which file belongs to a question.
"""
import argparse
import hashlib
import json
import subprocess
import unicodedata
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run(args):
    return subprocess.run(args, check=True, capture_output=True, timeout=120)


def probe(filename):
    data = json.loads(run(['ffprobe', '-v', 'error', '-count_frames', '-show_streams',
                           '-show_format', '-of', 'json', str(filename)]).stdout)
    video = next(s for s in data['streams'] if s['codec_type'] == 'video')
    return {'width': video['width'], 'height': video['height'],
            'frames': int(video.get('nb_read_frames', 0)),
            'duration': float(video.get('duration') or data.get('format', {}).get('duration') or 0),
            'audioStreams': sum(s['codec_type'] == 'audio' for s in data['streams'])}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    parser.add_argument('--archives', nargs='+', required=True)
    args = parser.parse_args()
    output = Path(args.output).resolve()
    if not output.is_relative_to(ROOT) or output == ROOT or output.exists():
        raise ValueError('Output must be a NEW directory inside the workspace')
    archives = [Path(p).resolve() for p in args.archives]
    baseline = json.loads((ROOT / 'docs/MEDIA_SIZE_BASELINE.json').read_text(encoding='utf-8'))
    # Largest delivered images/video plus detailed sign and a typical image/video.
    keys = [r['key'] for r in baseline['largest'][:7]]
    keys += [r['key'] for r in baseline['largest'] if r['key'].startswith('wideo/')][:3]
    delivery = json.loads((ROOT / 'assets/data/media-delivery.json').read_text(encoding='utf-8'))
    for prefix in ('zdjecia/', 'wideo/'):
        ordinary = [k for k, size in delivery['sizes'].items() if k.startswith(prefix) and 500000 <= size <= 750000]
        if ordinary:
            keys.append(sorted(ordinary)[0])
    keys = list(dict.fromkeys(keys))
    index = {}
    for archive_path in archives:
        with zipfile.ZipFile(archive_path) as archive:
            for item in archive.infolist():
                if item.is_dir():
                    continue
                name = unicodedata.normalize('NFC', item.filename.rsplit('/', 1)[-1])
                index.setdefault(name, []).append((archive_path, item.filename, item.CRC, item.file_size))
    output.mkdir(parents=True)
    originals = output / 'originals'
    candidates = output / 'candidates'
    originals.mkdir()
    candidates.mkdir()
    result = {'published': False, 'phoneQualityReview': 'pending', 'profiles': {
        'image': 'JPEG q=2, width <=1600, no crop/upscale',
        'video': 'H.264 CRF23, width <=1280, original frame cadence, AAC128k, faststart'}, 'records': []}
    for key in keys:
        delivered_name = key.rsplit('/', 1)[-1]
        source_name = delivered_name[:-4] + '.wmv' if key.startswith('wideo/') else delivered_name
        matches = index.get(source_name, [])
        if not matches or len({(m[2], m[3]) for m in matches}) > 1:
            result['records'].append({'key': key, 'status': 'missingOrAmbiguousSource'})
            continue
        archive_path, entry, _, source_size = matches[0]
        source = originals / source_name
        with zipfile.ZipFile(archive_path) as archive:
            source.write_bytes(archive.read(entry))
        target = candidates / delivered_name
        is_video = key.startswith('wideo/')
        before = probe(source)
        options = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-n', '-i', str(source)]
        if is_video:
            options += ['-map', '0:v:0', '-map', '0:a?', '-vf', "scale=w='min(1280,iw)':h=-2",
                        '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p',
                        '-fps_mode', 'passthrough', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart']
        else:
            options += ['-vf', "scale=w='min(1600,iw)':h=-2", '-frames:v', '1', '-q:v', '2']
        run(options + [str(target)])
        after = probe(target)
        consistent = (not is_video or (before['frames'] == after['frames'] and
                       abs(before['duration'] - after['duration']) <= 0.2 and
                       before['audioStreams'] == after['audioStreams']))
        # Extract both final frames for a human review. No trimming of the actual video.
        if is_video:
            for filename, suffix in ((source, 'source'), (target, 'candidate')):
                frame_count = probe(filename)['frames']
                run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-n', '-i', str(filename),
                     '-vf', 'select=eq(n' + chr(92) + f',{frame_count - 1})', '-frames:v', '1',
                     str(candidates / (delivered_name + '.' + suffix + '-last.png'))])
        status = 'timelineMismatch' if not consistent else 'largerThanDelivery' if target.stat().st_size >= delivery['sizes'][key] else 'reviewRequired'
        result['records'].append({'key': key, 'status': status,
            'sourceBytes': source_size, 'currentlyDeliveredBytes': delivery['sizes'][key],
            'candidateBytes': target.stat().st_size,
            'savingVsDelivered': 1 - target.stat().st_size / delivery['sizes'][key],
            'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'sourceMetadata': before,
            'candidateMetadata': after, 'candidateKey': key.split('/')[0] + '/mobile-v1/' + delivered_name})
    (output / 'report.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (ROOT / 'docs/MEDIA_COMPRESSION_PILOT.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'output': str(output), 'published': False,
                      'records': [{k: v for k, v in r.items() if k in ('key', 'status', 'candidateBytes', 'savingVsDelivered')}
                                  for r in result['records']]}, ensure_ascii=True, indent=2))


if __name__ == '__main__':
    main()
