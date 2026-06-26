import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { Input } from '../components/ui/Input';

const resetCopy = {
  es: {
    brand: 'MatMax Business Suite',
    home: 'Inicio',
    title: 'Crear nueva contraseña',
    description: 'Ingresa una nueva contraseña para recuperar el acceso a tu cuenta.',
    password: 'Nueva contraseña',
    confirmPassword: 'Confirmar contraseña',
    passwordMismatch: 'Las contraseñas no coinciden',
    passwordMin: 'La contraseña debe tener mínimo 6 caracteres',
    updating: 'Actualizando contraseña...',
    updatePassword: 'Actualizar contraseña',
    success: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
    error: 'No se pudo validar el enlace de recuperación. Vuelve a abrir el enlace desde tu correo o solicita uno nuevo.',
    backToLogin: 'Volver a iniciar sesión',
    secureAccess: 'Recuperación segura protegida por Supabase Auth'
  },
  en: {
    brand: 'MatMax Business Suite',
    home: 'Home',
    title: 'Create new password',
    description: 'Enter a new password to recover access to your account.',
    password: 'New password',
    confirmPassword: 'Confirm password',
    passwordMismatch: 'Passwords do not match',
    passwordMin: 'Password must be at least 6 characters',
    updating: 'Updating password...',
    updatePassword: 'Update password',
    success: 'Password updated successfully. You can now sign in.',
    error: 'Could not validate the recovery link. Open the link from your email again or request a new one.',
    backToLogin: 'Back to sign in',
    secureAccess: 'Secure recovery protected by Supabase Auth'
  }
} as const;

export function ResetPasswordPage() {
  const { language } = useLanguage();
  const t = resetCopy[language];

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'PASSWORD_RECOVERY' || session) {
        setSessionReady(true);
        setError(null);
      }
    });

    async function waitForExistingSession() {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const { data } = await supabase.auth.getSession();

        if (data.session) {
          if (isMounted) {
            setSessionReady(true);
            setError(null);
          }
          return true;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }

      return false;
    }

    async function recoverSessionFromUrl() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));

        const code = searchParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) throw exchangeError;

          if (isMounted) {
            setSessionReady(true);
            setError(null);
          }
          window.history.replaceState({}, '', `${window.location.origin}/reset-password`);
          return;
        }

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) throw sessionError;

          if (isMounted) {
            setSessionReady(true);
            setError(null);
          }
          window.history.replaceState({}, '', `${window.location.origin}/reset-password`);
          return;
        }

        const hasSession = await waitForExistingSession();

        if (!hasSession && isMounted) {
          setError(t.error);
        }
      } catch (sessionError) {
        console.error('RESET PASSWORD SESSION ERROR:', sessionError);
        if (isMounted) {
          setError(sessionError instanceof Error ? sessionError.message : t.error);
        }
      }
    }

    recoverSessionFromUrl();

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [t.error]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!sessionReady) {
      setError(t.error);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    if (password.length < 6) {
      setError(t.passwordMin);
      return;
    }

    try {
      setLoading(true);

      const { error: updateError } = await supabase.auth.updateUser({
        password
      });

      if (updateError) throw updateError;

      setSuccessMessage(t.success);
      setPassword('');
      setConfirmPassword('');

      window.setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch (err) {
      console.error('RESET PASSWORD ERROR:', err);
      setError(err instanceof Error ? err.message : resetCopy[language].error);
    } finally {
      setLoading(false);
    }
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
              {t.title}
            </h1>

            <p className="max-w-md text-base leading-relaxed text-white/65">
              {t.description}
            </p>
          </div>

          <div className="relative z-10 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4c542] text-[#050505]">
                <CheckCircle2 className="shrink-0" size={18} />
              </div>
              <span className="text-sm font-bold text-white/85">{t.secureAccess}</span>
            </div>
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
                {t.title}
              </h2>

              <p className="max-w-md text-sm font-medium leading-relaxed text-[#71717a]">
                {t.description}
              </p>
            </div>

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
                <div className="relative">
                  <Input
                    label={t.password}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading || !!successMessage || !sessionReady}
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-[#71717a] transition-colors hover:text-[#050505]"
                    disabled={loading || !!successMessage || !sessionReady}
                  >
                    {showPassword ? <EyeOff className="shrink-0" size={20} /> : <Eye className="shrink-0" size={20} />}
                  </button>
                </div>

                <Input
                  label={t.confirmPassword}
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading || !!successMessage || !sessionReady}
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !!successMessage || !sessionReady}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border border-[#050505] bg-[#050505] px-5 py-4 text-base font-black text-[#f4c542] shadow-[0_22px_55px_rgba(0,0,0,0.32)] transition hover:-translate-y-0.5 hover:bg-[#111111] hover:shadow-[0_28px_70px_rgba(0,0,0,0.38)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.22),transparent_42%)] opacity-70 transition group-hover:opacity-100" />

                {loading ? (
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#f4c542] border-t-transparent" />
                    {t.updating}
                  </span>
                ) : (
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Lock className="shrink-0" size={20} />
                    {t.updatePassword}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => (window.location.href = '/login')}
                className="w-full text-center text-sm font-bold text-[#8a6a16] transition hover:text-[#050505]"
              >
                {t.backToLogin}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}