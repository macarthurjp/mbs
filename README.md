# Boutique POS - Sistema de Punto de Venta

Sistema completo de punto de venta para boutiques y tiendas de ropa, con gestión de inventario, ventas, clientes, cuentas corrientes y reportes.

## Características Principales

- Gestión de productos (inventario, categorías, tallas, colores)
- Registro y gestión de clientes
- Sistema de ventas con múltiples métodos de pago
- Cuentas corrientes para clientes
- Caja diaria con movimientos de ingreso/egreso
- Reportes y estadísticas completas
- Sistema de usuarios con roles (admin, cajero)
- Interfaz moderna y responsive

## Tecnologías

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Express.js + TypeScript
- **Base de Datos:** MySQL (migrable desde Supabase)
- **Autenticación:** JWT
- **Producción:** Nginx + PM2

## Inicio Rápido

### Desarrollo Local

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

### Despliegue en Producción

**Lee primero:** [GUIA_RAPIDA.md](./GUIA_RAPIDA.md)

**Opción recomendada:** Script de despliegue completo

```bash
# 1. (Opcional) Exportar datos de Supabase
npm run export:data

# 2. Transferir al servidor
rsync -avz --exclude 'node_modules' . root@servidor:/opt/boutique-pos

# 3. En el servidor, ejecutar despliegue
sudo ./deploy-production.sh

# 4. (Opcional) Importar datos
npm run import:data
```

## Documentación

### Guías de Despliegue

- **[GUIA_RAPIDA.md](./GUIA_RAPIDA.md)** - Inicio rápido y resumen
- **[DESPLIEGUE_COMPLETO.md](./DESPLIEGUE_COMPLETO.md)** - Guía detallada de despliegue en producción
- **[MIGRACION_DE_DATOS.md](./MIGRACION_DE_DATOS.md)** - Cómo migrar datos de Supabase a MySQL
- **[README_MIGRACION.md](./README_MIGRACION.md)** - Índice completo de migración

### Guías Técnicas

- **[MIGRACION_MYSQL.md](./MIGRACION_MYSQL.md)** - Migración manual y configuración avanzada
- **[SCRIPT_MIGRACION.md](./SCRIPT_MIGRACION.md)** - Documentación del script de migración

## Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Servidor de desarrollo
npm run build        # Compilar para producción
npm run preview      # Vista previa de producción

# Migración de Datos
npm run export:data  # Exportar datos de Supabase
npm run import:data  # Importar datos a MySQL
```

## Estructura del Proyecto

```
boutique-pos/
├── src/                      # Código fuente del frontend
│   ├── components/          # Componentes React
│   ├── pages/              # Páginas de la aplicación
│   ├── contexts/           # Contextos de React
│   └── utils/              # Utilidades
├── server/                  # Backend (generado en producción)
├── supabase/migrations/    # Migraciones de base de datos
├── deploy-production.sh    # Script de despliegue completo
├── export-data-from-supabase.js  # Exportar datos
├── import-data-to-mysql.js # Importar datos
└── docs/                   # Documentación

```

## Funcionalidades

### Módulo de Ventas
- Registro rápido de ventas
- Selección de productos con búsqueda
- Cálculo automático de totales
- Múltiples métodos de pago (efectivo, transferencia, cuenta corriente)
- Impresión de tickets

### Gestión de Clientes
- Alta, baja y modificación de clientes
- Historial de compras
- Cuentas corrientes
- Comportamiento de pago

### Control de Inventario
- Gestión de productos por categoría
- Control de stock
- Alertas de stock mínimo
- Historial de movimientos

### Cuentas Corrientes
- Registro de deuda de clientes
- Pagos parciales y totales
- Historial de movimientos
- Balance actualizado

### Caja
- Movimientos de ingreso/egreso
- Categorización de movimientos
- Cierre de caja diario
- Conciliación

### Reportes
- Ventas por período
- Top productos más vendidos
- Estado de stock
- Rentabilidad
- Resumen de caja
- Análisis de inventario
- Cuentas corrientes pendientes

### Gestión de Usuarios
- Roles: Administrador y Cajero
- Permisos diferenciados
- Gestión de accesos
- Registro de actividad

## Seguridad

- Autenticación mediante JWT
- Contraseñas hasheadas con bcrypt
- Validación de permisos por rol
- Protección contra SQL injection
- HTTPS en producción
- Firewall configurado

## Soporte y Mantenimiento

### Comandos Útiles en Producción

```bash
# Ver estado de la aplicación
pm2 status

# Ver logs
pm2 logs boutique-pos-api

# Reiniciar aplicación
pm2 restart boutique-pos-api

# Backup de base de datos
mysqldump -u boutique_user -p boutique_db > backup.sql
```

### Logs

- Backend: `pm2 logs boutique-pos-api`
- Nginx: `/var/log/nginx/boutique-pos-error.log`
- MySQL: `/var/log/mysql/error.log`

## Licencia

Propietario

## Autor

Desarrollado para boutiques y tiendas de ropa
