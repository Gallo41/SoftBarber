# ==============================================================================
# SoftBarber - Script de Deploy Automatizado em 1 Clique (Windows PowerShell)
# ==============================================================================
[CmdletBinding()]
param (
    [switch]$Rebuild,
    [switch]$SkipSeed
)

$ErrorActionPreference = "Stop"

function Write-Color {
    param (
        [string]$Text,
        [ConsoleColor]$Color = [ConsoleColor]::White,
        [switch]$NoNewline
    )
    if ($NoNewline) {
        Write-Host $Text -ForegroundColor $Color -NoNewline
    } else {
        Write-Host $Text -ForegroundColor $Color
    }
}

Write-Color "==================================================================" -Color Cyan
Write-Color "          [SoftBarber] - Deploy Automatizado em 1 Clique          " -Color Cyan
Write-Color "==================================================================" -Color Cyan
Write-Host ""

# 1. Validacao do Docker e Docker Compose
Write-Color "[1/5] Verificando pre-requisitos do Docker..." -Color Yellow

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Color "[ERRO] O comando 'docker' nao foi encontrado no PATH do Windows." -Color Red
    Write-Color "Por favor, instale o Docker Desktop para Windows: https://docs.docker.com/desktop/setup/install/windows-install/" -Color Red
    exit 1
}

try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Color "[ERRO] O daemon do Docker Desktop nao parece estar em execucao." -Color Red
        Write-Color "Certifique-se de que o Docker Desktop esta aberto e aguarde a inicializacao completa." -Color Red
        exit 1
    }
} catch {
    Write-Color "[ERRO] Nao foi possivel comunicar com o Docker daemon: $_" -Color Red
    exit 1
}

# Valida Docker Compose v2
$composeCmd = "docker compose"
try {
    $composeVersion = & docker compose version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose error"
    }
} catch {
    if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
        $composeCmd = "docker-compose"
    } else {
        Write-Color "[ERRO] O plugin 'docker compose' nao esta disponivel." -Color Red
        exit 1
    }
}

Write-Color "  [OK] Docker e Docker Compose estao ativos e operacionais!" -Color Green

# 2. Configuracao de Variaveis de Ambiente (.env)
Write-Host ""
Write-Color "[2/5] Configurando variaveis de ambiente (.env)..." -Color Yellow

$envPath = Join-Path $PSScriptRoot ".env"
$envExamplePath = Join-Path $PSScriptRoot ".env.example"

if (-not (Test-Path $envPath)) {
    if (Test-Path $envExamplePath) {
        Write-Color "  [i] Arquivo .env nao encontrado. Copiando a partir de .env.example..." -Color Gray
        Copy-Item -Path $envExamplePath -Destination $envPath
    } else {
        Write-Color "[ERRO] Arquivo .env.example nao encontrado na pasta do projeto." -Color Red
        exit 1
    }
}

# Gerar JWT_SECRET seguro se ainda estiver com valor default
$envLines = Get-Content -Path $envPath
$updatedLines = @()
$secretChanged = $false

foreach ($line in $envLines) {
    if ($line -match "^JWT_SECRET=(.*)$") {
        $val = $matches[1].Trim()
        if ([string]::IsNullOrWhiteSpace($val) -or $val -eq "generate_your_random_secret_here" -or $val -eq "super_secret_jwt_key_change_in_production") {
            $bytes = [byte[]]::new(32)
            [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
            $newSecret = -join ($bytes | ForEach-Object { "{0:x2}" -f $_ })
            $updatedLines += "JWT_SECRET=$newSecret"
            $secretChanged = $true
        } else {
            $updatedLines += $line
        }
    } else {
        $updatedLines += $line
    }
}

if ($secretChanged) {
    $updatedLines | Set-Content -Path $envPath -Encoding UTF8
    Write-Color "  [OK] Novo JWT_SECRET seguro gerado e gravado em .env!" -Color Green
}

# Extrair portas configuradas
$appPort = "80"
$backendPort = "8000"
foreach ($line in (Get-Content -Path $envPath)) {
    if ($line -match "^APP_PORT=(.*)$") {
        $val = $matches[1].Trim()
        if (-not [string]::IsNullOrEmpty($val)) { $appPort = $val }
    }
    if ($line -match "^BACKEND_PORT=(.*)$") {
        $val = $matches[1].Trim()
        if (-not [string]::IsNullOrEmpty($val)) { $backendPort = $val }
    }
}

Write-Color "  [OK] Configuracao de ambiente carregada (Porta Frontend: $appPort, Backend: $backendPort)." -Color Green

# 3. Construcao e Execucao dos Conteineres
Write-Host ""
Write-Color "[3/5] Construindo imagens e subindo a pilha de conteineres..." -Color Yellow

if ($composeCmd -eq "docker compose") {
    & docker compose up -d --build
} else {
    & docker-compose up -d --build
}

if ($LASTEXITCODE -ne 0) {
    Write-Color "[ERRO] Falha ao executar 'docker compose up -d --build'." -Color Red
    exit 1
}

# 4. Checagem de Saude (Healthchecks)
Write-Host ""
Write-Color "[4/5] Aguardando a estabilizacao e saude dos servicos (healthchecks)..." -Color Yellow

$containers = @("softbarber_db", "softbarber_backend", "softbarber_frontend")
$maxWaitSec = 120
$startTime = [DateTime]::UtcNow

foreach ($container in $containers) {
    Write-Color "  Aguardando status healthy de '$container' " -Color White -NoNewline
    
    while ($true) {
        $statusRaw = (& docker inspect --format="{{json .State.Health.Status}}" $container 2>$null)
        $status = if ($statusRaw) { ($statusRaw -replace '[^a-zA-Z]', '').Trim() } else { 'unknown' }

        if ($status -eq "healthy") {
            Write-Color " [OK: Saudavel]" -Color Green
            break
        } elseif ($status -eq "unhealthy") {
            Write-Color " [FALHA: Conteiner reportou unhealthy]" -Color Red
            Write-Color "Logs recentes de ${container}:" -Color Yellow
            docker logs --tail 30 $container
            exit 1
        }

        $elapsed = ([DateTime]::UtcNow - $startTime).TotalSeconds
        if ($elapsed -ge $maxWaitSec) {
            Write-Color " [TIMEOUT apos ${maxWaitSec}s]" -Color Red
            Write-Color "Logs recentes de ${container}:" -Color Yellow
            docker logs --tail 30 $container
            exit 1
        }

        Write-Color "." -Color Gray -NoNewline
        Start-Sleep -Seconds 2
    }
}

# 5. Garantia de Carga de Dados Inicial (Seed)
Write-Host ""
Write-Color "[5/5] Garantindo carga inicial de dados (seed)..." -Color Yellow
if (-not $SkipSeed) {
    if ($composeCmd -eq "docker compose") {
        & docker compose exec -T backend python seed.py | Out-Null
    } else {
        & docker-compose exec -T backend python seed.py | Out-Null
    }
    Write-Color "  [OK] Dados padrao verificados e carregados com sucesso!" -Color Green
} else {
    Write-Color "  [i] Seed ignorado conforme parametro -SkipSeed." -Color Gray
}

# Banner Final de Sucesso
Write-Host ""
Write-Color "==================================================================" -Color Green
Write-Color "          [OK] SoftBarber inicializado com sucesso!               " -Color Green
Write-Color "==================================================================" -Color Green
Write-Host ""
Write-Color "  [>] Frontend (Portal PWA & Admin):   http://localhost:$appPort" -Color White
Write-Color "  [>] Documentacao OpenAPI (Swagger):  http://localhost:${backendPort}/docs" -Color White
Write-Color "  [>] Endpoint de Healthcheck:         http://localhost:${appPort}/health" -Color White
Write-Host ""
Write-Color "  [*] Credenciais Iniciais de Acesso:" -Color Yellow
Write-Color "     - Painel Administrativo:  http://localhost:${appPort}/admin" -Color White
Write-Color "     - PIN de Acesso Admin:    1234" -Color White
Write-Color "     - Cliente de Teste:       Telefone (11) 99999-1111 (Joao Silva)" -Color White
Write-Host ""
Write-Color "  [*] Comandos Uteis de Gerenciamento:" -Color Cyan
Write-Color "     - Ver logs em tempo real: docker compose logs -f" -Color Gray
Write-Color "     - Parar a aplicacao:      docker compose down" -Color Gray
Write-Color "     - Reiniciar servicos:     docker compose restart" -Color Gray
Write-Color "     - Backup do banco:        docker compose exec db mariadb-dump -u softbarber -p softbarber > backup.sql" -Color Gray
Write-Color "==================================================================" -Color Cyan
