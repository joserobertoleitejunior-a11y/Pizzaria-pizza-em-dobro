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
for nome, (voz, cenas) in PLANOS.items():
    ent = ['-i', os.path.join(V, voz), '-stream_loop', '-1', '-i', MUSICA]
    f, t, tempos, lista = [], 0.0, {}, []
    for i, c in enumerate(cenas):
        id_ = c[0]
        if c[1] == 'm' or isinstance(c[1], tuple):
            d = c[1][1]; f.append(f'anullsrc=r=44100:cl=mono,atrim=0:{d}[s{i}]')
        else:
            a0, a1 = c[1], c[2]; d = a1 - a0
            if id_ == 'fim': d += CAUDA
            f.append(f'[0:a]atrim={a0}:{a1},asetpts=PTS-STARTPTS,aresample=44100,apad=pad_dur={CAUDA if id_=="fim" else 0}[s{i}]')
        tempos[id_] = {'t0': round(t, 3), 't1': round(t + d, 3)}; lista.append(f'[s{i}]'); t += d
    dur = round(t, 3)
    f.append(''.join(lista) + f'concat=n={len(lista)}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=9[voz]')
    f.append(f'[1:a]atrim=0:{dur},asetpts=PTS-STARTPTS,volume=0.22,afade=t=in:d=1,afade=t=out:st={dur-1.8}:d=1.8[mus]')
    f.append('[voz][mus]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[out]')
    saida = os.path.join(V, f'audio-{nome}.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *ent, '-filter_complex', ';\n'.join(f), '-map', '[out]', '-t', str(dur), '-ar', '44100', '-b:a', '192k', saida], check=True)
    json.dump({'dur': dur, 'cenas': tempos}, open(os.path.join(V, f'tempos-{nome}.json'), 'w'), indent=1)
    print(nome, dur, 's →', saida)
