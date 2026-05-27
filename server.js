const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: '*' }));
app.use(express.static(__dirname));

const DOWNLOADS_DIR = path.join(os.tmpdir(), 'youtube_downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

// Encontrar yt-dlp
const YT_DLP_PATH = process.env.HOME ? path.join(process.env.HOME, '.local', 'bin', 'yt-dlp') : 'yt-dlp';

console.log('[STARTUP] yt-dlp path:', YT_DLP_PATH);
console.log('[STARTUP] PATH:', process.env.PATH);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), ytDlpPath: YT_DLP_PATH });
});

app.post('/api/video-info', (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL é obrigatória' });
    }

    console.log('[VIDEO-INFO]', url);

    const child = spawn(YT_DLP_PATH, ['-j', '--no-warnings', url], {
        timeout: 30000,
        env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
        stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
        stderr += data.toString();
    });

    child.on('close', (code) => {
        if (code !== 0) {
            console.error('[VIDEO-INFO] Error:', stderr);
            return res.status(400).json({ error: 'Erro ao obter informações: ' + stderr });
        }

        try {
            const info = JSON.parse(stdout);
            const duration = info.duration ? formatDuration(info.duration) : 'Desconhecido';
            
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

    child.on('error', (error) => {
        console.error('[VIDEO-INFO] Error:', error.message);
        res.status(400).json({ error: 'yt-dlp não encontrado: ' + error.message });
    });
});

app.post('/api/download', (req, res) => {
    const { url, format, quality } = req.body;

    if (!url || !format) {
        return res.status(400).json({ error: 'URL e formato são obrigatórios' });
    }

    console.log('[DOWNLOAD]', url, format, quality);

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

    const child = spawn(YT_DLP_PATH, args, { 
        timeout: 300000,
        env: { ...process.env }
    });

    let stderr = '';

    child.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log('[DOWNLOAD]', data.toString().trim());
    });

    child.on('close', (code) => {
        if (code !== 0) {
            console.error('[DOWNLOAD] Error:', stderr);
            return res.status(400).json({ error: 'Erro ao baixar vídeo: ' + stderr });
        }

        try {
            const files = fs.readdirSync(DOWNLOADS_DIR);
            const newestFile = files
                .map(f => ({
                    name: f,
                    time: fs.statSync(path.join(DOWNLOADS_DIR, f)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time)[0];

            if (newestFile) {
                console.log('[DOWNLOAD] File:', newestFile.name);
                res.json({
                    success: true,
                    downloadUrl: `/download/${newestFile.name}`,
                    filename: newestFile.name
                });
            } else {
                res.status(400).json({ error: 'Arquivo não encontrado' });
            }
        } catch (e) {
            console.error('[DOWNLOAD] Error:', e.message);
            res.status(500).json({ error: e.message });
        }
    });

    child.on('error', (error) => {
        console.error('[DOWNLOAD] Error:', error.message);
        res.status(400).json({ error: 'Erro ao iniciar download: ' + error.message });
    });
});

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
