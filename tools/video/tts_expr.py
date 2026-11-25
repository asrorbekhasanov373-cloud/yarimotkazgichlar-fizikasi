# Ifodali o'qish: har bir GAP butunligicha sintez qilinadi (ohang uzilmaydi);
# *atama* bor gaplar sekinroq va balandroq ohangda; gaplar orasida tabiiy pauza.
import json, subprocess, os, re, sys
import numpy as np
SR = 24000
voice, src, out_json = sys.argv[1], sys.argv[2], sys.argv[3]
env = dict(os.environ, SSL_CERT_FILE='/root/.ccr/ca-bundle.crt')

def synth(text, rate, pitch, vol, f):
    for _ in range(3):
        r = subprocess.run(['edge-tts', '--proxy', os.environ['HTTPS_PROXY'], '--voice', voice, f'--rate={rate}',
                            f'--pitch={pitch}', f'--volume={vol}', '--text', text, '--write-media', f],
                           env=env, capture_output=True, text=True)
        if r.returncode == 0 and os.path.getsize(f) > 800: break
    pcm = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True).stdout
    x = np.frombuffer(pcm, np.float32).astype(float)
    thr = 0.01 * np.max(np.abs(x)); idx = np.where(np.abs(x) > thr)[0]
    if len(idx): x = x[max(0, idx[0] - int(0.02 * SR)): idx[-1] + int(0.08 * SR)]
    fd = int(0.008 * SR); x[:fd] *= np.linspace(0, 1, fd); x[-fd:] *= np.linspace(1, 0, fd)
    return x

data = json.load(open(src)); res = {}
for name, lines in data.items():
    res[name] = []
    for i, line in enumerate(lines):
        sents = [s for s in re.split(r'(?<=[.!?])\s+', line.strip()) if s]
        parts = []
        for k, s in enumerate(sents):
            emph = '*' in s; txt = s.replace('*', '')
            if txt.endswith('?'): rate, pitch, vol = '-4%', '+8Hz', '+0%'
            elif emph: rate, pitch, vol = '-10%', '+4Hz', '+8%'
            else: rate, pitch, vol = '-5%', ('+2Hz' if k % 2 else '+0Hz'), '+0%'
            if k: parts.append(np.zeros(int(0.36 * SR)))
            parts.append(synth(txt, rate, pitch, vol, 'tmp.mp3'))
        y = np.concatenate(parts); y = y / (np.max(np.abs(y)) + 1e-9) * 0.95
        f = os.path.abspath(f'expr_{name}_{i:02d}.wav')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'f64le', '-ar', str(SR), '-ac', '1', '-i', '-', f], input=y.tobytes())
        res[name].append({'file': f, 'dur': len(y) / SR}); print(name, i, len(sents), 'gap', round(len(y) / SR, 2))
json.dump(res, open(out_json, 'w'), indent=1)
