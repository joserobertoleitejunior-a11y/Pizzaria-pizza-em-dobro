"""Gera a trilha original (tarantela alegre, 6/8, mandolim + acordeão + baixo + pandeiro) do vídeo de promoções.
Uso: python3 scripts/gerar-musica-video.py video/musica-promocoes.mp3   (precisa de numpy e do ffmpeg do imageio-ffmpeg)"""
import sys, subprocess, numpy as np
SR = 44100
BAR = 1.5            # 6/8 com colcheia = 0.25 s
EIGHTH = BAR / 6
BARS = 24
N = int(SR * BAR * BARS) + SR * 2
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def put(sig, t, pan=0.0, g=1.0):
    i = int(t * SR); sig = sig[: N - i] * g
    L[i:i + len(sig)] += sig * (1 - pan) / 2 * 1.4
    R[i:i + len(sig)] += sig * (1 + pan) / 2 * 1.4

def pluck(f, dur=0.45):
    t = np.arange(int(SR * dur)) / SR
    s = sum(a * np.sin(2 * np.pi * f * k * t) for k, a in ((1, 1), (2, .55), (3, .3), (4, .18), (5, .08)))
    return s * np.exp(-t * 9) * (1 - np.exp(-t * 900))

def stab(freqs, dur=0.16):
    t = np.arange(int(SR * dur)) / SR
    s = sum(np.sign(np.sin(2 * np.pi * f * t + .2)) * .5 + np.sin(2 * np.pi * f * t) for f in freqs) / len(freqs)
    return s * np.exp(-t * 16) * (1 - np.exp(-t * 600))

def bass(f, dur=0.5):
    t = np.arange(int(SR * dur)) / SR
    return (np.sin(2 * np.pi * f * t) + .35 * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t * 6) * (1 - np.exp(-t * 400))

def shake(acc):
    n = int(SR * .05); t = np.arange(n) / SR
    x = rng.standard_normal(n); x = np.diff(x, prepend=0)  # passa-alta
    return x * np.exp(-t * 70) * (0.5 + 0.5 * acc)

C = {'C': (48, [60, 64, 67]), 'F': (41, [60, 65, 69]), 'G': (43, [59, 62, 67])}
SC = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79]  # Dó maior
prog = ['C', 'C', 'F', 'C', 'G', 'G', 'C', 'C'] * 3
# frase de 8 compassos em graus da escala (6 colcheias por compasso)
frase_a = [[4,7,4,7,4,7],[4,5,4,2,4,2],[5,8,5,8,5,8],[7,5,4,2,4,0],
           [6,9,6,9,6,9],[8,7,6,5,6,4],[7,4,2,4,7,9],[7,4,4,2,2,0]]
frase_b = [[7,9,7,4,7,9],[7,9,11,9,7,4],[8,10,8,5,8,10],[8,7,5,4,2,4],
           [9,11,9,6,9,11],[9,8,7,6,5,6],[7,9,11,9,7,4],[7,4,2,4,0,0]]
frases = [frase_a, frase_a, frase_b]
for b in range(BARS):
    t0 = b * BAR; ch = prog[b]; root, tri = C[ch]
    mel = frases[b // 8][b % 8]
    for k in range(6):
        t = t0 + k * EIGHTH
        put(shake(1.0 if k % 3 == 0 else 0), t, pan=.5, g=.16)
        if b >= 2:  # mandolim entra no 3º compasso
            put(pluck(hz(SC[mel[k]])), t, pan=-.25, g=.55)
            if k % 3 == 0 and b >= 8: put(pluck(hz(SC[mel[k]] + 12), .3), t + .012, pan=.3, g=.14)
        if k in (1, 2, 4, 5) and b >= 4:  # acordeão em contratempo
            put(stab([hz(n) for n in tri]), t, pan=.35, g=.22)
        if k in (0, 3):  # baixo "oompah"
            put(bass(hz(root if k == 0 else root + 7)), t, g=.5)
# finalização: acorde de Dó no último compasso
tf = (BARS - 1) * BAR
put(stab([hz(n) for n in (60, 64, 67, 72)], .9), tf, g=.5)
put(pluck(hz(72), 1.2), tf, g=.5); put(bass(hz(36), 1.2), tf, g=.6)
# eco curto (sala) e fade
for d, g in ((.11, .28), (.23, .16)):
    k = int(d * SR); L[k:] += R[:-k] * g; R[k:] += L[:-k] * g
fim = BAR * BARS
t = np.arange(N) / SR
env = np.clip(t / 1.2, 0, 1) * np.clip((fim + .8 - t) / 1.2, 0, 1)
st = np.stack([L * env, R * env], 1)
st = st / np.abs(st).max() * 0.85
pcm = (st[: int(SR * (fim + .8))] * 32767).astype('<i2')
import imageio_ffmpeg, wave, tempfile, os
tmp = tempfile.mktemp(suffix='.wav')
with wave.open(tmp, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-loglevel', 'error', '-i', tmp, '-b:a', '160k', sys.argv[1]], check=True)
os.remove(tmp); print('ok', sys.argv[1], round(fim + .8, 1), 's')
