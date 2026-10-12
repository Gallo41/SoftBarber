# Guia de Implantação e Produção (Deploy) - SoftBarber

Este guia contém as instruções completas para implantar o **SoftBarber** em ambiente de produção utilizando contêineres Docker, com suporte a servidores VPS (Hetzner, DigitalOcean, AWS EC2, Linode, etc.), configuração de domínio com HTTPS/SSL automático, rotinas de backup e restauração do banco MariaDB e atualização contínua.

---

## 1. Requisitos Mínimos de Infraestrutura

### Requisitos de Hardware
- **Mínimo:** 1 vCPU, 1 GB de memória RAM, 10 GB de disco SSD (com swap de 1GB a 2GB recomendado).
- **Recomendado:** 2 vCPU, 2 GB a 4 GB de memória RAM, 20 GB de disco SSD.

### Sistemas Operacionais Suportados
- Ubuntu 22.04 LTS / 24.04 LTS *(Recomendado para servidores em nuvem)*
- Debian 12 (Bookworm)
- Rocky Linux 9 / AlmaLinux 9
- Windows Server 2022 / Windows 10/11 Pro (com WSL2 e Docker Desktop)
- macOS (Sonoma / Sequoia)

---

## 2. Preparação do Servidor VPS (Linux)

### 2.1. Atualização do Sistema Operacional
Acesse seu servidor via SSH e atualize os pacotes:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ufw htop
```

### 2.2. Configuração do Firewall (UFW)
Mantenha apenas as portas essenciais abertas:

```bash
# Permitir SSH (se sua porta for diferente de 22, altere conforme necessário)
sudo ufw allow 22/tcp

# Permitir tráfego HTTP e HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Habilitar firewall
sudo ufw enable
sudo ufw status
```

### 2.3. Instalação do Docker e Docker Compose (Oficial)
Instale o Docker Engine e o plugin oficial Docker Compose:

```bash
# Remover versões antigas se existirem
sudo apt remove -y docker docker-engine docker.io containerd runc

# Adicionar repositório oficial do Docker
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Permitir uso do docker sem sudo (opcional para o usuário atual)
sudo usermod -aG docker $USER
newgrp docker
```

Verifique a instalação:
```bash
docker --version
docker compose version
```

---

## 3. Implantação Rápida em 1 Clique

### 3.1. Clonagem do Repositório
Clone o código-fonte no servidor:

```bash
git clone https://github.com/SEU_USUARIO/SoftBarber.git /opt/softbarber
cd /opt/softbarber
```

### 3.2. Configuração de Variáveis de Produção (`.env`)
Copie o modelo de ambiente:

```bash
cp .env.example .env
```

Edite o arquivo `.env` para definir senhas fortes de produção:

```bash
nano .env
```

**Variáveis essenciais de produção:**
```ini
# Banco de Dados
MARIADB_HOST=db
MARIADB_PORT=3306
MARIADB_DATABASE=softbarber
MARIADB_USER=softbarber_prod
MARIADB_PASSWORD=DEFINA_UMA_SENHA_MUITO_FORTE_AQUI_1
MARIADB_ROOT_PASSWORD=DEFINA_UMA_SENHA_ROOT_MUITO_FORTE_AQUI_2

# String de conexão SQLAlchemy correspondente
DATABASE_URL=mysql+pymysql://softbarber_prod:DEFINA_UMA_SENHA_MUITO_FORTE_AQUI_1@db:3306/softbarber

# Chave de assinatura de tokens JWT (gere com: openssl rand -hex 32)
JWT_SECRET=DEFINA_SEU_JWT_SECRET_ALEATORIO_DE_PRODUCAO
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# PIN Administrativo Inicial (altere para o seu PIN confidencial)
DEFAULT_ADMIN_PIN=9876

# Portas
APP_PORT=80
BACKEND_PORT=8000
AUTO_SEED=true
```

> **Dica de Segurança:** Para gerar senhas e chaves criptográficas seguras, execute no terminal:
> ```bash
> openssl rand -hex 32
> ```

### 3.3. Executando o Deploy em 1 Clique
No Linux/macOS:
```bash
chmod +x deploy.sh
./deploy.sh
```

No Windows (PowerShell com permissão de execução):
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\deploy.ps1
```

O script realizará:
1. Validação de pré-requisitos (Docker e Docker Compose).
2. Geração automática de `JWT_SECRET` se não estiver configurado.
3. Compilação otimizada do frontend e backend (`docker compose up -d --build`).
4. Monitoramento da saúde de todos os contêineres (`healthchecks`).
5. Carga inicial de dados (serviços, profissionais e horários padrão).
6. Exibição do resumo final de acesso.

---

## 4. Configuração de Domínio e Certificado HTTPS / SSL

Para colocar o SoftBarber na internet sob um domínio próprio (ex: `barbearia.meudominio.com.br`) com certificado SSL gratuito e renovação automática, utilize uma das opções abaixo:

### Opção A: Caddy Server (Recomendado - Mais Simples e Automático)
O **Caddy** gerencia certificados Let's Encrypt automaticamente sem necessidade de scripts ou cron.

1. Instale o Caddy no host do servidor:
   ```bash
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update
   sudo apt install -y caddy
   ```

2. No `.env` do SoftBarber, configure `APP_PORT=8080` (para liberar a porta 80 para o Caddy):
   ```ini
   APP_PORT=8080
   ```
   Reinicie a pilha: `docker compose up -d`

3. Edite o arquivo `/etc/caddy/Caddyfile`:
   ```caddy
   barbearia.meudominio.com.br {
       reverse_proxy 127.0.0.1:8080
   }
   ```

4. Recarregue o Caddy:
   ```bash
   sudo systemctl reload caddy
   ```
   *Pronto! O Caddy emitirá o certificado SSL Let's Encrypt automaticamente.*

---

### Opção B: Nginx Host com Certbot / Let's Encrypt

1. Configure `APP_PORT=8080` no `.env` do SoftBarber e reinicie os contêineres:
   ```bash
   docker compose up -d
   ```

2. Instale Nginx e Certbot:
   ```bash
   sudo apt install -y nginx certbot python3-certbot-nginx
   ```

3. Crie a configuração do site `/etc/nginx/sites-available/softbarber`:
   ```nginx
   server {
       server_name barbearia.meudominio.com.br;

       location / {
           proxy_pass http://127.0.0.1:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

4. Ative o site e emita o certificado SSL:
   ```bash
   sudo ln -s /etc/nginx/sites-available/softbarber /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   sudo certbot --nginx -d barbearia.meudominio.com.br
   ```

---

## 5. Rotina de Backup e Restauração do MariaDB

### 5.1. Backup Manual Imediato
Para criar uma cópia de segurança completa do banco de dados:

```bash
mkdir -p /opt/softbarber/backups
docker compose exec -T db mariadb-dump -u root -p$(grep "^MARIADB_ROOT_PASSWORD=" .env | cut -d '=' -f2-) softbarber | gzip > /opt/softbarber/backups/softbarber_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 5.2. Backup Automatizado Diário com Rotação (Cron)
Crie o script `/opt/softbarber/scripts/backup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/opt/softbarber"
BACKUP_DIR="${PROJECT_DIR}/backups"
mkdir -p "$BACKUP_DIR"

cd "$PROJECT_DIR"
ROOT_PASS=$(grep "^MARIADB_ROOT_PASSWORD=" .env | cut -d '=' -f2-)
DB_NAME=$(grep "^MARIADB_DATABASE=" .env | cut -d '=' -f2- || echo "softbarber")
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${DATE}.sql.gz"

echo "[*] Realizando backup de $DB_NAME..."
docker compose exec -T db mariadb-dump -u root -p"${ROOT_PASS}" "${DB_NAME}" | gzip > "$BACKUP_FILE"
echo "[+] Backup salvo em: $BACKUP_FILE"

# Excluir backups com mais de 7 dias (retenção rotativa)
find "$BACKUP_DIR" -type f -name "backup_${DB_NAME}_*.sql.gz" -mtime +7 -delete
echo "[+] Politica de retencao aplicada (7 dias)."
```

Dê permissão de execução:
```bash
chmod +x /opt/softbarber/scripts/backup.sh
```

Adicione ao crontab para rodar toda madrugada às 03:00:
```bash
crontab -e
```
Adicione a linha:
```cron
0 3 * * * /opt/softbarber/scripts/backup.sh >> /var/log/softbarber_backup.log 2>&1
```

---

### 5.3. Restauração de Backup (Restore)
Para restaurar um backup existente:

1. Descompacte o arquivo `.sql.gz` ou aponte diretamente com `gunzip`:
   ```bash
   gunzip -k /opt/softbarber/backups/backup_softbarber_20261012_030000.sql.gz
   ```

2. Restaure para o contêiner do MariaDB:
   ```bash
   ROOT_PASS=$(grep "^MARIADB_ROOT_PASSWORD=" .env | cut -d '=' -f2-)
   docker compose exec -T db mariadb -u root -p"${ROOT_PASS}" softbarber < /opt/softbarber/backups/backup_softbarber_20261012_030000.sql
   ```

3. Reinicie o backend para sincronizar caches e sessões ativas:
   ```bash
   docker compose restart backend
   ```

---

## 6. Atualização de Versão (Deploy Contínuo)

Para atualizar o SoftBarber com novas funcionalidades ou correções mantendo os dados persistidos:

```bash
cd /opt/softbarber

# 1. Puxar alterações do repositório
git pull origin main

# 2. Reconstruir e subir imagens atualizadas
docker compose up -d --build

# 3. Verificar status dos contêineres
docker compose ps
```

*Como o volume `mariadb_data` é independente, seus agendamentos, clientes e transações permanecem 100% preservados durante qualquer atualização de contêiner.*

---

## 7. Comandos de Gerenciamento e Diagnóstico

| Ação | Comando |
|---|---|
| **Ver contêineres e status de saúde** | `docker compose ps` |
| **Acompanhar logs de todos os serviços** | `docker compose logs -f` |
| **Acompanhar logs apenas do backend** | `docker compose logs -f backend` |
| **Acompanhar logs do proxy frontend (Nginx)** | `docker compose logs -f frontend` |
| **Testar endpoint de saúde** | `curl -i http://localhost/health` |
| **Reiniciar todos os serviços** | `docker compose restart` |
| **Interromper todos os serviços** | `docker compose down` |
| **Reinicializar recriando contêineres** | `docker compose up -d --force-recreate` |
| **Acessar o terminal do contêiner backend** | `docker compose exec backend bash` |
| **Acessar o console interativo do MariaDB** | `docker compose exec db mariadb -u softbarber -p softbarber` |

---

## 8. Solução de Problemas Frequentes (Troubleshooting)

### Porta 80 já em uso no host
Se você receber a mensagem `Bind for 0.0.0.0:80 failed: port is already allocated`:
- Outro serviço (ex: Apache ou Nginx do host) está ocupando a porta 80.
- Altere `APP_PORT=8080` no seu `.env` e acesse via `http://localhost:8080`, ou configure um proxy reverso no host.

### Banco de dados não inicializa por falta de memória
O MariaDB exige pelo menos 512MB livres. Em VPS pequenas (1GB RAM):
- Configure swap no Linux:
  ```bash
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```

---
*SoftBarber - Tecnologia de ponta para gestão e agendamento de barbearias.*
