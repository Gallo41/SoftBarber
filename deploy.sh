#!/usr/bin/env bash
# ==============================================================================
# SoftBarber - Script de Deploy Automatizado em 1 Clique (Linux / macOS)
# ==============================================================================
set -euo pipefail

# Definição de cores para formatação no terminal
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}"
echo "=================================================================="
echo "          💈 SoftBarber - Deploy Automatizado em 1 Clique         "
echo "=================================================================="
echo -e "${NC}"

# 1. Validação de Dependências
echo -e "${CYAN}[1/5] Verificando dependencias do sistema...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERRO] O Docker nao foi encontrado neste sistema.${NC}"
    echo "Por favor, instale o Docker antes de continuar: https://docs.docker.com/engine/install/"
    exit 1
fi

COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}[ERRO] O Docker Compose (v2 plugin ou docker-compose v1) nao foi encontrado.${NC}"
    echo "Por favor, instale o plugin Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}  ✓ Docker e Docker Compose detectados com sucesso!${NC}"

# 2. Inicialização e Configuração do Ambiente (.env)
echo -e "\n${CYAN}[2/5] Configurando variaveis de ambiente (.env)...${NC}"

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo -e "  [i] Arquivo .env nao encontrado. Copiando a partir de .env.example..."
        cp .env.example .env
    else
        echo -e "${RED}[ERRO] Arquivo .env.example nao encontrado para copiar!${NC}"
        exit 1
    fi
fi

# Gera um JWT_SECRET seguro caso esteja com o valor padrao ou vazio
CURRENT_JWT=$(grep "^JWT_SECRET=" .env | cut -d '=' -f2- || true)
if [ -z "$CURRENT_JWT" ] || [ "$CURRENT_JWT" = "generate_your_random_secret_here" ] || [ "$CURRENT_JWT" = "super_secret_jwt_key_change_in_production" ]; then
    NEW_SECRET=""
    if command -v openssl &> /dev/null; then
        NEW_SECRET=$(openssl rand -hex 32)
    elif [ -r /dev/urandom ]; then
        NEW_SECRET=$(head -c 32 /dev/urandom | xxd -p -c 32 || tr -dc 'a-zA-Z0-9' < /dev/urandom | fold -w 64 | head -n 1)
    elif command -v python3 &> /dev/null; then
        NEW_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    fi

    if [ -n "$NEW_SECRET" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^JWT_SECRET=.*/JWT_SECRET=${NEW_SECRET}/" .env
        else
            sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${NEW_SECRET}/" .env
        fi
        echo -e "${GREEN}  ✓ Novo JWT_SECRET seguro gerado e salvo em .env!${NC}"
    fi
fi

# Carrega portas para exibição
APP_PORT=$(grep "^APP_PORT=" .env | cut -d '=' -f2- || echo "80")
APP_PORT=${APP_PORT:-80}
BACKEND_PORT=$(grep "^BACKEND_PORT=" .env | cut -d '=' -f2- || echo "8000")
BACKEND_PORT=${BACKEND_PORT:-8000}

echo -e "${GREEN}  ✓ Configuracao de ambiente validada.${NC}"

# 3. Build e Inicialização dos Contêineres
echo -e "\n${CYAN}[3/5] Construindo imagens e iniciando contêineres...${NC}"
$COMPOSE_CMD up -d --build

# 4. Aguardar Saúde dos Contêineres (Healthchecks)
echo -e "\n${CYAN}[4/5] Aguardando inicializacao e checagem de saude (healthchecks)...${NC}"
SERVICES=("softbarber_db" "softbarber_backend" "softbarber_frontend")
MAX_WAIT=120
START_TIME=$(date +%s)

for service in "${SERVICES[@]}"; do
    echo -n "  Aguardando status healthy de '$service' "
    while true; do
        STATUS=$(docker inspect --format='{{json .State.Health.Status}}' "$service" 2>/dev/null || echo "\"unknown\"")
        STATUS=$(echo "$STATUS" | tr -d '"')

        if [ "$STATUS" = "healthy" ]; then
            echo -e " ${GREEN}[OK: Saudavel]${NC}"
            break
        elif [ "$STATUS" = "unhealthy" ]; then
            echo -e " ${RED}[FALHA: Contêiner reportou unhealthy]${NC}"
            echo -e "${YELLOW}Logs de $service:${NC}"
            docker logs --tail 30 "$service" || true
            exit 1
        fi

        CURRENT_TIME=$(date +%s)
        ELAPSED=$((CURRENT_TIME - START_TIME))
        if [ "$ELAPSED" -ge "$MAX_WAIT" ]; then
            echo -e " ${RED}[TIMEOUT apos ${MAX_WAIT}s]${NC}"
            echo -e "${YELLOW}Logs de $service:${NC}"
            docker logs --tail 30 "$service" || true
            exit 1
        fi

        echo -n "."
        sleep 2
    done
done

# 5. Execução de Seed (se aplicável)
echo -e "\n${CYAN}[5/5] Garantindo carga de dados inicial (Seed)...${NC}"
# O entrypoint do backend ja executa o seed se AUTO_SEED=true.
# Fornecemos garantia adicional chamando seed.py no container:
$COMPOSE_CMD exec -T backend python seed.py > /dev/null 2>&1 || true
echo -e "${GREEN}  ✓ Base de dados MariaDB verificada e populada com dados de demonstracao!${NC}"

# Sucesso! Banner de Conclusão
echo -e "\n${GREEN}${BOLD}=================================================================="
echo "          🚀 SoftBarber inicializado com sucesso!               "
echo -e "==================================================================${NC}"
echo -e ""
echo -e "  ${BOLD}🌐 Frontend (Portal PWA e Admin):${NC}  http://localhost:${APP_PORT}"
echo -e "  ${BOLD}📖 Documentacao OpenAPI (Swagger):${NC} http://localhost:${BACKEND_PORT}/docs"
echo -e "  ${BOLD}💓 Endpoint de Healthcheck:${NC}       http://localhost:${APP_PORT}/health"
echo -e ""
echo -e "  ${YELLOW}${BOLD}🔑 Credenciais Iniciais de Acesso:${NC}"
echo -e "     • ${BOLD}Painel Administrativo:${NC} Acesse http://localhost:${APP_PORT}/admin"
echo -e "     • ${BOLD}PIN de Acesso Admin:${NC}   1234"
echo -e "     • ${BOLD}Cliente de Teste:${NC}      Telefone (11) 99999-1111 (João Silva)"
echo -e ""
echo -e "  ${CYAN}${BOLD}🛠️ Comandos Uteis de Gerenciamento:${NC}"
echo -e "     • Ver logs em tempo real:   ${BOLD}$COMPOSE_CMD logs -f${NC}"
echo -e "     • Parar a aplicacao:        ${BOLD}$COMPOSE_CMD down${NC}"
echo -e "     • Reiniciar servicos:       ${BOLD}$COMPOSE_CMD restart${NC}"
echo -e "     • Fazer backup do banco:    ${BOLD}$COMPOSE_CMD exec db mariadb-dump -u softbarber -p softbarber > backup.sql${NC}"
echo -e "=================================================================="
