const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({ origin: '*' }));
app.use(express.static(__dirname));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Video info usando API externa
app.post('/api/video-info', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL é obrigatória' });
    }

    try {
        console.log('[VIDEO-INFO] Obtendo info de:', url);

        // Usar a API do YouTube Data API via unofficial source
        // Alternativa: usar um serviço que extraia info do YouTube
        
        // Extrair video ID
        let videoId = extractVideoId(url);
        
        if (!videoId) {
            return res.status(400).json({ error: 'URL do YouTube inválida' });
        }

        // Tentar obter info via invidious API (alternativa ao YouTube)
        try {
            const invidious_url = `https://inv.nadeko.net/api/v1/videos/${videoId}`;
            const response = await axios.get(invidious_url, { timeout: 10000 });
            const data = response.data;

            res.json({
                success: true,
                title: data.title || 'Vídeo',
                duration: formatDuration(data.length || 0),
                channel: data.author || 'Desconhecido'
            });
        } catch (e) {
            // Fallback: retornar info genérica
            res.json({
                success: true,
                title: 'Vídeo do YouTube',
                duration: 'Desconhecido',
                channel: 'YouTube'
            });
        }

    } catch (error) {
        console.error('[VIDEO-INFO] Erro:', error.message);
        res.status(400).json({ error: 'Erro ao obter informações' });
    }
});

// Download - redirecionar para serviço externo
app.post('/api/download', async (req, res) => {
    const { url, format, quality } = req.body;

    if (!url || !format) {
        return res.status(400).json({ error: 'URL e formato são obrigatórios' });
    }

    try {
        console.log('[DOWNLOAD] URL:', url, 'Format:', format);

        // Serviços de download disponíveis
        const downloadServices = {
            'y2mate': `https://www.y2mate.com/youtube-downloader?url=${encodeURIComponent(url)}`,
            'savefrom': `https://savefrom.net/?url=${encodeURIComponent(url)}`,
            'ssyoutube': `https://www.ssyoutube.com/`
        };

        // Retornar as opções de download
        res.json({
            success: true,
            message: 'Clique no link abaixo para baixar',
            downloadUrls: downloadServices,
            info: {
                url: url,
                format: format,
                quality: quality
            }
        });

    } catch (error) {
        console.error('[DOWNLOAD] Erro:', error.message);
        res.status(400).json({ error: 'Erro ao processar download' });
    }
});

function extractVideoId(url) {
    // youtube.com/watch?v=ID
    let match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
}

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
    console.log(`📁 Usando serviços externos para download`);
});
