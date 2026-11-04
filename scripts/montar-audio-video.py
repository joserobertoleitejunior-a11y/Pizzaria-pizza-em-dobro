"""Monta o áudio final e a linha do tempo (tempos-X.json) de cada vídeo a partir da VOZ gravada (ElevenLabs).
Cada cena aponta pro trecho da voz (a0→a1, em segundos do MP3) ou é uma cena muda (só música + animação).
Uso: python3 scripts/montar-audio-video.py   (precisa de ffmpeg; as vozes ficam em video/voz-*.mp3)"""
import json, subprocess, os
V = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'video')
MUSICA = os.path.join(V, 'trilha-pizzaria.mp3')
M = lambda dur: ('m', dur)                      # cena muda
PLANOS = {
 'hoje': ('voz-hoje.mp3', [('splash',0,2.29),('promos',2.29,5.06),('c65',5.06,7.48),('c75',7.48,11.67),('c80',11.67,15.31),('c85',15.31,19.15),
          ('broto',19.15,22.41),('entrega',22.41,24.68),('rapido',M(6.5)),('fim',24.68,27.40)]),
 'quinta': ('voz-quinta.mp3', [('splash',0,1.51),('esf5',1.51,3.43),('sab',3.43,7.82),('doce',7.82,10.12),('pacotes',10.12,13.86),('entrega',13.86,16.30),
          ('doces',16.30,22.61),('bebida',22.61,26.72),('rapido',M(6.5)),('fim',26.72,30.04)]),
 'sabado': ('voz-sabado.mp3', [('splash',0,2.41),('promos',2.41,5.49),('cardapio',5.49,8.84),('rapido',M(6.5)),('site',8.84,12.41),('bairro',12.41,16.64),
          ('pix',16.64,20.37),('fim',20.37,23.95)]),
}
CAUDA = 1.6   # respiro no cartão final depois da última palavra
import wave, tempfile
def ff(*a): subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *a], check=True)
for nome, (voz, cenas) in PLANOS.items():
    tmp = tempfile.mkdtemp(); partes, t, tempos = [], 0.0, {}
    for i, c in enumerate(cenas):
        id_, trecho = c[0], c[1:]
        w = os.path.join(tmp, f'{i}.wav')
        if isinstance(trecho[0], tuple):                    # cena muda: silêncio
            d = trecho[0][1]; ff('-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', str(d), w)
        else:
            a0, a1 = trecho; d = a1 - a0
            ff('-i', os.path.join(V, voz), '-ss', str(a0), '-t', str(d), '-ac', '1', '-ar', '44100', w)
            if id_ == 'fim':                       # respiro no cartão final
                w2 = os.path.join(tmp, f'{i}p.wav'); ff('-i', w, '-af', f'apad=pad_dur={CAUDA}', '-t', str(d + CAUDA), w2); w = w2; d += CAUDA
        tempos[id_] = {'t0': round(t, 3), 't1': round(t + d, 3)}; partes.append(w); t += d
    dur = round(t, 3); voz_wav = os.path.join(tmp, 'voz.wav')
    with wave.open(voz_wav, 'wb') as out:
        for k, w in enumerate(partes):
            with wave.open(w) as r:
                if k == 0: out.setparams(r.getparams())
                out.writeframes(r.readframes(r.getnframes()))
    saida = os.path.join(V, f'audio-{nome}.mp3')
    ff('-i', voz_wav, '-stream_loop', '-1', '-i', MUSICA, '-filter_complex',
       f'[0:a]loudnorm=I=-16:TP=-1.5:LRA=9,apad=whole_dur={dur}[voz];[1:a]atrim=0:{dur},asetpts=PTS-STARTPTS,volume=0.22,afade=t=in:d=1,afade=t=out:st={dur-1.8}:d=1.8[mus];'
       f'[voz][mus]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95[out]', '-map', '[out]', '-t', str(dur), '-ar', '44100', '-b:a', '192k', saida)
    json.dump({'dur': dur, 'cenas': tempos}, open(os.path.join(V, f'tempos-{nome}.json'), 'w'), indent=1)
    print(nome, dur, 's, mp3 =', subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',saida],capture_output=True,text=True).stdout.strip())
