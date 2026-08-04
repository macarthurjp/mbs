# Guía rápida de MatMax Business Suite

Esta es la guía operativa vigente. MatMax usa React/Vite en el frontend, Supabase como backend y Cloudflare Pages para producción. No requiere MySQL, PM2, Nginx ni un servidor API propio.

## Requisitos

- Node.js 20.19.x o 22.12.x
- npm
- Proyecto Supabase configurado
- Variables basadas en `.env.example`

## Desarrollo local

```bash
npm install
cp .env.example .env
npm run dev
```

La URL habitual es `http://localhost:5173/`.

## Verificación

```bash
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Las pruebas e2e requieren las credenciales `E2E_*` declaradas en `.env.example`. CI ejecuta estas comprobaciones en cada push o pull request hacia `main`.

## Supabase

```bash
npm run supabase:db:push
npm run supabase:deploy:functions
npm run supabase:deploy:webhook
```

Los secretos de Stripe, Resend y la service role key se configuran en Supabase; nunca deben guardarse en variables `VITE_*`.

## Producción

- Rama: `main`
- Hosting: Cloudflare Pages
- Proyecto: `mbs`
- Dominio: `https://app.matmaxsuite.com`
- Build: `npm run build`
- Salida: `dist/`

Cada push a `main` debe aprobar CI antes de considerarse estable. Después del despliegue, verifica login, negocio activo, plan/trial, ventas, inventario, reportes y aislamiento entre negocios.

## Facturación

Stripe es la integración activa. `docs/lemon-squeezy-handoff.md` es solamente un plan futuro y no debe utilizarse como configuración vigente.

## Documentación

- `README.md`: referencia principal.
- `DESPLIEGUE_COMPLETO.md`: arquitectura y checklist de producción.
- `DESPLIEGUE_SUPABASE_SAAS.md`: funciones, migraciones y secretos.
- Los documentos de MySQL están conservados únicamente como archivo histórico.
