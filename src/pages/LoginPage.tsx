import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
  UserPlus,
  Lock,
  ArrowLeft,
  CheckCircle2,
  Mail
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Input } from '../components/ui/Input';
import { supabase } from '../lib/supabase';

type AuthMode = 'login' | 'signup' | 'forgot';

type PlanSlug = 'basic' | 'pro' | 'premium';

type LoginPageProps = {
  selectedPlan?: PlanSlug;
};

const loginCopy = {
  es: {
    brand: 'MatMax Business Suite',
    heroTitle: 'Gestión premium para negocios modernos.',
    heroSubtitle: 'Accede a ventas, cotizaciones, inventario, clientes, caja, facturación, cuentas por cobrar y reportes desde una plataforma elegante, segura y preparada para crecer.',
    secureStripe: 'Pago seguro con Stripe',
    realtimeDashboard: 'Dashboard en tiempo real',
    subscriptionControl: 'Control por suscripción y roles',
    home: 'Inicio',
    loginTitle: 'Iniciar sesión',
    signupTitle: 'Crear cuenta',
    forgotTitle: 'Recuperar contraseña',
    loginDescription: 'Accede a tu cuenta para continuar a tu dashboard o completar tu negocio.',
    signupDescription: 'Crea tu acceso para configurar tu negocio y seleccionar un plan.',
    selectedPlan: 'Plan seleccionado',
    basicPlan: 'Basic',
    proPlan: 'Pro',
    premiumPlan: 'Premium',
    forgotDescription: 'Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.',
    loginTab: 'Iniciar sesión',
    signupTab: 'Crear cuenta',
    email: 'Correo Electrónico',
    emailPlaceholder: 'correo@empresa.com',
    password: 'Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    passwordMismatch: 'Las contraseñas no coinciden',
    passwordMin: 'La contraseña debe tener mínimo 6 caracteres',
    signupSuccess: 'Cuenta creada correctamente. Revisa tu correo si Supabase solicita confirmación.',
    resetSuccess: 'Te enviamos un enlace para restablecer tu contraseña. Revisa tu correo electrónico y sigue las instrucciones para crear una nueva contraseña.',
    authError: 'Error de autenticación',
    creating: 'Creando cuenta...',
    signingIn: 'Iniciando sesión...',
    createAccount: 'Crear cuenta',
    signIn: 'Iniciar sesión',
    forgotPassword: '¿Olvidaste tu contraseña?',
    sendResetLink: 'Enviar enlace de recuperación',
    sendingReset: 'Enviando enlace...',
    backToLogin: 'Volver a iniciar sesión',
    secureAccess: 'Acceso seguro protegido por Supabase Auth y permisos por rol',
  },
  en: {
    brand: 'MatMax Business Suite',
    heroTitle: 'Premium management for modern businesses.',
    heroSubtitle: 'Access sales, quotes, inventory, clients, cashbox, invoicing, accounts receivable, and reports from an elegant, secure platform built to grow.',
    secureStripe: 'Secure payment with Stripe',
    realtimeDashboard: 'Real-time dashboard',
    subscriptionControl: 'Subscription and role control',
    home: 'Home',
    loginTitle: 'Sign in',
    signupTitle: 'Create account',
    forgotTitle: 'Reset password',
    loginDescription: 'Access your account to continue to your dashboard or complete your business setup.',
    signupDescription: 'Create your access to configure your business and select a plan.',
    selectedPlan: 'Selected plan',
    basicPlan: 'Basic',
    proPlan: 'Pro',
    premiumPlan: 'Premium',
    forgotDescription: 'Enter your email address and we will send you a link to reset your password.',
    loginTab: 'Sign in',
    signupTab: 'Create account',
    email: 'Email Address',
    emailPlaceholder: 'email@company.com',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    passwordMismatch: 'Passwords do not match',
    passwordMin: 'Password must be at least 6 characters',
    signupSuccess: 'Account created successfully. Check your email if Supabase requires confirmation.',
    resetSuccess: 'We sent you a password reset link. Check your inbox and follow the instructions to create a new password.',
    authError: 'Authentication error',
    creating: 'Creating account...',
    signingIn: 'Signing in...',
    createAccount: 'Create account',
    signIn: 'Sign in',
    forgotPassword: 'Forgot your password?',
    sendResetLink: 'Send reset link',
    sendingReset: 'Sending link...',
    backToLogin: 'Back to sign in',
    secureAccess: 'Secure access protected by Supabase Auth and role permissions',
  },
} as const;

export function LoginPage({ selectedPlan = 'basic' }: LoginPageProps) {
  const {
    signIn,
    refreshProfile,
    user,
    loading: authLoading
  } = useAuth();
  const { language } = useLanguage();
  const t = loginCopy[language];

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isSignup = mode === 'signup';
  const isForgot = mode === 'forgot';
  const selectedPlanLabel = selectedPlan === 'premium'
    ? t.premiumPlan
    : selectedPlan === 'pro'
      ? t.proPlan
      : t.basicPlan;

  useEffect(() => {
    if (!authLoading && user) {
      sessionStorage.setItem('matmax_selected_plan', selectedPlan);
      window.location.href = '/dashboard';
    }
  }, [user, authLoading, selectedPlan]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (isForgot) {
        const normalizedEmail = email.trim().toLowerCase();

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/reset-password`
        });

        if (resetError) throw resetError;

        setSuccessMessage(t.resetSuccess);
        setPassword('');
        setConfirmPassword('');
        setMode('login');
        return;
      }

      if (isSignup) {
        if (password !== confirmPassword) {
          throw new Error(t.passwordMismatch);
        }

        if (password.length < 6) {
          throw new Error(t.passwordMin);
        }

        const normalizedEmail = email.trim().toLowerCase();
        sessionStorage.setItem('matmax_selected_plan', selectedPlan);

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password
        });

        if (signUpError) throw signUpError;

        const authUser = data.user;

        if (!authUser) {
          throw new Error('No se pudo crear el usuario');
        }

        localStorage.setItem('matmax_has_account', 'true');

        const { error: profileError } = await supabase
          .from('usuarios')
          .upsert({
            id: authUser.id,
            email: normalizedEmail,
            rol: 'owner',
            is_active: true
          });

        if (profileError) {
          console.error(profileError);
        }

        if (!data.session) {
          const { error: autoLoginError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password
          });

          if (autoLoginError) {
            setSuccessMessage(t.signupSuccess);
            setMode('login');
            setPassword('');
            setConfirmPassword('');
            return;
          }
        }

        await refreshProfile?.();

        await new Promise((resolve) => setTimeout(resolve, 1500));

        const {
          data: { session: finalSession }
        } = await supabase.auth.getSession();

        if (!finalSession) {
          throw new Error('La sesión no pudo inicializarse');
        }

        localStorage.setItem('matmax_auth', 'true');
        localStorage.setItem('matmax_has_account', 'true');

        window.location.href = '/dashboard';

        return;
      }

      sessionStorage.setItem('matmax_selected_plan', selectedPlan);
      await signIn(email.trim().toLowerCase(), password);

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No se pudo iniciar la sesión');
      }

      await refreshProfile?.();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      localStorage.setItem('matmax_auth', 'true');
      localStorage.setItem('matmax_has_account', 'true');

      window.location.href = '/dashboard';
    } catch (err) {
      console.error('LOGIN ERROR:', err);
      localStorage.removeItem('matmax_auth');
      setError(err instanceof Error ? err.message : t.authError);
    } finally {
      setLoading(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setSuccessMessage(null);
    setPassword('');
    setConfirmPassword('');
  }

  return (
    <div className="matmax-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-8 top-16 h-80 w-80 rounded-full bg-[#f4c542]/20 blur-3xl" />
        <div className="absolute right-6 top-32 h-80 w-80 rounded-full bg-black/10 blur-3xl" />
        <div className="absolute bottom-10 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#fff4c7]/70 blur-3xl" />
      </div>

      <div className="relative grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-[2.25rem] border border-[#e9e2d3] bg-white/90 shadow-[0_40px_120px_rgba(15,15,15,0.16)] backdrop-blur-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden overflow-hidden bg-[#050505] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#f4c542]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-[#f4c542]/10 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.16),transparent_35%)]" />

          <div className="relative z-10">
            <div className="mb-10 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4c542] text-[#050505] shadow-lg shadow-[#f4c542]/20">
              <Sparkles className="shrink-0" size={28} />
            </div>

            <p className="mb-4 text-sm font-black uppercase tracking-[0.28em] text-[#f4c542]">
              {t.brand}
            </p>

            <h1 className="mb-5 max-w-md text-5xl font-serif font-bold leading-tight">
              {t.heroTitle}
            </h1>

            <p className="max-w-md text-base leading-relaxed text-white/65">
              {t.heroSubtitle}
            </p>
          </div>

          <div className="relative z-10 space-y-4">
            {[t.secureStripe, t.realtimeDashboard, t.subscriptionControl].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-all duration-300 hover:border-[#f4c542]/30 hover:bg-white/10"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4c542] text-[#050505]">
                  <CheckCircle2 className="shrink-0" size={18} />
                </div>
                <span className="text-sm font-bold text-white/85">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative bg-white/80 p-6 backdrop-blur-xl md:p-10">
          <div className="relative z-10 flex h-full flex-col justify-center">
            <button
              type="button"
              onClick={() => (window.location.href = '/')}
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#e9e2d3] bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#71717a] shadow-sm transition hover:border-[#f4c542] hover:bg-[#fff9e8] hover:text-[#050505]"
            >
              <ArrowLeft className="shrink-0" size={14} />
              {t.home}
            </button>

            <div className="mb-8 text-center lg:text-left">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-[#050505] text-[#f4c542] shadow-[0_18px_40px_rgba(0,0,0,0.18)] lg:mx-0">
                <Lock className="shrink-0" size={25} />
              </div>

              <h2 className="mb-3 text-4xl font-serif font-bold tracking-tight text-[#050505]">
                {isForgot ? t.forgotTitle : isSignup ? t.signupTitle : t.loginTitle}
              </h2>

              <p className="max-w-md text-sm font-medium leading-relaxed text-[#71717a]">
                {isForgot ? t.forgotDescription : isSignup ? t.signupDescription : t.loginDescription}
              </p>
              {isSignup && !isForgot && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#f4c542]/35 bg-[#fff9e8] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">
                  {t.selectedPlan}: {selectedPlanLabel}
                </div>
              )}
            </div>

            {!isForgot && (
            <div className="mb-6 grid grid-cols-2 rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-1 shadow-inner">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`rounded-xl px-4 py-3 text-sm font-black transition-all ${
                  !isSignup
                    ? 'bg-[#050505] text-[#f4c542] shadow-[0_10px_25px_rgba(0,0,0,0.2)]'
                    : 'text-[#71717a] hover:text-[#050505]'
                }`}
              >
                {t.loginTab}
              </button>

              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`rounded-xl px-4 py-3 text-sm font-black transition-all ${
                  isSignup
                    ? 'bg-[#050505] text-[#f4c542] shadow-[0_10px_25px_rgba(0,0,0,0.2)]'
                    : 'text-[#71717a] hover:text-[#050505]'
                }`}
              >
                {t.signupTab}
              </button>
            </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
                  <AlertCircle size={20} className="shrink-0 text-red-600" />
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              )}

              {successMessage && (
                <div className="flex items-center gap-3 rounded-2xl border border-[#f4c542]/30 bg-[#fff4c7] p-4 shadow-sm">
                  <CheckCircle2 size={20} className="shrink-0 text-[#8a6a16]" />
                  <p className="text-sm font-bold text-[#5f4700]">{successMessage}</p>
                </div>
              )}

              <div className="grid gap-4">
                <Input
                  label={t.email}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  required
                  disabled={loading}
                  autoComplete="email"
                />

                {!isForgot && (
                  <div className="relative">
                    <Input
                      label={t.password}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required={!isForgot}
                      disabled={loading}
                      autoComplete={isSignup ? 'new-password' : 'current-password'}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-9 text-[#71717a] transition-colors hover:text-[#050505]"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="shrink-0" size={20} /> : <Eye className="shrink-0" size={20} />}
                    </button>
                  </div>
                )}

                {isSignup && !isForgot && (
                  <Input
                    label={t.confirmPassword}
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    autoComplete="new-password"
                  />
                )}
              </div>

              {!isSignup && !isForgot && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-sm font-bold text-[#8a6a16] transition hover:text-[#050505]"
                    disabled={loading}
                  >
                    {t.forgotPassword}
                  </button>
                </div>
              )}

              {isForgot && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-sm font-bold text-[#8a6a16] transition hover:text-[#050505]"
                    disabled={loading}
                  >
                    {t.backToLogin}
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border border-[#050505] bg-[#050505] px-5 py-4 text-base font-black text-[#f4c542] shadow-[0_22px_55px_rgba(0,0,0,0.32)] transition hover:-translate-y-0.5 hover:bg-[#111111] hover:shadow-[0_28px_70px_rgba(0,0,0,0.38)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.22),transparent_42%)] opacity-70 transition group-hover:opacity-100" />

                {loading ? (
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#f4c542] border-t-transparent" />
                    {isForgot ? t.sendingReset : isSignup ? t.creating : t.signingIn}
                  </span>
                ) : (
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isForgot ? <Mail className="shrink-0" size={20} /> : isSignup ? <UserPlus className="shrink-0" size={20} /> : <LogIn className="shrink-0" size={20} />}
                    {isForgot ? t.sendResetLink : isSignup ? t.createAccount : t.signIn}
                  </span>
                )}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] px-4 py-3 text-xs font-bold text-[#71717a] shadow-sm backdrop-blur-sm">
              <Lock className="shrink-0" size={14} />
              {t.secureAccess}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
