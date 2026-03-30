# Guía de Migración a MySQL y Despliegue en Ubuntu

Esta guía explica cómo migrar la aplicación desde Supabase (PostgreSQL) a MySQL y desplegarla en un servidor Ubuntu en producción.

## 🚀 Inicio Rápido con Script Automatizado

Para una migración rápida y guiada, usa el script automatizado incluido:

```bash
./migrate-to-mysql.sh
```

El script te pedirá interactivamente:
- Nombre de base de datos, usuario y contraseña MySQL
- Configuración del usuario administrador
- Puerto del servidor backend
- Y configurará automáticamente todo el entorno

**Recomendado para:** Primera migración, entornos de desarrollo, y usuarios que prefieren una guía paso a paso.

---

## 📖 Migración Manual (Avanzada)

Si prefieres controlar cada paso manualmente o necesitas personalizar la migración, sigue esta guía completa:

## Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Instalación de MySQL en Ubuntu](#instalación-de-mysql-en-ubuntu)
3. [Migración del Esquema de Base de Datos](#migración-del-esquema-de-base-de-datos)
4. [Cambios en la Aplicación](#cambios-en-la-aplicación)
5. [Implementación de Autenticación](#implementación-de-autenticación)
6. [Despliegue en Producción](#despliegue-en-producción)
7. [Configuración de Nginx](#configuración-de-nginx)
8. [SSL con Let's Encrypt](#ssl-con-lets-encrypt)

---

## Requisitos Previos

- Servidor Ubuntu 20.04 o superior
- Acceso root o sudo
- Nombre de dominio apuntando al servidor (para SSL)
- Node.js 18+ instalado

---

## Instalación de MySQL en Ubuntu

### 1. Instalar MySQL Server

```bash
sudo apt update
sudo apt install mysql-server -y
```

### 2. Configurar MySQL

```bash
sudo mysql_secure_installation
```

Responde a las preguntas:
- Establecer contraseña root: **Sí**
- Eliminar usuarios anónimos: **Sí**
- Deshabilitar login root remoto: **Sí**
- Eliminar base de datos de prueba: **Sí**
- Recargar tablas de privilegios: **Sí**

### 3. Crear Base de Datos y Usuario

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE boutique_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'boutique_user'@'localhost' IDENTIFIED BY 'tu_contraseña_segura';
GRANT ALL PRIVILEGES ON boutique_db.* TO 'boutique_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## Migración del Esquema de Base de Datos

### Diferencias Principales entre PostgreSQL y MySQL

| Característica | PostgreSQL (Supabase) | MySQL |
|----------------|----------------------|--------|
| UUID | `uuid` | `CHAR(36)` o `BINARY(16)` |
| Timestamp | `timestamptz` | `TIMESTAMP` |
| JSON | `jsonb` | `JSON` |
| Booleano | `boolean` | `TINYINT(1)` |
| Función NOW | `now()` | `NOW()` |
| Auto-increment | `SERIAL` | `AUTO_INCREMENT` |

### Script de Migración para MySQL

Crea un archivo `migration_mysql.sql`:

```sql
-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'cajero') DEFAULT 'cajero',
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla de clientes
CREATE TABLE IF NOT EXISTS clients (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  email VARCHAR(255),
  id_number VARCHAR(50),
  notes TEXT,
  payment_behavior ENUM('excellent', 'good', 'regular', 'poor') DEFAULT 'good',
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla de productos
CREATE TABLE IF NOT EXISTS products (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  size VARCHAR(50),
  color VARCHAR(50),
  purchase_price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2) NOT NULL,
  stock INT DEFAULT 0,
  min_stock INT DEFAULT 5,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla de ventas
CREATE TABLE IF NOT EXISTS sales (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  client_id CHAR(36),
  user_id CHAR(36) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method ENUM('cash', 'transfer', 'current_account') NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_client (client_id),
  INDEX idx_user (user_id),
  INDEX idx_date (created_at),
  INDEX idx_payment_method (payment_method),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla de items de venta
CREATE TABLE IF NOT EXISTS sale_items (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  sale_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sale (sale_id),
  INDEX idx_product (product_id),
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla de cuentas corrientes
CREATE TABLE IF NOT EXISTS current_accounts (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  client_id CHAR(36) NOT NULL,
  sale_id CHAR(36),
  amount DECIMAL(10,2) NOT NULL,
  balance DECIMAL(10,2) NOT NULL,
  type ENUM('charge', 'payment') NOT NULL,
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_client (client_id),
  INDEX idx_sale (sale_id),
  INDEX idx_type (type),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla de movimientos de caja
CREATE TABLE IF NOT EXISTS cashbox_movements (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  type ENUM('income', 'expense') NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_type (type),
  INDEX idx_date (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear usuario admin por defecto
INSERT INTO users (id, email, username, full_name, password_hash, role, active)
VALUES (
  UUID(),
  'admin@boutique.com',
  'admin',
  'Administrador',
  '$2a$10$X9k8YBKqFvYHZPuEVqZn4.VKM8hL3BqXNNJYqJZPL9KzHQvZm5qOe', -- password: admin123
  'admin',
  1
);
```

### Ejecutar la Migración

```bash
mysql -u boutique_user -p boutique_db < migration_mysql.sql
```

---

## Cambios en la Aplicación

### 1. Instalar Cliente MySQL

```bash
npm install mysql2
```

### 2. Crear Archivo de Conexión

Crea `src/lib/mysql.ts`:

```typescript
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.VITE_DB_HOST || 'localhost',
  user: process.env.VITE_DB_USER || 'boutique_user',
  password: process.env.VITE_DB_PASSWORD,
  database: process.env.VITE_DB_NAME || 'boutique_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;
```

### 3. Actualizar Variables de Entorno

Modifica `.env`:

```env
VITE_DB_HOST=localhost
VITE_DB_USER=boutique_user
VITE_DB_PASSWORD=tu_contraseña_segura
VITE_DB_NAME=boutique_db
VITE_JWT_SECRET=tu_secret_key_muy_segura
```

---

## Implementación de Autenticación

Sin Supabase Auth, necesitas implementar autenticación propia.

### 1. Instalar Dependencias

```bash
npm install bcryptjs jsonwebtoken express cors
npm install -D @types/bcryptjs @types/jsonwebtoken @types/express @types/cors
```

### 2. Crear API Backend

Crea `server/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../src/lib/mysql';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const [users]: any = await pool.query(
      'SELECT * FROM users WHERE username = ? AND active = 1',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.VITE_JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Middleware de autenticación
const authMiddleware = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const decoded: any = jwt.verify(token, process.env.VITE_JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Ejemplo: Obtener productos
app.get('/api/products', authMiddleware, async (req, res) => {
  try {
    const [products] = await pool.query(
      'SELECT * FROM products WHERE active = 1 ORDER BY name'
    );
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
```

### 3. Actualizar package.json

```json
{
  "scripts": {
    "dev": "vite",
    "server": "tsx watch server/index.ts",
    "dev:full": "concurrently \"npm run dev\" \"npm run server\"",
    "build": "vite build",
    "build:server": "tsc server/index.ts --outDir dist-server"
  }
}
```

---

## Despliegue en Producción

### 1. Preparar el Servidor

```bash
# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Instalar PM2 (gestor de procesos)
sudo npm install -g pm2

# Instalar Nginx
sudo apt install nginx -y
```

### 2. Clonar y Configurar la Aplicación

```bash
# Crear directorio
sudo mkdir -p /var/www/boutique
cd /var/www/boutique

# Clonar repositorio (o subir archivos)
git clone <tu-repositorio> .

# Instalar dependencias
npm install

# Configurar variables de entorno
sudo nano .env
```

### 3. Compilar la Aplicación

```bash
# Build del frontend
npm run build

# Build del backend
npm run build:server
```

### 4. Configurar PM2

Crea `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'boutique-api',
    script: './dist-server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

Iniciar con PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Configuración de Nginx

### 1. Crear Configuración

```bash
sudo nano /etc/nginx/sites-available/boutique
```

```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Frontend (archivos estáticos)
    root /var/www/boutique/dist;
    index index.html;

    # Comprimir archivos
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # API Backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Caché para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 2. Activar Sitio

```bash
sudo ln -s /etc/nginx/sites-available/boutique /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## SSL con Let's Encrypt

### 1. Instalar Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Obtener Certificado SSL

```bash
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

### 3. Renovación Automática

Certbot configura automáticamente la renovación. Para verificar:

```bash
sudo certbot renew --dry-run
```

---

## Configuración del Firewall

```bash
# Permitir tráfico HTTP y HTTPS
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## Mantenimiento y Monitoreo

### Ver logs de PM2
```bash
pm2 logs boutique-api
```

### Ver estado de la aplicación
```bash
pm2 status
```

### Reiniciar aplicación
```bash
pm2 restart boutique-api
```

### Ver logs de Nginx
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Backup de Base de Datos
```bash
# Crear backup
mysqldump -u boutique_user -p boutique_db > backup_$(date +%Y%m%d).sql

# Restaurar backup
mysql -u boutique_user -p boutique_db < backup_20250107.sql
```

---

## Consideraciones de Seguridad

1. **Contraseñas fuertes**: Usa contraseñas seguras para MySQL y JWT
2. **Firewall**: Mantén solo los puertos necesarios abiertos
3. **Actualizaciones**: Mantén el sistema actualizado
4. **Backups**: Implementa backups automáticos diarios
5. **HTTPS**: Usa siempre SSL/TLS en producción
6. **Rate Limiting**: Implementa límites de peticiones en Nginx
7. **Variables de entorno**: Nunca subas `.env` al repositorio

---

## Solución de Problemas Comunes

### Error de conexión a MySQL
```bash
# Verificar que MySQL esté corriendo
sudo systemctl status mysql

# Verificar conexión
mysql -u boutique_user -p -h localhost boutique_db
```

### Nginx no puede conectar con el backend
```bash
# Verificar que PM2 esté corriendo
pm2 status

# Verificar puertos
sudo netstat -tlnp | grep 3001
```

### La aplicación no actualiza después de deploy
```bash
# Limpiar caché del navegador
# Rebuild y reiniciar
npm run build
pm2 restart boutique-api
```

---

## Recursos Adicionales

- [Documentación MySQL](https://dev.mysql.com/doc/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)

---

## Notas Importantes

- Esta migración requiere reescribir todas las consultas de Supabase
- Las políticas RLS de Supabase deben implementarse como lógica en el backend
- El sistema de autenticación debe manejarse completamente desde cero
- Se recomienda realizar pruebas exhaustivas antes de migrar datos de producción
