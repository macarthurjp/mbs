#!/bin/bash

# Script de Migración a MySQL - Boutique POS
# Este script guía la migración de Supabase (PostgreSQL) a MySQL

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
    echo -e "\n${GREEN}═══════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ${1}${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}\n"
}

# Función para pedir input con valor por defecto
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

# Función para confirmar acción
confirm() {
    local prompt="$1"
    local response

    read -p "$(echo -e ${YELLOW}${prompt}${NC} [s/N]: )" response
    case "$response" in
        [sS][iI]|[sS]) return 0 ;;
        *) return 1 ;;
    esac
}

# Banner
clear
echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   Boutique POS - Script de Migración a MySQL             ║
║   De Supabase (PostgreSQL) a MySQL en Ubuntu             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

print_warning "Este script realizará los siguientes pasos:"
echo "  1. Recopilar información de configuración"
echo "  2. Instalar MySQL Server (si no está instalado)"
echo "  3. Crear base de datos y usuario"
echo "  4. Ejecutar migraciones del esquema"
echo "  5. Crear usuario administrador por defecto"
echo "  6. Configurar variables de entorno"
echo "  7. Instalar dependencias de Node.js"
echo ""

if ! confirm "¿Desea continuar con la migración?"; then
    print_error "Migración cancelada por el usuario"
    exit 0
fi

# ============================================================
# PASO 1: Recopilar Información
# ============================================================
print_header "PASO 1: Configuración de Base de Datos"

DB_NAME=$(ask_input "Nombre de la base de datos" "boutique_db")
DB_USER=$(ask_input "Usuario de MySQL" "boutique_user")
DB_PASSWORD=$(ask_password "Contraseña del usuario MySQL")
DB_HOST=$(ask_input "Host de MySQL" "localhost")
DB_PORT=$(ask_input "Puerto de MySQL" "3306")

print_header "PASO 2: Configuración de la Aplicación"

APP_PORT=$(ask_input "Puerto del servidor backend" "3001")
JWT_SECRET=$(ask_input "Secret para JWT (dejar vacío para generar automático)" "")

if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    print_success "JWT Secret generado automáticamente"
fi

ADMIN_USERNAME=$(ask_input "Usuario administrador" "admin")
ADMIN_PASSWORD=$(ask_password "Contraseña del administrador")
ADMIN_EMAIL=$(ask_input "Email del administrador" "admin@boutique.com")
ADMIN_FULLNAME=$(ask_input "Nombre completo del administrador" "Administrador")

# ============================================================
# PASO 3: Verificar/Instalar MySQL
# ============================================================
print_header "PASO 3: Verificación de MySQL"

if ! command -v mysql &> /dev/null; then
    print_warning "MySQL no está instalado"

    if confirm "¿Desea instalar MySQL Server ahora?"; then
        print_info "Instalando MySQL Server..."
        sudo apt update
        sudo apt install mysql-server -y
        print_success "MySQL Server instalado"

        print_info "Configurando MySQL..."
        sudo mysql_secure_installation
    else
        print_error "MySQL es requerido para continuar"
        exit 1
    fi
else
    print_success "MySQL ya está instalado"
fi

# Pedir contraseña root de MySQL
MYSQL_ROOT_PASSWORD=$(ask_password "Contraseña root de MySQL")

# ============================================================
# PASO 4: Crear Base de Datos y Usuario
# ============================================================
print_header "PASO 4: Creación de Base de Datos"

print_info "Creando base de datos y usuario..."

mysql -u root -p"${MYSQL_ROOT_PASSWORD}" << MYSQL_SCRIPT
-- Crear base de datos
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crear usuario
CREATE USER IF NOT EXISTS '${DB_USER}'@'${DB_HOST}' IDENTIFIED BY '${DB_PASSWORD}';

-- Otorgar privilegios
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'${DB_HOST}';
FLUSH PRIVILEGES;

SELECT 'Base de datos y usuario creados exitosamente' AS resultado;
MYSQL_SCRIPT

if [ $? -eq 0 ]; then
    print_success "Base de datos y usuario creados exitosamente"
else
    print_error "Error al crear base de datos y usuario"
    exit 1
fi

# ============================================================
# PASO 5: Crear Archivo de Migración
# ============================================================
print_header "PASO 5: Preparando Migraciones"

print_info "Generando archivo de migración SQL..."

# Hashear la contraseña del admin
HASHED_PASSWORD=$(node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('${ADMIN_PASSWORD}', 10));" 2>/dev/null || echo "")

if [ -z "$HASHED_PASSWORD" ]; then
    print_warning "bcryptjs no está instalado, usando hash temporal"
    # Hash por defecto para "admin123" - CAMBIAR EN PRODUCCIÓN
    HASHED_PASSWORD='$2a$10$X9k8YBKqFvYHZPuEVqZn4.VKM8hL3BqXNNJYqJZPL9KzHQvZm5qOe'
fi

cat > migration_mysql_complete.sql << 'EOF'
-- ============================================================
-- Migración Completa: Boutique POS a MySQL
-- Generado automáticamente por migrate-to-mysql.sh
-- ============================================================

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
  INDEX idx_username (username),
  INDEX idx_active (active)
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
  INDEX idx_name (name),
  INDEX idx_active (active),
  INDEX idx_phone (phone)
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
  INDEX idx_name (name),
  INDEX idx_category (category),
  INDEX idx_active (active),
  INDEX idx_stock (stock)
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
  CONSTRAINT fk_sales_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  CONSTRAINT fk_sales_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
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
  CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  CONSTRAINT fk_sale_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
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
  INDEX idx_date (created_at),
  CONSTRAINT fk_current_accounts_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_current_accounts_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL
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
  INDEX idx_category (category),
  CONSTRAINT fk_cashbox_movements_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla de movimientos de cuenta corriente (para historial)
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
  INDEX idx_sale (sale_id),
  INDEX idx_date (created_at),
  CONSTRAINT fk_account_movements_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_account_movements_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Tablas creadas exitosamente' AS resultado;
EOF

print_success "Archivo de migración creado: migration_mysql_complete.sql"

# ============================================================
# PASO 6: Ejecutar Migraciones
# ============================================================
print_header "PASO 6: Ejecutando Migraciones"

print_info "Creando esquema de base de datos..."

mysql -u "${DB_USER}" -p"${DB_PASSWORD}" -h "${DB_HOST}" "${DB_NAME}" < migration_mysql_complete.sql

if [ $? -eq 0 ]; then
    print_success "Migraciones ejecutadas exitosamente"
else
    print_error "Error al ejecutar migraciones"
    exit 1
fi

# ============================================================
# PASO 7: Crear Usuario Administrador
# ============================================================
print_header "PASO 7: Creando Usuario Administrador"

print_info "Insertando usuario administrador..."

mysql -u "${DB_USER}" -p"${DB_PASSWORD}" -h "${DB_HOST}" "${DB_NAME}" << ADMIN_SQL
INSERT INTO users (email, username, full_name, password_hash, role, active)
VALUES (
  '${ADMIN_EMAIL}',
  '${ADMIN_USERNAME}',
  '${ADMIN_FULLNAME}',
  '${HASHED_PASSWORD}',
  'admin',
  1
);

SELECT 'Usuario administrador creado' AS resultado;
ADMIN_SQL

if [ $? -eq 0 ]; then
    print_success "Usuario administrador creado exitosamente"
else
    print_warning "El usuario administrador ya existe o hubo un error"
fi

# ============================================================
# PASO 8: Configurar Variables de Entorno
# ============================================================
print_header "PASO 8: Configuración de Variables de Entorno"

print_info "Creando archivo .env..."

cat > .env << ENV_FILE
# Configuración de Base de Datos MySQL
VITE_DB_HOST=${DB_HOST}
VITE_DB_PORT=${DB_PORT}
VITE_DB_USER=${DB_USER}
VITE_DB_PASSWORD=${DB_PASSWORD}
VITE_DB_NAME=${DB_NAME}

# Configuración de la Aplicación
VITE_API_URL=http://localhost:${APP_PORT}
PORT=${APP_PORT}

# Seguridad
VITE_JWT_SECRET=${JWT_SECRET}
NODE_ENV=development

# Nota: En producción, cambiar VITE_API_URL a tu dominio
# Ejemplo: VITE_API_URL=https://tu-dominio.com
ENV_FILE

print_success "Archivo .env creado"

# ============================================================
# PASO 9: Instalar Dependencias
# ============================================================
print_header "PASO 9: Instalación de Dependencias"

if confirm "¿Desea instalar las dependencias de Node.js necesarias para MySQL?"; then
    print_info "Instalando dependencias..."

    npm install mysql2 bcryptjs jsonwebtoken express cors
    npm install -D @types/bcryptjs @types/jsonwebtoken @types/express @types/cors tsx concurrently

    print_success "Dependencias instaladas"
else
    print_warning "Instalación de dependencias omitida"
fi

# ============================================================
# RESUMEN FINAL
# ============================================================
print_header "MIGRACIÓN COMPLETADA"

echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ✓ Migración completada exitosamente                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

print_success "Base de datos configurada: ${DB_NAME}"
print_success "Usuario MySQL: ${DB_USER}"
print_success "Usuario admin: ${ADMIN_USERNAME}"
print_success "Variables de entorno creadas en .env"

echo ""
print_info "PRÓXIMOS PASOS:"
echo ""
echo "  1. Revisar el archivo .env y ajustar si es necesario"
echo "  2. Crear el servidor backend en server/index.ts"
echo "  3. Actualizar la aplicación para usar MySQL en lugar de Supabase"
echo "  4. Ejecutar 'npm run build' para compilar"
echo "  5. Para desarrollo: npm run dev:full"
echo ""

print_warning "IMPORTANTE:"
echo "  • Guarda estas credenciales en un lugar seguro"
echo "  • Cambia las contraseñas en producción"
echo "  • Consulta MIGRACION_MYSQL.md para más detalles"
echo "  • El archivo .env NO debe subirse a Git"
echo ""

print_info "Credenciales del Administrador:"
echo "  Usuario: ${ADMIN_USERNAME}"
echo "  Password: ${ADMIN_PASSWORD}"
echo ""

print_success "¡Migración completada! 🎉"
