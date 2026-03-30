#!/bin/bash

# Script de Despliegue Completo en Producción - Boutique POS
# Para Ubuntu Server 20.04+
# Este script configura toda la aplicación desde /opt/ en producción

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Directorio de instalación
INSTALL_DIR="/opt/boutique-pos"
CURRENT_DIR=$(pwd)

# Función para imprimir mensajes
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

print_header() {
    echo -e "\n${CYAN}═══════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  ${1}${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════${NC}\n"
}

print_step() {
    echo -e "\n${MAGENTA}▶ ${1}${NC}\n"
}

# Función para pedir input
ask_input() {
    local prompt="$1"
    local default="$2"
    local value

    if [ -n "$default" ]; then
        read -p "$(echo -e ${BLUE}${prompt}${NC} [${default}]: )" value
        echo "${value:-$default}"
    else
        read -p "$(echo -e ${BLUE}${prompt}${NC}: )" value
        echo "$value"
    fi
}

# Función para pedir contraseña
ask_password() {
    local prompt="$1"
    local password

    read -sp "$(echo -e ${BLUE}${prompt}${NC}: )" password
    echo
    echo "$password"
}

# Función para confirmar
confirm() {
    local prompt="$1"
    local response

    read -p "$(echo -e ${YELLOW}${prompt}${NC} [s/N]: )" response
    case "$response" in
        [sS][iI]|[sS]) return 0 ;;
        *) return 1 ;;
    esac
}

# Verificar que se ejecuta como root
if [ "$EUID" -ne 0 ]; then
    print_error "Este script debe ejecutarse como root"
    print_info "Ejecuta: sudo $0"
    exit 1
fi

# Banner
clear
echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Boutique POS - Despliegue en Producción             ║
║   Instalación completa en Ubuntu Server                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

print_warning "Este script realizará una instalación COMPLETA:"
echo "  ✓ Instalar Node.js, MySQL, Nginx, PM2"
echo "  ✓ Configurar la aplicación en ${INSTALL_DIR}"
echo "  ✓ Crear y migrar base de datos MySQL"
echo "  ✓ Compilar el frontend y backend"
echo "  ✓ Configurar Nginx como proxy inverso"
echo "  ✓ Configurar PM2 para gestión de procesos"
echo "  ✓ Configurar firewall (UFW)"
echo "  ✓ (Opcional) Configurar SSL con Let's Encrypt"
echo ""

if ! confirm "¿Desea continuar con el despliegue completo?"; then
    print_error "Despliegue cancelado"
    exit 0
fi

# ============================================================
# PASO 1: Información del Sistema
# ============================================================
print_header "PASO 1: Configuración General"

DOMAIN=$(ask_input "Dominio o IP del servidor" "")
if [ -z "$DOMAIN" ]; then
    print_error "El dominio/IP es requerido"
    exit 1
fi

ENABLE_SSL="n"
if [[ "$DOMAIN" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$ ]]; then
    if confirm "¿Desea configurar SSL con Let's Encrypt? (requiere dominio válido)"; then
        ENABLE_SSL="s"
        SSL_EMAIL=$(ask_input "Email para Let's Encrypt" "")
    fi
fi

# ============================================================
# PASO 2: Configuración de Base de Datos
# ============================================================
print_header "PASO 2: Configuración de MySQL"

DB_NAME=$(ask_input "Nombre de la base de datos" "boutique_db")
DB_USER=$(ask_input "Usuario de MySQL" "boutique_user")
DB_PASSWORD=$(ask_password "Contraseña del usuario MySQL")
DB_HOST="localhost"
DB_PORT="3306"

# ============================================================
# PASO 3: Configuración de la Aplicación
# ============================================================
print_header "PASO 3: Configuración de la Aplicación"

BACKEND_PORT=$(ask_input "Puerto del servidor backend" "3001")
JWT_SECRET=$(openssl rand -base64 32)
print_success "JWT Secret generado automáticamente"

ADMIN_USERNAME=$(ask_input "Usuario administrador" "admin")
ADMIN_PASSWORD=$(ask_password "Contraseña del administrador")
ADMIN_EMAIL=$(ask_input "Email del administrador" "admin@boutique.com")
ADMIN_FULLNAME=$(ask_input "Nombre completo del administrador" "Administrador")

# ============================================================
# PASO 4: Actualizar Sistema
# ============================================================
print_header "PASO 4: Actualizando Sistema"

print_step "Actualizando paquetes del sistema..."
apt update && apt upgrade -y
print_success "Sistema actualizado"

# ============================================================
# PASO 5: Instalar Node.js
# ============================================================
print_header "PASO 5: Instalando Node.js"

if ! command -v node &> /dev/null; then
    print_step "Instalando Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    print_success "Node.js instalado: $(node --version)"
else
    print_success "Node.js ya está instalado: $(node --version)"
fi

# Instalar npm si no está
if ! command -v npm &> /dev/null; then
    apt install -y npm
fi

print_success "npm versión: $(npm --version)"

# ============================================================
# PASO 6: Instalar MySQL
# ============================================================
print_header "PASO 6: Instalando MySQL"

if ! command -v mysql &> /dev/null; then
    print_step "Instalando MySQL Server..."
    apt install -y mysql-server
    systemctl start mysql
    systemctl enable mysql
    print_success "MySQL instalado y en ejecución"
else
    print_success "MySQL ya está instalado"
fi

# ============================================================
# PASO 7: Configurar MySQL
# ============================================================
print_header "PASO 7: Configurando Base de Datos"

MYSQL_ROOT_PASSWORD=$(ask_password "Contraseña root de MySQL (dejar vacío si es instalación nueva)")

print_step "Creando base de datos y usuario..."

if [ -z "$MYSQL_ROOT_PASSWORD" ]; then
    # Instalación nueva, usar sudo
    sudo mysql << MYSQL_SCRIPT
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
MYSQL_SCRIPT
else
    # MySQL ya configurado
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" << MYSQL_SCRIPT
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
MYSQL_SCRIPT
fi

print_success "Base de datos '${DB_NAME}' creada"
print_success "Usuario '${DB_USER}' creado"

# ============================================================
# PASO 8: Copiar Aplicación a /opt
# ============================================================
print_header "PASO 8: Copiando Aplicación"

print_step "Copiando archivos desde ${CURRENT_DIR} a ${INSTALL_DIR}..."

# Crear directorio si no existe
mkdir -p ${INSTALL_DIR}

# Copiar todo excepto node_modules y dist
rsync -av --exclude 'node_modules' --exclude 'dist' --exclude '.git' ${CURRENT_DIR}/ ${INSTALL_DIR}/

print_success "Aplicación copiada a ${INSTALL_DIR}"

# Cambiar al directorio de instalación
cd ${INSTALL_DIR}

# ============================================================
# PASO 9: Crear Variables de Entorno
# ============================================================
print_header "PASO 9: Configurando Variables de Entorno"

cat > ${INSTALL_DIR}/.env << ENV_FILE
# Configuración de Base de Datos MySQL
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}

# Configuración de la Aplicación
API_URL=http://localhost:${BACKEND_PORT}
PORT=${BACKEND_PORT}

# Frontend (para build)
VITE_API_URL=https://${DOMAIN}/api

# Seguridad
JWT_SECRET=${JWT_SECRET}
NODE_ENV=production
ENV_FILE

print_success "Variables de entorno configuradas"

# ============================================================
# PASO 10: Instalar Dependencias
# ============================================================
print_header "PASO 10: Instalando Dependencias"

print_step "Instalando dependencias de producción..."
npm install --production

print_step "Instalando dependencias adicionales..."
npm install mysql2 bcryptjs jsonwebtoken express cors dotenv
npm install -D @types/node @types/express @types/cors @types/bcryptjs @types/jsonwebtoken tsx typescript

print_success "Dependencias instaladas"

# ============================================================
# PASO 11: Crear Backend (API)
# ============================================================
print_header "PASO 11: Creando Servidor Backend"

mkdir -p ${INSTALL_DIR}/server

cat > ${INSTALL_DIR}/server/index.ts << 'BACKEND_CODE'
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

app.use(cors());
app.use(express.json());

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'boutique_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Middleware de autenticación
interface AuthRequest extends Request {
  user?: any;
}

const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Rutas de autenticación
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const [rows]: any = await pool.execute(
      'SELECT * FROM users WHERE username = ? AND active = 1',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Verificar token
app.get('/api/auth/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [rows]: any = await pool.execute(
      'SELECT id, username, email, full_name, role FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// CRUD de Productos
app.get('/api/products', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM products WHERE active = 1 ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.post('/api/products', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, category, size, color, purchase_price, sale_price, stock, min_stock } = req.body;

    const [result]: any = await pool.execute(
      'INSERT INTO products (name, category, size, color, purchase_price, sale_price, stock, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, category, size, color, purchase_price, sale_price, stock || 0, min_stock || 5]
    );

    res.json({ id: result.insertId, message: 'Producto creado' });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// CRUD de Clientes
app.get('/api/clients', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM clients WHERE active = 1 ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.post('/api/clients', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, address, email, id_number, notes } = req.body;

    const [result]: any = await pool.execute(
      'INSERT INTO clients (name, phone, address, email, id_number, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [name, phone, address, email, id_number, notes]
    );

    res.json({ id: result.insertId, message: 'Cliente creado' });
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Servidor backend ejecutándose en puerto ${PORT}`);
});
BACKEND_CODE

print_success "Backend creado en ${INSTALL_DIR}/server/index.ts"

# ============================================================
# PASO 12: Migrar Base de Datos
# ============================================================
print_header "PASO 12: Migrando Base de Datos"

cat > ${INSTALL_DIR}/migration.sql << 'MIGRATION_SQL'
-- Tabla de usuarios
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

-- Tabla de clientes
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

-- Tabla de productos
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
  INDEX idx_name (name),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de ventas
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
  CONSTRAINT fk_sales_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  CONSTRAINT fk_sales_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de items de venta
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
  CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  CONSTRAINT fk_sale_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de cuentas corrientes
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
  CONSTRAINT fk_current_accounts_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_current_accounts_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de movimientos de caja
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
  CONSTRAINT fk_cashbox_movements_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de movimientos de cuenta corriente
CREATE TABLE IF NOT EXISTS account_movements (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  client_id CHAR(36) NOT NULL,
  sale_id CHAR(36),
  type ENUM('charge', 'payment') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_client (client_id),
  CONSTRAINT fk_account_movements_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
MIGRATION_SQL

print_step "Ejecutando migraciones..."
mysql -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" < ${INSTALL_DIR}/migration.sql

print_success "Base de datos migrada"

# Crear usuario administrador
print_step "Creando usuario administrador..."

# Instalar bcryptjs temporalmente para hashear
cd ${INSTALL_DIR}
HASHED_PASSWORD=$(node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('${ADMIN_PASSWORD}', 10));")

mysql -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" << ADMIN_SQL
INSERT INTO users (email, username, full_name, password_hash, role, active)
VALUES (
  '${ADMIN_EMAIL}',
  '${ADMIN_USERNAME}',
  '${ADMIN_FULLNAME}',
  '${HASHED_PASSWORD}',
  'admin',
  1
) ON DUPLICATE KEY UPDATE username=username;
ADMIN_SQL

print_success "Usuario administrador creado"

# ============================================================
# PASO 13: Compilar Aplicación
# ============================================================
print_header "PASO 13: Compilando Aplicación"

print_step "Compilando frontend..."
cd ${INSTALL_DIR}
npm run build

print_step "Compilando backend..."
npx tsc server/index.ts --outDir dist-server --esModuleInterop --resolveJsonModule --module commonjs --target es2020

print_success "Aplicación compilada"

# ============================================================
# PASO 14: Instalar PM2
# ============================================================
print_header "PASO 14: Instalando PM2"

if ! command -v pm2 &> /dev/null; then
    print_step "Instalando PM2..."
    npm install -g pm2
    print_success "PM2 instalado"
else
    print_success "PM2 ya está instalado"
fi

# Crear archivo de configuración de PM2
cat > ${INSTALL_DIR}/ecosystem.config.js << 'PM2_CONFIG'
module.exports = {
  apps: [{
    name: 'boutique-pos-api',
    script: './dist-server/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
PM2_CONFIG

mkdir -p ${INSTALL_DIR}/logs

print_step "Iniciando aplicación con PM2..."
cd ${INSTALL_DIR}
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

print_success "Aplicación iniciada con PM2"

# ============================================================
# PASO 15: Instalar y Configurar Nginx
# ============================================================
print_header "PASO 15: Configurando Nginx"

if ! command -v nginx &> /dev/null; then
    print_step "Instalando Nginx..."
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    print_success "Nginx instalado"
else
    print_success "Nginx ya está instalado"
fi

# Crear configuración de Nginx
cat > /etc/nginx/sites-available/boutique-pos << NGINX_CONFIG
server {
    listen 80;
    server_name ${DOMAIN};

    # Frontend (archivos estáticos)
    location / {
        root ${INSTALL_DIR}/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Configuración de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/boutique-pos-access.log;
    error_log /var/log/nginx/boutique-pos-error.log;
}
NGINX_CONFIG

# Habilitar sitio
ln -sf /etc/nginx/sites-available/boutique-pos /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
nginx -t

# Reiniciar Nginx
systemctl reload nginx

print_success "Nginx configurado"

# ============================================================
# PASO 16: Configurar SSL (Opcional)
# ============================================================
if [ "$ENABLE_SSL" == "s" ]; then
    print_header "PASO 16: Configurando SSL con Let's Encrypt"

    print_step "Instalando Certbot..."
    apt install -y certbot python3-certbot-nginx

    print_step "Obteniendo certificado SSL..."
    certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m ${SSL_EMAIL} --redirect

    print_success "SSL configurado correctamente"
fi

# ============================================================
# PASO 17: Configurar Firewall
# ============================================================
print_header "PASO 17: Configurando Firewall (UFW)"

if command -v ufw &> /dev/null; then
    print_step "Configurando reglas del firewall..."
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable

    print_success "Firewall configurado"
else
    print_warning "UFW no está instalado, se omite configuración del firewall"
fi

# ============================================================
# RESUMEN FINAL
# ============================================================
print_header "DESPLIEGUE COMPLETADO"

echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ✓ Despliegue completado exitosamente                   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

print_success "Aplicación instalada en: ${INSTALL_DIR}"
print_success "Base de datos: ${DB_NAME}"
print_success "Usuario administrador: ${ADMIN_USERNAME}"
print_success "Dominio: ${DOMAIN}"

if [ "$ENABLE_SSL" == "s" ]; then
    print_success "SSL: Habilitado"
    echo -e "\n${GREEN}Accede a tu aplicación en: https://${DOMAIN}${NC}\n"
else
    echo -e "\n${GREEN}Accede a tu aplicación en: http://${DOMAIN}${NC}\n"
fi

print_info "COMANDOS ÚTILES:"
echo ""
echo "  Ver logs del backend:"
echo "    pm2 logs boutique-pos-api"
echo ""
echo "  Reiniciar backend:"
echo "    pm2 restart boutique-pos-api"
echo ""
echo "  Ver estado de PM2:"
echo "    pm2 status"
echo ""
echo "  Ver logs de Nginx:"
echo "    tail -f /var/log/nginx/boutique-pos-error.log"
echo ""
echo "  Reiniciar Nginx:"
echo "    systemctl reload nginx"
echo ""

print_warning "CREDENCIALES:"
echo "  Usuario: ${ADMIN_USERNAME}"
echo "  Password: ${ADMIN_PASSWORD}"
echo ""
echo "  Base de datos: ${DB_NAME}"
echo "  Usuario DB: ${DB_USER}"
echo ""

print_info "NOTAS DE SEGURIDAD:"
echo "  • Cambia las contraseñas por defecto"
echo "  • Configura backups automáticos de MySQL"
echo "  • Mantén el sistema actualizado"
echo "  • Monitorea los logs regularmente"
echo ""

if [ "$ENABLE_SSL" == "s" ]; then
    print_info "RENOVACIÓN DE SSL:"
    echo "  • El certificado se renueva automáticamente"
    echo "  • Para renovar manualmente: certbot renew"
    echo ""
fi

print_success "¡Despliegue completado! 🎉"
print_info "Tu aplicación está lista para usar"
