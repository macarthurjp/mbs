# 📦 Guía Completa de Migración de Datos

## Supabase → MySQL en Producción

Esta guía te explica cómo migrar **todos tus datos actuales** desde Supabase a MySQL en tu servidor de producción.

---

## 🎯 Proceso Completo

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   SUPABASE      │──1──▶│  ARCHIVOS JSON  │──2──▶│  MySQL Server   │
│  (PostgreSQL)   │      │   (data-export) │      │  (Producción)   │
└─────────────────┘      └─────────────────┘      └─────────────────┘
   Exportar datos       Transferir archivos       Importar a MySQL
```

---

## 📋 Paso a Paso

### PASO 1: Exportar Datos de Supabase (en tu máquina local)

**1.1 Asegúrate de tener las variables de entorno:**

Verifica que tu archivo `.env` tenga:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

**1.2 Ejecuta el script de exportación:**

```bash
# En tu máquina local, en el directorio del proyecto
node export-data-from-supabase.js
```

**1.3 Resultado:**

Se creará una carpeta `data-export/` con archivos JSON:
```
data-export/
├── _metadata.json           # Información de la exportación
├── user_profiles.json       # Usuarios
├── clients.json             # Clientes
├── products.json            # Productos
├── sales.json               # Ventas
├── sale_items.json          # Items de ventas
├── current_accounts.json    # Cuentas corrientes
├── cashbox_movements.json   # Movimientos de caja
└── account_movements.json   # Movimientos de cuenta
```

**Ejemplo de salida:**
```
🚀 Iniciando exportación de datos de Supabase...

📦 Exportando tabla: user_profiles...
   ✓ 5 registros exportados a user_profiles.json
📦 Exportando tabla: clients...
   ✓ 124 registros exportados a clients.json
📦 Exportando tabla: products...
   ✓ 458 registros exportados a products.json
📦 Exportando tabla: sales...
   ✓ 1250 registros exportados a sales.json

═══════════════════════════════════════════════════
📊 RESUMEN DE EXPORTACIÓN
═══════════════════════════════════════════════════

  ✓ user_profiles              5 registros
  ✓ clients                    124 registros
  ✓ products                   458 registros
  ✓ sales                      1250 registros
  ✓ sale_items                 3420 registros
  ✓ current_accounts           89 registros
  ✓ cashbox_movements          567 registros
  ✓ account_movements          234 registros

═══════════════════════════════════════════════════
✓ Total de registros exportados: 6147
✓ Archivos guardados en: /ruta/data-export
═══════════════════════════════════════════════════
```

---

### PASO 2: Transferir Archivos al Servidor

**2.1 Transferir la aplicación Y los datos:**

```bash
# Desde tu máquina local

# Transferir toda la aplicación (incluye data-export/)
rsync -avz --exclude 'node_modules' --exclude 'dist' \
  /ruta/local/boutique-pos \
  root@tu-servidor:/opt/

# O si ya transferiste la app, solo transfiere los datos:
rsync -avz data-export/ root@tu-servidor:/opt/boutique-pos/data-export/
```

**2.2 Verificar que llegaron los archivos:**

```bash
# En el servidor
ssh root@tu-servidor
ls -la /opt/boutique-pos/data-export/
```

Deberías ver todos los archivos JSON.

---

### PASO 3: Desplegar la Aplicación

**3.1 Ejecutar el script de despliegue:**

```bash
# En el servidor
cd /opt/boutique-pos
sudo ./deploy-production.sh
```

Este script:
- ✅ Instala Node.js, MySQL, Nginx, PM2
- ✅ Crea la base de datos vacía
- ✅ Ejecuta todas las migraciones (crea tablas)
- ✅ Compila frontend y backend
- ✅ Configura servicios

**⚠️ NO importa datos todavía, solo prepara la infraestructura.**

---

### PASO 4: Importar Datos a MySQL

**4.1 Verificar que la base de datos está lista:**

```bash
# En el servidor
mysql -u boutique_user -p
```

```sql
USE boutique_db;
SHOW TABLES;  -- Debe mostrar todas las tablas vacías
EXIT;
```

**4.2 Ejecutar el script de importación:**

```bash
# En el servidor, en /opt/boutique-pos
cd /opt/boutique-pos
node import-data-to-mysql.js
```

**Ejemplo de salida:**
```
🚀 Iniciando importación de datos a MySQL...

🔌 Conectando a MySQL...
✓ Conectado a MySQL

👤 Importando perfiles de usuario...
   ✓ 5/5 usuarios importados
👥 Importando clientes...
   ✓ 124/124 clientes importados
📦 Importando productos...
   ✓ 458/458 productos importados
💰 Importando ventas...
   ✓ 1250/1250 ventas importadas
📋 Importando items de venta...
   ✓ 3420/3420 items importados
💳 Importando cuentas corrientes...
   ✓ 89/89 cuentas corrientes importadas
💵 Importando movimientos de caja...
   ✓ 567/567 movimientos de caja importados
📊 Importando movimientos de cuenta...
   ✓ 234/234 movimientos de cuenta importados

═══════════════════════════════════════════════════
📊 RESUMEN DE IMPORTACIÓN
═══════════════════════════════════════════════════

  ✓ users                      5 registros
  ✓ clients                    124 registros
  ✓ products                   458 registros
  ✓ sales                      1250 registros
  ✓ sale_items                 3420 registros
  ✓ current_accounts           89 registros
  ✓ cashbox_movements          567 registros
  ✓ account_movements          234 registros

═══════════════════════════════════════════════════
✓ Total de registros importados: 6147
═══════════════════════════════════════════════════
```

---

### PASO 5: Verificación Post-Importación

**5.1 Verificar en la base de datos:**

```bash
mysql -u boutique_user -p
```

```sql
USE boutique_db;

-- Ver cantidad de registros en cada tabla
SELECT COUNT(*) as total FROM users;
SELECT COUNT(*) as total FROM clients;
SELECT COUNT(*) as total FROM products;
SELECT COUNT(*) as total FROM sales;
SELECT COUNT(*) as total FROM sale_items;

-- Ver algunos clientes
SELECT * FROM clients LIMIT 5;

-- Ver algunos productos
SELECT * FROM products LIMIT 5;

EXIT;
```

**5.2 Probar desde la aplicación:**

```bash
# Accede desde el navegador
https://tu-dominio.com

# Inicia sesión con el usuario admin
```

Deberías ver:
- ✅ Todos tus clientes
- ✅ Todos tus productos
- ✅ Historial de ventas
- ✅ Cuentas corrientes
- ✅ Movimientos de caja

---

## ⚠️ IMPORTANTE: Contraseñas de Usuarios

Los usuarios importados tienen un **hash de contraseña temporal** que NO funciona.

### Solución: Restablecer Contraseñas

**Opción 1: Desde la aplicación (Administrador)**

1. Inicia sesión como administrador
2. Ve a "Gestión de Usuarios"
3. Edita cada usuario y establece una nueva contraseña

**Opción 2: Desde MySQL (Manual)**

```bash
# Generar hash de contraseña (en Node.js)
node -e "console.log(require('bcryptjs').hashSync('nueva_password', 10));"
```

```sql
-- Actualizar en MySQL
UPDATE users
SET password_hash = '$2a$10$hash_generado_aqui'
WHERE username = 'nombre_usuario';
```

**Opción 3: Usuario Admin (ya lo creó el script de despliegue)**

El script de despliegue YA creó un usuario admin funcional con la contraseña que especificaste.

---

## 🔄 Resumen del Flujo Completo

```bash
# ═══════════════════════════════════════════════════
# EN TU MÁQUINA LOCAL
# ═══════════════════════════════════════════════════

# 1. Exportar datos de Supabase
node export-data-from-supabase.js

# 2. Verificar que se creó data-export/
ls -la data-export/

# 3. Transferir todo al servidor
rsync -avz --exclude 'node_modules' --exclude 'dist' \
  /ruta/boutique-pos \
  root@servidor:/opt/

# ═══════════════════════════════════════════════════
# EN EL SERVIDOR UBUNTU
# ═══════════════════════════════════════════════════

# 4. Conectar al servidor
ssh root@servidor

# 5. Ir al directorio
cd /opt/boutique-pos

# 6. Ejecutar despliegue completo
sudo ./deploy-production.sh

# 7. Importar los datos
node import-data-to-mysql.js

# 8. Verificar que todo funciona
pm2 status
mysql -u boutique_user -p
```

---

## 🛠️ Troubleshooting

### Error: "No se encontró el directorio data-export"

```bash
# Verificar que los archivos están en el servidor
ls -la /opt/boutique-pos/data-export/

# Si no están, transferirlos:
rsync -avz data-export/ root@servidor:/opt/boutique-pos/data-export/
```

### Error: "Cannot connect to MySQL"

```bash
# Verificar credenciales en .env
cat /opt/boutique-pos/.env

# Verificar que MySQL está corriendo
systemctl status mysql

# Probar conexión manual
mysql -u boutique_user -p
```

### Error: "Duplicate entry"

Esto significa que ya existen datos en la tabla.

```bash
# Opción 1: Limpiar tablas y volver a importar
mysql -u boutique_user -p boutique_db
```

```sql
-- CUIDADO: Esto elimina TODOS los datos
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE account_movements;
TRUNCATE TABLE cashbox_movements;
TRUNCATE TABLE current_accounts;
TRUNCATE TABLE sale_items;
TRUNCATE TABLE sales;
TRUNCATE TABLE products;
TRUNCATE TABLE clients;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;
EXIT;
```

```bash
# Volver a importar
node import-data-to-mysql.js
```

### No puedo hacer login con usuarios importados

Los usuarios importados tienen hash temporal. Usa el usuario **admin** creado durante el despliegue, o restablece las contraseñas como se explica arriba.

---

## 📊 Verificación Completa

Checklist de verificación:

- [ ] Datos exportados de Supabase (data-export/ creado)
- [ ] Archivos transferidos al servidor
- [ ] Script de despliegue ejecutado sin errores
- [ ] MySQL tiene las tablas creadas
- [ ] Script de importación ejecutado sin errores
- [ ] Las tablas tienen datos (SELECT COUNT(*))
- [ ] Puedes hacer login con el usuario admin
- [ ] Puedes ver clientes en la aplicación
- [ ] Puedes ver productos en la aplicación
- [ ] Puedes ver historial de ventas
- [ ] Aplicación funcionando correctamente

---

## 🎓 Archivos Involucrados

| Archivo | Ubicación | Propósito |
|---------|-----------|-----------|
| `export-data-from-supabase.js` | Local | Exporta datos de Supabase |
| `import-data-to-mysql.js` | Servidor | Importa datos a MySQL |
| `deploy-production.sh` | Servidor | Despliegue completo |
| `data-export/` | Local → Servidor | Datos en JSON |

---

## 🆘 Necesitas Ayuda?

Si tienes problemas:

1. **Revisa los logs:**
   ```bash
   # Logs del backend
   pm2 logs boutique-pos-api

   # Logs de MySQL
   tail -f /var/log/mysql/error.log
   ```

2. **Verifica la configuración:**
   ```bash
   # Variables de entorno
   cat /opt/boutique-pos/.env

   # Estado de servicios
   pm2 status
   systemctl status nginx
   systemctl status mysql
   ```

3. **Consulta la documentación:**
   - [DESPLIEGUE_COMPLETO.md](./DESPLIEGUE_COMPLETO.md)
   - [GUIA_RAPIDA.md](./GUIA_RAPIDA.md)

---

**¡Tu migración está completa!** 🎉

Todos tus datos de Supabase están ahora en MySQL en producción.
