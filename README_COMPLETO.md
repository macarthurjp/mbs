# Sistema POS Completo

## Descripción General

Sistema de Punto de Venta (POS) profesional desarrollado con React, TypeScript y Supabase. Diseñado para pequeños y medianos comercios que necesitan gestión integral de ventas, inventario, clientes, cuentas corrientes y reportes detallados.

## Características Principales

### 1. Gestión de Ventas
- Sistema de caja completo con múltiples métodos de pago (efectivo, tarjeta, cuenta corriente, gift cards)
- Apertura y cierre de caja con reportes detallados
- Búsqueda rápida de productos por nombre, código de barras o categoría
- Cálculo automático de cambio y totales
- Edición y eliminación de ventas con control de stock
- Ventas en cuenta corriente con seguimiento de saldos

### 2. Cuentas Corrientes
- Gestión completa de clientes con cuenta corriente
- Seguimiento de deudas y pagos
- Antigüedad de deudas (0-30, 31-60, 61-90, +90 días)
- Registro de pagos parciales o totales
- Límites de crédito configurables
- Historial completo de movimientos

### 3. Gift Cards
- Creación de tarjetas de regalo personalizadas
- Diseño con mensajes "PARA" y "DE"
- Código de barras único para cada tarjeta
- Impresión en formato A4 (3 tarjetas por hoja)
- Seguimiento de activaciones, usos y saldos
- Reportes de ventas y canjes

### 4. Inventario
- Alta, modificación y eliminación de productos
- Categorización flexible
- Gestión de stock con alertas de bajo inventario
- Códigos de barras automáticos o personalizados
- Precios de costo y venta
- Actualización automática de stock en ventas

### 5. Reportes Avanzados
- **Ventas por Período**: Análisis detallado con filtros por fecha, categoría y vendedor
- **Ventas por Hora**: Identificación de horarios pico de ventas
- **Resumen de Caja**: Desglose completo por método de pago
- **Cuentas Corrientes**: Estado de deudas y antigüedad
- **Pagos de Cuenta**: Registro de todos los pagos recibidos
- **Gift Cards**: Ventas, canjes y saldos pendientes
- **Stock**: Inventario completo con valores
- **Gestión de Ventas**: Detalle completo de todas las transacciones

### 6. Impresión
- Tickets térmicos de 58mm y 80mm
- Impresión de facturas en A4
- Etiquetas de productos con código de barras
- Gift cards personalizadas
- Reportes exportables a PDF

### 7. Usuarios y Seguridad
- Sistema de autenticación con roles (admin, vendedor, cajero)
- Control de permisos por funcionalidad
- Registro de actividad por usuario
- Gestión de contraseñas seguras

### 8. Dashboard
- Panel principal con métricas en tiempo real
- Ventas del día, mes y comparativas
- Productos más vendidos
- Alertas de stock bajo
- Resumen de cuentas corrientes

## Tecnologías Utilizadas

### Frontend
- **React 18** - Biblioteca UI con hooks
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Framework CSS utility-first
- **Lucide React** - Iconos modernos
- **React-PDF** - Generación de PDFs
- **JsBarcode** - Generación de códigos de barras

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication
  - Row Level Security (RLS)
  - Real-time subscriptions
  - Functions y triggers

### Características de Seguridad
- Row Level Security en todas las tablas
- Políticas restrictivas por usuario
- Autenticación segura con JWT
- Validación de datos en cliente y servidor
- Control de permisos granular

## Estructura del Proyecto

```
sistema-pos/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── ui/             # Componentes UI base
│   │   └── reports/        # Componentes de reportes
│   ├── contexts/           # Context API (Auth, Notifications)
│   ├── pages/              # Páginas principales
│   ├── types/              # Definiciones TypeScript
│   ├── utils/              # Utilidades y helpers
│   └── lib/                # Configuración (Supabase)
├── supabase/
│   └── migrations/         # Migraciones de base de datos
├── public/                 # Archivos estáticos
└── docs/                   # Documentación
```

## Base de Datos

### Tablas Principales

1. **products** - Productos del inventario
2. **categories** - Categorías de productos
3. **clients** - Clientes y cuentas corrientes
4. **sales** - Registro de ventas
5. **sale_items** - Items individuales de cada venta
6. **account_movements** - Movimientos de cuenta corriente
7. **cashbox_closures** - Cierres de caja
8. **gift_cards** - Tarjetas de regalo
9. **gift_card_transactions** - Transacciones de gift cards
10. **user_profiles** - Perfiles de usuarios

### Funciones Especiales

- `get_sales_by_period()` - Obtener ventas filtradas
- `get_sales_by_hour()` - Análisis horario
- `get_cashbox_summary()` - Resumen de caja
- `get_current_accounts_with_aging()` - Cuentas con antigüedad
- `create_gift_card_with_sale()` - Crear gift card y venta
- `update_product_stock()` - Actualizar stock
- `delete_sale()` - Eliminar venta con reversión de stock
- `edit_sale_with_items()` - Editar venta completa

## Instalación

### Prerrequisitos
- Node.js 18 o superior
- npm o yarn
- Cuenta en Supabase

### Pasos

1. **Clonar el repositorio**
```bash
git clone https://github.com/aasfish/sistema-pos.git
cd sistema-pos
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
Crear archivo `.env` en la raíz:
```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima
```

4. **Ejecutar migraciones en Supabase**
- Ir a Supabase Dashboard > SQL Editor
- Ejecutar las migraciones en orden desde `supabase/migrations/`

5. **Iniciar servidor de desarrollo**
```bash
npm run dev
```

6. **Acceder a la aplicación**
```
http://localhost:5173
```

### Usuarios por Defecto

- **Admin**: admin / admin123
- **Vendedor**: vendedor / vendedor123
- **Cajero**: cajero / cajero123

## Despliegue a Producción

### Opción 1: Vercel
```bash
npm run build
vercel --prod
```

### Opción 2: Netlify
```bash
npm run build
netlify deploy --prod --dir=dist
```

### Opción 3: Servidor Propio
```bash
npm run build
# Copiar carpeta dist/ a tu servidor web
```

## Configuración de Impresoras

### Impresora Térmica
El sistema soporta impresoras térmicas ESC/POS de 58mm y 80mm.

**Configuración recomendada:**
1. Instalar driver de la impresora
2. En Chrome: Habilitar "Imprimir en segundo plano"
3. Configurar tamaño de papel en propiedades de impresora
4. Seleccionar impresora en Configuración del sistema

### Documentación
Ver archivos:
- `IMPRESORA_TERMICA.md` - Guía completa de impresión térmica
- `CONFIGURACION_IMPRESORAS.md` - Configuración detallada
- `GUIA_IMPRESORA_NEXUSPOS.md` - Integración con NexusPOS

## Flujos de Trabajo Principales

### 1. Realizar una Venta
1. Ir a "Caja"
2. Abrir caja (si está cerrada)
3. Buscar y agregar productos
4. Seleccionar cliente (opcional para cuenta corriente)
5. Elegir método de pago
6. Confirmar venta
7. Imprimir ticket

### 2. Gestionar Cuenta Corriente
1. Ir a "Cuentas Corrientes"
2. Ver deudas por cliente
3. Registrar pago (botón "Pagar")
4. Imprimir comprobante

### 3. Crear Gift Card
1. Ir a "Gift Cards"
2. Click en "Nueva Gift Card"
3. Ingresar monto y datos personalizados
4. Confirmar (genera venta automática)
5. Imprimir tarjeta

### 4. Cerrar Caja
1. Ir a "Caja"
2. Click en "Cerrar Caja"
3. Verificar totales por método de pago
4. Confirmar cierre
5. Imprimir resumen

### 5. Ver Reportes
1. Ir a "Reportes"
2. Seleccionar tipo de reporte
3. Aplicar filtros (fechas, categorías, usuarios)
4. Exportar a PDF si es necesario

## Características Técnicas Destacadas

### Gestión de Stock Inteligente
- Actualización automática en ventas
- Reversión automática al eliminar ventas
- Control de stock negativo
- Alertas de bajo stock

### Sincronización de Datos
- Triggers automáticos para mantener consistencia
- Cálculo automático de totales de venta
- Actualización de saldos de cuenta corriente
- Validación de integridad referencial

### Optimización de Rendimiento
- Índices en campos de búsqueda frecuente
- Vistas materializadas para reportes
- Paginación en listados grandes
- Carga lazy de componentes

### Experiencia de Usuario
- Interfaz responsive (móvil y desktop)
- Búsqueda en tiempo real
- Feedback visual en todas las acciones
- Atajos de teclado para funciones comunes
- Modo oscuro (opcional)

## Mantenimiento

### Backup de Base de Datos
Supabase realiza backups automáticos diarios. Para backup manual:
1. Ir a Supabase Dashboard
2. Settings > Database > Backups
3. Descargar backup

### Actualización de Datos
```bash
# Exportar datos de Supabase
npm run export:data

# Importar a MySQL (si es necesario)
npm run import:data
```

### Logs y Monitoreo
- Supabase Dashboard > Logs
- Revisar errores de RLS
- Monitorear queries lentas
- Verificar uso de recursos

## Solución de Problemas Comunes

### Error de autenticación
- Verificar variables de entorno
- Confirmar que las migraciones se ejecutaron
- Revisar políticas RLS en Supabase

### Problemas de impresión
- Verificar que la impresora está configurada
- Permitir ventanas emergentes en el navegador
- Revisar formato de papel en propiedades

### Stock no se actualiza
- Verificar que los triggers están activos
- Revisar permisos de la función `update_product_stock()`
- Confirmar que el producto existe

### Reportes vacíos
- Verificar rango de fechas
- Confirmar que hay datos en el período
- Revisar zona horaria del servidor

## Roadmap Futuro

- [ ] Integración con facturación electrónica
- [ ] App móvil nativa (React Native)
- [ ] Dashboard con gráficos avanzados
- [ ] Sistema de turnos para empleados
- [ ] Integración con proveedores
- [ ] Órdenes de compra
- [ ] Multi-sucursal
- [ ] API REST pública
- [ ] Exportación a Excel
- [ ] Notificaciones push

## Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crear una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

## Licencia

Este proyecto está bajo licencia MIT. Ver archivo `LICENSE` para más detalles.

## Soporte

Para reportar bugs o solicitar funcionalidades:
- Abrir un issue en GitHub
- Email: soporte@ejemplo.com

## Créditos

Desarrollado con ❤️ para comercios que necesitan una solución POS moderna, eficiente y fácil de usar.

---

**Versión:** 1.0.0
**Última actualización:** Marzo 2026
**Mantenido por:** aasfish
