import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Bell, Headset, Menu } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import Sidebar, { AppPage } from './components/layout/Sidebar';
import { getUserRoleFlags } from './utils/roles';
import { supabase } from './lib/supabase';
import { getEffectivePlan } from './utils/subscriptionPlan';
import { clearChunkReloadGuard } from './lib/chunkReloadGuard';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const ProductsPage = lazy(() => import('./pages/ProductsPage').then((module) => ({ default: module.ProductsPage })));
const ClientsPage = lazy(() => import('./pages/ClientsPage').then((module) => ({ default: module.ClientsPage })));
const QuotesPage = lazy(() => import('./pages/QuotesPage'));
const SalesPage = lazy(() => import('./pages/SalesPage').then((module) => ({ default: module.SalesPage })));
const CashboxPage = lazy(() => import('./pages/CashboxPage'));
const PurchasesPage = lazy(() => import('./pages/PurchasesPage'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const AccountsReceivablePage = lazy(() => import('./pages/AccountsReceivablePage'));
const UsersPage = lazy(() => import('./pages/UsersPage').then((module) => ({ default: module.UsersPage })));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const SupportTicketsPage = lazy(() => import('./pages/SupportTicketsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SuperAdminPage = lazy(() => import('./pages/SuperAdminPage'));
const SubscriptionGuard = lazy(() => import('./pages/SubscriptionGuard'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })));

type PublicStep = 'landing' | 'auth';
type PlanSlug = 'basic' | 'pro' | 'premium';

const DEFAULT_SESSION_TIMEOUT_MINUTES = 30;
const configuredSessionTimeoutMinutes = Number(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES || DEFAULT_SESSION_TIMEOUT_MINUTES);
const SESSION_TIMEOUT_MS = Number.isFinite(configuredSessionTimeoutMinutes) && configuredSessionTimeoutMinutes > 0
  ? configuredSessionTimeoutMinutes * 60 * 1000
  : 0;

function hasKnownAccount() {
  return window.localStorage.getItem('matmax_has_account') === 'true';
}

function shouldShowLandingFromUrl() {
  const params = new URLSearchParams(window.location.search);

  if (window.location.pathname === '/landing' || params.get('landing') === '1') return true;
  if (window.location.pathname === '/' && !hasKnownAccount()) return true;

  return false;
}

function normalizePlanSlug(value: string | null | undefined): PlanSlug {
  const normalizedValue = String(value || '').trim().toLowerCase();
  if (normalizedValue === 'pro' || normalizedValue === 'premium') return normalizedValue;
  return 'basic';
}


const appCopy = {
  es: {
    loadingPlatform: 'Cargando plataforma...',
    verifyingAccess: 'Verificando acceso',
    confirmingCheckout: 'Confirmando pago y activando dashboard...',
    validatingBusiness: 'Validando negocio...',
    mobileTagline: 'Gestión - Precisión - Elegancia',
    openMenu: 'Abrir menú',
    switchLanguage: 'Cambiar idioma a inglés',
    notifications: 'Notificaciones',
    unreadNotifications: 'notificaciones sin leer',
    languageLabel: 'ES',
  },
  en: {
    loadingPlatform: 'Loading platform...',
    verifyingAccess: 'Verifying access',
    confirmingCheckout: 'Confirming payment and activating dashboard...',
    validatingBusiness: 'Validating business...',
    mobileTagline: 'Management - Precision - Elegance',
    openMenu: 'Open menu',
    switchLanguage: 'Switch language to Spanish',
    notifications: 'Notifications',
    unreadNotifications: 'unread notifications',
    languageLabel: 'EN',
  },
} as const;


function PageLoader({ text = 'MatMax Business Suite' }: { text?: string }) {
  return (
    <div className="flex min-h-[55vh] items-center justify-center px-4">
      <div className="rounded-[2rem] border border-[#e9e2d3] bg-white/85 px-6 py-5 shadow-[0_24px_70px_rgba(15,15,15,0.08)] backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 animate-spin rounded-full border-[3px] border-[#f4c542] border-t-[#050505]" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8a6a16]">
              MatMax Business Suite
            </p>
            <p className="mt-1 text-sm font-semibold text-[#71717a]">
              {text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, userProfile, loading } = useAuth();
  const roleFlags = getUserRoleFlags(userProfile);
  const normalizedRole = roleFlags.role;
  const isSuperAdmin = roleFlags.isSuperAdmin;
  const canManageUsers = roleFlags.canManageUsers;
  const canAccessSettings = roleFlags.canAccessSettings;
  const canViewAuditLogs = roleFlags.canViewAuditLogs;

  const { language, toggleLanguage } = useLanguage();
  const { unreadCount } = useNotification();
  const t = appCopy[language];
  const isResetPasswordRoute =
    window.location.pathname === '/reset-password' ||
    window.location.hash.includes('type=recovery');

  const checkoutParams = useMemo(() => {
    return new URLSearchParams(window.location.search);
  }, []);


  const checkoutStatus = checkoutParams.get('checkout');
  const checkoutNegocioId = checkoutParams.get('negocio_id');
  const cameFromCheckout = checkoutStatus === 'success';
  const initialSelectedPlan = normalizePlanSlug(
    checkoutParams.get('plan') || sessionStorage.getItem('matmax_selected_plan')
  );

  // Frozen at mount: this must reflect the URL/account state at first load
  // only, otherwise it fights with in-app transitions like clicking "Crear
  // cuenta" on the landing page (which moves publicStep to 'auth' without a
  // real navigation, so window.location never changes).
  const [shouldShowLanding] = useState(() => shouldShowLandingFromUrl());
  const userLeftLandingRef = useRef(false);
  const [publicStep, setPublicStep] = useState<PublicStep>(shouldShowLanding ? 'landing' : 'auth');
  const [selectedPlan, setSelectedPlan] = useState<PlanSlug>(initialSelectedPlan);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<AppPage>('dashboard');
  const [businessSummary, setBusinessSummary] = useState<{ name: string; plan: string } | null>(null);
  const [invoicePageKey, setInvoicePageKey] = useState(0);
  const [supportOpen, setSupportOpen] = useState(false);
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [lockPin, setLockPin] = useState('');
  const [lockPinConfirm, setLockPinConfirm] = useState('');
  const [lockPinError, setLockPinError] = useState('');
  const [screenLockPinHash, setScreenLockPinHash] = useState('');
  const [screenLockBiometricId, setScreenLockBiometricId] = useState('');
  const [loadingScreenLock, setLoadingScreenLock] = useState(false);
  const [loadingBiometricUnlock, setLoadingBiometricUnlock] = useState(false);
  const inactivityTimerRef = useRef<number | null>(null);

    useEffect(() => {
      function handleInternalNavigation(event: Event) {
        const customEvent = event as CustomEvent<string>;
        const page = customEvent.detail;

        if (!page) return;

        const normalizedPage = String(page).replace(/^\//, '');

        if (normalizedPage.startsWith('invoices?')) {
          const query = normalizedPage.split('?')[1] || '';
          const params = new URLSearchParams(query);
          const saleId =
            params.get('invoiceId') ||
            params.get('sale') ||
            params.get('id') ||
            params.get('venta');

          if (saleId) {
            sessionStorage.setItem('matmax_open_invoice_sale', saleId);
            sessionStorage.setItem('matmax_pending_invoice_id', saleId);
          }

          setInvoicePageKey((currentKey) => currentKey + 1);
          setCurrentPage('invoices');
          setSidebarOpen(false);
          return;
        }

        if (normalizedPage === 'invoices') {
          setInvoicePageKey((currentKey) => currentKey + 1);
          setCurrentPage('invoices');
          setSidebarOpen(false);
          return;
        }

        if (normalizedPage === 'support') {
          if (isSuperAdmin) {
            setCurrentPage('support-tickets');
            setSupportOpen(false);
          } else {
            setSupportOpen(true);
          }
          setSidebarOpen(false);
          return;
        }

        if (normalizedPage === 'support-tickets') {
          if (isSuperAdmin) {
            setCurrentPage('support-tickets');
            setSupportOpen(false);
          } else {
            setSupportOpen(true);
          }
          setSidebarOpen(false);
          return;
        }

        setCurrentPage(normalizedPage as AppPage);
        setSidebarOpen(false);
      }

      window.addEventListener('matmax_navigate', handleInternalNavigation);

      return () => {
        window.removeEventListener('matmax_navigate', handleInternalNavigation);
      };
    }, [isSuperAdmin]);
  async function hashScreenLockPin(pin: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  // --- Biometric helpers ---
  function isBiometricSupported() {
    return !!(window.PublicKeyCredential && typeof window.PublicKeyCredential === 'function');
  }

  function bufferToBase64Url(buffer: ArrayBuffer) {
    // Convert to Uint8Array, then base64, then replace for url-safe
    let str = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function base64UrlToBuffer(base64url: string) {
    // Convert from url-safe base64 to ArrayBuffer
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4 ? 4 - (base64.length % 4) : 0;
    const padded = base64 + '='.repeat(pad);
    const str = atob(padded);
    const buffer = new ArrayBuffer(str.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i);
    }
    return buffer;
  }

  function createWebAuthnChallenge() {
    // Generate a random challenge for WebAuthn
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    return challenge.buffer;
  }

  const loadScreenLockPinHash = useCallback(async () => {
    if (!user?.id) {
      setScreenLockPinHash('');
      setScreenLockBiometricId('');
      return '';
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select('screen_lock_pin_hash')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading screen lock PIN:', error);
      setScreenLockPinHash('');
      setScreenLockBiometricId('');
      return '';
    }

    const hash = String(data?.screen_lock_pin_hash || screenLockPinHash || sessionStorage.getItem('matmax_screen_lock_pin_hash') || '');
    const biometricId = String(screenLockBiometricId || sessionStorage.getItem('matmax_screen_lock_biometric_id') || '');

    if (hash) {
      setScreenLockPinHash(hash);
      sessionStorage.setItem('matmax_screen_lock_pin_hash', hash);
    }

    if (biometricId) {
      setScreenLockBiometricId(biometricId);
      sessionStorage.setItem('matmax_screen_lock_biometric_id', biometricId);
    }

    return hash;
  }, [screenLockBiometricId, screenLockPinHash, user?.id]);

  // --- Biometric registration ---
  async function registerBiometricUnlock() {
    if (!user?.id) {
      setLockPinError(language === 'es' ? 'No se pudo validar el usuario.' : 'Could not validate the user.');
      return '';
    }

    if (!isBiometricSupported()) {
      setLockPinError(language === 'es' ? 'Este dispositivo o navegador no soporta Face ID / Touch ID.' : 'This device or browser does not support Face ID / Touch ID.');
      return '';
    }

    setLockPinError('');
    setLoadingBiometricUnlock(true);

    try {
      const challenge = createWebAuthnChallenge();
      const publicKey: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: { name: 'MatMax Business Suite' },
        user: {
          id: new TextEncoder().encode(user.id),
          name: user.email || user.id,
          displayName: user.email || user.id,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'none',
      };

      const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential | null;
      if (!credential) throw new Error('No credential returned');

      const credId = bufferToBase64Url(credential.rawId);
      setScreenLockBiometricId(credId);
      sessionStorage.setItem('matmax_screen_lock_biometric_id', credId);
      setLockPinError(language === 'es' ? 'Face ID / Touch ID activado correctamente.' : 'Face ID / Touch ID enabled successfully.');

      return credId;
    } catch (err) {
      setLockPinError(language === 'es'
        ? 'No se pudo activar Face ID / Touch ID. Usa el PIN como respaldo.'
        : 'Could not enable Face ID / Touch ID. Use PIN as backup.');
      console.error('registerBiometricUnlock error', err);
      return '';
    } finally {
      setLoadingBiometricUnlock(false);
    }
  }

  async function unlockWithBiometric() {
    if (!user?.id) {
      setLockPinError(language === 'es' ? 'No se pudo validar el usuario.' : 'Could not validate the user.');
      return;
    }

    if (!isBiometricSupported()) {
      setLockPinError(language === 'es' ? 'Este dispositivo o navegador no soporta Face ID / Touch ID.' : 'This device or browser does not support Face ID / Touch ID.');
      return;
    }

    setLockPinError('');

    if (!screenLockBiometricId) {
      await registerBiometricUnlock();
      return;
    }

    setLoadingBiometricUnlock(true);

    try {
      const publicKey: PublicKeyCredentialRequestOptions = {
        challenge: createWebAuthnChallenge(),
        allowCredentials: [{
          id: base64UrlToBuffer(screenLockBiometricId),
          type: 'public-key',
        }],
        userVerification: 'required',
        timeout: 60000,
      };

      const assertion = await navigator.credentials.get({ publicKey }) as PublicKeyCredential | null;
      if (!assertion) throw new Error('No assertion returned');

      setIsScreenLocked(false);
      setLockPin('');
      setLockPinConfirm('');
      setLockPinError('');
    } catch (err) {
      setLockPinError(language === 'es'
        ? 'No se pudo desbloquear con Face ID / Touch ID. Usa tu PIN.'
        : 'Could not unlock with Face ID / Touch ID. Use your PIN.');
      console.error('unlockWithBiometric error', err);
    } finally {
      setLoadingBiometricUnlock(false);
    }
  }

  useEffect(() => {
    async function handleLockScreen() {
      setLockPin('');
      setLockPinConfirm('');
      setLockPinError('');
      setLoadingScreenLock(true);
      setIsScreenLocked(true);

      try {
        await loadScreenLockPinHash();
      } finally {
        setLoadingScreenLock(false);
      }
    }

    window.addEventListener('matmax_lock_screen', handleLockScreen);

    return () => {
      window.removeEventListener('matmax_lock_screen', handleLockScreen);
    };
  }, [loadScreenLockPinHash]);

  useEffect(() => {
    function closeSupportModal() {
      setSupportOpen(false);
    }

    window.addEventListener('matmax_support_ticket_created', closeSupportModal);

    return () => {
      window.removeEventListener('matmax_support_ticket_created', closeSupportModal);
    };
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;

    const forbiddenPages: AppPage[] = [
      'sales',
      'quotes',
      'products',
      'clients',
      'cashbox',
      'purchases',
      'invoices',
      'reports',
      'accounts-receivable'
    ];

    if (forbiddenPages.includes(currentPage)) {
      setCurrentPage('dashboard');
    }
  }, [currentPage, isSuperAdmin]);

  useEffect(() => {
    let cancelled = false;

    async function forceLandingOnRoot() {
      if (window.location.pathname !== '/') return;

      setCurrentPage('dashboard');
      setSidebarOpen(false);

      // Skip re-asserting landing once the visitor has deliberately clicked
      // through (e.g. "Crear cuenta"), otherwise this effect re-running on
      // every publicStep change would undo that in-app transition.
      if (!userLeftLandingRef.current) {
        if (shouldShowLanding && !cameFromCheckout) {
          if (!cancelled) {
            setResolvedNegocioId(null);
            setPublicStep('landing');
          }
          return;
        }
      }

      if (cameFromCheckout) {
        if (!cancelled) {
          setPublicStep('auth');
        }
        return;
      }

      if (!user) {
        if (!cancelled) {
          setResolvedNegocioId(null);
          setPublicStep('auth');
        }
        return;
      }

      if (publicStep === 'landing' && !cancelled) {
        setPublicStep('auth');
      }
    }

    forceLandingOnRoot();

    return () => {
      cancelled = true;
    };
  }, [user, publicStep, cameFromCheckout, shouldShowLanding]);

  const [resolvedNegocioId, setResolvedNegocioId] = useState<string | null>(null);
  const [checkingBusiness, setCheckingBusiness] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadBusinessSummary() {
      if (!resolvedNegocioId || resolvedNegocioId === 'super_admin_platform') {
        setBusinessSummary(null);
        return;
      }

      const maxAttempts = cameFromCheckout ? 8 : 1;
      const expectedPlan = normalizePlanSlug(checkoutParams.get('plan') || selectedPlan);

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const [businessResult, subscriptionResult] = await Promise.all([
          supabase
            .from('negocios')
            .select('nombre, plan')
            .eq('id', resolvedNegocioId)
            .maybeSingle(),
          supabase
            .from('suscripciones')
            .select('estado, plan')
            .eq('negocio_id', resolvedNegocioId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        ]);

        if (cancelled) return;

        if (businessResult.error) {
          console.warn('Could not load business summary:', businessResult.error);
          return;
        }

        if (subscriptionResult.error) {
          console.warn('Could not load subscription summary:', subscriptionResult.error);
        }

        const data = businessResult.data;
        const subscription = subscriptionResult.data;
        const currentPlan = normalizePlanSlug(
          getEffectivePlan({
            businessPlan: data?.plan,
            subscriptionPlan: subscription?.plan,
            subscriptionStatus: subscription?.estado,
          })
        );

        setBusinessSummary({
          name: String(data?.nombre || 'MatMax Business Suite'),
          plan: currentPlan,
        });

        if (!cameFromCheckout || currentPlan === expectedPlan || attempt === maxAttempts) {
          return;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 1200));
      }
    }

    loadBusinessSummary();

    return () => {
      cancelled = true;
    };
  }, [resolvedNegocioId, cameFromCheckout, checkoutParams, selectedPlan]);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      setPublicStep('auth');
      setSidebarOpen(false);
      setCurrentPage('dashboard');
      setResolvedNegocioId(null);
      window.location.reload();
    } catch (error) {
      console.error('Error closing session:', error);
    }
  }

  useEffect(() => {
    if (!user?.id || loading || isResetPasswordRoute || SESSION_TIMEOUT_MS <= 0) {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    async function logoutByInactivity() {
      if (cancelled) return;

      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Error closing inactive session:', error);
      } finally {
        if (!cancelled) {
          setPublicStep('auth');
          setSidebarOpen(false);
          setCurrentPage('dashboard');
          setResolvedNegocioId(null);
          window.location.reload();
        }
      }
    }

    function resetInactivityTimer() {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
      }

      inactivityTimerRef.current = window.setTimeout(() => {
        void logoutByInactivity();
      }, SESSION_TIMEOUT_MS);
    }

    const activityEvents = [
      'click',
      'keydown',
      'mousemove',
      'pointerdown',
      'scroll',
      'touchstart',
      'visibilitychange',
    ] as const;

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetInactivityTimer, { passive: true });
    });

    resetInactivityTimer();

    return () => {
      cancelled = true;

      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }

      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetInactivityTimer);
      });
    };
  }, [user?.id, loading, isResetPasswordRoute]);

  function handleGetStarted(plan: PlanSlug = 'basic') {
    const safePlan = normalizePlanSlug(plan);
    setSelectedPlan(safePlan);
    sessionStorage.setItem('matmax_selected_plan', safePlan);

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('plan', safePlan);
    window.history.replaceState({}, '', nextUrl.toString());

    userLeftLandingRef.current = true;
    setPublicStep('auth');
    setSidebarOpen(false);
  }

  const needsLockPinSetup = isScreenLocked && !screenLockPinHash;

  async function handleUnlockScreen(e: FormEvent) {
    e.preventDefault();

    if (!user?.id) {
      setLockPinError(language === 'es' ? 'No se pudo validar el usuario.' : 'Could not validate the user.');
      return;
    }

    if (loadingScreenLock) return;

    if (needsLockPinSetup) {
      if (lockPin.length < 4) {
        setLockPinError(language === 'es' ? 'El PIN debe tener mínimo 4 dígitos.' : 'PIN must be at least 4 digits.');
        return;
      }

      if (lockPin !== lockPinConfirm) {
        setLockPinError(language === 'es' ? 'Los PIN no coinciden.' : 'PINs do not match.');
        return;
      }

      try {
        setLoadingScreenLock(true);

        const pinHash = await hashScreenLockPin(lockPin);
        const { error } = await supabase
          .from('usuarios')
          .update({ screen_lock_pin_hash: pinHash })
          .eq('id', user.id);

        if (error) throw error;

        setScreenLockPinHash(pinHash);
        setIsScreenLocked(false);
        setLockPin('');
        setLockPinConfirm('');
        setLockPinError('');
      } catch (error) {
        console.error('Error saving screen lock PIN:', error);
        setLockPinError(language === 'es' ? 'No se pudo guardar el PIN.' : 'Could not save the PIN.');
      } finally {
        setLoadingScreenLock(false);
      }

      return;
    }

    try {
      setLoadingScreenLock(true);

      const latestHash = screenLockPinHash || await loadScreenLockPinHash();
      const typedHash = await hashScreenLockPin(lockPin);

      if (typedHash !== latestHash) {
        setLockPinError(language === 'es' ? 'PIN incorrecto.' : 'Incorrect PIN.');
        setLockPin('');
        return;
      }

      setIsScreenLocked(false);
      setLockPin('');
      setLockPinConfirm('');
      setLockPinError('');
    } catch (error) {
      console.error('Error validating screen lock PIN:', error);
      setLockPinError(language === 'es' ? 'No se pudo validar el PIN.' : 'Could not validate the PIN.');
    } finally {
      setLoadingScreenLock(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function resolveUserBusiness() {
      try {
        setCheckingBusiness(true);

        if (!user?.id) {
          if (!cancelled) setResolvedNegocioId(null);
          return;
        }

        if ((window.location.pathname === '/' || window.location.pathname === '/landing') && publicStep === 'landing' && !cameFromCheckout) {
          if (!cancelled) setResolvedNegocioId(null);
          return;
        }

        if (isSuperAdmin) {
          if (!cancelled) {
            setResolvedNegocioId('super_admin_platform');
            setCurrentPage('dashboard');
          }
          return;
        }

        if (cameFromCheckout && checkoutNegocioId) {
          if (!cancelled) {
            setResolvedNegocioId(checkoutNegocioId);
            window.history.replaceState({}, '', window.location.origin + window.location.pathname);
          }
          return;
        }

        if (userProfile?.negocio_id) {
          if (!cancelled) setResolvedNegocioId(userProfile.negocio_id);

          if (cameFromCheckout) {
            window.history.replaceState({}, '', window.location.origin + window.location.pathname);
          }

          return;
        }

        if (userProfile && !userProfile.negocio_id && !cameFromCheckout) {
          if (!cancelled) setResolvedNegocioId(null);
          return;
        }

        const maxAttempts = cameFromCheckout ? 8 : 1;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          const { data, error } = await supabase
            .from('usuarios')
            .select('negocio_id')
            .eq('id', user.id)
            .maybeSingle();

          if (cancelled) return;

          if (error) {
            console.warn('Could not resolve negocio_id from usuarios:', error);
          }

          if (data?.negocio_id) {
            setResolvedNegocioId(data.negocio_id);

            if (cameFromCheckout) {
              window.history.replaceState({}, '', window.location.origin + window.location.pathname);
            }

            return;
          }

          if (attempt < maxAttempts) {
            await new Promise((resolve) => window.setTimeout(resolve, 1200));
          }
        }

        if (!cancelled) setResolvedNegocioId(null);
      } finally {
        if (!cancelled) setCheckingBusiness(false);
      }
    }

    resolveUserBusiness();

    return () => {
      cancelled = true;
    };
  }, [user?.id, userProfile, userProfile?.negocio_id, normalizedRole, cameFromCheckout, checkoutNegocioId, publicStep, isSuperAdmin]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f4ec]">
        <div className="rounded-[2rem] border border-[#e9e2d3] bg-white/85 px-8 py-6 shadow-[0_24px_70px_rgba(15,15,15,0.08)] backdrop-blur-2xl">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-[#f4c542] border-t-[#050505]" />
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#8a6a16]">
                MatMax Business Suite
              </p>
              <p className="mt-1 text-sm font-semibold text-[#71717a]">
                {t.loadingPlatform}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isResetPasswordRoute) {
    return (
      <Suspense fallback={<PageLoader text={t.loadingPlatform} />}>
        <ResetPasswordPage />
      </Suspense>
    );
  }

  if (!user) {
    if (publicStep === 'landing') {
      return (
        <Suspense fallback={<PageLoader text={t.loadingPlatform} />}>
          <LandingPage onGetStarted={handleGetStarted} />
        </Suspense>
      );
    }

    return (
      <Suspense fallback={<PageLoader text={t.loadingPlatform} />}>
        <LoginPage selectedPlan={selectedPlan} />
      </Suspense>
    );
  }

  if (checkingBusiness) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f4ec] px-6">
        <div className="w-full max-w-md rounded-[2rem] border border-[#e9e2d3] bg-white/88 p-7 shadow-[0_30px_90px_rgba(15,15,15,0.08)] backdrop-blur-2xl">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#050505] text-[#f4c542] shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#f4c542] border-t-transparent" />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8a6a16]">
                {t.verifyingAccess}
              </p>

              <p className="mt-1 text-sm font-semibold text-[#71717a]">
                {cameFromCheckout ? t.confirmingCheckout : t.validatingBusiness}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!resolvedNegocioId && !isSuperAdmin) {
    if (cameFromCheckout && checkoutNegocioId) {
      return (
        <SubscriptionGuard>
          <div className="min-h-screen overflow-x-hidden bg-[#f7f4ec] text-[#08080b] lg:flex">
            <Sidebar
              currentPage={currentPage}
              onNavigate={setCurrentPage}
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              businessName={businessSummary?.name || 'MatMax Business Suite'}
              plan={businessSummary?.plan || 'Basic'}
              userEmail={user.email}
              onLogout={handleLogout}
              isSuperAdmin={isSuperAdmin}
              canManageUsers={canManageUsers}
              userRole={normalizedRole}
              language={language}
              onToggleLanguage={toggleLanguage}
            />

            <div className="min-w-0 flex-1 overflow-x-hidden">
              <main className="relative w-full min-w-0 overflow-x-hidden px-3 py-4 sm:px-4 md:px-6 lg:px-8">
                <Suspense fallback={<PageLoader text={t.loadingPlatform} />}>
                  <DashboardPage />
                </Suspense>
              </main>
            </div>
          </div>
        </SubscriptionGuard>
      );
    }

    return (
      <Suspense fallback={<PageLoader text={t.loadingPlatform} />}>
        <OnboardingPage selectedPlan={selectedPlan} />
      </Suspense>
    );
  }

  return (
    <SubscriptionGuard>
      <div className="min-h-screen overflow-x-hidden bg-[#f7f4ec] text-[#08080b] lg:flex">
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          businessName={isSuperAdmin ? 'MatMax SaaS Control Center' : businessSummary?.name || 'MatMax Business Suite'}
          plan={isSuperAdmin ? 'Platform' : businessSummary?.plan || 'Basic'}
          userEmail={user.email}
          onLogout={handleLogout}
          isSuperAdmin={isSuperAdmin}
          canManageUsers={canManageUsers}
          userRole={normalizedRole}
          language={language}
          onToggleLanguage={toggleLanguage}
        />

        <div className="min-w-0 flex-1 overflow-x-hidden">
          <header className="sticky top-0 z-30 border-b border-[#ece5d7] bg-white/72 px-3 py-3 shadow-[0_12px_34px_rgba(15,15,15,0.05)] backdrop-blur-2xl sm:px-5 sm:py-4 lg:hidden">
            <div className="flex min-w-0 items-center justify-between gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="shrink-0 rounded-2xl border border-[#ece5d7] bg-white/92 p-3 text-[#71717a] shadow-[0_12px_28px_rgba(15,15,15,0.06)] backdrop-blur-xl transition-all duration-300 hover:border-[#f4c542]/40 hover:bg-[#fff9e8] hover:text-[#050505]"
                aria-label={t.openMenu}
              >
                <Menu size={22} />
              </button>

              <div className="min-w-0 flex-1 text-right">
                <h1 className="truncate text-base font-black text-[#050505] sm:text-lg">
                  {isSuperAdmin ? 'MatMax SaaS Control Center' : 'MatMax Business Suite'}
                </h1>
                <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16] sm:text-[11px] sm:tracking-[0.22em]">
                  {t.mobileTagline}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage('notifications')}
                  className="relative rounded-2xl border border-[#ece5d7] bg-white/92 p-2.5 text-[#8a6a16] shadow-[0_12px_28px_rgba(15,15,15,0.06)] backdrop-blur-xl transition-all duration-300 hover:border-[#f4c542]/50 hover:bg-[#fff9e8] hover:text-[#050505]"
                  aria-label={`${unreadCount} ${t.unreadNotifications}`}
                  title={t.notifications}
                >
                  <Bell className="h-4.5 w-4.5 shrink-0" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#050505] bg-[#f4c542] px-1 text-[10px] font-black leading-none text-[#050505] shadow-[0_8px_18px_rgba(244,197,66,0.28)]">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="rounded-2xl border border-[#ece5d7] bg-white/92 px-3 py-2 text-xs font-black text-[#8a6a16] shadow-[0_12px_28px_rgba(15,15,15,0.06)] backdrop-blur-xl transition-all duration-300 hover:border-[#f4c542]/50 hover:bg-[#fff9e8] hover:text-[#050505]"
                  aria-label={t.switchLanguage}
                  title={t.switchLanguage}
                >
                  {t.languageLabel}
                </button>
              </div>
            </div>
          </header>

          <main className="relative w-full min-w-0 overflow-x-hidden px-3 py-4 sm:px-4 md:px-6 lg:px-8">
            <Suspense fallback={<PageLoader text={t.loadingPlatform} />}>
              {currentPage === 'dashboard' && <DashboardPage />}
              {currentPage === 'sales' && !isSuperAdmin && <SalesPage />}
              {currentPage === 'quotes' && !isSuperAdmin && <QuotesPage />}
              {currentPage === 'products' && !isSuperAdmin && <ProductsPage />}
              {currentPage === 'clients' && !isSuperAdmin && <ClientsPage />}
              {currentPage === 'cashbox' && !isSuperAdmin && <CashboxPage />}
              {currentPage === 'purchases' && !isSuperAdmin && <PurchasesPage />}
              {currentPage === 'invoices' && !isSuperAdmin && <InvoicesPage key={invoicePageKey} />}
              {currentPage === 'reports' && !isSuperAdmin && <ReportsPage />}
              {currentPage === 'accounts-receivable' && !isSuperAdmin && <AccountsReceivablePage />}
              {currentPage === 'notifications' && <NotificationsPage />}
              {(currentPage === 'sales' ||
                currentPage === 'quotes' ||
                currentPage === 'products' ||
                currentPage === 'clients' ||
                currentPage === 'cashbox' ||
                currentPage === 'purchases' ||
                currentPage === 'invoices' ||
                currentPage === 'reports' ||
                currentPage === 'accounts-receivable') &&
                isSuperAdmin && <DashboardPage />}
              {currentPage === 'settings' && canAccessSettings && <SettingsPage />}
              {currentPage === 'settings' && !canAccessSettings && <DashboardPage />}
              {currentPage === 'users' && canManageUsers && <UsersPage />}
              {currentPage === 'audit-logs' && canViewAuditLogs && <AuditLogsPage />}
              {currentPage === 'support-tickets' && isSuperAdmin && <SupportTicketsPage />}
              {currentPage === 'superadmin' && isSuperAdmin && <SuperAdminPage />}
              {currentPage === 'users' && !canManageUsers && <DashboardPage />}
              {currentPage === 'audit-logs' && !canViewAuditLogs && <DashboardPage />}
              {currentPage === 'support-tickets' && !isSuperAdmin && <DashboardPage />}
              {currentPage === 'superadmin' && !isSuperAdmin && <DashboardPage />}
            </Suspense>
          </main>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isSuperAdmin) {
              setCurrentPage('support-tickets');
              setSupportOpen(false);
              return;
            }

            setSupportOpen(true);
          }}
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#050505] text-[#f4c542] shadow-[0_18px_45px_rgba(0,0,0,0.25)] transition hover:-translate-y-1 hover:bg-[#111111]"
          aria-label="Contact support"
          title="Contact support"
        >
          <Headset className="h-6 w-6" />
        </button>

        {supportOpen && (
          <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/35 p-4 backdrop-blur-sm sm:p-6">
            <div className="mx-auto max-w-5xl rounded-[2rem] bg-[#fbfaf7] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8a6a16]">
                    MatMax Support
                  </p>
                  <h2 className="text-2xl font-black text-[#050505]">
                    {isSuperAdmin ? 'Support Tickets' : 'Contact Support'}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSupportOpen(false)}
                  className="rounded-2xl border border-[#e9e2d3] bg-white px-4 py-2 text-sm font-black text-[#050505] shadow-sm transition hover:bg-[#fff8e1]"
                >
                  Close
                </button>
              </div>

              <Suspense fallback={<PageLoader text={t.loadingPlatform} />}>
                {isSuperAdmin ? <SupportTicketsPage /> : <SupportPage onTicketCreated={() => setSupportOpen(false)} />}
              </Suspense>
            </div>
          </div>
        )}

        {isScreenLocked && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050505]/80 p-4 backdrop-blur-2xl">
            <form
              onSubmit={handleUnlockScreen}
              className="w-full max-w-md overflow-hidden rounded-[2rem] border border-[#f4c542]/30 bg-[#fffdf8] p-6 text-center shadow-[0_34px_100px_rgba(0,0,0,0.35)] sm:p-8"
            >
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#050505] text-3xl text-[#f4c542] shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
                🔒
              </div>

              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.28em] text-[#8a6a16]">
                MatMax Secure Lock
              </p>

              <h2 className="mb-3 text-3xl font-black tracking-tight text-[#050505]">
                {needsLockPinSetup
                  ? language === 'es'
                    ? 'Crear PIN'
                    : 'Create PIN'
                  : language === 'es'
                  ? 'Pantalla bloqueada'
                  : 'Screen locked'}
              </h2>

              <p className="mb-5 text-sm font-semibold leading-relaxed text-[#71717a]">
                {loadingScreenLock
                  ? language === 'es'
                    ? 'Preparando bloqueo seguro...'
                    : 'Preparing secure lock...'
                  : needsLockPinSetup
                  ? language === 'es'
                    ? 'Crea un PIN rápido para bloquear la pantalla cuando te alejes. Puedes activar Face ID / Touch ID después de crear el PIN.'
                    : 'Create a quick PIN to lock the screen when you step away. You can enable Face ID / Touch ID after creating the PIN.'
                  : language === 'es'
                  ? 'Introduce tu PIN para continuar trabajando sin cerrar sesión.'
                  : 'Enter your PIN to continue working without signing out.'}
              </p>

              {/* Biometric button */}
              {isBiometricSupported() && !needsLockPinSetup && (
                <button
                  type="button"
                  className="mb-3 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-[#e9e2d3] bg-white px-5 text-sm font-black text-[#8a6a16] shadow-sm transition hover:bg-[#fff9e8] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={loadingScreenLock || loadingBiometricUnlock}
                  onClick={unlockWithBiometric}
                >
                  {loadingBiometricUnlock
                    ? (language === 'es' ? 'Esperando biometría...' : 'Waiting for biometrics...')
                    : screenLockBiometricId
                    ? (language === 'es' ? 'Desbloquear con Face ID / Touch ID' : 'Unlock with Face ID / Touch ID')
                    : (language === 'es' ? 'Activar Face ID / Touch ID' : 'Enable Face ID / Touch ID')}
                </button>
              )}

              <input
                type="password"
                inputMode="numeric"
                autoFocus
                disabled={loadingScreenLock || loadingBiometricUnlock}
                value={lockPin}
                onChange={(e) => {
                  setLockPinError('');
                  setLockPin(e.target.value.replace(/\D/g, '').slice(0, 8));
                }}
                placeholder={needsLockPinSetup ? (language === 'es' ? 'Nuevo PIN' : 'New PIN') : 'PIN'}
                className="mb-3 h-14 w-full rounded-2xl border border-[#e9e2d3] bg-white px-5 text-center text-2xl font-black tracking-[0.35em] text-[#050505] outline-none transition placeholder:text-base placeholder:tracking-normal focus:border-[#f4c542] focus:ring-4 focus:ring-[#f4c542]/10"
              />

              {needsLockPinSetup && (
                <input
                  type="password"
                  inputMode="numeric"
                  disabled={loadingScreenLock || loadingBiometricUnlock}
                  value={lockPinConfirm}
                  onChange={(e) => {
                    setLockPinError('');
                    setLockPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 8));
                  }}
                  placeholder={language === 'es' ? 'Confirmar PIN' : 'Confirm PIN'}
                  className="mb-3 h-14 w-full rounded-2xl border border-[#e9e2d3] bg-white px-5 text-center text-2xl font-black tracking-[0.35em] text-[#050505] outline-none transition placeholder:text-base placeholder:tracking-normal focus:border-[#f4c542] focus:ring-4 focus:ring-[#f4c542]/10"
                />
              )}

              {lockPinError && (
                <div className="mb-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
                  {lockPinError}
                </div>
              )}

              <button
                type="submit"
                disabled={loadingScreenLock || loadingBiometricUnlock}
                className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#050505] px-5 text-sm font-black text-[#f4c542] shadow-[0_18px_44px_rgba(0,0,0,0.20)] transition hover:-translate-y-0.5 hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {(loadingScreenLock || loadingBiometricUnlock)
                  ? language === 'es'
                    ? 'Validando...'
                    : 'Validating...'
                  : needsLockPinSetup
                  ? language === 'es'
                    ? 'Guardar PIN y desbloquear'
                    : 'Save PIN and unlock'
                  : language === 'es'
                  ? 'Desbloquear'
                  : 'Unlock'}
              </button>
            </form>
          </div>
        )}
      </div>
    </SubscriptionGuard>
  );
}

function App() {
  useEffect(() => {
    clearChunkReloadGuard();
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <Suspense fallback={<PageLoader />}>
            <AppContent />
          </Suspense>
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
