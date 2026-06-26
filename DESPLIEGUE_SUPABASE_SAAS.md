# Despliegue Supabase SaaS

## 1. Secrets necesarios

Verifica en Supabase Dashboard > Edge Functions > Secrets:

```txt
APP_SUPABASE_URL
APP_SUPABASE_ANON_KEY
APP_SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_PRICE_BASIC
STRIPE_PRICE_PRO
STRIPE_PRICE_PREMIUM
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
```

## 2. Funciones que deben existir

Estas funciones son necesarias para el flujo SaaS:

```txt
create-business
create-checkout-session
create-billing-portal-session
stripe-webhook
sync-stripe-subscriptions
send-invoice
```

Si `create-business` no aparece en el Dashboard, el onboarding no podra crear/asociar negocios.

## 3. Deploy de funciones

Desde la raiz del proyecto:

```bash
npm run supabase:deploy:functions
```

Si quieres desplegar solo el webhook:

```bash
npm run supabase:deploy:webhook
```

`stripe-webhook` debe quedar con JWT desactivado porque Stripe no envia JWT de Supabase.

## 4. Aplicar migraciones

```bash
npm run supabase:db:push
```

Migraciones SaaS importantes:

```txt
20260616120000_harden_saas_tenant_rls.sql
20260616121500_create_stripe_webhook_events.sql
```

## 5. Prueba minima

1. Crear una cuenta nueva.
2. Completar onboarding.
3. Elegir plan.
4. Confirmar que Stripe Checkout abre.
5. Completar pago.
6. Confirmar que `negocios.estado` queda `activo`.
7. Confirmar que `stripe_webhook_events` registra el evento.
8. Probar Billing Portal desde Configuracion.
