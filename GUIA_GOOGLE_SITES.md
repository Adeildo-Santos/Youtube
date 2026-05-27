# 🎬 YouTube Downloader - Versão Google Sites

## ⚡ Opção 1: Embutir via iframe (Mais fácil)

### Passo 1: Hospedar o HTML
Você pode usar:
- **GitHub Pages** (grátis)
- **Netlify** (grátis)
- **Vercel** (grátis)
- **Firebase Hosting** (grátis)
- **Seu próprio servidor**

#### Exemplo com Netlify (recomendado):

1. Acesse https://netlify.com
2. Faça login com sua conta Google
3. Clique em "Add new site" → "Deploy manually"
4. Arraste o arquivo `google_sites_version.html`
5. Copie o link gerado (algo como `https://seu-site.netlify.app`)

### Passo 2: Adicionar ao Google Sites

1. Abra seu Google Site
2. Clique em **"+"** (Insert)
3. Procure por **"Incorporar código"** ou **"Embed"**
4. Cole este código, substituindo a URL:

```html
<iframe 
  src="https://seu-site.netlify.app" 
  width="100%" 
  height="800px" 
  style="border: none; border-radius: 12px;"
></iframe>
```

5. Clique em "Insert"
6. **Pronto!** 🎉

---

## ⚙️ Opção 2: Google Apps Script (Integração nativa)

### Passo 1: Criar um Projeto Apps Script

1. Acesse https://script.google.com
2. Clique em **"New project"**
3. Dê um nome: "YouTube Downloader"
4. Cole o código do arquivo `apps_script.gs`
5. Salve (Ctrl+S)

### Passo 2: Deploy como Web App

1. Clique em **"Deploy"** → **"New deployment"**
2. Selecione **Type: "Web app"**
3. Em "Execute as": escolha sua conta Google
4. Em "Who has access": escolha "Anyone"
5. Clique em **"Deploy"**
6. Copie a URL gerada (algo como `https://script.google.com/macros/d/...`)

### Passo 3: Adicionar ao Google Sites

1. Abra seu Google Site
2. Clique em **"+"** (Insert)
3. Selecione **"Incorporar código"**
4. Cole:

```html
<iframe 
  src="https://script.google.com/macros/d/SEU_ID/usercache" 
  width="100%" 
  height="800px" 
  style="border: none;"
></iframe>
```

5. Clique em "Insert"

---

## 🔑 Configurar YouTube Data API (Opcional)

Se quiser obter informações do vídeo direto no Google Sites:

### 1. Criar um projeto no Google Cloud

1. Acesse https://console.cloud.google.com
2. Clique em **"Create Project"**
3. Dê um nome ao projeto
4. Clique em "Create"

### 2. Ativar YouTube Data API

1. Clique em **"APIs & Services"** → **"Library"**
2. Procure por **"YouTube Data API v3"**
3. Clique em "Enable"

### 3. Criar uma chave de API

1. Vá para **"APIs & Services"** → **"Credentials"**
2. Clique em **"Create Credentials"** → **"API Key"**
3. Copie a chave gerada
4. Cole no código do Apps Script (substitua `SEU_YOUTUBE_API_KEY`)

---

## 🚀 Opção 3: Usando seu Servidor Node.js (Melhor controle)

Se você quiser usar o servidor Node.js que criamos:

### 1. Colocar online seu servidor

Você pode usar:
- **AWS EC2** (tenho experiência!)
- **DigitalOcean**
- **Heroku**
- **Replit**
- **PythonAnywhere**

#### Exemplo com Replit:

1. Acesse https://replit.com
2. Clique em "Create"
3. Selecione "Node.js"
4. Cole o código do `server.js`
5. Clique em "Run"
6. Copie a URL (algo como `https://seu-projeto.replit.dev`)

### 2. Atualizar HTML

No arquivo `google_sites_version.html`, mude:

```javascript
const serverUrl = 'http://localhost:3000/api/video-info';
```

Para:

```javascript
const serverUrl = 'https://seu-projeto.replit.dev/api/video-info';
```

E também em:

```javascript
window.open(`http://localhost:3000${data.downloadUrl}`, '_blank');
```

Para:

```javascript
window.open(`https://seu-projeto.replit.dev${data.downloadUrl}`, '_blank');
```

### 3. Adicionar ao Google Sites (via iframe)

```html
<iframe 
  src="https://seu-projeto.replit.dev" 
  width="100%" 
  height="800px" 
  style="border: none;"
></iframe>
```

---

## 📊 Comparação das opções

| Opção | Vantagem | Desvantagem |
|-------|----------|-----------|
| **iframe + Netlify** | Simples, grátis | Sem backend real |
| **Apps Script** | Nativo do Google | Limitado |
| **Server Node.js** | Full control, real | Precisa hospedar servidor |

---

## 🐛 Solução de problemas

### "Iframe recusado por política de CORS"
- Isso significa que o servidor não está configurado para aceitar requisições de sites externos
- Solução: usar o servidor Node.js com CORS habilitado (já está configurado no código)

### "Arquivo não encontrado após download"
- O servidor não conseguiu executar yt-dlp
- Verifique se yt-dlp está instalado: `yt-dlp --version`

### "API Key inválida"
- Você não configurou a chave de API do YouTube
- Crie uma em https://console.cloud.google.com

---

## 💡 Recomendação

Para melhor experiência, eu recomendo:

1. **Usar a versão Netlify** se quiser algo simples
2. **Usar o Server Node.js no Replit** se quiser downloads reais
3. **Combinar ambos**: Netlify para UI + Replit para backend

---

## 📝 Checklist

- [ ] Escolhi uma opção (Netlify, Apps Script ou Node.js)
- [ ] Hospedei o arquivo/servidor
- [ ] Copiei o código de incorporação
- [ ] Adicionei ao Google Sites
- [ ] Testei com uma URL de vídeo
- [ ] Funcionou! 🎉

---

## ✉️ Precisa de ajuda?

Se tiver dúvidas sobre qualquer passo, é só avisar!
