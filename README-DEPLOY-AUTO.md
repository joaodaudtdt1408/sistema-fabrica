# 🚀 Deploy Automático para Render.com

Script PowerShell que automatiza todo o processo de deploy do Sistema Fábrica para Render.com + UptimeRobot.

---

## 📋 Requisitos

- Windows 10/11
- [Node.js](https://nodejs.org) instalado
- [Git](https://git-scm.com) instalado
- Conta no [GitHub](https://github.com)
- Conta no [Render.com](https://render.com)

---

## 🚀 Como Usar

### Opção 1: Clique Duplo (Mais Fácil)

1. Abra a pasta do projeto
2. **Clique duplo** em `deploy-render.bat`
3. Siga as instruções na tela

### Opção 2: PowerShell (Avançado)

```powershell
# Navegue até a pasta do projeto
cd "c:\Users\joaod\OneDrive\Área de Trabalho\fabrica\CascadeProjects\windsurf-project"

# Execute o script
.\deploy-render.ps1
```

### Opção 3: Com Parâmetros

```powershell
.\deploy-render.ps1 -GitHubUsername "seu-usuario" -RepoName "meu-sistema"
```

---

## 📦 O que o script faz?

### 1. **Verificações**
- ✅ Node.js instalado
- ✅ Git instalado
- ✅ Git configurado

### 2. **Git e GitHub**
- 📝 Inicializa repositório (se necessário)
- 📄 Cria `.gitignore`
- 💾 Faz commit das alterações
- ⬆️ Envia código para GitHub

### 3. **Render.com**
- 🔧 Verifica/instala Render CLI
- 🔑 Configura login no Render
- 📦 Prepara configuração do serviço

### 4. **Instruções Finais**
- 📋 Mostra passos para UptimeRobot
- 🔗 Lista URLs importantes

---

## 🎯 Fluxo Completo

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   SEU COMPUTADOR│────▶│     GITHUB      │────▶│     RENDER      │
│                 │     │                 │     │                 │
│ deploy-render   │     │ Repositório     │     │ Web Service     │
│     .bat        │     │    Código       │     │  + PostgreSQL   │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                              ┌──────────────────────────┘
                              ▼
                    ┌─────────────────┐
                    │   UPTIMEROBOT   │
                    │                 │
                    │  Ping a cada    │
                    │   5 minutos     │
                    │                 │
                    └─────────────────┘
```

---

## 📁 Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `deploy-render.ps1` | Script PowerShell principal |
| `deploy-render.bat` | Atalho para clique duplo |
| `render.yaml` | Configuração do Render |
| `.gitignore` | Arquivos ignorados pelo Git |
| `README-DEPLOY.md` | Guia completo de deploy |
| `README-DEPLOY-AUTO.md` | Este arquivo |

---

## ⚠️ Passos Manuais Necessários

O script automatiza 90%, mas você precisa fazer manualmente:

### 1. Criar Repositório GitHub
- Acesse: https://github.com/new
- Nome: `sistema-fabrica` (ou seu nome)
- **⚠️ NÃO** inicialize com README

### 2. Criar Serviço no Render
- Acesse: https://dashboard.render.com
- **New +** → **Blueprint**
- Selecione seu repositório
- Clique **Apply**

### 3. Configurar UptimeRobot
- Acesse: https://uptimerobot.com
- **Add Monitor** → HTTP(s)
- URL: `https://seu-app.onrender.com`
- Intervalo: 5 minutos

---

## 🔧 Solução de Problemas

### "Git não encontrado"
```powershell
# Instale o Git:
# https://git-scm.com/download/win
```

### "Node.js não encontrado"
```powershell
# Instale o Node.js:
# https://nodejs.org (versão LTS recomendada)
```

### "Push falhou"
```powershell
# Configure token de acesso no GitHub:
# 1. Acesse: https://github.com/settings/tokens
# 2. Gere token com permissão 'repo'
# 3. Use no lugar da senha
```

### "Render CLI não instalou"
```powershell
# Instale manualmente:
npm install -g @render/cli

# Ou use o deploy manual (veja README-DEPLOY.md)
```

---

## 📝 Parâmetros do Script

```powershell
.\deploy-render.ps1 [OPÇÕES]

Opções:
  -GitHubUsername "usuario"    Seu usuário do GitHub
  -RepoName "nome-repo"        Nome do repositório
  -RenderServiceName "nome"   Nome do serviço no Render
  -SkipGitHub                  Pular parte do GitHub
  -SkipRender                  Pular parte do Render
```

**Exemplos:**

```powershell
# Com usuário pré-definido
.\deploy-render.ps1 -GitHubUsername "meu-user" -RepoName "fabrica-app"

# Apenas configurar Git
.\deploy-render.ps1 -SkipRender

# Apenas configurar Render
.\deploy-render.ps1 -SkipGitHub
```

---

## 🎉 Resultado Final

Após executar o script e completar os passos manuais:

✅ Sistema online em: `https://seu-app.onrender.com`  
✅ Banco de dados PostgreSQL funcional  
✅ UptimeRobot mantendo sempre ativo  
✅ Atualizações automáticas via Git push  

---

## 💡 Dica Pro

Após o deploy inicial, atualizações são automáticas:

```bash
# Faça alterações no código
git add .
git commit -m "Nova funcionalidade"
git push origin main

# Render faz deploy automaticamente! 🚀
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do script
2. Consulte `README-DEPLOY.md` para instruções detalhadas
3. Verifique documentação do Render: https://render.com/docs

---

**Pronto para deploy? Clique duplo em `deploy-render.bat`!** 🚀
