# 📖 Guía Rápida de Despliegue

## 🎯 ¿Qué quieres hacer?

### Opción 1: Despliegue COMPLETO en Servidor Ubuntu (Más Común)

**Usa esto si:** Tienes un servidor Ubuntu limpio y quieres instalar toda la aplicación en producción.

```bash
# 1. (OPCIONAL) Exporta datos actuales de Supabase
npm run export:data
# Esto crea la carpeta data-export/ con todos tus datos

# 2. Transfiere la app al servidor (incluye data-export si lo creaste)
rsync -avz --exclude 'node_modules' /ruta/local/boutique-pos root@servidor:/opt/

# 3. Conéctate al servidor
ssh root@servidor

# 4. Ve al directorio
cd /opt/boutique-pos

# 5. Ejecuta el script de despliegue
sudo ./deploy-production.sh

# 6. (OPCIONAL) Importa tus datos de Supabase
npm run import:data
# Esto importa todos los datos de data-export/ a MySQL
```

**El script configurará TODO:**
- ✅ Node.js, MySQL, Nginx, PM2
- ✅ Base de datos + migraciones
- ✅ Backend API compilado
- ✅ Frontend compilado
- ✅ SSL (opcional)
- ✅ Firewall
- ✅ Importación de datos (si ejecutas el paso 6)

**📚 Documentación completa:** [DESPLIEGUE_COMPLETO.md](./DESPLIEGUE_COMPLETO.md)
**📦 Migración de datos:** [MIGRACION_DE_DATOS.md](./MIGRACION_DE_DATOS.md)

---

### Opción 2: Solo Migración de Base de Datos

**Usa esto si:** Ya tienes Node.js y otros servicios instalados, solo necesitas configurar MySQL.

```bash
./migrate-to-mysql.sh
```

**El script configurará:**
- ✅ Base de datos MySQL
- ✅ Usuario de DB
- ✅ Migraciones completas
- ✅ Usuario administrador
- ✅ Archivo .env

**📚 Documentación completa:** [SCRIPT_MIGRACION.md](./SCRIPT_MIGRACION.md)

---

### Opción 3: Migración Manual Paso a Paso

**Usa esto si:** Eres usuario avanzado y quieres control total de cada paso.

**📚 Documentación completa:** [MIGRACION_MYSQL.md](./MIGRACION_MYSQL.md)

---

## 🗺️ Arquitectura de la Aplicación

```
┌─────────────────────────────────────────────────┐
│              USUARIO / NAVEGADOR                │
│              https://mitienda.com               │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│                  NGINX (Puerto 80/443)          │
│  • Sirve archivos estáticos (React)            │
│  • Proxy inverso para /api                     │
│  • SSL/HTTPS con Let's Encrypt                 │
└────────┬────────────────────────┬───────────────┘
         │                        │
         ▼                        ▼
┌──────────────────┐    ┌─────────────────────────┐
│   FRONTEND       │    │   BACKEND (PM2)         │
│   React + Vite   │    │   Express + TypeScript  │
│   /opt/.../dist  │    │   Puerto 3001           │
└──────────────────┘    └───────────┬─────────────┘
                                    │
                                    ▼
                        ┌─────────────────────────┐
                        │   MySQL Database        │
                        │   boutique_db           │
                        │   Puerto 3306           │
                        └─────────────────────────┘
```

---

## 📁 Archivos Importantes

### Scripts de Despliegue
- `deploy-production.sh` - Despliegue completo automatizado
- `migrate-to-mysql.sh` - Solo migración de DB

### Documentación
- `GUIA_RAPIDA.md` - Esta guía (inicio rápido)
- `DESPLIEGUE_COMPLETO.md` - Guía detallada de despliegue
- `SCRIPT_MIGRACION.md` - Guía del script de migración
- `MIGRACION_MYSQL.md` - Guía de migración manual
- `README_MIGRACION.md` - Índice de documentación

### Configuración
- `.env` - Variables de entorno (generado automáticamente)
- `ecosystem.config.js` - Configuración de PM2 (generado)
- `migration.sql` - SQL de migración (generado)

---

## ⚡ Comandos Rápidos Post-Despliegue

```bash
# Ver estado de la aplicación
pm2 status

# Ver logs en vivo
pm2 logs boutique-pos-api

# Reiniciar aplicación
pm2 restart boutique-pos-api

# Ver logs de Nginx
tail -f /var/log/nginx/boutique-pos-error.log

# Backup de base de datos
mysqldump -u boutique_user -p boutique_db > backup.sql
```

---

## 🔐 Credenciales Por Defecto

### Usuario Administrador
- **Usuario:** admin (configurable durante instalación)
- **Password:** (lo defines durante instalación)

### Base de Datos
- **Base de datos:** boutique_db
- **Usuario:** boutique_user
- **Host:** localhost
- **Puerto:** 3306

**⚠️ IMPORTANTE:** Cambia todas las contraseñas en producción.

---

## 🆘 Problemas Comunes

### No puedo acceder a la aplicación

```bash
# Verificar que todo está corriendo
pm2 status
systemctl status nginx
systemctl status mysql

# Ver logs
pm2 logs boutique-pos-api --lines 50
```

### Error 502 Bad Gateway

```bash
# El backend no está respondiendo
pm2 restart boutique-pos-api
pm2 logs boutique-pos-api
```

### No puedo hacer login

```bash
# Verificar usuario en la base de datos
mysql -u boutique_user -p
USE boutique_db;
SELECT username, role, active FROM users WHERE role = 'admin';
```

---

## 📊 Checklist de Despliegue

- [ ] Servidor Ubuntu accesible vía SSH
- [ ] Dominio/IP configurado
- [ ] Código transferido a `/opt/boutique-pos`
- [ ] Script ejecutado sin errores
- [ ] PM2 muestra aplicación "online"
- [ ] Nginx responde en puerto 80/443
- [ ] MySQL tiene las tablas creadas
- [ ] Puedes acceder desde el navegador
- [ ] Login funciona correctamente
- [ ] Firewall configurado
- [ ] SSL habilitado (si aplica)
- [ ] Backups configurados

---

## 🎓 Siguiente Paso: Personalización

Una vez desplegado, puedes:

1. **Agregar usuarios** desde el panel de administración
2. **Configurar productos y clientes**
3. **Personalizar la marca** (logo, colores)
4. **Configurar backups automáticos**
5. **Monitorear la aplicación** con PM2

---

## 📞 Necesitas Ayuda

- **Despliegue completo:** Ver [DESPLIEGUE_COMPLETO.md](./DESPLIEGUE_COMPLETO.md)
- **Migración DB:** Ver [SCRIPT_MIGRACION.md](./SCRIPT_MIGRACION.md)
- **Manual avanzado:** Ver [MIGRACION_MYSQL.md](./MIGRACION_MYSQL.md)
- **Solución de problemas:** Ver sección específica en cada guía

---

**¡Listo para empezar!** 🚀

Elige la opción que mejor se adapte a tu caso y sigue la guía correspondiente.
