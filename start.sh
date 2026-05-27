#!/bin/bash
set -e

echo "🔧 Instalando yt-dlp com Python..."

# Tentar instalar com python3 -m pip
python3 -m pip install --user yt-dlp 2>&1 | grep -i "success\|installed" || true

# Adicionar ao PATH
export PATH="$HOME/.local/bin:$PATH"

echo "✅ Verificando yt-dlp..."
python3 -m yt_dlp --version || echo "⚠️ Usando via python3 -m"

echo "🚀 Iniciando servidor Node.js..."
node server.js
