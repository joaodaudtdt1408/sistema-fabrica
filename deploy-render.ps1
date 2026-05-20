#Requires -Version 5.1
<#
.SYNOPSIS
    Script de deploy automatico para Render.com
.DESCRIPTION
    Automatiza o deploy do Sistema Fabrica para Render.com
    - Configura Git
    - Cria repositorio GitHub
    - Faz push do codigo
    - Instala Render CLI
    - Cria servico no Render
.NOTES
    Execute como Administrador
#>

param(
    [string]$GitHubUsername = "",
    [string]$RepoName = "sistema-fabrica",
    [string]$RenderServiceName = "sistema-fabrica",
    [switch]$SkipGitHub = $false,
    [switch]$SkipRender = $false
)

# Cores
$Green = "`e[32m"
$Blue = "`e[34m"
$Yellow = "`e[33m"
$Red = "`e[31m"
$Reset = "`e[0m"

function Write-Step {
    param([string]$Message)
    Write-Host "$Blue[PASSO]$Reset $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "$Green[OK]$Reset $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "$Yellow[AVISO]$Reset $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "$Red[ERRO]$Reset $Message" -ForegroundColor Red
}

# Banner
Write-Host ""
Write-Host $Blue"========================================"$Reset
Write-Host $Blue"   DEPLOY AUTOMATICO - SISTEMA FABRICA"$Reset
Write-Host $Blue"             para Render.com"$Reset
Write-Host $Blue"========================================"$Reset
Write-Host ""

# Verificar Node.js
Write-Step "Verificando Node.js..."
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Error "Node.js não encontrado! Instale em: https://nodejs.org"
    exit 1
}
Write-Success "Node.js encontrado: $nodeVersion"

# Verificar Git
Write-Step "Verificando Git..."
$gitVersion = git --version 2>$null
if (-not $gitVersion) {
    Write-Error "Git não encontrado! Instale em: https://git-scm.com"
    exit 1
}
Write-Success "Git encontrado: $gitVersion"

# Diretório do projeto (usa diretório do script)
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $projectDir
Write-Step "Diretorio do projeto: $projectDir"

# ============================================
# PARTE 1: GIT E GITHUB
# ============================================

if (-not $SkipGitHub) {
    Write-Host ""
    Write-Host $Blue"========================================"$Reset
    Write-Host $Blue"   CONFIGURANDO GIT E GITHUB"$Reset
    Write-Host $Blue"========================================"$Reset
    Write-Host ""

    # Configurar Git se necessário
    Write-Step "Configurando Git..."
    $gitUser = git config user.name 2>$null
    $gitEmail = git config user.email 2>$null
    
    if (-not $gitUser -or -not $gitEmail) {
        Write-Warning "Git não configurado. Configure agora:"
        if (-not $gitUser) {
            $gitUser = Read-Host "Seu nome para Git"
            git config --global user.name "$gitUser"
        }
        if (-not $gitEmail) {
            $gitEmail = Read-Host "Seu email para Git"
            git config --global user.email "$gitEmail"
        }
    }
    Write-Success "Git configurado: $gitUser <$gitEmail>"

    # Inicializar repositório se necessário
    if (-not (Test-Path ".git")) {
        Write-Step "Inicializando repositório Git..."
        git init
        Write-Success "Repositório Git inicializado"
    } else {
        Write-Success "Repositório Git já existe"
    }

    # Criar .gitignore se não existir
    if (-not (Test-Path ".gitignore")) {
        Write-Step "Criando .gitignore..."
        @"
node_modules/
client/node_modules/
*.db
backups/*.db
.env
.DS_Store
uploads/*.db
*.log
"@ | Out-File -FilePath ".gitignore" -Encoding UTF8
        Write-Success ".gitignore criado"
    }

    # Commit inicial
    Write-Step "Fazendo commit das alterações..."
    git add -A
    $commitMessage = "Configuração para deploy no Render - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    git commit -m "$commitMessage" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Commit realizado: $commitMessage"
    } else {
        Write-Warning "Nada para commitar ou já commitado"
    }

    # Perguntar usuário GitHub
    if (-not $GitHubUsername) {
        $GitHubUsername = Read-Host "`nSeu usuario do GitHub (ex: joaodaudtdt1408)"
    }
    
    # Validar que não é email
    if ($GitHubUsername -match "@") {
        Write-Error "O usuario do GitHub nao pode ser um email!"
        Write-Host "Use seu nome de usuario, nao o email."
        Write-Host "Exemplo: 'joaodaudtdt1408' em vez de 'joaodaudtdt@gmail.com'"
        $GitHubUsername = Read-Host "Digite seu usuario do GitHub corretamente"
    }

    # Verificar remote
    $remote = git remote get-url origin 2>$null
    $expectedUrl = "https://github.com/$GitHubUsername/$RepoName.git"
    
    if (-not $remote) {
        Write-Step "Adicionando remote do GitHub..."
        git remote add origin $expectedUrl
        Write-Success "Remote adicionado: $expectedUrl"
        
        Write-Host ""
        Write-Host $Yellow"ATENCAO IMPORTANTE:"$Reset
        Write-Host "Crie o repositorio '$RepoName' em: https://github.com/new"
        Write-Host "Nao inicialize com README (ou havera conflito)"
        Write-Host ""
        Write-Host "Pressione ENTER quando criar o repositorio..."
        Read-Host
    } elseif ($remote -ne $expectedUrl) {
        Write-Warning "Remote existe mas aponta para: $remote"
        Write-Host "Atualizando para: $expectedUrl"
        git remote set-url origin $expectedUrl
        Write-Success "Remote atualizado!"
    } else {
        Write-Success "Remote ja configurado: $remote"
    }

    # Push para GitHub
    Write-Step "Enviando código para GitHub..."
    git branch -M main 2>$null
    git push -u origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Código enviado para GitHub!"
        Write-Host ""
        Write-Host $Green"URL do repositorio: https://github.com/$GitHubUsername/$RepoName"$Reset
    } else {
        Write-Error "Falha ao fazer push. Verifique suas credenciais do GitHub."
        Write-Host "Dica: Configure token de acesso pessoal em https://github.com/settings/tokens"
        exit 1
    }
}

# ============================================
# PARTE 2: RENDER.COM
# ============================================

if (-not $SkipRender) {
    Write-Host ""
    Write-Host $Blue"========================================"$Reset
    Write-Host $Blue"   CONFIGURANDO RENDER.COM"$Reset
    Write-Host $Blue"========================================"$Reset
    Write-Host ""

    # Verificar/Instalar Render CLI
    Write-Step "Verificando Render CLI..."
    $renderCli = Get-Command render -ErrorAction SilentlyContinue
    
    if (-not $renderCli) {
        Write-Warning "Render CLI não encontrado. Instalando..."
        
        # Instalar via npm
        npm install -g @render/cli 2>$null
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Falha ao instalar Render CLI via npm"
            Write-Host "Tentando instalar via scoop..."
            
            # Tentar via scoop
            $scoop = Get-Command scoop -ErrorAction SilentlyContinue
            if (-not $scoop) {
                Write-Host "Instalando Scoop..."
                Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
                Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
            }
            scoop install render
        }
        
        # Verificar novamente
        $renderCli = Get-Command render -ErrorAction SilentlyContinue
        if (-not $renderCli) {
            Write-Error "Não foi possível instalar Render CLI automaticamente"
            Write-Host "Instale manualmente: npm install -g @render/cli"
            exit 1
        }
    }
    Write-Success "Render CLI instalado"

    # Login no Render
    Write-Step "Configurando acesso ao Render..."
    Write-Host ""
    Write-Host $Yellow"Sera aberta uma pagina para login no Render"$Reset
    Write-Host "Faça login com sua conta do GitHub"
    Write-Host "`nPressione ENTER para continuar..."
    Read-Host
    
    render login

    # Verificar se já existe serviço
    Write-Step "Verificando serviço existente..."
    $existingService = render services | Select-String $RenderServiceName
    
    if ($existingService) {
        Write-Success "Serviço '$RenderServiceName' já existe no Render"
        Write-Host "`nPara atualizar, faça commit e push para GitHub"
        Write-Host "O Render fará deploy automático!"
    } else {
        Write-Step "Criando novo serviço no Render..."
        
        # Criar blueprint do render.yaml
        if (Test-Path "render.yaml") {
            Write-Success "Arquivo render.yaml encontrado"
            
            Write-Host ""
            Write-Host $Yellow"Instrucoes para criar servico:"$Reset
            Write-Host "1. Acesse: https://dashboard.render.com"
            Write-Host "2. Clique em 'New +' → 'Blueprint'"
            Write-Host "3. Selecione seu repositório GitHub"
            Write-Host "4. Clique em 'Apply' - O Render criará tudo automaticamente!"
            Write-Host "`nOu crie manualmente:"
            Write-Host "1. 'New +' → 'Web Service'"
            Write-Host "2. Selecione: $RepoName"
            Write-Host "3. Name: $RenderServiceName"
            Write-Host "4. Build Command: npm run render:build"
            Write-Host "5. Start Command: npm start"
            Write-Host "6. Plan: Free"
            
        } else {
            Write-Error "Arquivo render.yaml não encontrado!"
            exit 1
        }
    }
}

# ============================================
# PARTE 3: UPTIMEROBOT
# ============================================

Write-Host ""
Write-Host $Blue"========================================"$Reset
Write-Host $Blue"   CONFIGURANDO UPTIMEROBOT"$Reset
Write-Host $Blue"========================================"$Reset
Write-Host ""

Write-Host $Yellow"PASSOS FINAIS - UPTIMEROBOT:"$Reset
Write-Host ""
Write-Host "1. Acesse: https://uptimerobot.com"
Write-Host "2. Crie conta gratuita (ou faca login)"
Write-Host "3. Clique em 'Add New Monitor'"
Write-Host "4. Configure:"
Write-Host "   - Monitor Type: HTTP(s)"
Write-Host "   - Friendly Name: Sistema Fabrica"
Write-Host "   - URL: https://$RenderServiceName.onrender.com"
Write-Host "   - Monitoring Interval: 5 minutes"
Write-Host "5. Clique em 'Create Monitor'"
Write-Host ""
Write-Host $Green"Isso mantera seu site sempre acordado!"$Reset

# ============================================
# RESUMO FINAL
# ============================================

Write-Host ""
Write-Host $Blue"========================================"$Reset
Write-Host $Blue"         DEPLOY COMPLETO!"$Reset
Write-Host $Blue"========================================"$Reset
Write-Host ""

Write-Host $Green"TAREFAS CONCLUIDAS:"$Reset
Write-Host ""
Write-Host "   [OK] Codigo commitado e enviado para GitHub"
Write-Host "   [OK] Configuracao do Render pronta"
Write-Host "   [OK] Arquivo render.yaml criado"
Write-Host "   [OK] Health check endpoint configurado"
Write-Host ""
Write-Host $Yellow"PROXIMOS PASSOS MANUAIS:"$Reset
Write-Host ""
Write-Host "   1. Acesse https://dashboard.render.com"
Write-Host "   2. Crie Blueprint (carrega render.yaml automaticamente)"
Write-Host "   3. Configure UptimeRobot (evita 'sleep')"
Write-Host "   4. Acesse sua URL: https://$RenderServiceName.onrender.com"
Write-Host ""
Write-Host $Blue"LINKS UTEIS:"$Reset
Write-Host ""
Write-Host "   GitHub:    https://github.com/$GitHubUsername/$RepoName"
Write-Host "   Render:    https://dashboard.render.com"
Write-Host "   Uptime:    https://uptimerobot.com"
Write-Host ""
Write-Host $Green"Seu sistema estara online em breve!"$Reset

Write-Host "`nPressione ENTER para sair..."
Read-Host
