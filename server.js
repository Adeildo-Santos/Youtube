const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS - Permitir requisições de qualquer origem
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept']
}));

app.use(express.static(__dirname));

// Diretório para downloads temporários
const DOWNLOADS_DIR = path.join(os.tmpdir(), 'youtube_downloads');

// Criar diretório se não existir
if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

// Limpar downloads antigos a cada hora
setInterval(() => {
    try {
        const files = fs.readdirSync(DOWNLOADS_DIR);
        const now = Date.now();
        const maxAge = 60 * 60 * 1000; // 1 hora

        files.forEach(file => {
            try {
                const filePath = path.join(DOWNLOADS_DIR, file);
                const stat = fs.statSync(filePath);
                if (now - stat.mtimeMs > maxAge) {
                    fs.unlinkSync(filePath);
                    console.log(`Arquivo expirado deletado: ${file}`);
                }
            } catch (e) {
                console.error('Erro ao limpar arquivo:', e.message);
            }
        });
    } catch (e) {
        console.error('Erro ao limpar diretório:', e.message);
    }
}, 60 * 60 * 1000);

// Servir arquivo HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'youtube_downloader_updated.html'));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', yt_dlp: checkYtDlp() });
});

// Verificar se yt-dlp está disponível
function checkYtDlp() {
    return new Promise((resolve) => {
        exec('which yt-dlp', (error) => {
            resolve(!error);
        });
    });
}

// Endpoint para validar e obter informações do vídeo
app.post('/api/video-info', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL é obrigatória' });
    }

    try {
        // Comando para obter informações do vídeo
        const command = `yt-dlp -j --no-warnings "${url}"`;

        exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
            if (error) {
                console.error('Erro yt-dlp:', error.message);
                return res.status(400).json({ 
                    error: 'Não foi possível obter informações do vídeo. Verifique a URL.' 
                });
            }

            try {
                const info = JSON.parse(stdout);
                res.json({
                    success: true,
                    title: info.title || 'Vídeo',
                    duration: info.duration ? formatDuration(info.duration) : 'Desconhecido',
                    formats: info.formats || []
                });
            } catch (e) {
                console.error('Erro ao parsear JSON:', e.message);
                res.status(400).json({ error: 'Erro ao processar resposta do vídeo' });
            }
        });
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Endpoint para fazer download
app.post('/api/download', async (req, res) => {
    const { url, format, quality } = req.body;

    if (!url || !format) {
        return res.status(400).json({ error: 'URL e formato são obrigatórios' });
    }

    try {
        let outputPath = path.join(DOWNLOADS_DIR, '%(title)s.%(ext)s');
        let command = '';

        if (format === 'audio') {
            // Download apenas áudio em MP3
            command = `yt-dlp -f bestaudio --extract-audio --audio-format mp3 --audio-quality 192K -o "${outputPath}" "${url}" --no-warnings`;
        } else {
            // Download de vídeo com qualidade específica
            const qualityMap = {
                '720': '22',    // 720p
                '480': '18',    // 480p
                '360': '18',    // 360p (fallback)
                'best': 'best'
            };

            const fmt = qualityMap[quality] || 'best';
            command = `yt-dlp -f ${fmt} -o "${outputPath}" "${url}" --no-warnings`;
        }

        console.log(`Iniciando download: ${url}`);

        // Executar download
        const process = exec(command, { timeout: 300000 }, (error, stdout, stderr) => {
            if (error) {
                console.error('Erro no download:', error.message);
                return res.status(400).json({ 
                    error: 'Erro ao baixar vídeo. O vídeo pode estar privado ou indisponível.' 
                });
            }

            console.log('Download concluído, procurando arquivo...');

            // Encontrar arquivo baixado
            try {
                const files = fs.readdirSync(DOWNLOADS_DIR);
                const newestFile = files
                    .map(file => ({
                        name: file,
                        time: fs.statSync(path.join(DOWNLOADS_DIR, file)).mtime.getTime()
                    }))
                    .sort((a, b) => b.time - a.time)[0];

                if (newestFile) {
                    const downloadPath = `/download/${newestFile.name}`;
                    console.log('Arquivo encontrado:', newestFile.name);
                    res.json({
                        success: true,
                        downloadUrl: downloadPath,
                        filename: newestFile.name
                    });
                } else {
                    res.status(400).json({ error: 'Arquivo não encontrado após download' });
                }
            } catch (e) {
                console.error('Erro ao buscar arquivo:', e.message);
                res.status(500).json({ error: 'Erro ao processar arquivo' });
            }
        });

    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Endpoint para servir downloads
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(DOWNLOADS_DIR, filename);

    // Segurança: verificar se o arquivo está dentro do diretório de downloads
    if (!filepath.startsWith(DOWNLOADS_DIR)) {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    console.log('Servindo download:', filename);

    res.download(filepath, (err) => {
        if (err) {
            console.error('Erro ao enviar arquivo:', err);
        } else {
            // Deletar arquivo após 2 minutos
            setTimeout(() => {
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath);
                    console.log(`Arquivo deletado: ${filename}`);
                }
            }, 2 * 60 * 1000);
        }
    });
});

// Função auxiliar para formatar duração
function formatDuration(seconds) {
    if (!seconds) return 'Desconhecido';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🎬 YouTube Downloader rodando em http://localhost:${PORT}`);
    console.log(`📁 Diretório de downloads: ${DOWNLOADS_DIR}`);
});
