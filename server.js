const express = require('express');
const https = require('https');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const url = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({ origin: '*' }));
app.use(express.static(__dirname));

const DOWNLOADS_DIR = path.join(os.tmpdir(), 'youtube_downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Usar API de conversão online que funciona
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

        // Usar a API do YouTube sem chave (informações públicas)
        const infoUrl = `https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${videoId}&format=json`;
        
        const promise = new Promise((resolve, reject) => {
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
        res.status(400).json({ error: 'Erro ao obter informações' });
    }
});

// Download usando API InvidiousAPI (funciona!)
app.post('/api/download', async (req, res) => {
    const { url: videoUrl } = req.body;

    if (!videoUrl) {
        return res.status(400).json({ error: 'URL é obrigatória' });
    }

    try {
        const videoId = extractVideoId(videoUrl);
        
        if (!videoId) {
            return res.status(400).json({ error: 'URL inválida' });
        }

        console.log('[DOWNLOAD] Obtendo links para:', videoId);

        // Usar infernalee.ru API (funciona sem autenticação)
        const apiUrl = `https://api.infernalee.ru/youtube/info/${videoId}`;

        const promise = new Promise((resolve, reject) => {
            https.get(apiUrl, (response) => {
                let data = '';
                
                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    try {
                        const info = JSON.parse(data);
                        console.log('[DOWNLOAD] Info recebida:', info.title);

                        if (info && info.formats) {
                            // Encontrar melhor qualidade de vídeo
                            const videoFormats = info.formats
                                .filter(f => f.hasVideo && f.hasAudio)
                                .sort((a, b) => (b.height || 0) - (a.height || 0));

                            const bestVideo = videoFormats[0];
                            const audioFormat = info.formats
                                .filter(f => f.hasAudio && !f.hasVideo)[0];

                            if (bestVideo) {
                                resolve({
                                    success: true,
                                    downloadUrl: bestVideo.url,
                                    filename: `${info.title || 'video'}.mp4`,
                                    title: info.title,
                                    formats: info.formats.length
                                });
                            } else {
                                reject('Nenhum formato disponível');
                            }
                        } else {
                            reject('Resposta inválida da API');
                        }
                    } catch (e) {
                        console.error('[DOWNLOAD] Parse error:', e.message);
                        reject('Erro ao processar resposta');
                    }
                });
            }).on('error', (e) => {
                console.error('[DOWNLOAD] Request error:', e.message);
                reject(e.message);
            });
        });

        const result = await promise;
        res.json(result);

    } catch (error) {
        console.error('[DOWNLOAD] Error:', error);
        
        // Fallback: Redirecionar para Y2Mate
        res.json({
            success: true,
            downloadUrl: `https://www.y2mate.com/youtube-downloader?url=${encodeURIComponent(req.body.url)}`,
            fallback: true,
            message: 'Use o link abaixo para fazer download direto'
        });
    }
});

function extractVideoId(videoUrl) {
    if (!videoUrl) return null;
    
    let match = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
}

app.listen(PORT, () => {
    console.log(`🎬 YouTube Downloader em http://localhost:${PORT}`);
});
