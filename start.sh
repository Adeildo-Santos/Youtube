#!/bin/bash
set -e

echo "🔧 Instalando yt-dlp via pip..."
pip install --upgrade yt-dlp 2>&1 | grep -i "success\|installed\|already" || true

echo "✅ Verificando yt-dlp..."
which yt-dlp || echo "⚠️ yt-dlp não encontrado no PATH"
yt-dlp --version || echo "⚠️ yt-dlp não executável"

echo "🚀 Iniciando servidor Node.js..."
node server.js
