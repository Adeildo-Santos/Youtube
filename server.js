const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({ origin: '*' }));
app.use(express.static(__dirname));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Video info usando YouTube API
app.post('/api/video-info', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL é obrigatória' });
    }

    try {
        const videoId = extractVideoId(url);
        
        if (!videoId) {
            return res.status(400).json({ error: 'URL do YouTube inválida' });
        }

        // Usar API alternativa para obter informações
        const infoUrl = `https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${videoId}&format=json`;
        
        https.get(infoUrl, (apiRes) => {
            let data = '';
            
            apiRes.on('data', (chunk) => {
                data += chunk;
            });
            
            apiRes.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    res.json({
                        success: true,
                        title: json.title || 'Vídeo do YouTube',
                        duration: 'Desconhecido',
                        author: json.author_name || 'Desconhecido'
                    });
                } catch (e) {
                    res.json({
                        success: true,
                        title: 'Vídeo do YouTube',
                        duration: 'Desconhecido',
                        author: 'Desconhecido'
                    });
                }
            });
        }).on('error', (e) => {
            res.json({
                success: true,
                title: 'Vídeo do YouTube',
                duration: 'Desconhecido',
                author: 'Desconhecido'
            });
        });
        
    } catch (error) {
        res.status(400).json({ error: 'Erro ao obter informações' });
    }
});

// Download - redirecionar para serviço confiável
app.post('/api/download', (req, res) => {
    const { url, format, quality } = req.body;

    if (!url || !format) {
        return res.status(400).json({ error: 'URL e formato são obrigatórios' });
    }

    try {
        // Redirecionar para serviços confiáveis
        const services = {
            'y2mate': `https://www.y2mate.com/youtube-downloader?url=${encodeURIComponent(url)}`,
            'savefrom': `https://savefrom.net/?url=${encodeURIComponent(url)}`,
            'keepvid': `https://keepvid.com/?url=${encodeURIComponent(url)}`
        };

        res.json({
            success: true,
            message: 'Escolha um serviço para baixar',
            downloadServices: services,
            instructions: [
                '1. Clique no botão abaixo',
                '2. Na nova página, selecione o formato (MP4/MP3)',
                '3. Clique em Download',
                '4. Salve o arquivo'
            ]
        });

    } catch (error) {
        res.status(400).json({ error: 'Erro ao processar' });
    }
});

function extractVideoId(url) {
    let match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
}

app.listen(PORT, () => {
    console.log(`🎬 YouTube Downloader em http://localhost:${PORT}`);
});
