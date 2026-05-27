# 🎬 YouTube Downloader

Um downloader de vídeos do YouTube moderno com interface web e suporte a múltiplos formatos.

## 📋 Requisitos

- **Node.js** 14+ (https://nodejs.org/)
- **yt-dlp** (instalar conforme o SO abaixo)
- **ffmpeg** (para conversão de áudio - opcional, recomendado para MP3)

## 🔧 Instalação do yt-dlp

### Windows
```bash
# Opção 1: Com pip (Python)
pip install yt-dlp

# Opção 2: Usando Chocolatey
choco install yt-dlp

# Opção 3: Download direto
# https://github.com/yt-dlp/yt-dlp/releases
# Descompacte e adicione ao PATH
```

### macOS
```bash
brew install yt-dlp
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install yt-dlp
```

### Linux (Fedora)
```bash
sudo dnf install yt-dlp
```

## 📦 Instalar dependências do Node.js

```bash
# Navegar até a pasta do projeto
cd caminho/para/youtube-downloader

# Instalar dependências
npm install
```

## 🚀 Iniciar o servidor

```bash
npm start
```

Você verá algo como:
```
🎬 YouTube Downloader rodando em http://localhost:3000
📁 Diretório de downloads: /tmp/youtube_downloads (ou seu diretório temp)
```

## 🌐 Acessar a aplicação

Abra no navegador:
```
http://localhost:3000
```

## 📱 Como usar

1. **Cole a URL** do vídeo do YouTube
   - Exemplos válidos:
     - `https://www.youtube.com/watch?v=T7r9Sk-gwm4`
     - `https://youtu.be/T7r9Sk-gwm4`
     - `https://www.youtube.com/live/T7r9Sk-gwm4` (lives também)

2. **Clique em "Verificar"** para validar o vídeo

3. **Selecione o formato**:
   - **Vídeo (MP4)** - O vídeo completo
   - **Áudio (MP3)** - Apenas o áudio

4. **Escolha a qualidade** (apenas para vídeo)
   - Melhor disponível
   - 720p HD
   - 480p SD
   - 360p SD

5. **Clique em "Baixar"** para iniciar o download

6. **Salve o arquivo** quando aparecer a caixa de download

## ⚙️ Variáveis de ambiente (opcional)

Crie um arquivo `.env` na raiz do projeto:

```env
PORT=3000
TEMP_DIR=/custom/download/path
MAX_AGE=3600000
```

## 🐛 Solução de problemas

### Erro: "yt-dlp não encontrado"
- Verifique se yt-dlp está instalado: `yt-dlp --version`
- Adicione ao PATH ou instale novamente

### Erro: "Não foi possível obter informações do vídeo"
- Verifique a URL
- O vídeo pode estar privado ou indisponível
- Tente com outra URL

### Erro: "Download expirou (timeout)"
- O vídeo é muito grande
- Sua conexão é lenta
- Tente com qualidade menor

### ffmpeg não encontrado (para MP3)
```bash
# Windows (Chocolatey)
choco install ffmpeg

# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Fedora
sudo dnf install ffmpeg
```

## 🔒 Segurança

- ✅ Validação de URL
- ✅ Isolamento de diretório (path traversal prevention)
- ✅ Limpeza automática de arquivos antigos
- ✅ Timeout de 5 minutos para downloads
- ✅ Suporte a CORS configurável

## 📊 API Endpoints

### `POST /api/video-info`
Obtém informações do vídeo
```json
{
  "url": "https://www.youtube.com/watch?v=..."
}
```

Resposta:
```json
{
  "success": true,
  "title": "Título do vídeo",
  "duration": "10m 30s",
  "formats": [...]
}
```

### `POST /api/download`
Inicia o download
```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "format": "video" ou "audio",
  "quality": "720", "480", "360" ou "best"
}
```

Resposta:
```json
{
  "success": true,
  "downloadUrl": "/download/titulo_do_video.mp4",
  "filename": "titulo_do_video.mp4"
}
```

### `GET /download/:filename`
Faz download do arquivo

## 📄 Arquivos do projeto

```
youtube-downloader/
├── server.js                      # Servidor Express
├── youtube_downloader.html        # Interface web (antiga)
├── youtube_downloader_updated.html # Interface web (nova - USAR ESTA)
├── package.json                   # Dependências Node.js
└── README.md                      # Este arquivo
```

## 🎯 Recursos

- ✅ Interface moderna e responsiva
- ✅ Suporte a vídeos e lives do YouTube
- ✅ Download em múltiplas qualidades
- ✅ Conversão para MP3
- ✅ Progresso visual
- ✅ Informações do vídeo antes do download
- ✅ Validação de URL
- ✅ Limpeza automática de arquivos
- ✅ API REST documentada

## ⚖️ Aviso Legal

Este projeto é apenas para fins educacionais. Respeite sempre os direitos autorais. Faça download apenas de conteúdo que você tem permissão para baixar. O desenvolvedor não se responsabiliza pelo uso indevido da ferramenta.

## 📝 Licença

MIT

## 💬 Suporte

Para mais informações sobre yt-dlp:
- https://github.com/yt-dlp/yt-dlp
- https://github.com/yt-dlp/yt-dlp/blob/master/README.md

---

**Versão:** 1.0.0  
**Última atualização:** 2026
