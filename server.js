const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cors = require('cors');
const { execFile, spawn } = require('child_process');

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

// Encontrar yt-dlp
let YT_DLP_PATH = null;

function findYtDlp() {
    const possiblePaths = [
        'yt-dlp',
        path.join(__dirname, 'node_modules', '.bin', 'yt-dlp'),
        path.join(__dirname, 'node_modules', 'yt-dlp', 'index.js'),
        '/usr/local/bin/yt-dlp',
        '/usr/bin/yt-dlp'
    ];

    for (const p of possiblePaths) {
        try {
            require.resolve(p);
            console.log(`✅ yt-dlp encontrado em: ${p}`);
            return p;
        } catch (e) {
            // continuar
        }
    }
    
    return 'yt-dlp'; // fallback
}

YT_DLP_PATH = findYtDlp();

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        ytDlpPath: YT_DLP_PATH,
        timestamp: new Date().toISOString()
    });
});

// Video info
app.post('/api/video-info', (req, res) => {
    const { url } = req.body;

    console.log('[VIDEO-INFO] URL:', url);

    if (!url) {
        return res.status(400).json({ error: 'URL é obrigatória' });
    }

    execFile(YT_DLP_PATH, ['-j', '--no-warnings', url], { 
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024 
    }, (error, stdout, stderr) => {
        
        if (error) {
            console.error('[VIDEO-INFO] ERRO:', error.message);
            return res.status(400).json({ error: 'Erro ao obter informações' });
        }

        try {
            const info = JSON.parse(stdout);
            const duration = info.duration ? formatDuration(info.duration) : 'Desconhecido';
            
            console.log('[VIDEO-INFO] ✅', info.title);
            res.json({
                success: true,
                title: info.title || 'Vídeo',
                duration: duration
            });
        } catch (e) {
            console.error('[VIDEO-INFO] Parse error:', e.message);
            res.status(400).json({ error: 'Erro ao processar vídeo' });
        }
    });
});

// Download
app.post('/api/download', (req, res) => {
    const { url, format, quality } = req.body;

    console.log('[DOWNLOAD] Iniciando download:', url);

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
        const qualityMap = { '720': '22', '480': '18', '360': '18', 'best': 'best' };
        const fmt = qualityMap[quality] || 'best';
        
        args = [
            '-f', fmt,
            '-o', path.join(DOWNLOADS_DIR, '%(title)s.%(ext)s'),
            url,
            '--no-warnings'
        ];
    }

    execFile(YT_DLP_PATH, args, { 
        timeout: 300000,
        maxBuffer: 50 * 1024 * 1024 
    }, (error, stdout, stderr) => {
        
        if (error) {
            console.error('[DOWNLOAD] ERRO:', error.message);
            return res.status(400).json({ error: 'Erro ao baixar vídeo' });
        }

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
                res.status(400).json({ error: 'Arquivo não encontrado' });
            }
        } catch (e) {
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

    res.download(filepath, (err) => {
        if (!err) {
            setTimeout(() => {
                try { fs.unlinkSync(filepath); } catch (e) {}
            }, 2 * 60 * 1000);
        }
    });
});

function formatDuration(seconds) {
    if (!seconds) return 'Desconhecido';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

app.listen(PORT, () => {
    console.log(`🎬 YouTube Downloader em http://localhost:${PORT}`);
    console.log(`📁 Downloads: ${DOWNLOADS_DIR}`);
    console.log(`🔧 yt-dlp: ${YT_DLP_PATH}`);
});
