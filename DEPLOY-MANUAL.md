# 🚀 Deploy Manual no Render.com

Guia passo a passo para publicar seu Sistema Fábrica na nuvem.

---

## 📋 ANTES DE COMEÇAR

Você precisa ter:
- ✅ Conta no [GitHub](https://github.com)
- ✅ Conta no [Render](https://render.com)
- ✅ Código do projeto no seu computador

---

## 🎯 PASSO 1: Enviar Código para GitHub

### 1.1 Abra o Terminal

Pressione `Win + R`, digite `cmd` e pressione Enter.

### 1.2 Navegue até a pasta do projeto

```cmd
cd "C:\Users\joaod\OneDrive\Área de Trabalho\fabrica\CascadeProjects\windsurf-project"
```

### 1.3 Verifique se Git está inicializado

```cmd
git status
```

Se aparecer "not a git repository", execute:
```cmd
git init
```

### 1.4 Configure seu Git (se ainda não configurou)

```cmd
git config user.name "Seu Nome"
git config user.email "seu.email@exemplo.com"
```

### 1.5 Adicione os arquivos e faça commit

```cmd
git add .
git commit -m "Configuracao para deploy no Render"
```

### 1.6 Conecte ao GitHub

1. Acesse https://github.com/new
2. **Repository name:** `sistema-fabrica`
3. **⚠️ NÃO marque** "Add a README file"
4. **⚠️ NÃO marque** "Add .gitignore"
5. Clique **"Create repository"**

### 1.7 Envie o código

No terminal, execute os comandos que o GitHub mostrar (será algo assim):

```cmd
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/sistema-fabrica.git
git push -u origin main
```

> 💡 Se pedir senha, use seu **Token de Acesso Pessoal** do GitHub (crie em: https://github.com/settings/tokens)

---

## 🌐 PASSO 2: Criar Conta no Render

1. Acesse https://render.com
2. Clique **"Get Started for Free"**
3. Faça login com **GitHub** (mais fácil)
4. Autorize o Render a acessar seus repositórios

---

## 🔧 PASSO 3: Criar Web Service no Render

### 3.1 Iniciar Criação

1. No dashboard do Render, clique **"New +"** (canto superior direito)
2. Selecione **"Web Service"**

### 3.2 Conectar Repositório

1. Encontre e selecione: **`sistema-fabrica`**
2. Clique **"Connect"**

### 3.3 Configurar Serviço

Preencha os campos:

| Campo | Valor |
|-------|-------|
| **Name** | `sistema-fabrica` |
| **Region** | `Ohio (US East)` |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm run render:build` |
| **Start Command** | `npm start` |
| **Plan** | `Free` |

### 3.4 Configurar Variáveis de Ambiente

Clique em **"Advanced"** e depois **"Add Environment Variable"**:

Adicione estas:

```
NODE_ENV=production
JWT_SECRET=sua-chave-secreta-muito-forte-aqui-123456
```

> 💡 O `JWT_SECRET` pode ser qualquer texto longo e aleatório

### 3.5 Criar Serviço

Clique **"Create Web Service"**

**Aguarde o build** (pode levar 3-5 minutos)

---

## 💾 PASSO 4: Criar Banco de Dados (Opcional mas Recomendado)

### 4.1 Criar PostgreSQL

1. No dashboard, clique **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name:** `sistema-fabrica-db`
   - **Region:** Mesma do Web Service
   - **Plan:** `Free`
3. Clique **"Create Database"**

### 4.2 Conectar Banco ao Web Service

1. Vá no seu **Web Service** → **"Environment"**
2. Clique **"Add Environment Variable"**
3. Selecione **"From another service"**
4. Escolha: `sistema-fabrica-db`
5. Nome da variável: `DATABASE_URL`
6. Clique **"Add"**

---

## ⚡ PASSO 5: Configurar UptimeRobot (Mantém Sempre Ativo)

### 5.1 Criar Conta

1. Acesse https://uptimerobot.com
2. Crie conta gratuita

### 5.2 Adicionar Monitor

1. Clique **"Add New Monitor"**
2. Configure:

| Campo | Valor |
|-------|-------|
| **Monitor Type** | `HTTP(s)` |
| **Friendly Name** | `Sistema Fabrica` |
| **URL** | `https://sistema-fabrica.onrender.com` (sua URL) |
| **Monitoring Interval** | `5 minutes` |

3. Clique **"Create Monitor"**

### 5.3 Resultado

✅ UptimeRobot faz "ping" a cada 5 minutos  
✅ Render nunca "dorme"  
✅ Sem delay de 30 segundos!

---

## ✅ VERIFICAÇÃO FINAL

Após tudo configurado:

1. **Aguarde** o status ficar "Live" no Render
2. Acesse sua URL: `https://sistema-fabrica.onrender.com`
3. Faça login com seu usuário e senha
4. Teste as funcionalidades

---

## 🔗 URLs Importantes

| Serviço | Link |
|---------|------|
| Seu Sistema | `https://sistema-fabrica.onrender.com` |
| Render Dashboard | https://dashboard.render.com |
| UptimeRobot | https://uptimerobot.com |
| Seu GitHub | https://github.com/SEU_USUARIO/sistema-fabrica |

---

## 🆘 PROBLEMAS COMUNS

### "Build Failed"

Verifique o log de build no Render. Problemas comuns:
- Erro de sintaxe no código
- Dependências faltando
- Script `render:build` não existe no package.json

### "Repository not found"

- Verifique se o repositório é público
- Ou conceda permissão ao Render para acessar repositórios privados

### SQLite perde dados

Isso é normal no plano gratuito. Soluções:
1. Usar PostgreSQL (recomendado)
2. Configurar UptimeRobot para minimizar reinícios
3. Fazer backups regulares

### "Application Error" ao acessar

Verifique os logs no Render:
1. Vá no Web Service → **"Logs"**
2. Procure mensagens de erro vermelhas
3. Corrija o problema e faça novo push

---

## 🔄 ATUALIZAR O SISTEMA

Após o deploy inicial, atualizações são automáticas:

```cmd
# Faça alterações no código
git add .
git commit -m "Nova funcionalidade"
git push origin main
```

**O Render faz deploy automaticamente!** 🎉

---

## 📞 PRECISA DE AJUDA?

- Documentação Render: https://render.com/docs
- Suporte Render: https://render.com/support
- Logs do sistema: Dashboard → Web Service → Logs

---

## 🎉 PARABÉNS!

Seu Sistema Fábrica está online! Compartilhe a URL com sua equipe.

**URL do seu sistema:** `https://sistema-fabrica.onrender.com`
