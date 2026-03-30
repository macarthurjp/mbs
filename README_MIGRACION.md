# 🔄 Migración y Despliegue en Producción

Este proyecto incluye scripts completos para migración a MySQL y despliegue en producción.

## 📁 Archivos Disponibles

### Scripts de Automatización
- **`deploy-production.sh`** - 🚀 **DESPLIEGUE COMPLETO** en Ubuntu Server (RECOMENDADO)
- **`export-data-from-supabase.js`** - Exporta todos los datos de Supabase a JSON
- **`import-data-to-mysql.js`** - Importa datos JSON a MySQL en producción
- **`migrate-to-mysql.sh`** - Migración solo de base de datos

### Documentación
- **`GUIA_RAPIDA.md`** - 📖 **INICIO RÁPIDO** - Lee esto primero
- **`DESPLIEGUE_COMPLETO.md`** - Guía completa de despliegue en producción
- **`MIGRACION_DE_DATOS.md`** - 📦 **MIGRAR TUS DATOS** de Supabase a MySQL
- **`SCRIPT_MIGRACION.md`** - Documentación del script de migración
- **`MIGRACION_MYSQL.md`** - Guía completa de migración manual

## 🚀 Despliegue Completo en Producción (Recomendado)

Para desplegar toda la aplicación en un servidor Ubuntu:

### 1. Transferir la aplicación al servidor

```bash
# Desde tu máquina local
rsync -avz --exclude 'node_modules' --exclude 'dist' \
  /ruta/local/boutique-pos \
  root@tu-servidor:/opt/
```

### 2. Conectar al servidor y ejecutar

```bash
# En el servidor
cd /opt/boutique-pos
sudo ./deploy-production.sh
```

El script configurará:
- ✅ Node.js, MySQL, Nginx, PM2
- ✅ Base de datos completa
- ✅ Backend API
- ✅ Frontend compilado
- ✅ SSL con Let's Encrypt (opcional)
- ✅ Firewall y seguridad

**Ver guía completa:** [DESPLIEGUE_COMPLETO.md](./DESPLIEGUE_COMPLETO.md)

## 🔧 Solo Migración de Base de Datos

Si solo necesitas migrar la base de datos (ya tienes el servidor configurado):

```bash
chmod +x migrate-to-mysql.sh
./migrate-to-mysql.sh
```

## 📖 Migración Manual

Si prefieres hacerlo manualmente o necesitas más control, consulta:

- **[MIGRACION_MYSQL.md](./MIGRACION_MYSQL.md)** - Guía completa paso a paso

## 📚 Documentación

1. **[SCRIPT_MIGRACION.md](./SCRIPT_MIGRACION.md)** - Todo sobre el script automatizado:
   - Cómo usarlo
   - Qué hace cada paso
   - Solución de problemas
   - Verificación post-instalación

2. **[MIGRACION_MYSQL.md](./MIGRACION_MYSQL.md)** - Guía avanzada:
   - Instalación manual de MySQL
   - Esquema de base de datos
   - Implementación de autenticación
   - Despliegue en producción con Nginx
   - SSL con Let's Encrypt
   - Configuración de PM2

## ⚠️ Antes de Migrar

### 📦 Exportar Datos de Supabase

Si tienes datos en Supabase que quieres llevar a producción:

```bash
# En tu máquina local (antes de desplegar)
npm run export:data
```

Esto creará una carpeta `data-export/` con todos tus datos actuales.

**Luego transferir todo al servidor:**

```bash
rsync -avz --exclude 'node_modules' \
  /ruta/local/boutique-pos \
  root@servidor:/opt/
```

**En el servidor, después del despliegue:**

```bash
# Importar los datos a MySQL
npm run import:data
```

**Ver guía completa:** [MIGRACION_DE_DATOS.md](./MIGRACION_DE_DATOS.md)

### Requisitos

- Ubuntu 20.04+ (o Debian-based Linux)
- Node.js 18+
- Permisos sudo
- MySQL 8.0+ (el script puede instalarlo)

## 🎯 Flujo de Migración

```
┌─────────────────────────────────────────────────┐
│  1. Ejecutar migrate-to-mysql.sh                │
│     - Instala MySQL (si es necesario)           │
│     - Crea base de datos                        │
│     - Ejecuta migraciones                       │
│     - Crea usuario admin                        │
│     - Configura .env                            │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  2. Crear servidor backend (server/index.ts)    │
│     - Implementar API con Express               │
│     - Configurar autenticación JWT              │
│     - Crear endpoints necesarios                │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  3. Actualizar frontend                         │
│     - Cambiar llamadas de Supabase a API       │
│     - Adaptar autenticación                     │
│     - Probar funcionalidad                      │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  4. Desplegar en producción                     │
│     - Configurar Nginx                          │
│     - Configurar PM2                            │
│     - Obtener SSL con Let's Encrypt            │
│     - Configurar firewall                       │
└─────────────────────────────────────────────────┘
```

## 🔐 Seguridad

**IMPORTANTE:**
- El archivo `.env` contiene credenciales sensibles
- **NUNCA** subas `.env` a Git
- Usa contraseñas fuertes en producción
- Cambia el JWT secret en producción

## 💡 Consejos

### Para Desarrollo

```bash
# Usar el script automatizado
./migrate-to-mysql.sh

# Configurar con valores de desarrollo
# DB: boutique_db
# User: boutique_user
# Host: localhost
```

### Para Producción

- Usa contraseñas más fuertes
- Configura backups automáticos
- Habilita SSL/HTTPS
- Usa PM2 para gestión de procesos
- Configura Nginx como proxy inverso
- Implementa rate limiting
- Monitorea logs y errores

## 🆘 Ayuda

### ¿Script no funciona?

Consulta **[SCRIPT_MIGRACION.md](./SCRIPT_MIGRACION.md)** sección "Solución de Problemas"

### ¿Problemas en producción?

Consulta **[MIGRACION_MYSQL.md](./MIGRACION_MYSQL.md)** sección "Mantenimiento y Monitoreo"

## 📋 Checklist Rápida

- [ ] Backup de datos actuales
- [ ] Ejecutar `migrate-to-mysql.sh`
- [ ] Verificar base de datos creada
- [ ] Verificar usuario admin
- [ ] Crear backend API
- [ ] Actualizar frontend
- [ ] Probar en desarrollo
- [ ] Desplegar en producción

---

**¿Preguntas?** Revisa la documentación completa en los archivos mencionados.
