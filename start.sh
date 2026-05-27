#!/bin/bash
set -e

echo "🔧 Atualizando package manager..."
apt-get update -qq 2>&1 | head -3

echo "📦 Instalando yt-dlp via apt-get..."
apt-get install -y yt-dlp ffmpeg 2>&1 | grep -i "installed\|unpacking\|done" | head -5

echo "✅ Verificando yt-dlp..."
which yt-dlp
yt-dlp --version

echo "🚀 Iniciando servidor Node.js..."
node server.js
