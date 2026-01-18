# Guia de Deploy - Typing Book Trainer

## 📋 Pré-requisitos

- Conta no GitHub (com o código commitado)
- Conta no MongoDB Atlas (já configurada)
- Conta no Netlify (para frontend)
- Conta no Render ou Railway (para backend)

---

## 🚀 Parte 1: Deploy do Backend (Render)

### Passo 1: Preparar o repositório

1. Certifique-se de que todos os arquivos estão commitados:
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Passo 2: Deploy no Render

1. Acesse: https://dashboard.render.com
2. Clique em **"New +"** → **"Web Service"**
3. Conecte seu repositório GitHub
4. Selecione o repositório do projeto
5. Configure o serviço:
   - **Name**: `typing-trainer-api` (ou o nome que preferir)
   - **Environment**: `Node`
   - **Region**: Escolha a mais próxima (ex: `Oregon (US West)`)
   - **Branch**: `main` (ou sua branch principal)
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
6. Clique em **"Advanced"** e adicione as variáveis de ambiente:
   ```
   PORT=10000
   MONGODB_URI=sua-string-de-conexao-do-mongodb-atlas
   JWT_SECRET=seu-secret-key-aleatorio-muito-longo-minimo-32-caracteres
   CLIENT_ORIGIN=https://seu-site.netlify.app
   NODE_ENV=production
   ```
   **Importante**: 
   - Substitua `sua-string-de-conexao-do-mongodb-atlas` pela sua URI do MongoDB Atlas
   - Substitua `seu-secret-key-aleatorio-muito-longo` por uma string aleatória segura
   - O `CLIENT_ORIGIN` será atualizado depois com a URL do Netlify
7. Selecione o plano **"Free"**
8. Clique em **"Create Web Service"**
9. Aguarde o deploy (pode levar 5-10 minutos)
10. **Anote a URL do seu backend** (ex: `https://typing-trainer-api.onrender.com`)

### Passo 3: Testar o backend

1. Acesse: `https://sua-url.onrender.com/health`
2. Deve retornar: `{"status":"ok"}`

---

## 🎨 Parte 2: Deploy do Frontend (Netlify)

### Passo 1: Deploy no Netlify

1. Acesse: https://app.netlify.com
2. Clique em **"Add new site"** → **"Import an existing project"**
3. Conecte seu repositório GitHub
4. Selecione o repositório do projeto
5. Configure o build:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `client/dist`
6. Clique em **"Show advanced"** e adicione variáveis de ambiente:
   ```
   VITE_API_URL=https://sua-url-backend.onrender.com/api
   ```
   **Importante**: Substitua `sua-url-backend.onrender.com` pela URL do seu backend no Render
7. Clique em **"Deploy site"**
8. Aguarde o build (pode levar 2-5 minutos)
9. **Anote a URL do seu site** (ex: `https://typing-trainer.netlify.app`)

### Passo 2: Atualizar CORS no backend

1. Volte ao Render Dashboard
2. Vá em **"Environment"** → Edite a variável `CLIENT_ORIGIN`
3. Atualize para a URL do Netlify (sem barra no final):
   ```
   CLIENT_ORIGIN=https://seu-site.netlify.app
   ```
4. Clique em **"Save Changes"**
5. O serviço será reiniciado automaticamente

---

## ✅ Parte 3: Verificação Final

### Testar a aplicação:

1. Acesse a URL do Netlify
2. Teste o registro de um novo usuário
3. Teste o login
4. Importe um livro .txt
5. Teste a digitação e verifique se o progresso salva

### Checklist:

- [ ] Backend está rodando (teste `/health`)
- [ ] Frontend está acessível
- [ ] Registro de usuário funciona
- [ ] Login funciona
- [ ] Importação de livro funciona
- [ ] Progresso salva corretamente
- [ ] CORS está configurado corretamente

---

## 🔧 Troubleshooting

### Erro: "Failed to fetch" no frontend
- Verifique se `VITE_API_URL` está configurada corretamente no Netlify
- Verifique se o backend está rodando
- Verifique se `CLIENT_ORIGIN` no backend está com a URL correta do Netlify

### Erro: CORS no navegador
- Certifique-se de que `CLIENT_ORIGIN` no backend está exatamente como a URL do Netlify (sem barra no final)
- Reinicie o serviço no Render após atualizar

### Erro: Build falha no Netlify
- Verifique se `Base directory` está como `client`
- Verifique se `Publish directory` está como `client/dist`
- Verifique os logs de build no Netlify

### Erro: Backend não inicia
- Verifique se todas as variáveis de ambiente estão configuradas
- Verifique os logs no Render Dashboard
- Certifique-se de que `PORT` está configurado (Render usa 10000)

### MongoDB não conecta
- Verifique se a string de conexão está correta
- Verifique se o IP está whitelisted no MongoDB Atlas (ou use `0.0.0.0/0` para desenvolvimento)
- Verifique se o usuário do banco tem permissões

---

## 📝 URLs importantes

- **Netlify Dashboard**: https://app.netlify.com
- **Render Dashboard**: https://dashboard.render.com
- **MongoDB Atlas**: https://cloud.mongodb.com
- **Railway** (alternativa): https://railway.app

---

## 🔄 Atualizações futuras

Para fazer deploy de atualizações:

1. Faça commit das mudanças:
```bash
git add .
git commit -m "Descrição das mudanças"
git push origin main
```

2. O Netlify e Render detectarão automaticamente e farão redeploy

---

## 💡 Dicas

- **Render Free Tier**: O serviço "dorme" após 15 minutos de inatividade. A primeira requisição pode demorar ~30 segundos para acordar
- **Netlify**: O build é automático a cada push na branch principal
- **MongoDB Atlas**: O plano gratuito tem 512MB, suficiente para muitos livros comprimidos
- **Variáveis de ambiente**: Nunca commite arquivos `.env` no Git

---

## 🆘 Suporte

Se encontrar problemas:
1. Verifique os logs no Render Dashboard (backend)
2. Verifique os logs no Netlify (frontend)
3. Verifique o console do navegador (F12)
4. Teste os endpoints diretamente (ex: `https://seu-backend.onrender.com/health`)

