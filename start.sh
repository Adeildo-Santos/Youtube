#!/bin/bash
set -e

echo "🔧 Preparando yt-dlp..."

# Criar diretório
mkdir -p $HOME/.local/bin

# Baixar yt-dlp
echo "📥 Baixando yt-dlp..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/download/2026.03.17/yt-dlp -o $HOME/.local/bin/yt-dlp
chmod +x $HOME/.local/bin/yt-dlp

# Verificar
echo "✅ Verificando..."
$HOME/.local/bin/yt-dlp --version

# Criar symlink
echo "🔗 Criando symlink..."
ln -sf $HOME/.local/bin/yt-dlp /tmp/yt-dlp 2>/dev/null || true

# Exportar PATH e iniciar servidor
echo "🚀 Iniciando servidor..."
export PATH="$HOME/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
node server.js
