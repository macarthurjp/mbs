# Script de Migración Automatizada a MySQL

Este documento explica cómo usar el script `migrate-to-mysql.sh` para migrar fácilmente tu aplicación de Supabase a MySQL.

## 🎯 Características

- ✅ Instalación guiada paso a paso
- ✅ Validación de requisitos previos
- ✅ Creación automática de base de datos
- ✅ Migración completa del esquema
- ✅ Generación de contraseñas seguras
- ✅ Configuración de variables de entorno
- ✅ Creación de usuario administrador
- ✅ Instalación de dependencias necesarias

## 📋 Requisitos Previos

Antes de ejecutar el script, asegúrate de tener:

1. **Ubuntu 20.04+** o similar (Debian-based)
2. **Permisos sudo** en el servidor
3. **Node.js 18+** instalado
4. **MySQL Server** (el script puede instalarlo si no lo tienes)

## 🚀 Uso

### 1. Dar permisos de ejecución

```bash
chmod +x migrate-to-mysql.sh
```

### 2. Ejecutar el script

```bash
./migrate-to-mysql.sh
```

### 3. Seguir las instrucciones

El script te pedirá la siguiente información:

#### Configuración de Base de Datos

- **Nombre de la base de datos**: (default: `boutique_db`)
- **Usuario MySQL**: (default: `boutique_user`)
- **Contraseña del usuario**: Tu contraseña segura
- **Host**: (default: `localhost`)
- **Puerto**: (default: `3306`)

#### Configuración de la Aplicación

- **Puerto del backend**: (default: `3001`)
- **Secret JWT**: Se genera automáticamente o puedes proporcionar uno

#### Usuario Administrador

- **Username**: (default: `admin`)
- **Contraseña**: Tu contraseña para el admin
- **Email**: (default: `admin@boutique.com`)
- **Nombre completo**: (default: `Administrador`)

#### Credenciales de MySQL Root

- **Contraseña root**: Necesaria para crear la base de datos

## 📝 Ejemplo de Ejecución

```bash
$ ./migrate-to-mysql.sh

╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   Boutique POS - Script de Migración a MySQL             ║
║   De Supabase (PostgreSQL) a MySQL en Ubuntu             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

⚠ Este script realizará los siguientes pasos:
  1. Recopilar información de configuración
  2. Instalar MySQL Server (si no está instalado)
  3. Crear base de datos y usuario
  4. Ejecutar migraciones del esquema
  5. Crear usuario administrador por defecto
  6. Configurar variables de entorno
  7. Instalar dependencias de Node.js

¿Desea continuar con la migración? [s/N]: s

═══════════════════════════════════════════════════════════
  PASO 1: Configuración de Base de Datos
═══════════════════════════════════════════════════════════

Nombre de la base de datos [boutique_db]: mi_boutique
Usuario de MySQL [boutique_user]: boutique_app
Contraseña del usuario MySQL: ********
Host de MySQL [localhost]:
Puerto de MySQL [3306]:

═══════════════════════════════════════════════════════════
  PASO 2: Configuración de la Aplicación
═══════════════════════════════════════════════════════════

Puerto del servidor backend [3001]: 3000
Secret para JWT (dejar vacío para generar automático):
✓ JWT Secret generado automáticamente

Usuario administrador [admin]: miusuario
Contraseña del administrador: ********
Email del administrador [admin@boutique.com]: yo@miempresa.com
Nombre completo del administrador [Administrador]: Juan Pérez

...
```

## 📂 Archivos Generados

Después de ejecutar el script, se crearán los siguientes archivos:

### 1. `.env`
Variables de entorno con toda la configuración:
```env
VITE_DB_HOST=localhost
VITE_DB_PORT=3306
VITE_DB_USER=boutique_user
VITE_DB_PASSWORD=tu_password
VITE_DB_NAME=boutique_db
VITE_API_URL=http://localhost:3001
PORT=3001
VITE_JWT_SECRET=secret_generado
NODE_ENV=development
```

### 2. `migration_mysql_complete.sql`
Script SQL con todas las tablas y esquema completo.

**⚠️ IMPORTANTE:** Este archivo se genera automáticamente y contiene el esquema de la base de datos. No lo modifiques manualmente.

## ✅ Verificación Post-Instalación

Después de que el script termine, verifica que todo esté correcto:

### 1. Verificar Base de Datos

```bash
mysql -u boutique_user -p
```

```sql
USE boutique_db;
SHOW TABLES;
```

Deberías ver estas tablas:
- `users`
- `clients`
- `products`
- `sales`
- `sale_items`
- `current_accounts`
- `cashbox_movements`
- `account_movements`

### 2. Verificar Usuario Administrador

```sql
SELECT username, email, role FROM users WHERE role = 'admin';
```

### 3. Verificar Variables de Entorno

```bash
cat .env
```

## 🔧 Próximos Pasos

Una vez completada la migración:

1. **Revisar el archivo `.env`** y ajustar valores si es necesario
2. **Crear el servidor backend** (`server/index.ts`) - Ver `MIGRACION_MYSQL.md`
3. **Actualizar el código** para usar MySQL en lugar de Supabase
4. **Instalar dependencias faltantes** (si el script no las instaló)
5. **Probar la aplicación** en desarrollo

## 🐛 Solución de Problemas

### Error: "MySQL no está instalado"

El script intentará instalar MySQL automáticamente. Si falla:

```bash
sudo apt update
sudo apt install mysql-server -y
sudo mysql_secure_installation
```

### Error: "Access denied for user"

Verifica la contraseña root de MySQL:

```bash
sudo mysql -u root
```

Si no recuerdas la contraseña root, restablécela:

```bash
sudo mysql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'nueva_password';
FLUSH PRIVILEGES;
EXIT;
```

### Error: "Database already exists"

Si la base de datos ya existe, tienes dos opciones:

1. **Usar otra base de datos**: Ejecuta el script de nuevo con otro nombre
2. **Eliminar la base de datos existente** (⚠️ perderás todos los datos):

```sql
DROP DATABASE boutique_db;
```

### El script se detiene inesperadamente

Verifica los logs y asegúrate de:
- Tener permisos sudo
- Tener conexión a internet (para instalar paquetes)
- Tener espacio en disco suficiente

## 🔐 Seguridad

### Contraseñas

- ✅ Usa contraseñas fuertes (mínimo 12 caracteres)
- ✅ Mezcla mayúsculas, minúsculas, números y símbolos
- ✅ No reutilices contraseñas

### JWT Secret

El script genera un JWT Secret aleatorio de 32 bytes. Si quieres generar uno manualmente:

```bash
openssl rand -base64 32
```

### Archivo .env

**⚠️ MUY IMPORTANTE:**
- El archivo `.env` contiene información sensible
- **NUNCA** lo subas a Git
- Asegúrate de que esté en `.gitignore`
- En producción, usa variables de entorno del sistema

## 📚 Documentación Adicional

- [MIGRACION_MYSQL.md](./MIGRACION_MYSQL.md) - Guía completa de migración manual
- [README.md](./README.md) - Documentación general del proyecto

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs del script
2. Consulta la sección de "Solución de Problemas"
3. Revisa la documentación completa en `MIGRACION_MYSQL.md`
4. Verifica que todos los requisitos previos estén cumplidos

## 📋 Checklist de Migración

Usa este checklist para asegurarte de completar todos los pasos:

- [ ] Backup de datos actuales de Supabase (si aplica)
- [ ] MySQL instalado y configurado
- [ ] Script ejecutado sin errores
- [ ] Base de datos creada correctamente
- [ ] Usuario administrador creado
- [ ] Archivo `.env` generado
- [ ] Dependencias de Node.js instaladas
- [ ] Tablas verificadas en MySQL
- [ ] Login de admin probado
- [ ] Código actualizado para usar MySQL
- [ ] Aplicación probada en desarrollo
- [ ] Documentación revisada

---

**¡Migración exitosa!** 🎉

Para más información sobre el despliegue en producción, consulta el documento [MIGRACION_MYSQL.md](./MIGRACION_MYSQL.md).
