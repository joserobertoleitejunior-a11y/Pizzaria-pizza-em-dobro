#!/bin/bash
# Prepara um vídeo (queijo esticando, forno, animação do mascote...) pra entrar nos vídeos: vira WebM vertical 1080x1920, sem áudio.
# Uso: bash scripts/preparar-clipe.sh entrada.mp4 video/clips/nome.webm [segundos_maximos]
set -e
mkdir -p "$(dirname "$2")"
ffmpeg -y -loglevel error -i "$1" -t "${3:-8}" -an -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30" -c:v libvpx-vp9 -b:v 0 -crf 32 -pix_fmt yuv420p "$2"
echo "pronto: $2"
