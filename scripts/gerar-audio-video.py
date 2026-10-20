"""Áudio dos vídeos Stories: violão de nylon calmo (valsa italiana de pizzaria, com bandolim suave ao fundo) + locução.
Uso: python3 scripts/gerar-audio-video.py roteiro.json saida.mp3
  roteiro.json = {"dur": 31, "falas": [{"t": 0.5, "texto": "Bateu a fome?"}, ...]}   (gerado por scripts/exportar-roteiro.js)
Precisa de: numpy, scipy, imageio-ffmpeg e do Piper (PIPER_DIR com o binário "piper/" e PIPER_VOZ com o .onnx pt-BR).
A música é sintetizada (Karplus-Strong), sem direitos autorais; a voz é sintética (Piper, pt-BR) tratada com EQ, compressão e sala leve."""
import sys, os, json, wave, subprocess, tempfile, numpy as np
from scipy.signal import lfilter, fftconvolve
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
SR = 44100
rot = json.load(open(sys.argv[1])); saida = sys.argv[2]; DUR = float(rot['dur'])
PIPER = os.environ.get('PIPER_DIR', '/tmp/tts/bin') + '/piper/piper'
VOZ = os.environ.get('PIPER_VOZ', '/tmp/tts/voz/pt-br-edresson-low.onnx')
ESCALA = float(os.environ.get('VOZ_ESCALA', '0.88'))   # <1 = fala mais rápida e animada
rng = np.random.default_rng(5)
N = int(SR * (DUR + 3))
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)

# ───────────── violão (Karplus-Strong + corpo) ─────────────
def corda(f, dur, brilho=.5, decaimento=.9965, pos=.18):
    n0 = int(SR / f); g = decaimento
    a = np.zeros(n0 + 2); a[0] = 1; a[n0] = -g / 2; a[n0 + 1] = -g / 2
    ex = rng.standard_normal(n0 + 2)
    for _ in range(int(3 + (1 - brilho) * 5)): ex = (ex + np.roll(ex, 1)) / 2           # ponta do dedo: som mais macio
    p = max(1, int(n0 * pos)); ex = ex - np.roll(ex, p)                                    # posição do toque
    x = np.zeros(int(SR * dur)); x[:len(ex)] = ex
    y = lfilter([1.0], a, x)
    r = (SR / n0) / f                                                                      # acerta a afinação (inteiro do atraso)
    y = np.interp(np.arange(int(len(y) / r)) * r, np.arange(len(y)), y)
    return y / (np.abs(y).max() + 1e-9) * np.minimum(1, np.arange(len(y)) / 40.0)
def nota(bus, t, m, vel=.7, dur=2.2, **k):
    y = corda(hz(m), dur, **k) * vel; i = max(0, int(t * SR))
    if i < len(bus): y = y[: len(bus) - i]; bus[i:i + len(y)] += y
violao = np.zeros(N); bandolim = np.zeros(N)
# acordes (midi, cordas de baixo→agudo) — valsa lenta em Dó
AC = {'C': [48, 52, 55, 60, 64], 'Am': [45, 52, 57, 60, 64], 'Dm': [50, 57, 62, 65], 'G7': [43, 50, 55, 59, 65], 'F': [41, 48, 53, 57, 60], 'E7': [40, 47, 52, 56, 59]}
PROG = ['C', 'Am', 'Dm', 'G7', 'C', 'F', 'G7', 'C', 'Am', 'Dm', 'E7', 'Am', 'F', 'G7', 'C', 'C']
BPM = 96; BEAT = 60 / BPM; BAR = BEAT * 3
nbar = int((DUR + 2) / BAR) + 1
for b in range(nbar):
    ac = AC[PROG[b % len(PROG)]]; t0 = b * BAR
    jit = lambda: rng.normal(0, .006)
    nota(violao, t0 + jit(), ac[0], .85, 2.6)                                  # baixo no 1
    if b % 2 == 0: nota(violao, t0 + BEAT * .02, ac[-1] + 0, .0)              # (respiro)
    for k, idx in enumerate((2, 3, 4)):                                         # dedilhado: agudos
        nota(violao, t0 + BEAT * 1 + k * BEAT / 3 * .98 + jit(), ac[min(idx, len(ac) - 1)], .45 + .1 * k, 1.8)
    nota(violao, t0 + BEAT * 2 + jit(), ac[1], .55, 1.8)                       # segundo baixo
    nota(violao, t0 + BEAT * 2.5 + jit(), ac[3 if len(ac) > 3 else -1], .5, 1.6)
    # bandolim com tremolo só nos finais de frase (suave, ao fundo)
    if b % 4 == 3:
        mel = {'G7': [79, 77, 76], 'C': [76, 74, 72], 'Am': [76, 77, 76], 'Dm': [77, 76, 74], 'E7': [80, 81, 80], 'F': [77, 76, 72]}[PROG[b % len(PROG)]]
        for j, m in enumerate(mel):
            tt = t0 + j * BEAT
            for r in range(5): nota(bandolim, tt + r * .055, m, .13 + .02 * (r % 2), .5, brilho=.8, decaimento=.992)
t = np.arange(int(.9 * SR)) / SR
ir = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, a, d in ((98, 1, 22), (196, .8, 30), (392, .5, 45), (780, .25, 70))) + rng.standard_normal(len(t)) * np.exp(-t * 90) * .15
ir /= np.abs(ir).sum() * .12
corpo = lambda x: fftconvolve(x, ir)[: len(x)]
musica = corpo(violao) * .9 + corpo(bandolim) * .5
tr = np.arange(int(1.4 * SR)) / SR; rv = rng.standard_normal(len(tr)) * np.exp(-tr * 3.2); rv = lfilter([1 - .55], [1, -.55], rv)
musica = musica + fftconvolve(musica, rv)[: len(musica)] * .035
musica = musica[:N]; musica /= np.abs(musica).max()

# ───────────── locução ─────────────
def ler(p):
    w = wave.open(p); d = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(float) / 32768; return d, w.getframerate()
voz = np.zeros(N); marcas = []
cache = tempfile.mkdtemp()
FILTRO = ('aresample=44100,highpass=f=90,equalizer=f=150:t=q:w=1:g=2.5,equalizer=f=2800:t=q:w=1.2:g=3.5,equalizer=f=6500:t=q:w=1:g=2,'
          'acompressor=threshold=0.09:ratio=4:attack=4:release=90:makeup=3,aecho=0.8:0.5:55:0.12,alimiter=limit=0.9')
for i, f in enumerate(rot['falas']):
    bruto, tratado = f'{cache}/{i}.wav', f'{cache}/{i}t.wav'
    subprocess.run([PIPER, '-m', VOZ, '--length_scale', str(ESCALA), '-f', bruto], input=f['texto'].encode(), capture_output=True, check=True)
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', bruto, '-af', FILTRO, '-ar', str(SR), tratado], check=True)
    d, _ = ler(tratado); d = d / (np.abs(d).max() + 1e-9) * .92
    i0 = int(f['t'] * SR); voz[i0:i0 + len(d)] += d[: N - i0]
    fim = f['t'] + len(d) / SR; marcas.append((f['t'], fim))
    folga = f.get('ate')
    print(f"  fala {i:2d}: {f['t']:6.2f} → {fim:6.2f}s ({len(d)/SR:.2f}s){'  ⚠ passa do trecho!' if folga and fim > folga else ''}  {f['texto'][:50]}")
# abaixa o violão quando a voz fala (sidechain suave)
e = lfilter([1 - .998], [1, -.998], np.abs(voz)); mask = (e > .02).astype(float)
jan = np.ones(int(.55 * SR)); mask = np.clip(np.convolve(mask, jan, 'full')[int(.2 * SR): int(.2 * SR) + N], 0, 1)   # começa a abaixar antes da voz, solta devagar
mask = lfilter([1 - .9992], [1, -.9992], mask)
duck = 1 - .62 * mask
fade = np.clip(np.arange(N) / SR / 1.2, 0, 1) * np.clip((DUR - np.arange(N) / SR) / 2.2, 0, 1)
mix = musica * .30 * duck * fade + voz * .95
mix = np.tanh(mix * 1.1) / np.tanh(1.1); mix = mix / np.abs(mix).max() * .93
pcm = (mix[: int(DUR * SR)] * 32767).astype('<i2')
tmp = tempfile.mktemp(suffix='.wav')
with wave.open(tmp, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
subprocess.run([FF, '-y', '-loglevel', 'error', '-i', tmp, '-ac', '2', '-b:a', '192k', saida], check=True)
os.remove(tmp); print('ok', saida, DUR)
