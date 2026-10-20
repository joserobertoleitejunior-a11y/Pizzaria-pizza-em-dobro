"""Áudio dos vídeos Stories: violão de nylon calmo (valsa italiana de pizzaria, com bandolim suave ao fundo) + locução.
Uso: python3 scripts/gerar-audio-video.py roteiro.json saida.mp3
  roteiro.json = {"tempos": "tempos-X.json", "cenas": [{"id":..., "fala":..., "min": s, "fim": bool}, ...]}   (gerado por scripts/exportar-roteiro.js)
  Cada cena dura o tempo da fala + folga (nenhuma frase é cortada). Grava também video/tempos-X.json, que o vídeo usa pra montar a linha do tempo.
Precisa de: numpy, scipy, imageio-ffmpeg, sherpa-onnx (pip) e o modelo Kokoro multilíngue (KOKORO_DIR = pasta de
https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_0.tar.bz2). Voz pt-BR masculina "pm_alex" (VOZ_SID=43).
A música é sintetizada (Karplus-Strong), sem direitos autorais; a voz é neural (Kokoro) tratada com EQ leve, compressão e sala curta."""
import sys, os, json, wave, subprocess, tempfile, numpy as np
from scipy.signal import lfilter, fftconvolve
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
SR = 44100
rot = json.load(open(sys.argv[1])); saida = sys.argv[2]
KOKORO = os.environ.get('KOKORO_DIR', '/tmp/tts/kokoro-multi-lang-v1_0')
VOZ_SID = int(os.environ.get('VOZ_SID', '43'))             # 42 = pf_dora (feminina), 43 = pm_alex, 44 = pm_santa (masculinas)
VOZ_VEL = float(os.environ.get('VOZ_VEL', '0.9'))          # <1 = fala mais pausada (dá pra entender cada palavra)
import sherpa_onnx
_tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
    model=f'{KOKORO}/model.onnx', voices=f'{KOKORO}/voices.bin', tokens=f'{KOKORO}/tokens.txt', data_dir=f'{KOKORO}/espeak-ng-data',
    dict_dir=f'{KOKORO}/dict', lexicon=f'{KOKORO}/lexicon-us-en.txt', lang='pt-br'), num_threads=4, provider='cpu')))
# ───────────── locução (primeiro: a duração de cada cena vem da fala) ─────────────
def ler(p):
    w = wave.open(p); d = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(float) / 32768; return d, w.getframerate()
cache = tempfile.mkdtemp()
FILTRO = ('aresample=44100,highpass=f=70,equalizer=f=140:t=q:w=1:g=2,equalizer=f=3200:t=q:w=1.2:g=1.5,'
          'acompressor=threshold=0.1:ratio=3:attack=5:release=120:makeup=2,aecho=0.8:0.4:45:0.08,alimiter=limit=0.9')
clipes = []
for i, c in enumerate(rot['cenas']):
    bruto, tratado = f'{cache}/{i}.wav', f'{cache}/{i}t.wav'
    g = _tts.generate(c['fala'], sid=VOZ_SID, speed=VOZ_VEL)
    with wave.open(bruto, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(g.sample_rate); w.writeframes((np.clip(np.array(g.samples), -1, 1) * 32767).astype('<i2').tobytes())
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', bruto, '-af', FILTRO, '-ar', str(SR), tratado], check=True)
    d, _ = ler(tratado); clipes.append(d / (np.abs(d).max() + 1e-9) * .92)
# linha do tempo: cada cena = fala + folga; a fala começa 0,3 s depois da legenda
t = 0.0; tempos = {}; inicios = []
for c, d in zip(rot['cenas'], clipes):
    dv = len(d) / SR
    atraso = 1.0 if c.get('fim') else .3
    fim_cena = t + max(c.get('min') or 0, atraso + dv + (1.8 if c.get('fim') else .85))
    tempos[c['id']] = {'t0': round(t, 2), 't1': round(fim_cena, 2)}; inicios.append(t + atraso)
    print(f"  {c['id']:9s} {t:6.2f} → {fim_cena:6.2f}s  fala {dv:.2f}s  {c['fala'][:55]}")
    t = fim_cena
DUR = round(t, 2)
os.makedirs('video', exist_ok=True)
json.dump({'dur': DUR, 'cenas': tempos}, open(os.path.join(os.path.dirname(os.path.abspath(saida)), rot['tempos']), 'w'), indent=1)
N = int(SR * (DUR + 3))
voz = np.zeros(N)
for ini, d in zip(inicios, clipes):
    i0 = int(ini * SR); voz[i0:i0 + len(d)] += d[: N - i0]
rng = np.random.default_rng(5)
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
