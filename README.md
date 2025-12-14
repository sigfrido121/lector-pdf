<<<<<<< HEAD
# LiteReader AI

Una aplicación moderna de lectura de PDFs con asistente AI integrado, construida con React, Vite y Google Gemini AI.

## Características

- 📚 Biblioteca de PDFs con almacenamiento local (IndexedDB)
- 🤖 Asistente AI para responder preguntas sobre el contenido
- 🎨 Temas múltiples (Light, Dark, Sepia)
- 📝 Sistema de resaltado y notas
- ⌨️ Navegación por teclado
- 📱 Diseño responsive

## Requisitos

- Node.js 22.x o superior
- API Key de Google Gemini AI

## Instalación Local

1. Clonar el repositorio:
```bash
git clone https://github.com/tu-usuario/lector-pdf.git
cd lector-pdf
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
Crear un archivo `.env.local` con:
```
API_KEY=tu_api_key_de_gemini
```

4. Iniciar el servidor de desarrollo:
```bash
# Terminal 1 - Backend
node server.js

# Terminal 2 - Frontend
npm run dev
```

## Despliegue con Docker

### Construcción de la imagen

```bash
docker build -t litereader-ai .
```

### Ejecutar con Docker Compose

```bash
docker-compose up -d
```

La aplicación estará disponible en `http://localhost:2024`

### Variables de entorno

Asegúrate de tener un archivo `.env.local` con:
- `API_KEY`: Tu API key de Google Gemini AI
- `PORT`: Puerto del servidor (opcional, por defecto 3001)

## Tecnologías

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Express.js, Node.js
- **AI**: Google Gemini AI SDK
- **PDF**: react-pdf, pdf.js
- **Storage**: IndexedDB (idb)
- **UI**: Lucide Icons, CSS personalizado

## Licencia

MIT
# lector-pdf
=======

# Lector PDF Dockerizado

Proyecto listo para subir a Git y desplegar en un VPS con Docker.

## Uso rápido
```bash
cp .env.example .env
docker compose up --build -d
```

Frontend: http://TU_IP  
Backend: http://TU_IP:3001/health
>>>>>>> 0e603af (first commit)
# lector-pdf
