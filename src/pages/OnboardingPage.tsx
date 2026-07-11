import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CreditCard,
  Crown,
  Sparkles,
  User
} from 'lucide-react';
import Card, { CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  DEFAULT_PHONE_INPUT_VALUE,
  normalizePhoneForStorage,
  sanitizePhoneInput
} from '../utils/formatContact';
import { notifySaasOwner } from '../utils/ownerAlerts';

type OnboardingStep = 'business' | 'plans';
type PlanId = 'basic' | 'pro' | 'premium';

type OnboardingPageProps = {
  selectedPlan?: PlanId;
};

async function getFunctionErrorMessage(error: unknown, fallback: string) {
  const context = (error as { context?: Response } | null)?.context;

  if (context instanceof Response) {
    try {
      const payload = await context.clone().json();
      if (payload?.error) return String(payload.error);
    } catch {
      try {
        const text = await context.clone().text();
        if (text) return text;
      } catch {
        return fallback;
      }
    }
  }

  return error instanceof Error ? error.message || fallback : fallback;
}

type Plan = {
  id: PlanId;
  name: string;
  price: string;
  description: string;
  icon: React.ElementType;
  features: readonly string[];
  badge?: string;
};

const onboardingCopy = {
  es: {
    brand: 'MatMax Business Suite',
    title: 'Configura tu negocio',
    subtitle: 'Gestión - Precisión - Elegancia para empresas que quieren vender, medir y crecer mejor.',
    businessStep: 'Datos',
    planStep: 'Plan',
    ownerCompanyTitle: 'Información del propietario y empresa',
    ownerCompanySubtitle: 'Estos datos se usarán para crear el negocio y asociarlo a tu cuenta.',
    ownerName: 'Nombre del dueño',
    ownerNamePlaceholder: 'Ej. María González',
    businessName: 'Nombre de empresa',
    businessNamePlaceholder: 'Ej. Beauty Studio Lux',
    phone: 'Teléfono',
    phonePlaceholder: 'Ej. +1 (809) 555-1234',
    email: 'Email',
    emailPlaceholder: 'correo@empresa.com',
    businessType: 'Tipo de empresa',
    businessTypePlaceholder: 'Ej. Retail, belleza, restaurante, servicios...',
    next: 'Siguiente',
    back: 'Volver',
    company: 'Empresa',
    preparingPayment: 'Preparando pago...',
    choosePlan: 'Elegir plan',
    ownerRequired: 'El nombre del dueño es obligatorio',
    businessRequired: 'El nombre de la empresa es obligatorio',
    phoneRequired: 'El teléfono es obligatorio',
    phoneInvalid: 'El teléfono solo puede contener números, espacios, +, guiones o paréntesis',
    emailRequired: 'El email es obligatorio',
    businessTypeRequired: 'El tipo de empresa es obligatorio',
    loginRequired: 'Debes iniciar sesión para crear tu negocio',
    businessCreateError: 'No se pudo crear el negocio',
    invalidStripeResponse: 'Respuesta inválida de Stripe Checkout',
    stripeSessionError: 'No se pudo crear la sesión de pago',
    stripeUrlError: 'Stripe no devolvió una URL de pago',
    paymentError: 'Error al iniciar el pago',
    basicDescription: 'Ideal para negocios pequeños que quieren controlar ventas, clientes e inventario.',
    proDescription: 'Para negocios en crecimiento que necesitan reportes, caja y compras.',
    premiumDescription: 'Para empresas que necesitan control completo y herramientas avanzadas.',
    recommended: 'Recomendado',
    basicFeatures: ['Ventas y productos', 'Clientes', 'Cotizaciones', 'Facturación simple'],
    proFeatures: ['Todo en Basic', 'Caja avanzada', 'Cuentas por cobrar', 'Reportes', 'Control por roles'],
    premiumFeatures: ['Todo en Pro', 'Multiusuario', 'Permisos Dueño/Admin/Vendedor', 'Analytics avanzado', 'Soporte prioritario']
  },
  en: {
    brand: 'MatMax Business Suite',
    title: 'Set up your business',
    subtitle: 'Management - Precision - Elegance for businesses that want to sell, measure, and grow better.',
    businessStep: 'Details',
    planStep: 'Plan',
    ownerCompanyTitle: 'Owner and business information',
    ownerCompanySubtitle: 'This information will be used to create the business and link it to your account.',
    ownerName: 'Owner name',
    ownerNamePlaceholder: 'Ex. Maria Gonzalez',
    businessName: 'Business name',
    businessNamePlaceholder: 'Ex. Beauty Studio Lux',
    phone: 'Phone',
    phonePlaceholder: 'Ex. +1 (809) 555-1234',
    email: 'Email',
    emailPlaceholder: 'email@company.com',
    businessType: 'Business type',
    businessTypePlaceholder: 'Ex. Retail, beauty, restaurant, services...',
    next: 'Next',
    back: 'Back',
    company: 'Company',
    preparingPayment: 'Preparing payment...',
    choosePlan: 'Choose plan',
    ownerRequired: 'Owner name is required',
    businessRequired: 'Business name is required',
    phoneRequired: 'Phone number is required',
    phoneInvalid: 'Phone can only contain numbers, spaces, +, hyphens, or parentheses',
    emailRequired: 'Email is required',
    businessTypeRequired: 'Business type is required',
    loginRequired: 'You must sign in to create your business',
    businessCreateError: 'Could not create business',
    invalidStripeResponse: 'Invalid Stripe Checkout response',
    stripeSessionError: 'Could not create checkout session',
    stripeUrlError: 'Stripe did not return a payment URL',
    paymentError: 'Error starting payment',
    basicDescription: 'Ideal for small businesses that want to manage sales, clients, and inventory.',
    proDescription: 'For growing businesses that need reports, cashbox, and purchases.',
    premiumDescription: 'For companies that need complete control and advanced tools.',
    recommended: 'Recommended',
    basicFeatures: ['Sales and products', 'Clients', 'Quotes', 'Simple invoicing'],
    proFeatures: ['Everything in Basic', 'Advanced cashbox', 'Accounts receivable', 'Reports', 'Role control'],
    premiumFeatures: ['Everything in Pro', 'Multi-user', 'Owner/Admin/Seller permissions', 'Advanced analytics', 'Priority support']
  }
} as const;

const getPlans = (t: (typeof onboardingCopy)[keyof typeof onboardingCopy]): Plan[] => [
  {
    id: 'basic',
    name: 'Basic',
    price: '€99.99/mes',
    description: t.basicDescription,
    icon: CreditCard,
    features: t.basicFeatures
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '€149.99/mes',
    description: t.proDescription,
    icon: Sparkles,
    badge: t.recommended,
    features: t.proFeatures
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '€249.99/mes',
    description: t.premiumDescription,
    icon: Crown,
    features: t.premiumFeatures
  }
];

export default function OnboardingPage({ selectedPlan: initialSelectedPlan = 'basic' }: OnboardingPageProps) {
  const { user, refreshProfile } = useAuth();
  const { showToast } = useNotification();
  const { language } = useLanguage();
  const t = onboardingCopy[language];
  const plans = getPlans(t);

  const [step, setStep] = useState<OnboardingStep>('business');
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(initialSelectedPlan);
  const [saving, setSaving] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [createdNegocioId, setCreatedNegocioId] = useState<string | null>(null);

  const [form, setForm] = useState({
    owner_name: '',
    business_name: '',
    phone: DEFAULT_PHONE_INPUT_VALUE,
    email: user?.email || '',
    business_type: ''
  });

  function isValidPhone(value: string) {
    const cleanValue = value.trim();
    const digits = cleanValue.replace(/\D/g, '');

    return /^[+\d\s()-]+$/.test(cleanValue) && digits.length >= 7 && digits.length <= 15;
  }

  function validateBusinessForm() {
    if (!form.owner_name.trim()) return t.ownerRequired;
    if (!form.business_name.trim()) return t.businessRequired;
    if (!form.phone.trim()) return t.phoneRequired;
    if (!isValidPhone(form.phone)) return t.phoneInvalid;
    if (!form.email.trim()) return t.emailRequired;
    if (!form.business_type.trim()) return t.businessTypeRequired;
    return null;
  }

  async function handleNext() {
    const errorMessage = validateBusinessForm();

    if (errorMessage) {
      showToast(errorMessage, 'error');
      return;
    }

    setStep('plans');
  }

  async function createBusinessIfNeeded(plan: PlanId) {
    if (createdNegocioId) {
      const { data, error } = await supabase.functions.invoke('create-business', {
        body: {
          owner_name: form.owner_name.trim(),
          business_name: form.business_name.trim(),
          phone: normalizePhoneForStorage(form.phone),
          email: form.email.trim().toLowerCase() || user?.email || null,
          business_type: form.business_type.trim(),
          plan
        }
      });

      if (error) throw new Error(await getFunctionErrorMessage(error, t.businessCreateError));

      if (data?.negocio_id && data.negocio_id !== createdNegocioId) {
        setCreatedNegocioId(data.negocio_id);
        return data.negocio_id as string;
      }

      return createdNegocioId;
    }

    if (!user?.id) {
      throw new Error(t.loginRequired);
    }

    setSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-business', {
        body: {
          owner_name: form.owner_name.trim(),
          business_name: form.business_name.trim(),
          phone: normalizePhoneForStorage(form.phone),
          email: form.email.trim().toLowerCase() || user.email || null,
          business_type: form.business_type.trim(),
          plan
        }
      });

      if (error) throw new Error(await getFunctionErrorMessage(error, t.businessCreateError));

      if (!data?.negocio_id) {
        throw new Error(t.businessCreateError);
      }

      setCreatedNegocioId(data.negocio_id);
      notifySaasOwner({
        event_type: 'signup_completed',
        email: form.email.trim().toLowerCase() || user.email || null,
        user_id: user.id,
        negocio_id: data.negocio_id,
        selected_plan: plan,
        owner_name: form.owner_name.trim(),
        business_name: form.business_name.trim()
      });
      await refreshProfile();
      return data.negocio_id as string;
    } finally {
      setSaving(false);
    }
  }

  async function handleCheckout(plan: PlanId) {
    try {
      setSelectedPlan(plan);
      sessionStorage.setItem('matmax_selected_plan', plan);
      setCheckoutLoading(true);

      const negocioId = await createBusinessIfNeeded(plan);

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          negocio_id: negocioId,
          user_id: user?.id,
          plan,
          success_url: `${window.location.origin}?checkout=success&negocio_id=${negocioId}&plan=${plan}`,
          cancel_url: `${window.location.origin}?checkout=cancelled&plan=${plan}`
        }
      });

      if (error) {
        throw new Error(await getFunctionErrorMessage(error, t.stripeSessionError));
      }

      if (!data?.url) {
        throw new Error(t.stripeUrlError);
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error('Onboarding checkout error:', error);
      const message = error instanceof Error ? error.message : t.paymentError;
      showToast(message, 'error');
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <div className="matmax-page min-h-screen px-4 py-8 text-[#08080b] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-[#8a6a16] sm:text-sm sm:tracking-[0.35em]">
            {t.brand}
          </p>
          <h1 className="matmax-heading-gradient mb-4 text-4xl font-serif font-bold md:text-6xl">
            {t.title}
          </h1>
          <p className="text-base font-medium text-[#52525b] sm:text-lg">
            {t.subtitle}
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <div className={`flex items-center gap-2 ${step === 'business' ? 'text-[#050505]' : 'text-[#8a6a16]'}`}>
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-black ${
                step === 'business' ? 'bg-[#050505] text-[#f4c542]' : 'bg-[#fff4c7] text-[#8a6a16]'
              }`}
            >
              {step === 'business' ? '1' : <Check className="shrink-0" size={18} />}
            </div>
            <span className="font-black">{t.businessStep}</span>
          </div>
          <div className="h-px w-16 bg-[#d9ceb8]" />
          <div className={`flex items-center gap-2 ${step === 'plans' ? 'text-[#050505]' : 'text-[#71717a]'}`}>
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-black ${
                step === 'plans' ? 'bg-[#050505] text-[#f4c542]' : 'border border-[#e9e2d3] bg-white text-[#71717a]'
              }`}
            >
              2
            </div>
            <span className="font-black">{t.planStep}</span>
          </div>
        </div>

        {step === 'business' && (
          <Card className="mx-auto max-w-3xl border-[#e9e2d3] bg-white/90 shadow-matmax-soft">
            <CardContent className="p-5 sm:p-8">
              <div className="mb-8 flex items-start gap-4">
                <div className="rounded-2xl bg-[#050505] p-3 text-[#f4c542]">
                  <User className="shrink-0" size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[#050505]">{t.ownerCompanyTitle}</h2>
                  <p className="mt-1 text-[#52525b]">
                    {t.ownerCompanySubtitle}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Input
                  label={t.ownerName}
                  value={form.owner_name}
                  onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                  placeholder={t.ownerNamePlaceholder}
                />
                <Input
                  label={t.businessName}
                  value={form.business_name}
                  onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                  placeholder={t.businessNamePlaceholder}
                />
                <Input
                  label={t.phone}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: sanitizePhoneInput(e.target.value) })}
                  placeholder={t.phonePlaceholder}
                  inputMode="tel"
                />
                <Input
                  label={t.email}
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={t.emailPlaceholder}
                />
                <div className="md:col-span-2">
                  <Input
                    label={t.businessType}
                    value={form.business_type}
                    onChange={(e) => setForm({ ...form, business_type: e.target.value })}
                    placeholder={t.businessTypePlaceholder}
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#050505] bg-[#050505] px-6 py-3 font-black text-[#f4c542] shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:bg-[#111111] hover:shadow-[0_24px_60px_rgba(0,0,0,0.34)] sm:w-auto"
                >
                  {t.next}
                  <ArrowRight className="shrink-0" size={18} />
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'plans' && (
          <div className="space-y-6">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setStep('business')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#d9ceb8] bg-white px-5 py-3 font-black text-[#050505] shadow-sm transition hover:bg-[#fbfaf7] sm:w-auto"
              >
                <ArrowLeft className="shrink-0" size={18} />
                {t.back}
              </button>
              <div className="text-left sm:text-right">
                <p className="text-sm font-bold text-[#71717a]">{t.company}</p>
                <p className="max-w-full break-words font-black text-[#050505]">{form.business_name}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {plans.map((plan) => {
                const Icon = plan.icon;
                const isSelected = selectedPlan === plan.id;
                const isLoading = checkoutLoading && isSelected;

                return (
                  <Card
                    key={plan.id}
                    className={`relative overflow-hidden border-[#e9e2d3] bg-white/90 shadow-matmax-soft ${
                      isSelected ? 'ring-2 ring-[#f4c542]' : ''
                    }`}
                  >
                    {plan.badge && (
                      <div className="absolute right-4 top-4 rounded-full bg-[#050505] px-3 py-1 text-xs font-black text-[#f4c542]">
                        {plan.badge}
                      </div>
                    )}
                    <CardContent className="p-7">
                      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#050505] text-[#f4c542]">
                        <Icon className="h-7 w-7 shrink-0" />
                      </div>

                      <h3 className="mb-2 text-2xl font-black text-[#050505]">{plan.name}</h3>
                      <p className="mb-3 text-4xl font-black text-[#8a6a16]">{plan.price}</p>
                      <p className="mb-6 min-h-[72px] text-[#52525b]">{plan.description}</p>

                      <ul className="mb-7 space-y-3">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm font-medium text-[#3f3f46]">
                            <Check size={17} className="shrink-0 text-[#8a6a16]" />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      <button
                        type="button"
                        onClick={() => handleCheckout(plan.id)}
                        disabled={checkoutLoading || saving}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#050505] bg-[#050505] px-5 py-3 font-black text-[#f4c542] shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:bg-[#111111] hover:shadow-[0_24px_60px_rgba(0,0,0,0.34)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Building2 className="shrink-0" size={18} />
                        {isLoading || saving ? t.preparingPayment : t.choosePlan}
                      </button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
