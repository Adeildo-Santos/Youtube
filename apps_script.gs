// ==== GOOGLE APPS SCRIPT - YouTube Downloader ====
// Cole este código em Apps Script do Google Sites

// Função para obter informações do vídeo
function getVideoInfo(url) {
  try {
    // Validar URL
    if (!url || !url.includes('youtube.com') && !url.includes('youtu.be')) {
      return { success: false, error: 'URL inválida do YouTube' };
    }

    // Usar yt-dlp via API externa (já que Apps Script não pode executar comandos)
    // Alternativa: usar a API do YouTube Data API
    
    const apiKey = 'SEU_YOUTUBE_API_KEY'; // Você precisa configurar isso
    let videoId = extractVideoId(url);
    
    if (!videoId) {
      return { success: false, error: 'Não foi possível extrair o ID do vídeo' };
    }

    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`;
    
    const response = UrlFetchApp.fetch(apiUrl, {
      muteHttpExceptions: true,
      headers: {
        'Accept': 'application/json'
      }
    });

    const result = JSON.parse(response.getContentText());

    if (!result.items || result.items.length === 0) {
      return { success: false, error: 'Vídeo não encontrado' };
    }

    const video = result.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;
    const duration = parseDuration(contentDetails.duration);

    return {
      success: true,
      title: snippet.title,
      duration: duration,
      thumbnail: snippet.thumbnails.high.url,
      channelTitle: snippet.channelTitle
    };

  } catch (error) {
    return { success: false, error: 'Erro ao obter informações: ' + error.toString() };
  }
}

// Função para extrair ID do vídeo
function extractVideoId(url) {
  let videoId = '';
  
  if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1].split('?')[0];
  } else if (url.includes('youtube.com/watch?v=')) {
    videoId = url.split('v=')[1].split('&')[0];
  } else if (url.includes('youtube.com/live/')) {
    videoId = url.split('live/')[1].split('?')[0];
  }
  
  return videoId;
}

// Função para converter duração ISO 8601 para formato legível
function parseDuration(duration) {
  // Padrão: PT1H30M45S
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  
  let hours = 0, minutes = 0, seconds = 0;
  
  if (match[1]) hours = parseInt(match[1]);
  if (match[2]) minutes = parseInt(match[2]);
  if (match[3]) seconds = parseInt(match[3]);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

// Função para iniciar download (redireciona para serviço externo)
function initiateDownload(url, format, quality) {
  try {
    // Opção 1: Usar um serviço externo como y2mate.com ou similar
    // (Isso contorna as limitações do Apps Script)
    
    const downloadServices = {
      'y2mate': `https://www.y2mate.com/youtube-downloader?url=${encodeURIComponent(url)}`,
      'savefrom': `https://savefrom.net/?url=${encodeURIComponent(url)}`,
      'keepvid': `https://keepvid.com/?url=${encodeURIComponent(url)}`
    };

    // Usar o seu servidor Node.js local/remoto se disponível
    const yourServerUrl = 'http://localhost:3000/api/download';
    
    const payload = {
      url: url,
      format: format,
      quality: quality
    };

    try {
      const response = UrlFetchApp.fetch(yourServerUrl, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      const result = JSON.parse(response.getContentText());
      
      if (result.success) {
        return {
          success: true,
          downloadUrl: result.downloadUrl,
          filename: result.filename
        };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      // Fallback: usar serviço externo
      return {
        success: true,
        downloadUrl: downloadServices.y2mate,
        message: 'Abrindo serviço externo de download...'
      };
    }

  } catch (error) {
    return { success: false, error: 'Erro ao processar download: ' + error.toString() };
  }
}

// Função para testar a conexão com o servidor
function testServerConnection() {
  try {
    const response = UrlFetchApp.fetch('http://localhost:3000/api/health', {
      muteHttpExceptions: true
    });
    return response.getResponseCode() === 200;
  } catch (error) {
    return false;
  }
}

// Fazer essas funções disponíveis para o front-end
function doPost(e) {
  const action = e.parameter.action;
  const data = JSON.parse(e.postData.contents);

  let result;

  switch (action) {
    case 'getVideoInfo':
      result = getVideoInfo(data.url);
      break;
    case 'download':
      result = initiateDownload(data.url, data.format, data.quality);
      break;
    case 'testServer':
      result = { serverConnected: testServerConnection() };
      break;
    default:
      result = { error: 'Ação desconhecida' };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
