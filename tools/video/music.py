# Videolar uchun original fon musiqasi va ovoz effektlari (to'liq sintez, mualliflik huquqisiz)
import sys, json, wave
import numpy as np

SR = 44100
rng = np.random.default_rng(7)

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)

def env_adsr(n, a, r):
    e = np.ones(n)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e

def iir1(x, a, b):
    # y[n] = b*x[n] + a*y[n-1]
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc = b * x[i] + a * acc; y[i] = acc
    return y

def reverb(x, sec=2.4, wet=0.28):
    n = int(sec * SR)
    t = np.arange(n) / SR
    out = np.empty_like(x)
    for ch in range(2):
        ir = rng.standard_normal(n) * np.exp(-t * 3.2)
        ir = iir1(ir, np.exp(-2*np.pi*5000/SR), 1-np.exp(-2*np.pi*5000/SR))
        ir /= np.sqrt(np.sum(ir ** 2))
        L = len(x[:, ch]) + n - 1; N = 1 << (L - 1).bit_length()
        y = np.fft.irfft(np.fft.rfft(x[:, ch], N) * np.fft.rfft(ir, N), N)[:len(x)]
        out[:, ch] = (1 - wet) * x[:, ch] + wet * y
    return out

PROG = {
    'kristall': [[48, 55, 64, 71], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 64]],   # Cmaj7 Am7 Fmaj7 G6
    'fermi':    [[45, 52, 60, 64], [41, 48, 57, 60], [48, 55, 60, 64], [43, 50, 55, 59]],   # Am F C G
    'pn1':      [[50, 57, 64, 65], [46, 53, 62, 69], [41, 48, 57, 60], [48, 55, 64, 67]],   # Dm9 Bbmaj7 F C
    'pn2':      [[40, 47, 55, 64], [36, 43, 52, 60], [43, 50, 59, 62], [38, 45, 54, 62]],   # Em C G D
}

def music(dur, prog, bpm=88):
    n = int(dur * SR); beat = 60 / bpm; bar = 4 * beat
    mix = np.zeros((n, 2)); dry = np.zeros((n, 2))
    nbars = int(np.ceil(dur / bar)) + 1
    for b in range(nbars):
        ch = prog[b % len(prog)]; t0 = b * bar
        i0 = int(t0 * SR); m = int((bar + 0.6) * SR)
        if i0 >= n: break
        m = min(m, n - i0); t = np.arange(m) / SR
        # pad: biroz farqli sozlangan uchta ovoz, yumshoq garmonikalar
        pad = np.zeros(m)
        for note in ch[1:]:
            f = mtof(note)
            for det in (-0.12, 0.0, 0.11):
                ff = f * 2 ** (det / 12)
                for h, amp in ((1, 1), (2, .35), (3, .15), (4, .06)):
                    pad += amp * np.sin(2 * np.pi * ff * h * t + rng.uniform(0, 6.28))
        pad *= env_adsr(m, 0.9, 0.7) * 0.016
        mix[i0:i0+m, 0] += pad; mix[i0:i0+m, 1] += pad
        # bas
        for k, off in enumerate((0, 2 * beat, 3.5 * beat)):
            j0 = int((t0 + off) * SR)
            if j0 >= n: continue
            L = min(int(1.4 * SR), n - j0); tt = np.arange(L) / SR
            f = mtof(ch[0] - 12 if ch[0] > 43 else ch[0])
            s = np.tanh(1.6 * np.sin(2 * np.pi * f * tt)) * np.exp(-tt * (2.2 if k < 2 else 5)) * env_adsr(L, 0.01, 0.05)
            g = 0.16 if b >= 1 else 0.0
            dry[j0:j0+L] += (s * g)[:, None]
        # arpedjio (8-lik notalar), stereo ping-pong
        tones = [ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 24, ch[3] + 12, ch[2] + 12, ch[1] + 24, ch[3] + 12]
        for k in range(8):
            j0 = int((t0 + k * beat / 2) * SR)
            if j0 >= n: continue
            L = min(int(0.9 * SR), n - j0); tt = np.arange(L) / SR; f = mtof(tones[k])
            s = (np.sin(2*np.pi*f*tt) + 0.25*np.sin(2*np.pi*2*f*tt) + 0.08*np.sin(2*np.pi*3*f*tt)) * np.exp(-tt * 5.5) * env_adsr(L, 0.004, 0.05)
            g = 0.05 if b >= 1 else 0.035; pan = 0.3 if k % 2 else -0.3
            mix[j0:j0+L, 0] += s * g * (1 - pan); mix[j0:j0+L, 1] += s * g * (1 + pan)
        # ritm: 2-taktdan boshlab yumshoq kik va xet
        if b >= 2:
            for k in (0, 2):
                j0 = int((t0 + k * beat) * SR)
                if j0 >= n: continue
                L = min(int(0.35 * SR), n - j0); tt = np.arange(L) / SR
                ph = 2 * np.pi * np.cumsum(45 + 80 * np.exp(-tt * 30)) / SR
                dry[j0:j0+L] += (np.sin(ph) * np.exp(-tt * 14) * 0.32)[:, None]
            for k in range(8):
                if k % 2 == 0: continue
                j0 = int((t0 + k * beat / 2) * SR)
                if j0 >= n: continue
                L = min(int(0.08 * SR), n - j0); tt = np.arange(L) / SR
                nz = np.diff(rng.standard_normal(L + 1)) * np.exp(-tt * 55) * 0.022
                dry[j0:j0+L, 0] += nz * 0.8; dry[j0:j0+L, 1] += nz * 1.2
    wet = reverb(mix)
    out = wet + dry
    # boshlanish va tugashda silliq o'tish
    fi, fo = int(1.2 * SR), int(3.0 * SR)
    out[:fi] *= np.linspace(0, 1, fi)[:, None]; out[-fo:] *= np.linspace(1, 0, fo)[:, None]
    return out

def whoosh(L=0.75):
    m = int(L * SR); t = np.arange(m) / SR
    nz = rng.standard_normal((m, 2))
    # vaqt bo'yicha o'zgaruvchan filtr: past chastotadan yuqoriga va qaytib
    out = np.zeros((m, 2))
    for ch in range(2):
        y = np.zeros(m); acc = 0.0
        fc = 300 + 3800 * np.sin(np.pi * t / L) ** 2
        a = np.exp(-2 * np.pi * fc / SR)
        x = nz[:, ch]
        for i in range(m):
            acc = (1 - a[i]) * x[i] + a[i] * acc; y[i] = acc
        out[:, ch] = y
    e = np.sin(np.pi * t / L) ** 3
    pan = np.linspace(-0.6, 0.6, m)
    out[:, 0] *= e * (1 - pan); out[:, 1] *= e * (1 + pan)
    return out * 0.55

def chime():
    m = int(2.5 * SR); t = np.arange(m) / SR; s = np.zeros(m)
    for f0, d in ((1046.5, 0), (1568.0, 0.12)):
        j = int(d * SR); tt = t[:m - j]
        for r, a, dec in ((1, 1, 2.2), (2.76, .4, 4), (5.4, .15, 7)):
            s[j:] += a * np.sin(2 * np.pi * f0 * r * tt) * np.exp(-tt * dec)
    return np.stack([s, s], 1) * 0.06

def load(f):
    import subprocess
    r = subprocess.run(['ffmpeg','-loglevel','error','-i',f,'-f','f32le','-ac','2','-ar',str(SR),'-'],capture_output=True)
    return np.frombuffer(r.stdout, np.float32).reshape(-1, 2).astype(float)

def main(name, meta_path, out_wav):
    meta = json.load(open(meta_path)); dur = meta['dur']
    mus = music(dur, PROG[name])
    sfx = np.zeros_like(mus)
    w = whoosh(); c = chime()
    for ev in meta['events']:
        if ev['type'] == 'card':
            j = int((ev['t'] + 0.35) * SR); L = min(len(c), len(sfx) - j)
            if L > 0: sfx[j:j+L] += c[:L]
        if ev['t'] > 0:
            j = int(max(0, ev['t'] - 0.45) * SR); L = min(len(w), len(sfx) - j)
            if L > 0: sfx[j:j+L] += w[:L]
    mus = mus / (np.max(np.abs(mus)) + 1e-9) * 0.72
    # o'zbekcha ovoz va musiqani pasaytirish (ducking)
    vo = np.zeros_like(mus); act = np.zeros(len(mus))
    if len(sys.argv) > 4:
        lines = json.load(open(sys.argv[4]))[name]
        for st, ln in zip(meta['starts'], lines):
            v = load(ln['file']); v = v / (np.max(np.abs(v)) + 1e-9) * 0.95
            j = int((st['t'] + st['lead']) * SR); L = min(len(v), len(vo) - j)
            if L > 0: vo[j:j+L] += v[:L]; act[j:j+L] = 1
    # silliq ducking egri chizig'i (0,25 s hujum, 0,6 s qaytish)
    def box(x, w):
        c = np.cumsum(np.concatenate([np.zeros(w), x, np.zeros(w)]))
        return (c[2*w:] - c[:-2*w])[:len(x)] / (2 * w) if len(c) > 2*w else x
    w = int(0.15 * SR); a2 = box(box(act, w), w)
    duck = 1 - 0.68 * np.clip(a2 * 1.4, 0, 1)
    out = np.tanh((mus * duck[:, None] + sfx * 0.45 + vo * 1.0) * 1.05) * 0.92
    pcm = (out * 32767).astype(np.int16)
    with wave.open(out_wav, 'wb') as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes(pcm.tobytes())

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3])
