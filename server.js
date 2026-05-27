const express = require('express');
const path = require('path');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: '*' }));
app.use(express.static(__dirname));

// Diretório para downloads
const DOWNLOADS_DIR = path.join(os.tmpdir(), 'youtube_downloads');

if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

console.log('[STARTUP] Diretório de downloads:', DOWNLOADS_DIR);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Video info
app.post('/api/video-info', (req, res) => {
    const { url } = req.body;

    console.log('[VIDEO-INFO] URL:', url);

    if (!url) {
        return res.status(400).json({ error: 'URL é obrigatória' });
    }

    execFile('yt-dlp', ['-j', '--no-warnings', url], { 
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024 
    }, (error, stdout, stderr) => {
        
        if (error) {
            console.error('[VIDEO-INFO] ERRO:', error.message);
            console.error('[VIDEO-INFO] STDERR:', stderr);
            return res.status(400).json({ 
                error: 'Erro ao obter informações: ' + error.message
            });
        }

        try {
            const info = JSON.parse(stdout);
            const duration = info.duration ? formatDuration(info.duration) : 'Desconhecido';
            
            console.log('[VIDEO-INFO] ✅ Sucesso:', info.title);
            res.json({
                success: true,
                title: info.title || 'Vídeo',
                duration: duration,
                formats: (info.formats || []).length
            });
        } catch (parseError) {
            console.error('[VIDEO-INFO] Parse error:', parseError.message);
            res.status(400).json({ error: 'Erro ao processar vídeo' });
        }
    });
});

// Download
app.post('/api/download', (req, res) => {
    const { url, format, quality } = req.body;

    console.log('[DOWNLOAD] URL:', url, 'Format:', format, 'Quality:', quality);

    if (!url || !format) {
        return res.status(400).json({ error: 'URL e formato são obrigatórios' });
    }

    let args = [];

    if (format === 'audio') {
        args = [
            '-f', 'bestaudio',
            '--extract-audio',
            '--audio-format', 'mp3',
            '--audio-quality', '192K',
            '-o', path.join(DOWNLOADS_DIR, '%(title)s.%(ext)s'),
            url,
            '--no-warnings'
        ];
    } else {
        const qualityMap = {
            '720': '22',
            '480': '18',
            '360': '18',
            'best': 'best'
        };
        const fmt = qualityMap[quality] || 'best';
        
        args = [
            '-f', fmt,
            '-o', path.join(DOWNLOADS_DIR, '%(title)s.%(ext)s'),
            url,
            '--no-warnings'
        ];
    }

    console.log('[DOWNLOAD] Iniciando...');

    execFile('yt-dlp', args, { 
        timeout: 300000,
        maxBuffer: 50 * 1024 * 1024 
    }, (error, stdout, stderr) => {
        
        if (error) {
            console.error('[DOWNLOAD] ERRO:', error.message);
            console.error('[DOWNLOAD] STDERR:', stderr);
            return res.status(400).json({ 
                error: 'Erro ao baixar: ' + error.message
            });
        }

        console.log('[DOWNLOAD] Concluído, procurando arquivo...');

        try {
            const files = fs.readdirSync(DOWNLOADS_DIR);
            const newestFile = files
                .map(file => ({
                    name: file,
                    time: fs.statSync(path.join(DOWNLOADS_DIR, file)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time)[0];

            if (newestFile) {
                console.log('[DOWNLOAD] ✅ Arquivo:', newestFile.name);
                res.json({
                    success: true,
                    downloadUrl: `/download/${newestFile.name}`,
                    filename: newestFile.name
                });
            } else {
                console.error('[DOWNLOAD] Arquivo não encontrado');
                res.status(400).json({ error: 'Arquivo não encontrado' });
            }
        } catch (e) {
            console.error('[DOWNLOAD] Erro ao buscar arquivo:', e.message);
            res.status(500).json({ error: e.message });
        }
    });
});

// Download file
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(DOWNLOADS_DIR, filename);

    if (!filepath.startsWith(DOWNLOADS_DIR)) {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    console.log('[DOWNLOAD] Servindo:', filename);

    res.download(filepath, (err) => {
        if (err) {
            console.error('[DOWNLOAD] Erro ao enviar:', err.message);
        } else {
            setTimeout(() => {
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath);
                    console.log('[DOWNLOAD] Arquivo deletado:', filename);
                }
            }, 2 * 60 * 1000);
        }
    });
});

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

app.listen(PORT, () => {
    console.log(`🎬 YouTube Downloader rodando em http://localhost:${PORT}`);
    console.log(`📁 Diretório de downloads: ${DOWNLOADS_DIR}`);
});
