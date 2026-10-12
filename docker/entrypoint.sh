#!/bin/sh
set -e

echo "[entrypoint] Iniciando inicializacao do backend SoftBarber..."

# 1. Aguarda conectividade com o banco de dados (se MySQL / MariaDB)
python - << 'EOF'
import sys
import time
from sqlalchemy import text
from app.core.config import settings
from app.core.database import engine, Base

db_url = settings.DATABASE_URL
if "mysql" in db_url or "mariadb" in db_url:
    target_info = db_url.split('@')[-1] if '@' in db_url else 'configurado'
    print(f"[entrypoint] Verificando conexao com banco de dados MariaDB/MySQL ({target_info})...")
    max_retries = 30
    retry_interval = 2
    connected = False
    for attempt in range(1, max_retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("[entrypoint] Conexao com o banco de dados estabelecida com sucesso!")
            connected = True
            break
        except Exception as e:
            if attempt == max_retries:
                print(f"[entrypoint] ERRO: Nao foi possivel conectar ao banco apos {max_retries} tentativas: {e}", file=sys.stderr)
                sys.exit(1)
            print(f"[entrypoint] Tentativa {attempt}/{max_retries}: banco indisponivel. Aguardando {retry_interval}s...")
            time.sleep(retry_interval)

# Garante criacao inicial das tabelas
try:
    Base.metadata.create_all(bind=engine)
    print("[entrypoint] Tabelas verificadas/criadas no banco de dados.")
except Exception as e:
    print(f"[entrypoint] Aviso ao verificar tabelas: {e}", file=sys.stderr)
EOF

# 2. Execucao de auto-seed se solicitado
if [ "$AUTO_SEED" = "true" ] || [ "$AUTO_SEED" = "1" ]; then
    echo "[entrypoint] AUTO_SEED ativo. Executando seed.py..."
    python seed.py
fi

# 3. Inicializa o servidor web Uvicorn
echo "[entrypoint] Inicializando Uvicorn na porta 8000..."
if [ $# -eq 0 ] || [ "${1#-}" != "$1" ]; then
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 "$@"
else
    exec "$@"
fi
