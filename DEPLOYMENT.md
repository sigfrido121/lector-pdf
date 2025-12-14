# Instrucciones de Despliegue en VPS

## Requisitos previos en el VPS

1. Docker y Docker Compose instalados
2. Git instalado
3. Acceso SSH al VPS

## Pasos para desplegar

### 1. Conectar al VPS

```bash
ssh usuario@tu-vps-ip
```

### 2. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/lector-pdf.git
cd lector-pdf
```

### 3. Configurar variables de entorno

Crear el archivo `.env.local`:

```bash
nano .env.local
```

Agregar:
```
API_KEY=tu_api_key_de_gemini_aqui
PORT=3001
NODE_ENV=production
```

Guardar con `Ctrl+O`, Enter, `Ctrl+X`

### 4. Ejecutar el script de despliegue

```bash
./deploy.sh
```

O manualmente:

```bash
# Construir la imagen
docker-compose build

# Iniciar el contenedor
docker-compose up -d

# Ver logs
docker-compose logs -f
```

### 5. Verificar que está funcionando

```bash
curl http://localhost:2024
```

### 6. Configurar firewall (si es necesario)

```bash
# UFW
sudo ufw allow 2024/tcp

# iptables
sudo iptables -A INPUT -p tcp --dport 2024 -j ACCEPT
```

## Comandos útiles

### Ver logs
```bash
docker-compose logs -f litereader
```

### Reiniciar el contenedor
```bash
docker-compose restart
```

### Detener el contenedor
```bash
docker-compose down
```

### Actualizar la aplicación
```bash
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Ver estado del contenedor
```bash
docker-compose ps
```

## Configurar Nginx como reverse proxy (opcional)

Si quieres usar un dominio:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:2024;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Luego:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Configurar SSL con Let's Encrypt (opcional)

```bash
sudo certbot --nginx -d tu-dominio.com
```

## Troubleshooting

### El contenedor no inicia
```bash
docker-compose logs litereader
```

### Puerto ya en uso
```bash
sudo lsof -i :2024
# Matar el proceso si es necesario
sudo kill -9 <PID>
```

### Problemas de permisos
```bash
sudo chown -R $USER:$USER .
```
