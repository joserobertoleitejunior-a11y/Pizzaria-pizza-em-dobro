"""Trilha original dos vídeos (pop/house leve e alegre, 120 bpm, Dó maior), sem direitos autorais.
Uso: python3 scripts/gerar-musica-video.py video/musica-X.mp3 DURACAO_EM_SEGUNDOS
Precisa de numpy e imageio-ffmpeg. Camadas: bumbo, palma, hi-hat, baixo funkeado, piano elétrico (FM), arpejo "sino" e pad."""
import sys, wave, os, tempfile, subprocess, numpy as np
SR = 44100
saida, DUR = sys.argv[1], float(sys.argv[2])
BEAT = 0.5; BAR = 2.0; S16 = BEAT / 4
NB = int(np.ceil(DUR / BAR))
N = int(SR * (NB * BAR + 3))
rng = np.random.default_rng(11)
L = np.zeros(N); R = np.zeros(N)
side = np.ones(N)                     # "sidechain": os instrumentos abaixam no bumbo

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def put(x, t, g=1.0, pan=0.0, bus=None):
    i = int(t * SR)
    if i >= N: return
    x = x[: N - i] * g
    (L if bus is None else bus[0])[i:i + len(x)] += x * (1 - pan) / 2 * 1.4
    (R if bus is None else bus[1])[i:i + len(x)] += x * (1 + pan) / 2 * 1.4
def env(n, a, d): t = np.arange(n) / SR; return (1 - np.exp(-t / a)) * np.exp(-t / d)

def kick():
    n = int(SR * .35); t = np.arange(n) / SR
    f = 48 + 110 * np.exp(-t * 28); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 9) * 1.2 + (rng.standard_normal(n) * np.exp(-t * 300)) * .15
def clap():
    n = int(SR * .22); t = np.arange(n) / SR; x = rng.standard_normal(n)
    x = x - np.convolve(x, np.ones(18) / 18, 'same')       # passa-alta
    e = np.exp(-t * 26) * (1 + .8 * np.exp(-((t * 1000) % 11) / 3)); return x * e * .5
def hat(a=1.0, aberto=False):
    n = int(SR * (.22 if aberto else .05)); t = np.arange(n) / SR; x = np.diff(rng.standard_normal(n + 1))
    return x * np.exp(-t * (18 if aberto else 90)) * .35 * a
def baixo(f, d=.42):
    n = int(SR * d); t = np.arange(n) / SR
    saw = 2 * ((f * t) % 1) - 1; y = np.sin(2 * np.pi * f * t) * .8 + saw * .25
    return y * env(n, .004, .22) * (1 - np.exp(-(d - t) * 40) * 0)
def epiano(f, d=.5):
    n = int(SR * d); t = np.arange(n) / SR; e = np.exp(-t * 5.5)
    return (np.sin(2 * np.pi * f * t + 1.8 * e * np.sin(2 * np.pi * f * 2 * t)) * .7 + np.sin(2 * np.pi * f * 4 * t) * .12 * e) * env(n, .003, .5)
def sino(f, d=.5):
    n = int(SR * d); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + .45 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 14) + .3 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 25)) * env(n, .002, .2)
def pad(freqs, d):
    n = int(SR * d); t = np.arange(n) / SR; y = 0
    for f in freqs: y = y + np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 1.004 * t + 1)
    return y / len(freqs) * np.minimum(1, t / .6) * np.minimum(1, (d - t) / .4)

# Dó maior: Cmaj7 | Am7 | Fmaj7 | G6
ACORDES = [(48, [60, 64, 67, 71]), (45, [57, 60, 64, 67]), (41, [57, 60, 65, 69]), (43, [59, 62, 67, 71])]
ARP = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 3, 2, 1, 2]
K = kick(); CL = clap()
bus_i = (np.zeros(N), np.zeros(N))   # instrumentos (recebem sidechain)
for b in range(NB):
    t0 = b * BAR; raiz, ac = ACORDES[b % 4]
    sec = 0 if b < 1 else (1 if b < 3 else 2)          # intro leve → groove → cheio
    ultimo = b >= NB - 1
    if sec >= 0: put(pad([hz(n) for n in ac], BAR + .3), t0, .20, 0, bus_i)
    for k in range(16):
        t = t0 + k * S16
        if sec >= 1 and k % 4 == 0 and not ultimo: put(K, t, .9); side[int(t * SR):int((t + .22) * SR)] *= np.linspace(.35, 1, int(.22 * SR))[: len(side[int(t * SR):int((t + .22) * SR)])]
        if sec >= 1 and k in (4, 12) and not ultimo: put(CL, t, .55, .1)
        if sec >= 1: put(hat(1.0 if k % 4 == 2 else .55, k % 4 == 2), t, .6, .25)
        if sec >= 1 and k in (0, 6, 10, 14): put(baixo(hz(raiz + (0 if k != 14 else 12))), t, .75, 0, bus_i)
        if sec >= 1 and k in (2, 5, 10, 13): put(epiano(hz(ac[(k // 2) % 4] + 0)), t, .42, -.2, bus_i)
        if sec >= 2 or (b % 4 >= 2 and sec >= 1):
            put(sino(hz(ac[ARP[k]] + 12), .45), t, .30, .3 if k % 2 else -.3, bus_i)
    if b == 0:  # pontos de entrada: risers
        pass
# acorde final
tf = (NB - 1) * BAR
put(K, tf, 1.0); put(epiano(hz(60), 1.6), tf, .6, -.2, bus_i); put(epiano(hz(64), 1.6), tf, .5, .2, bus_i); put(epiano(hz(67), 1.6), tf, .5, 0, bus_i)
put(sino(hz(84), 1.6), tf, .4, .3, bus_i); put(baixo(hz(36), 1.4), tf, .8, 0, bus_i)
L += bus_i[0] * side; R += bus_i[1] * side
# "sala": ecos curtos
for d, g in ((.09, .22), (.19, .15), (.31, .10)):
    k = int(d * SR); L[k:] += R[:-k] * g; R[k:] += L[:-k] * g
t = np.arange(N) / SR
fade = np.clip(t / .8, 0, 1) * np.clip((DUR - t) / 1.4, 0, 1)
st = np.stack([L * fade, R * fade], 1)
st = np.tanh(st * 1.2); st = st / np.abs(st).max() * .88
pcm = (st[: int(SR * DUR)] * 32767).astype('<i2')
import imageio_ffmpeg
tmp = tempfile.mktemp(suffix='.wav')
with wave.open(tmp, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-loglevel', 'error', '-i', tmp, '-b:a', '192k', saida], check=True)
os.remove(tmp); print('ok', saida, DUR)
