# Despliegue de MatMax Business Suite

Documento vigente para desplegar MatMax. La arquitectura de producción es:

```text
Chrome/Safari
    │
    ▼
Cloudflare Pages — React + Vite
    │
    ▼
Supabase — PostgreSQL, Auth, RLS, Storage y Edge Functions
    ├── Stripe — suscripciones
    └── Resend — correos transaccionales
```

No se usa el despliegue histórico con MySQL, Nginx, PM2 ni un backend en el puerto 3001.

## 1. Requisitos

- Node.js 20.19.x o 22.12.x
- Acceso al repositorio y Cloudflare Pages
- Supabase CLI autenticado y vinculado al proyecto correcto
- Secretos de Supabase configurados
- Stripe y Resend configurados

## 2. Verificación previa

```bash
npm ci
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

No desplegar si el workflow CI del commit no está aprobado.

## 3. Base de datos y Edge Functions

Revisa las migraciones antes de aplicarlas. Las operaciones de base de datos afectan estado externo y deben ejecutarse contra el proyecto correcto.

```bash
npm run supabase:db:push
npm run supabase:deploy:functions
npm run supabase:deploy:webhook
```

El webhook de Stripe se despliega sin validación JWT porque Stripe autentica mediante su firma.

## 4. Frontend

Cloudflare Pages construye la rama `main` con:

```text
Comando: npm run build
Salida: dist
Dominio: app.matmaxsuite.com
```

Las variables públicas `VITE_*` se configuran en el hosting. Nunca expongas service role keys ni secretos de Stripe/Resend en el frontend.

## 5. SPA y caché

Mantén `public/_redirects` para el enrutamiento SPA. No crees `public/404.html`: Cloudflare Pages le da prioridad y puede romper rutas como `/dashboard` y `/reset-password`. El fallback para chunks antiguos es `public/stale-chunk.html`.

## 6. Checklist posterior

- Abrir `https://app.matmaxsuite.com`.
- Probar landing, login y recuperación de contraseña.
- Confirmar negocio activo y plan/trial.
- Probar roles `owner`, `admin`, `seller` y `super_admin`.
- Confirmar aislamiento entre negocios.
- Revisar productos, clientes, compras, ventas y devoluciones.
- Confirmar facturas, cotizaciones, caja y cuentas por cobrar.
- Validar reportes netos después de devoluciones.
- Verificar Stripe, Resend, auditoría y notificaciones.
- Revisar consola y solicitudes fallidas del navegador.

## 7. Recuperación

Si un despliegue falla, conserva el commit anterior aprobado, identifica el error en CI o Cloudflare y corrige mediante un nuevo commit. No sobrescribas migraciones ya aplicadas: crea una migración correctiva no destructiva.

## Referencias

- `README.md`
- `GUIA_RAPIDA.md`
- `DESPLIEGUE_SUPABASE_SAAS.md`
- `.github/workflows/ci.yml`
- `.env.example`
