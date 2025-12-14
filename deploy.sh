#!/bin/bash

# Script de despliegue para LiteReader AI en VPS
# Uso: ./deploy.sh

set -e

echo "🚀 Iniciando despliegue de LiteReader AI..."

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que existe .env.local
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  Advertencia: No se encontró .env.local${NC}"
    echo "Por favor, crea el archivo .env.local con tu API_KEY antes de continuar"
    exit 1
fi

# Detener contenedores existentes
echo -e "${GREEN}📦 Deteniendo contenedores existentes...${NC}"
docker-compose down || true

# Construir la imagen
echo -e "${GREEN}🔨 Construyendo imagen Docker...${NC}"
docker-compose build --no-cache

# Iniciar los contenedores
echo -e "${GREEN}🚀 Iniciando contenedores...${NC}"
docker-compose up -d

# Mostrar logs
echo -e "${GREEN}📋 Mostrando logs...${NC}"
docker-compose logs -f --tail=50

echo -e "${GREEN}✅ Despliegue completado!${NC}"
echo -e "${GREEN}🌐 La aplicación está disponible en el puerto 2024${NC}"
