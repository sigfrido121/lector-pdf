# Etapa 1: Construcción del Frontend
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar archivos de configuración y dependencias
COPY package.json package-lock.json ./
RUN npm install

# Copiar el código fuente
COPY . .

# Construir el frontend (genera la carpeta dist)
RUN npm run build

# Etapa 2: Servidor de Producción
FROM node:20-alpine
WORKDIR /app

# Instalar dependencias de producción (incluyendo las del backend)
COPY package.json package-lock.json ./
RUN npm install --only=production

# Copiar el código del backend y el frontend construido
COPY --from=builder /app/dist ./dist
COPY server.js ./
COPY server ./server
COPY services ./services
COPY types.ts ./

# Crear el directorio de subidas y asegurar permisos
RUN mkdir -p uploads && chown -R node:node /app
USER node

# Exponer el puerto del servidor
EXPOSE 3001

# Comando de inicio
CMD ["node", "server.js"]
