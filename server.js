const express = require('express');
const https = require('https');
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

        const result = await fetchDownloadUrl(videoId, format, quality);
        res.json(result);

    } catch (error) {
        console.error('[DOWNLOAD] Error:', error.message);
        res.status(400).json({ 
            success: false,
            error: 'Erro ao obter link de download: ' + error.message 
        });
    }
});

async function fetchDownloadUrl(videoId, format, quality) {
    const apiUrl = `https://api.infernalee.ru/youtube/info/${videoId}`;

    return new Promise((resolve, reject) => {
        https.get(apiUrl, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const info = JSON.parse(data);
                    console.log('[API] Formatos disponíveis:', info.formats ? info.formats.length : 0);

                    if (!info || !info.formats || info.formats.length === 0) {
                        throw new Error('Nenhum formato disponível');
                    }

                    let selectedFormat;

                    if (format === 'audio') {
                        // Buscar melhor áudio
                        selectedFormat = info.formats
                            .filter(f => f.hasAudio && !f.hasVideo)
                            .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];

                        if (!selectedFormat) {
                            // Fallback: pegar vídeo e descartar vídeo
                            selectedFormat = info.formats
                                .filter(f => f.hasAudio)
                                .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];
                        }
                    } else {
                        // Buscar vídeo com áudio (melhor combinação)
                        let videoFormats = info.formats.filter(f => f.hasVideo && f.hasAudio);

                        if (quality === 'best') {
                            selectedFormat = videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0];
                        } else {
                            const qualityNum = parseInt(quality);
                            selectedFormat = videoFormats
                                .filter(f => f.height <= qualityNum)
                                .sort((a, b) => (b.height || 0) - (a.height || 0))[0];
                            
                            // Fallback se não encontrar exata
                            if (!selectedFormat) {
                                selectedFormat = videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0];
                            }
                        }
                    }

                    if (!selectedFormat) {
                        throw new Error('Nenhum formato adequado encontrado');
                    }

                    console.log('[API] ✓ Formato selecionado:', {
                        height: selectedFormat.height,
                        hasVideo: selectedFormat.hasVideo,
                        hasAudio: selectedFormat.hasAudio,
                        url: selectedFormat.url ? 'OK' : 'FALTA'
                    });

                    resolve({
                        success: true,
                        downloadUrl: selectedFormat.url,
                        filename: `${info.title || 'video'}.${format === 'audio' ? 'mp3' : 'mp4'}`,
                        format: format,
                        quality: quality,
                        title: info.title
                    });

                } catch (e) {
                    console.error('[API] Parse error:', e.message);
                    reject(e);
                }
            });
        }).on('error', (e) => {
            console.error('[API] Request error:', e.message);
            reject(e);
        });
    });
}

function extractVideoId(videoUrl) {
    if (!videoUrl) return null;
    
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/watch\?.*&v=)([a-zA-Z0-9_-]{11})/
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
