import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard, Lock, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import OnboardingPage from './OnboardingPage';
import { getEffectivePlan, normalizeSubscriptionStatus } from '../utils/subscriptionPlan';

type SubscriptionStatus = 'loading' | 'active' | 'blocked' | 'missing-business';

type NegocioSubscription = {
  id: string;
  nombre: string;
  estado: string | null;
  plan: string | null;
  trial_ends_at: string | null;
  subscription_estado?: string | null;
  subscription_plan?: string | null;
};

type SubscriptionGuardProps = {
  children: ReactNode;
};

const DEV_FALLBACK_NEGOCIO_ID = import.meta.env.DEV
  ? String(import.meta.env.VITE_DEV_FALLBACK_NEGOCIO_ID || '')
  : '';

function isTrialActive(trialEndsAt: string | null) {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() >= Date.now();
}

export default function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { user, userProfile } = useAuth();

  const checkoutParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const checkoutStatus = checkoutParams.get('checkout');
  const checkoutPlan = checkoutParams.get('plan');
  const cameFromCheckout = checkoutStatus === 'success';

  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [business, setBusiness] = useState<NegocioSubscription | null>(null);
  const [message, setMessage] = useState('Validando suscripción...');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const resolveNegocioId = useCallback(async () => {
    if (userProfile?.negocio_id) return userProfile.negocio_id;

    if (!user?.id) return null;

    const { data, error } = await supabase
      .from('usuarios')
      .select('negocio_id')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('No se pudo leer negocio_id desde usuarios:', error);
    }

    if (data?.negocio_id) return data.negocio_id;

    if (import.meta.env.DEV && DEV_FALLBACK_NEGOCIO_ID && user.id === import.meta.env.VITE_DEV_FALLBACK_USER_ID) {
      return DEV_FALLBACK_NEGOCIO_ID;
    }

    return null;
  }, [user?.id, userProfile?.negocio_id]);

  const clearCheckoutUrl = useCallback(() => {
    if (cameFromCheckout) {
      window.history.replaceState({}, '', window.location.origin + window.location.pathname);
    }
  }, [cameFromCheckout]);

  const validateSubscription = useCallback(async () => {
    try {
      setStatus('loading');
      setMessage(cameFromCheckout ? 'Confirmando pago y activando acceso...' : 'Validando suscripción...');

      if (!user) {
        setStatus('blocked');
        setMessage('Debes iniciar sesión para usar el sistema.');
        return;
      }

      const maxAttempts = cameFromCheckout ? 8 : 1;
      let negocioId: string | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        negocioId = await resolveNegocioId();

        if (negocioId) break;

        if (attempt < maxAttempts) {
          await new Promise((resolve) => window.setTimeout(resolve, 1200));
        }
      }

      if (!negocioId) {
        setBusiness(null);
        setStatus('missing-business');
        setMessage('Este usuario no tiene un negocio asignado. Redirigiendo a configuración del negocio.');
        return;
      }

      let data: NegocioSubscription | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const [businessResult, subscriptionResult] = await Promise.all([
          supabase
            .from('negocios')
            .select('id, nombre, estado, plan, trial_ends_at')
            .eq('id', negocioId)
            .maybeSingle(),
          supabase
            .from('suscripciones')
            .select('estado, plan')
            .eq('negocio_id', negocioId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        ]);

        if (businessResult.error) throw businessResult.error;
        if (subscriptionResult.error) console.warn('No se pudo leer suscripción:', subscriptionResult.error);

        data = businessResult.data
          ? {
              ...(businessResult.data as NegocioSubscription),
              subscription_estado: subscriptionResult.data?.estado || null,
              subscription_plan: subscriptionResult.data?.plan || null,
            }
          : null;

        const normalizedCheckoutPlan = String(checkoutPlan || '').trim().toLowerCase();
        const normalizedBusinessPlan = getEffectivePlan({
          businessPlan: data?.plan,
          subscriptionPlan: data?.subscription_plan,
          subscriptionStatus: data?.subscription_estado,
        });
        const planMatches =
          !normalizedCheckoutPlan ||
          !['basic', 'pro', 'premium'].includes(normalizedCheckoutPlan) ||
          normalizedBusinessPlan === normalizedCheckoutPlan;

        if (!cameFromCheckout || (data?.estado === 'activo' && planMatches)) break;

        if (attempt < maxAttempts) {
          await new Promise((resolve) => window.setTimeout(resolve, 1200));
        }
      }

      if (!data) {
        setBusiness(null);
        setStatus('missing-business');
        setMessage('No se encontró el negocio asociado a este usuario.');
        return;
      }

      const currentBusiness = data as NegocioSubscription;
      const effectivePlan = getEffectivePlan({
        businessPlan: currentBusiness.plan,
        subscriptionPlan: currentBusiness.subscription_plan,
        subscriptionStatus: currentBusiness.subscription_estado,
      });
      const effectiveEstado =
        normalizeSubscriptionStatus(currentBusiness.subscription_estado) ||
        normalizeSubscriptionStatus(currentBusiness.estado) ||
        'activo';

      setBusiness({
        ...currentBusiness,
        estado: effectiveEstado,
        plan: effectivePlan,
      });

      const estado = effectiveEstado;
      const plan = effectivePlan;
      const trialIsActive = isTrialActive(currentBusiness.trial_ends_at);

      if (estado === 'suspendido' || estado === 'bloqueado' || estado === 'cancelado') {
        setStatus('blocked');
        setMessage('Tu cuenta está suspendida. Contacta al administrador de la plataforma.');
        return;
      }

      if (estado === 'activo') {
        clearCheckoutUrl();
        setStatus('active');
        return;
      }

      if (plan === 'trial' && trialIsActive) {
        clearCheckoutUrl();
        setStatus('active');
        return;
      }

      setStatus('blocked');
      setMessage('Tu prueba gratuita o suscripción ha vencido. Actualiza tu plan para continuar.');
    } catch (error) {
      console.error('Error validating subscription:', error);
      setStatus('blocked');
      setMessage('No se pudo validar la suscripción. Intenta nuevamente.');
    }
  }, [cameFromCheckout, checkoutPlan, clearCheckoutUrl, resolveNegocioId, user]);

  useEffect(() => {
    validateSubscription();
  }, [validateSubscription]);

  async function handleCheckout() {
    try {
      setCheckoutLoading(true);
      setMessage('Creando sesión de pago con Stripe...');

      if (!user) {
        setMessage('Debes iniciar sesión para pagar la suscripción.');
        return;
      }

      const negocioId = await resolveNegocioId();

      if (!negocioId) {
        setStatus('missing-business');
        setMessage('Primero completa la configuración del negocio antes de pagar.');
        return;
      }

      const checkoutPlan = business?.plan && business.plan !== 'trial' ? business.plan : 'basic';
      const checkoutPromise = supabase.functions.invoke('create-checkout-session', {
        body: {
          negocio_id: negocioId,
          user_id: user.id,
          plan: checkoutPlan,
          success_url: `${window.location.origin}?checkout=success&negocio_id=${negocioId}&plan=${checkoutPlan}`,
          cancel_url: `${window.location.origin}?checkout=cancelled&plan=${checkoutPlan}`
        }
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        window.setTimeout(() => {
          reject(new Error('La función create-checkout-session no respondió en 30 segundos. Revisa Supabase Edge Function Logs.'));
        }, 30000);
      });

      const { data, error } = await Promise.race([checkoutPromise, timeoutPromise]);

      if (error) throw new Error(String(error));

      const checkoutUrl = data?.url;

      if (!checkoutUrl) {
        throw new Error(data?.error || 'Stripe no devolvió una URL de pago.');
      }

      window.location.assign(checkoutUrl);
    } catch (error) {
      console.error('Error creating checkout session:', error);
      const errorMessage = error instanceof Error ? error.message : 'No se pudo iniciar el pago.';
      setMessage(errorMessage);
      alert(errorMessage);
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="matmax-page flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[2rem] border border-[#e9e2d3] bg-white/90 p-8 text-center shadow-matmax-soft">
          <RefreshCw className="mx-auto mb-4 h-10 w-10 animate-spin text-[#8a6a16]" />
          <h1 className="mb-2 text-2xl font-black text-[#050505]">Validando acceso</h1>
          <p className="font-medium text-[#52525b]">{message}</p>
        </div>
      </div>
    );
  }

  if (status === 'active') {
    return <>{children}</>;
  }

  if (status === 'missing-business') {
    return <OnboardingPage />;
  }

  return (
    <div className="matmax-page flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-[2rem] border border-red-200 bg-white/90 p-8 text-center shadow-matmax-soft">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <Lock className="h-8 w-8" />
        </div>

        <h1 className="mb-3 text-3xl font-serif font-bold text-red-700">
          Acceso bloqueado
        </h1>

        <p className="mb-6 font-medium text-[#52525b]">
          {message}
        </p>

        {business && (
          <div className="mb-6 rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4 text-left text-sm text-[#3f3f46]">
            <p><strong>Negocio:</strong> {business.nombre}</p>
            <p><strong>Plan:</strong> {business.plan || 'trial'}</p>
            <p><strong>Estado:</strong> {business.estado || 'activo'}</p>
            {business.trial_ends_at && (
              <p><strong>Trial vence:</strong> {new Date(business.trial_ends_at).toLocaleDateString()}</p>
            )}
          </div>
        )}

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={validateSubscription}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d9ceb8] bg-white px-5 py-3 font-black text-[#050505] transition hover:bg-[#fbfaf7]"
          >
            <RefreshCw size={18} />
            Validar otra vez
          </button>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f4c542] px-5 py-3 font-black text-[#050505] shadow-[0_18px_40px_rgba(244,197,66,0.35)] transition hover:bg-[#e8b93a] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <CreditCard size={18} />
            {checkoutLoading ? 'Abriendo Stripe...' : 'Pagar suscripción'}
          </button>
        </div>

        <p className="mt-6 text-xs font-medium text-[#a1a1aa]">
          El pago se procesa de forma segura con Stripe Checkout.
        </p>
      </div>
    </div>
  );
}
