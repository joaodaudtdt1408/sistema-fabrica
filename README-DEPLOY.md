# 🚀 Deploy no Render.com + UptimeRobot

Guia completo para hospedar o Sistema Fábrica na nuvem gratuitamente.

---

## 📋 Pré-requisitos

1. Conta no [Render.com](https://render.com) (gratuita)
2. Conta no [GitHub](https://github.com) (para código)
3. Conta no [UptimeRobot](https://uptimerobot.com) (para manter acordado)

---

## 🚀 Passo 1: Preparar o Projeto

### 1.1 Criar repositório Git (se ainda não tiver)

```bash
# No terminal, na pasta do projeto
git init
git add .
git commit -m "Initial commit"

# Criar repositório no GitHub e conectar
git remote add origin https://github.com/SEU_USUARIO/sistema-fabrica.git
git branch -M main
git push -u origin main
```

### 1.2 Arquivos já configurados

✅ `render.yaml` - Configuração automática do Render  
✅ `package.json` - Scripts de build atualizados  

---

## 🌐 Passo 2: Deploy no Render

### 2.1 Criar conta e conectar

1. Acesse [render.com](https://render.com)
2. Clique em **"Get Started for Free"**
3. Faça login com **GitHub**
4. Autorize o Render acessar seus repositórios

### 2.2 Criar Web Service

1. No dashboard, clique em **"New +"** → **"Web Service"**
2. Selecione seu repositório `sistema-fabrica`
3. Configure:

| Campo | Valor |
|-------|-------|
| **Name** | `sistema-fabrica` |
| **Region** | `Ohio (US East)` (ou mais próximo) |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm run render:build` |
| **Start Command** | `npm start` |
| **Plan** | `Free` |

4. Clique em **"Create Web Service"**

### 2.3 Criar Banco de Dados PostgreSQL

1. No dashboard, clique em **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name**: `sistema-fabrica-db`
   - **Region**: Mesma do Web Service
   - **Plan**: `Free`
3. Clique em **"Create Database"**

### 2.4 Configurar Variáveis de Ambiente

1. No seu Web Service, vá em **"Environment"**
2. Adicione estas variáveis:

```
NODE_ENV=production
JWT_SECRET=chave-secreta-muito-forte-aqui
PORT=10000
```

> 💡 O `JWT_SECRET` pode ser qualquer string longa e aleatória

3. A variável `DATABASE_URL` será adicionada automaticamente quando conectar o banco

### 2.5 Conectar Banco ao Web Service

1. No Web Service, vá em **"Environment"**
2. Clique em **"Add Environment Variable"**
3. Selecione **"From another service"**
4. Escolha o banco `sistema-fabrica-db`
5. Use o nome `DATABASE_URL`

---

## ⏰ Passo 3: Configurar UptimeRobot

### 3.1 Criar conta

1. Acesse [uptimerobot.com](https://uptimerobot.com)
2. Crie conta gratuita

### 3.2 Adicionar monitor

1. Clique em **"Add New Monitor"**
2. Configure:

| Campo | Valor |
|-------|-------|
| **Monitor Type** | `HTTP(s)` |
| **Friendly Name** | `Sistema Fábrica` |
| **URL** | `https://sistema-fabrica.onrender.com` (sua URL do Render) |
| **Monitoring Interval** | `5 minutes` (gratuito) |

3. Clique em **"Create Monitor"**

### 3.3 Resultado

✅ UptimeRobot faz ping a cada 5 minutos  
✅ Render nunca "dorme" (sempre ativo)  
✅ Sem delay de 30 segundos!  

---

## 🔧 Passo 4: Adaptar Código para PostgreSQL (Opcional mas Recomendado)

O sistema atualmente usa SQLite. Para produção em Render, recomendo PostgreSQL.

### 4.1 Instalar dependência PostgreSQL

```bash
npm install pg
```

### 4.2 Adaptar database.js

Substituir `sqlite3` por `pg` quando `DATABASE_URL` estiver presente:

```javascript
// database.js - Adicionar no início
const usePostgres = process.env.DATABASE_URL;

if (usePostgres) {
  const { Pool } = require('pg');
  // Configurar PostgreSQL
} else {
  // Manter SQLite para desenvolvimento local
}
```

> 💡 Posso fazer esta adaptação para você. Deseja que eu migre para PostgreSQL?

---

## ✅ Verificação Final

Após deploy, verifique:

```
✅ Build completo sem erros
✅ Web Service "Live"
✅ URL pública acessível
✅ Login funciona
✅ UptimeRobot mostra "Up"
```

---

## 🆘 Troubleshooting

### Erro: "Build failed"

- Verifique se `render:build` está correto no package.json
- Veja logs em **"Logs"** no dashboard do Render

### Erro: "Cannot find module"

- Certifique-se que `node_modules` está no `.gitignore`
- O Render instala automaticamente

### Banco não conecta

- Verifique se `DATABASE_URL` está configurada
- Reinicie o Web Service após adicionar variáveis

### SQLite não persiste dados

- Normal no Render (dados são "ephemeral")
- Solução: Migrar para PostgreSQL ou usar UptimeRobot para minimizar reinícios

---

## 📞 URLs Importantes

| Serviço | URL |
|---------|-----|
| **Render Dashboard** | [dashboard.render.com](https://dashboard.render.com) |
| **UptimeRobot** | [uptimerobot.com](https://uptimerobot.com) |
| **Seu Sistema** | `https://sistema-fabrica.onrender.com` |

---

## 🎉 Pronto!

Seu sistema está na nuvem 24/7 gratuito!

**Próximos passos opcionais:**
- Configurar domínio próprio
- Migrar para PostgreSQL (recomendado)
- Ativar backups automáticos

---

## 💡 Dica Pro

Quer que eu **faça a migração para PostgreSQL** agora? Isso garante que seus dados nunca sejam perdidos, mesmo se o servidor reiniciar.
