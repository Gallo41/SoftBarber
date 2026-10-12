# ==============================================================================
# SoftBarber Backend - Production Dockerfile
# Base: Python 3.12-slim
# ==============================================================================

FROM python:3.12-slim

# Metadados e variáveis de ambiente do Python
LABEL maintainer="SoftBarber Team"
LABEL description="SoftBarber Backend Service (FastAPI + Uvicorn)"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Instala dependências de sistema mínimas (curl para healthcheck HTTP)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Cria usuário não-root appuser com UID/GID 1000 para segurança
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -d /app -s /bin/sh appuser

# Instala dependências Python em camada isolada de cache
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copia código da aplicação e script de inicialização
COPY app/ /app/app/
COPY seed.py /app/seed.py
COPY docker/entrypoint.sh /app/docker/entrypoint.sh

# Garante permissões de execução e propriedade para appuser
RUN chmod +x /app/docker/entrypoint.sh && \
    chown -R appuser:appuser /app

# Execução como usuário não-root
USER appuser

# Exposição da porta do backend FastAPI
EXPOSE 8000

# Verificação de integridade nativa do contêiner
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Script de entrada inteligente
ENTRYPOINT ["/app/docker/entrypoint.sh"]
