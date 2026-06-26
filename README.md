# MatMax POS

Sistema SaaS de punto de venta para negocios minoristas. Incluye ventas, inventario, clientes, facturas, cotizaciones, compras, caja, cuentas por cobrar, reportes, usuarios, auditoría, soporte, suscripciones y administración de plataforma.

## Estado Técnico

Última verificación local:

```bash
npm run lint
npm run typecheck
npm run build
```

Resultado actual: los tres comandos pasan correctamente. El proyecto no tiene suite automatizada de unit tests o e2e configurada todavía.

## Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase
  - PostgreSQL
  - Auth
  - Row Level Security
  - Edge Functions
  - Realtime
- Stripe para suscripciones
- Resend para envío de correos
- React PDF, jsPDF, html2canvas y JsBarcode para documentos, reportes, facturas, cotizaciones y etiquetas

## Módulos Principales

- Dashboard con métricas operativas y financieras
- Ventas con control de stock, descuentos, cuentas por cobrar y notificaciones
- Facturas con impresión, descarga HTML, envío por email y WhatsApp
- Cotizaciones con generación y envío por email
- Clientes con validación y formato de contacto
- Productos, inventario, precios, stock mínimo y seguimiento de cambios de precio
- Compras con actualización automática de inventario
- Caja diaria y resumen de movimientos
- Cuentas por cobrar con pagos, vencimientos y reportes
- Reportes de ventas, caja, inventario, rentabilidad, cuentas y gift cards
- Gift cards con emisión, uso, saldo, impresión y reportes
- Etiquetas y códigos de barras
- Usuarios y roles
- Logs de auditoría
- Centro de notificaciones
- Soporte y tickets
- Configuración del negocio, correo remitente, moneda, logo, permisos y facturación
- Super Admin para gestión SaaS de negocios, usuarios, planes y suscripciones
- Onboarding y protección de suscripción

## Roles y Permisos

El sistema trabaja con roles normalizados:

- `super_admin`: acceso de plataforma.
- `owner`: dueño del negocio.
- `admin`: administración operativa del negocio.
- `seller`: acceso de vendedor con permisos restringidos.

La separación por negocio usa `negocio_id` y debe estar reforzada por políticas RLS en Supabase.

## Requisitos

- Node.js 18 o superior
- npm
- Proyecto Supabase configurado
- Supabase CLI para desplegar migraciones y Edge Functions
- Cuenta Stripe para suscripciones
- Cuenta Resend para correos transaccionales

## Instalación Local

```bash
npm install
```

Crear un archivo `.env` en la raíz con las variables públicas del frontend:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SAAS_EMAIL_DOMAIN=mbs.app
VITE_SESSION_TIMEOUT_MINUTES=30
VITE_DEV_FALLBACK_NEGOCIO_ID=
VITE_DEV_FALLBACK_USER_ID=
```

No guardes service role keys, secretos de Stripe ni llaves de Resend en variables `VITE_*`, porque esas variables se exponen al navegador.

## Desarrollo

```bash
npm run dev
```

La aplicación normalmente queda disponible en:

```text
http://localhost:5173
```

## Scripts Disponibles

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run preview
```

Scripts de Supabase:

```bash
npm run supabase:db:push
npm run supabase:deploy:functions
npm run supabase:deploy:webhook
```

Scripts de migración de datos:

```bash
npm run export:data
npm run import:data
```

## Verificación Técnica

Antes de entregar o desplegar cambios, ejecutar:

```bash
npm run lint
npm run typecheck
npm run build
```

Qué cubren:

- `lint`: reglas de ESLint, hooks de React, imports y tipado básico.
- `typecheck`: validación completa de TypeScript.
- `build`: compilación de producción con Vite.

Qué no cubren:

- Login real con Supabase.
- RLS y permisos en datos reales.
- Flujos completos de venta, factura, cotización y caja.
- Webhooks de Stripe.
- Envío real de correos.
- Impresión térmica o WebUSB.

Para validar producción se recomienda hacer una prueba manual/e2e de los flujos críticos.

## Variables de Entorno de Edge Functions

Las Edge Functions usan secretos configurados en Supabase, no en el frontend:

```env
APP_SUPABASE_URL=
APP_SUPABASE_ANON_KEY=
APP_SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_BASIC=
STRIPE_PRICE_PRO=
STRIPE_PRICE_PREMIUM=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
SAAS_EMAIL_DOMAIN=mbs.app
```

Configurar estos valores con Supabase CLI o desde el Dashboard de Supabase.

## Supabase

El proyecto incluye:

- Migraciones en `supabase/migrations/`
- Edge Functions en `supabase/functions/`
- Configuración local en `supabase/config.toml`

Orden recomendado de despliegue:

1. Revisar `.env` local y secretos de Supabase.
2. Aplicar migraciones:

```bash
npm run supabase:db:push
```

3. Desplegar funciones generales:

```bash
npm run supabase:deploy:functions
```

4. Desplegar webhook de Stripe:

```bash
npm run supabase:deploy:webhook
```

5. Verificar RLS, storage, Stripe, Resend y dominio de correo.

## Estructura del Proyecto

```text
.
├── public/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   ├── reports/
│   │   └── ui/
│   ├── contexts/
│   ├── lib/
│   ├── pages/
│   └── utils/
├── supabase/
│   ├── functions/
│   └── migrations/
├── dist/
├── package.json
├── vite.config.ts
├── tsconfig.app.json
└── eslint.config.js
```

## Documentación Relacionada

- `DESPLIEGUE_SUPABASE_SAAS.md`: despliegue SaaS con Supabase.
- `DESPLIEGUE_COMPLETO.md`: guía completa de despliegue.
- `GUIA_RAPIDA.md`: guía rápida de uso/despliegue.
- `CONFIGURACION_IMPRESORAS.md`: configuración de impresoras.
- `IMPRESORA_TERMICA.md`: impresión térmica.
- `GUIA_IMPRESORA_NEXUSPOS.md`: guía para impresora NexusPOS.
- `GIFT_CARDS_CON_CAJA.md`: gift cards integradas con caja.
- `MIGRACION_DE_DATOS.md`, `MIGRACION_MYSQL.md`, `README_MIGRACION.md`: documentación de migración.

## Flujo Básico de Operación

1. Crear o configurar el negocio.
2. Crear usuarios y asignar roles.
3. Configurar moneda, logo, permisos de venta y correo del negocio.
4. Cargar productos y clientes.
5. Registrar ventas, compras y movimientos de caja.
6. Emitir facturas, cotizaciones y reportes.
7. Revisar notificaciones, auditoría y cuentas por cobrar.
8. Administrar suscripción desde Stripe Billing Portal.

## Producción

Para producción:

- Ejecutar `npm run build`.
- Publicar la carpeta `dist/` en el hosting elegido.
- Configurar variables `VITE_*` en el hosting.
- Configurar secretos de Edge Functions en Supabase.
- Verificar políticas RLS con usuarios reales de cada rol.
- Verificar webhook de Stripe con eventos reales o Stripe CLI.
- Verificar envío de facturas/cotizaciones con Resend.

## Seguridad

- No exponer service role keys en frontend.
- Mantener RLS activo en tablas multi-tenant.
- Validar que todo acceso por negocio filtre por `negocio_id`.
- Validar permisos tanto en UI como en políticas/funciones backend.
- Probar usuarios `owner`, `admin`, `seller` y `super_admin` antes de producción.
- Mantener logs de auditoría activos para acciones críticas.

## Licencia

Propietario. Uso interno/comercial autorizado por el dueño del proyecto.
