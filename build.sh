#!/bin/bash
set -e

echo "🔧 Instalando dependências do Node.js..."
npm install

echo "🎬 Instalando yt-dlp..."
apt-get update
apt-get install -y yt-dlp ffmpeg

echo "✅ Build concluído!"
