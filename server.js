const express = require('express');
const https = require('https');
const http = require('http');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({ origin: '*' }));
app.use(express.static(__dirname));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/api/video-info', async (req, res) => {
    const { url: videoUrl } = req.body;

    if (!videoUrl) {
        return res.status(400).json({ error: 'URL é obrigatória' });
    }

    try {
        const videoId = extractVideoId(videoUrl);
        
        if (!videoId) {
            return res.status(400).json({ error: 'URL do YouTube inválida' });
        }

        console.log('[VIDEO-INFO] Buscando:', videoId);

        const infoUrl = `https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${videoId}&format=json`;
        
        const promise = new Promise((resolve) => {
            https.get(infoUrl, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const info = JSON.parse(data);
                        resolve({
                            title: info.title,
                            author: info.author_name,
                            duration: 'Desconhecido'
                        });
                    } catch (e) {
                        resolve({
                            title: 'Vídeo do YouTube',
                            author: 'Desconhecido',
                            duration: 'Desconhecido'
                        });
                    }
                });
            }).on('error', () => {
                resolve({
                    title: 'Vídeo do YouTube',
                    author: 'Desconhecido',
                    duration: 'Desconhecido'
                });
            });
        });

        const info = await promise;
        res.json({ success: true, ...info });
        
    } catch (error) {
        console.error('[VIDEO-INFO] Error:', error.message);
        res.status(400).json({ error: 'Erro ao obter informações' });
    }
});

app.post('/api/download', async (req, res) => {
    const { url: videoUrl, format = 'video', quality = 'best' } = req.body;

    if (!videoUrl) {
        return res.status(400).json({ error: 'URL é obrigatória' });
    }

    try {
        const videoId = extractVideoId(videoUrl);
        
        if (!videoId) {
            return res.status(400).json({ error: 'URL inválida' });
        }

        console.log('[DOWNLOAD] Processando:', { videoId, format, quality });

        // Tentar múltiplas APIs em ordem
        const apis = [
            {
                name: 'cobalt',
                fetch: () => fetchCobalt(videoUrl)
            },
            {
                name: 'extractify',
                fetch: () => fetchExtractify(videoId)
            },
            {
                name: 'y2meta',
                fetch: () => fetchY2Meta(videoId, format, quality)
            }
        ];

        for (const api of apis) {
            try {
                console.log(`[DOWNLOAD] Tentando ${api.name}...`);
                const result = await api.fetch();
                if (result && result.success) {
                    console.log(`[DOWNLOAD] ✓ ${api.name} sucesso`);
                    return res.json(result);
                }
            } catch (error) {
                console.error(`[DOWNLOAD] ✗ ${api.name} falhou:`, error.message);
            }
        }

        throw new Error('Todas as APIs falharam');

    } catch (error) {
        console.error('[DOWNLOAD] Error:', error.message);
        
        // Último recurso: redirecionar para serviço confiável
        res.json({
            success: true,
            downloadUrl: `https://www.y2mate.com/youtube-downloader?url=${encodeURIComponent(req.body.url)}`,
            filename: 'video',
            fallback: true,
            message: 'Use o link de redirecionamento abaixo',
            format: format,
            quality: quality
        });
    }
});

// API Cobalt (funciona muito bem)
function fetchCobalt(videoUrl) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            url: videoUrl,
            videoQuality: '720',
            audioFormat: 'best',
            downloadMode: null,
            filenamePattern: 'pattern'
        });

        const options = {
            hostname: 'api.cobalt.tools',
            port: 443,
            path: '/api/json',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'Accept': 'application/json'
            },
            timeout: 10000
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.url) {
                        resolve({
                            success: true,
                            downloadUrl: json.url,
                            filename: json.filename || 'video.mp4'
                        });
                    } else {
                        reject(new Error('URL não encontrada na resposta'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });

        req.write(postData);
        req.end();
    });
}

// API Extractify
function fetchExtractify(videoId) {
    return new Promise((resolve, reject) => {
        const url = `https://extractify.com/api/v1/download?url=https://www.youtube.com/watch?v=${videoId}&format=best`;
        
        https.get(url, { timeout: 10000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.download_url) {
                        resolve({
                            success: true,
                            downloadUrl: json.download_url,
                            filename: json.title || 'video.mp4'
                        });
                    } else {
                        reject(new Error('URL não encontrada'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject).on('timeout', function() {
            this.destroy();
            reject(new Error('Timeout'));
        });
    });
}

// API Y2Meta
function fetchY2Meta(videoId, format, quality) {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams({
            url: `https://www.youtube.com/watch?v=${videoId}`,
            vquality: quality === 'best' ? 'best' : quality === '720' ? '720' : '480',
            format: format === 'audio' ? 'mp3' : 'mp4'
        });

        const options = {
            hostname: 'y2meta.com',
            port: 443,
            path: '/en/download-yt',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData.toString()),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    // Extrair URL do HTML
                    const match = data.match(/href="([^"]*download[^"]*)"/i);
                    if (match && match[1]) {
                        resolve({
                            success: true,
                            downloadUrl: match[1],
                            filename: `video.${format === 'audio' ? 'mp3' : 'mp4'}`
                        });
                    } else {
                        reject(new Error('URL não encontrada no HTML'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });

        req.write(postData.toString());
        req.end();
    });
}

function extractVideoId(videoUrl) {
    if (!videoUrl) return null;
    
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/watch\?.*[&?]v=)([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
        const match = videoUrl.match(pattern);
        if (match) return match[1];
    }
    
    return null;
}

app.listen(PORT, () => {
    console.log(`🎬 YouTube Downloader rodando em http://localhost:${PORT}`);
});
