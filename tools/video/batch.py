# Videolar nutqini foydalanuvchi ovoziga o'tkazish + tozalash; natija: voice_user.json
import json, os, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__))
names = sys.argv[1:]
src = json.load(open(os.path.join(here, 'voice_sardor_expr.json')))
outj = os.path.join(here, 'voice_user.json')
res = json.load(open(outj)) if os.path.exists(outj) else {}
pairs = []
for n in names:
    for i, it in enumerate(src[n]):
        raw = os.path.join(here, 'out', f'{n}_{i:02d}_raw.wav')
        if not os.path.exists(raw): pairs += [it['file'], raw]
if pairs:
    subprocess.run([sys.executable, os.path.join(here, 'convert.py'), os.path.join(here, os.environ.get('REF','ref15.wav'))] + pairs, check=True)
for n in names:
    res[n] = []
    for i, it in enumerate(src[n]):
        raw = os.path.join(here, 'out', f'{n}_{i:02d}_raw.wav'); cl = os.path.join(here, 'out', f'{n}_{i:02d}.wav')
        subprocess.run([os.path.join(here, 'clean.sh'), raw, cl], check=True)
        d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', cl], capture_output=True, text=True).stdout)
        res[n].append({'file': cl, 'dur': d})
    json.dump(res, open(outj, 'w'), indent=1); print('tayyor:', n, flush=True)
