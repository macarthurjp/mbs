# 🚀 Guía de Despliegue Completo en Producción

Esta guía explica cómo desplegar la aplicación completa de Boutique POS en un servidor Ubuntu usando el script automatizado `deploy-production.sh`.

## 📋 Prerrequisitos

### En el Servidor Ubuntu

- **Ubuntu Server 20.04+** (limpio o existente)
- **Acceso root** (sudo)
- **Memoria RAM**: Mínimo 2GB recomendado
- **Espacio en disco**: Mínimo 10GB disponible
- **Dominio o IP pública** para acceder a la aplicación

### En tu Máquina Local

- El código de la aplicación listo para transferir
- Acceso SSH al servidor

## 🎯 Proceso de Despliegue

### Paso 1: Transferir la Aplicación al Servidor

Desde tu máquina local, copia la aplicación al servidor:

```bash
# Opción 1: Usar rsync (recomendado)
rsync -avz --exclude 'node_modules' --exclude 'dist' \
  /ruta/local/boutique-pos \
  root@tu-servidor:/opt/

# Opción 2: Usar scp
scp -r /ruta/local/boutique-pos root@tu-servidor:/opt/

# Opción 3: Usar Git (si tienes repositorio privado)
ssh root@tu-servidor
cd /opt
git clone https://tu-repositorio.git boutique-pos
```

### Paso 2: Conectar al Servidor

```bash
ssh root@tu-servidor
```

### Paso 3: Ir al Directorio de la Aplicación

```bash
cd /opt/boutique-pos
```

### Paso 4: Ejecutar el Script de Despliegue

```bash
# Dar permisos de ejecución
chmod +x deploy-production.sh

# Ejecutar como root
sudo ./deploy-production.sh
```

## 🎬 Ejemplo de Ejecución Interactiva

```bash
$ sudo ./deploy-production.sh

╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Boutique POS - Despliegue en Producción             ║
║   Instalación completa en Ubuntu Server                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

⚠ Este script realizará una instalación COMPLETA:
  ✓ Instalar Node.js, MySQL, Nginx, PM2
  ✓ Configurar la aplicación en /opt/boutique-pos
  ✓ Crear y migrar base de datos MySQL
  ✓ Compilar el frontend y backend
  ✓ Configurar Nginx como proxy inverso
  ✓ Configurar PM2 para gestión de procesos
  ✓ Configurar firewall (UFW)
  ✓ (Opcional) Configurar SSL con Let's Encrypt

¿Desea continuar con el despliegue completo? [s/N]: s

═══════════════════════════════════════════════════════════
  PASO 1: Configuración General
═══════════════════════════════════════════════════════════

Dominio o IP del servidor: mitienda.com
¿Desea configurar SSL con Let's Encrypt? [s/N]: s
Email para Let's Encrypt: admin@mitienda.com

═══════════════════════════════════════════════════════════
  PASO 2: Configuración de MySQL
═══════════════════════════════════════════════════════════

Nombre de la base de datos [boutique_db]:
Usuario de MySQL [boutique_user]:
Contraseña del usuario MySQL: ********

═══════════════════════════════════════════════════════════
  PASO 3: Configuración de la Aplicación
═══════════════════════════════════════════════════════════

Puerto del servidor backend [3001]:
✓ JWT Secret generado automáticamente

Usuario administrador [admin]:
Contraseña del administrador: ********
Email del administrador [admin@boutique.com]: admin@mitienda.com
Nombre completo del administrador [Administrador]: Juan Pérez

...
```

## 📦 ¿Qué Hace el Script?

El script `deploy-production.sh` automatiza completamente el despliegue:

### 1. Instalación de Software Base
- ✅ Node.js 20.x
- ✅ MySQL Server 8.0+
- ✅ Nginx
- ✅ PM2 (gestor de procesos)
- ✅ Certbot (para SSL)

### 2. Configuración de Base de Datos
- ✅ Crea la base de datos MySQL
- ✅ Crea el usuario de base de datos
- ✅ Ejecuta todas las migraciones
- ✅ Crea las tablas necesarias
- ✅ Inserta usuario administrador

### 3. Configuración de la Aplicación
- ✅ Instala todas las dependencias
- ✅ Genera archivo `.env` con variables de producción
- ✅ Crea el servidor backend (API REST)
- ✅ Compila el frontend (React + Vite)
- ✅ Compila el backend (TypeScript)

### 4. Configuración de Servicios
- ✅ Configura PM2 para ejecutar el backend en cluster
- ✅ Configura Nginx como proxy inverso
- ✅ Configura SSL con Let's Encrypt (opcional)
- ✅ Configura firewall UFW

### 5. Seguridad
- ✅ Firewall configurado (puertos 22, 80, 443)
- ✅ SSL/HTTPS (si se habilita)
- ✅ Headers de seguridad en Nginx
- ✅ Contraseñas hasheadas con bcrypt

## 🗂️ Estructura de Archivos Final

Después del despliegue, la estructura será:

```
/opt/boutique-pos/
├── dist/                    # Frontend compilado (servido por Nginx)
├── dist-server/             # Backend compilado (ejecutado por PM2)
├── server/
│   └── index.ts            # Código del backend
├── src/                    # Código fuente del frontend
├── logs/                   # Logs de PM2
├── node_modules/           # Dependencias
├── .env                    # Variables de entorno
├── ecosystem.config.js     # Configuración de PM2
├── migration.sql           # SQL de migración
└── package.json           # Dependencias del proyecto
```

## 🔧 Comandos Post-Despliegue

### Gestión con PM2

```bash
# Ver estado de la aplicación
pm2 status

# Ver logs en tiempo real
pm2 logs boutique-pos-api

# Ver solo errores
pm2 logs boutique-pos-api --err

# Reiniciar aplicación
pm2 restart boutique-pos-api

# Detener aplicación
pm2 stop boutique-pos-api

# Iniciar aplicación
pm2 start boutique-pos-api

# Ver información detallada
pm2 show boutique-pos-api

# Monitorear recursos
pm2 monit
```

### Gestión de Nginx

```bash
# Verificar configuración
nginx -t

# Recargar configuración (sin downtime)
systemctl reload nginx

# Reiniciar Nginx
systemctl restart nginx

# Ver logs de acceso
tail -f /var/log/nginx/boutique-pos-access.log

# Ver logs de errores
tail -f /var/log/nginx/boutique-pos-error.log

# Ver estado
systemctl status nginx
```

### Gestión de MySQL

```bash
# Conectar a MySQL
mysql -u boutique_user -p

# Backup de base de datos
mysqldump -u boutique_user -p boutique_db > backup_$(date +%Y%m%d).sql

# Restaurar backup
mysql -u boutique_user -p boutique_db < backup_20260107.sql

# Ver estado de MySQL
systemctl status mysql

# Ver logs de MySQL
tail -f /var/log/mysql/error.log
```

### SSL con Let's Encrypt

```bash
# Renovar certificados manualmente
certbot renew

# Ver certificados instalados
certbot certificates

# Probar renovación sin aplicar
certbot renew --dry-run
```

## 🔐 Seguridad y Mantenimiento

### Cambiar Contraseñas

#### Usuario Administrador de la Aplicación

```sql
-- Conectar a MySQL
mysql -u boutique_user -p boutique_db

-- Generar nuevo hash (en Node.js)
node -e "console.log(require('bcryptjs').hashSync('nueva_password', 10));"

-- Actualizar en la base de datos
UPDATE users
SET password_hash = '$2a$10$...'
WHERE username = 'admin';
```

#### Usuario de MySQL

```sql
-- Como root
ALTER USER 'boutique_user'@'localhost' IDENTIFIED BY 'nueva_password';
FLUSH PRIVILEGES;

-- Actualizar en /opt/boutique-pos/.env
```

### Backups Automáticos

Crear script de backup automático:

```bash
# Crear script
nano /usr/local/bin/backup-boutique.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backups/boutique"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup de MySQL
mysqldump -u boutique_user -p'password' boutique_db > $BACKUP_DIR/db_$DATE.sql

# Backup de archivos
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /opt/boutique-pos --exclude=node_modules --exclude=dist

# Eliminar backups antiguos (más de 7 días)
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completado: $DATE"
```

```bash
# Hacer ejecutable
chmod +x /usr/local/bin/backup-boutique.sh

# Programar en crontab (diario a las 2 AM)
crontab -e
0 2 * * * /usr/local/bin/backup-boutique.sh
```

### Actualización de la Aplicación

```bash
# 1. Hacer backup
/usr/local/bin/backup-boutique.sh

# 2. Detener aplicación
cd /opt/boutique-pos
pm2 stop boutique-pos-api

# 3. Actualizar código
# (transferir nuevos archivos o git pull)

# 4. Instalar dependencias nuevas (si hay)
npm install

# 5. Recompilar
npm run build
npx tsc server/index.ts --outDir dist-server --esModuleInterop --resolveJsonModule --module commonjs

# 6. Aplicar migraciones de DB (si hay)
mysql -u boutique_user -p boutique_db < nueva_migracion.sql

# 7. Reiniciar aplicación
pm2 restart boutique-pos-api

# 8. Verificar
pm2 logs boutique-pos-api --lines 50
```

### Monitoreo

Instalar herramientas de monitoreo:

```bash
# Instalar htop para monitoreo de recursos
apt install htop

# Ver uso de recursos
htop

# Ver uso de disco
df -h

# Ver uso de memoria
free -h

# Ver conexiones activas
netstat -tuln
```

## 🐛 Solución de Problemas

### Error: "Cannot connect to MySQL"

```bash
# Verificar que MySQL está corriendo
systemctl status mysql

# Verificar credenciales en .env
cat /opt/boutique-pos/.env

# Probar conexión manual
mysql -u boutique_user -p -h localhost
```

### Error: "Port 3001 already in use"

```bash
# Ver qué está usando el puerto
lsof -i :3001

# Matar proceso si es necesario
kill -9 PID

# O cambiar puerto en .env y reiniciar
```

### Error: "502 Bad Gateway" en Nginx

```bash
# Verificar que el backend está corriendo
pm2 status

# Verificar logs del backend
pm2 logs boutique-pos-api

# Verificar configuración de Nginx
nginx -t

# Ver logs de Nginx
tail -f /var/log/nginx/boutique-pos-error.log
```

### Error: "Cannot GET /"

```bash
# Verificar que dist/ existe
ls -la /opt/boutique-pos/dist

# Recompilar frontend si es necesario
cd /opt/boutique-pos
npm run build

# Reiniciar Nginx
systemctl reload nginx
```

### La aplicación se detiene después de cerrar SSH

```bash
# Asegurarse de que PM2 está guardado
pm2 save

# Configurar PM2 para iniciar al boot
pm2 startup systemd
# Ejecutar el comando que PM2 te muestra
```

## 📊 Verificación Post-Despliegue

### Checklist de Verificación

- [ ] El servidor está accesible vía SSH
- [ ] Node.js está instalado (`node --version`)
- [ ] MySQL está corriendo (`systemctl status mysql`)
- [ ] La base de datos existe (`mysql -u boutique_user -p`)
- [ ] Las tablas están creadas (`SHOW TABLES;`)
- [ ] El usuario admin existe (`SELECT * FROM users;`)
- [ ] PM2 está ejecutando el backend (`pm2 status`)
- [ ] Nginx está corriendo (`systemctl status nginx`)
- [ ] El sitio responde en el navegador
- [ ] Puedes hacer login con las credenciales admin
- [ ] El firewall está activo (`ufw status`)
- [ ] SSL está configurado (si aplica)

### Pruebas Funcionales

```bash
# 1. Health check del backend
curl http://localhost:3001/api/health

# 2. Verificar frontend (debe devolver HTML)
curl http://localhost:80

# 3. Verificar acceso público
curl http://tu-dominio.com

# 4. Si tienes SSL
curl https://tu-dominio.com
```

## 🎓 Recursos Adicionales

- [Documentación de PM2](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Documentación de Nginx](https://nginx.org/en/docs/)
- [Documentación de Let's Encrypt](https://letsencrypt.org/docs/)
- [Guía de UFW](https://help.ubuntu.com/community/UFW)

## 🆘 Soporte

Si tienes problemas durante el despliegue:

1. Revisa los logs de cada servicio
2. Verifica que todos los servicios estén corriendo
3. Comprueba la configuración de firewall
4. Revisa los archivos de configuración generados
5. Consulta la sección de "Solución de Problemas"

---

**¡Tu aplicación está lista para producción!** 🎉
