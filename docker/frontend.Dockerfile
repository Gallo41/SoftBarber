# ==============================================================================
# SoftBarber Frontend - Production Multi-stage Dockerfile
# Stage 1: Builder (Node.js 20 Alpine)
# Stage 2: Production Web Server & Reverse Proxy (Nginx 1.27 Alpine)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build React/Vite SPA
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências com cache otimizado
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copia código-fonte do frontend
COPY frontend/ ./

# Argumentos e variáveis de compilação
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

# Compilação dos assets estáticos de produção
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Nginx Server
# ------------------------------------------------------------------------------
FROM nginx:1.27-alpine

LABEL maintainer="SoftBarber Team"
LABEL description="SoftBarber Frontend SPA & Reverse Proxy (Nginx)"

# Instala curl para suporte a verificações HTTP adicionais
RUN apk add --no-cache curl

# Remove arquivos estáticos padrão do Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copia build estático do SPA a partir do estágio builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia configuração customizada do Nginx com SPA fallback e proxy reverso
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Exposição da porta padrão HTTP
EXPOSE 80

# Verificação de integridade nativa do contêiner
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Inicialização do servidor Nginx
CMD ["nginx", "-g", "daemon off;"]
