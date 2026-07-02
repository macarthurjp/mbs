import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  CreditCard,
  Crown,
  Lock,
  Package,
  ShieldCheck,
  Sparkles,
  Users
} from 'lucide-react';
import Card, { CardContent } from '../components/ui/Card';
import { useLanguage } from '../contexts/LanguageContext';

type PlanSlug = 'basic' | 'pro' | 'premium';

type LandingPageProps = {
  onGetStarted: (plan?: PlanSlug) => void;
};

const plans = {
  es: [
    {
      name: 'Basic',
      slug: 'basic' as PlanSlug,
      price: '€99.99',
      description: 'Para pequeños negocios que quieren empezar con orden y control.',
      features: ['Ventas y productos', 'Clientes', 'Caja básica', 'Facturación simple'],
    },
    {
      name: 'Pro',
      slug: 'pro' as PlanSlug,
      price: '€149.99',
      description: 'Para negocios en crecimiento que necesitan reportes y más control.',
      featured: true,
      features: ['Todo en Basic', 'Compras', 'Reportes', 'Caja avanzada', 'Control de crédito'],
    },
    {
      name: 'Premium',
      slug: 'premium' as PlanSlug,
      price: '€249.99',
      description: 'Para empresas que quieren escalar con precisión y elegancia.',
      features: ['Todo en Pro', 'Multiusuario', 'Analytics avanzado', 'Soporte prioritario'],
    },
  ],
  en: [
    {
      name: 'Basic',
      slug: 'basic' as PlanSlug,
      price: '€99.99',
      description: 'For small businesses that want better organization and control.',
      features: ['Sales and products', 'Clients', 'Basic cash register', 'Simple invoicing'],
    },
    {
      name: 'Pro',
      slug: 'pro' as PlanSlug,
      price: '€149.99',
      description: 'For growing businesses that need reports and more control.',
      featured: true,
      features: ['Everything in Basic', 'Purchases', 'Reports', 'Advanced cash register', 'Credit control'],
    },
    {
      name: 'Premium',
      slug: 'premium' as PlanSlug,
      price: '€249.99',
      description: 'For companies that want to scale with precision and elegance.',
      features: ['Everything in Pro', 'Multi-user', 'Advanced analytics', 'Priority support'],
    },
  ]
};

const features = {
  es: [
    {
      icon: Package,
      title: 'Inventario inteligente',
      description: 'Controla productos, stock, alertas y movimientos desde una sola plataforma.',
    },
    {
      icon: CreditCard,
      title: 'Ventas y caja',
      description: 'Registra ventas, pagos, créditos y cierres de caja con claridad profesional.',
    },
    {
      icon: BarChart3,
      title: 'Reportes visuales',
      description: 'Analiza ventas, clientes, deudas y rendimiento para tomar mejores decisiones.',
    },
    {
      icon: Users,
      title: 'Roles y clientes',
      description: 'Gestiona clientes, historial, créditos y permisos para Dueño, Administrador y Vendedor.',
    },
  ],
  en: [
    {
      icon: Package,
      title: 'Smart inventory',
      description: 'Control products, stock, alerts, and movements from one platform.',
    },
    {
      icon: CreditCard,
      title: 'Sales and cash register',
      description: 'Register sales, payments, credits, and cash closings professionally.',
    },
    {
      icon: BarChart3,
      title: 'Visual reports',
      description: 'Analyze sales, clients, debts, and performance to make better decisions.',
    },
    {
      icon: Users,
      title: 'Roles and clients',
      description: 'Manage clients, history, credits, and permissions for Owner, Administrator, and Seller.',
    },
  ]
};

const landingCopy = {
  es: {
    tagline: 'Gestión - Precisión - Elegancia',
    featuresNav: 'Funciones',
    plansNav: 'Planes',
    securityNav: 'Seguridad',
    startNow: 'Empezar ahora',
    saasBadge: 'Plataforma SaaS para negocios modernos',
    heroTitle: 'Gestiona tu negocio con precisión y elegancia.',
    heroDescription:
      'MatMax Business Suite centraliza ventas, cotizaciones, inventario, clientes, caja, compras, facturas, cuentas por cobrar y reportes en una experiencia premium, simple y preparada para crecer.',
    createAccount: 'Crear cuenta',
    viewPlans: 'Ver planes',
    secureStripe: 'Pago seguro con Stripe',
    multiBusiness: 'Multi-negocio preparado',
    realtimeDashboard: 'Dashboard en tiempo real',
    monthlySummary: 'Resumen mensual',
    executiveDashboard: 'Dashboard Ejecutivo',
    sales: 'Ventas',
    clients: 'Clientes',
    todaySales: 'Ventas de hoy',
    lowInventory: 'Inventario bajo',
    debtClients: 'Clientes con deuda',
    pendingInvoices: 'Facturas pendientes',
    active: 'Activo',
    featuresTitle: 'Funciones',
    featuresHeading: 'Todo tu negocio en un solo lugar',
    featuresDescription:
      'Diseñado para dueños de negocios que necesitan claridad, control y una experiencia elegante.',
    plansTitle: 'Planes',
    plansHeading: 'Elige el plan ideal',
    plansDescription: 'Empieza simple y escala cuando tu negocio lo necesite.',
    recommended: 'Recomendado',
    start: 'Empezar',
    securityBadge: 'Seguridad y control',
    securityHeading: 'Una base sólida para vender con confianza.',
    securityDescription:
      'Acceso protegido, pagos procesados por Stripe, control por suscripción, permisos por rol y estructura preparada para crecer como SaaS multi-tenant.',
    activeProtection: 'Protección activa',
    validatedSubscription: 'Suscripción validada',
    validatedDescription:
      'El sistema bloquea o activa el acceso según el estado real de cada negocio y el rol del usuario.',
    ctaHeading: 'Empieza a gestionar tu negocio hoy.',
    ctaDescription:
      'Crea tu cuenta, registra tu empresa y elige el plan que mejor se adapta a tu operación.',
    createAccountNow: 'Crear cuenta ahora',
month: '/mes'
  },
  en: {
    tagline: 'Management - Precision - Elegance',
    featuresNav: 'Features',
    plansNav: 'Plans',
    securityNav: 'Security',
    startNow: 'Get Started',
    saasBadge: 'SaaS platform for modern businesses',
    heroTitle: 'Manage your business with precision and elegance.',
    heroDescription:
      'MatMax Business Suite centralizes sales, quotes, inventory, clients, cash register, purchases, invoices, accounts receivable, and reports in a premium experience designed to grow.',
    createAccount: 'Create account',
    viewPlans: 'View plans',
    secureStripe: 'Secure payments with Stripe',
    multiBusiness: 'Multi-business ready',
    realtimeDashboard: 'Real-time dashboard',
    monthlySummary: 'Monthly summary',
    executiveDashboard: 'Executive Dashboard',
    sales: 'Sales',
    clients: 'Clients',
    todaySales: 'Today sales',
    lowInventory: 'Low inventory',
    debtClients: 'Clients with debt',
    pendingInvoices: 'Pending invoices',
    active: 'Active',
    featuresTitle: 'Features',
    featuresHeading: 'Your entire business in one place',
    featuresDescription:
      'Designed for business owners who need clarity, control, and an elegant experience.',
    plansTitle: 'Plans',
    plansHeading: 'Choose the ideal plan',
    plansDescription: 'Start simple and scale when your business needs it.',
    recommended: 'Recommended',
    start: 'Get Started',
    securityBadge: 'Security and control',
    securityHeading: 'A strong foundation to sell with confidence.',
    securityDescription:
      'Protected access, Stripe-powered payments, subscription validation, role-based permissions, and a scalable multi-tenant SaaS structure.',
    activeProtection: 'Active protection',
    validatedSubscription: 'Validated subscription',
    validatedDescription:
      'The system blocks or enables access according to the real status of each business and user role.',
    ctaHeading: 'Start managing your business today.',
    ctaDescription:
      'Create your account, register your company, and choose the plan that best fits your operation.',
    createAccountNow: 'Create account now',
month: '/mo'
  }
} as const;

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const { language, setLanguage } = useLanguage();
  const t = landingCopy[language];
  const localizedPlans = plans[language];
  const localizedFeatures = features[language];
  return (
    <div className="matmax-page text-[#08080b]">
      <header className="sticky top-0 z-40 border-b border-[#e9e2d3] bg-[#fbfaf7]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#050505] text-[#f4c542] shadow-matmax-soft">
              <Building2 size={23} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#050505] md:text-2xl">MatMax Business Suite</h1>
              <p className="text-xs font-medium text-[#71717a] md:text-sm">{t.tagline}</p>
            </div>
          </div>

          <div className="hidden items-center gap-7 text-sm font-semibold text-[#52525b] md:flex">
  <a href="#features" className="transition-colors hover:text-[#050505]">{t.featuresNav}</a>
  <a href="#pricing" className="transition-colors hover:text-[#050505]">{t.plansNav}</a>
  <a href="#security" className="transition-colors hover:text-[#050505]">{t.securityNav}</a>

  <button
    type="button"
    onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
    className="rounded-2xl border border-[#e9e2d3] bg-white px-4 py-2 text-xs font-black text-[#050505] shadow-sm transition hover:bg-[#fff9e8]"
  >
    {language === 'es' ? 'EN' : 'ES'}
  </button>
</div>

          <div className="flex items-center gap-3">
  <button
    type="button"
    onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
    className="inline-flex items-center justify-center rounded-2xl border border-[#e9e2d3] bg-white px-4 py-3 text-sm font-black text-[#050505] shadow-sm transition hover:bg-[#fff9e8] md:hidden"
  >
    {language === 'es' ? 'EN' : 'ES'}
  </button>

  <button
    type="button"
    onClick={() => onGetStarted('basic')}
    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#050505] bg-[#050505] px-5 py-3 text-sm font-black text-[#f4c542] shadow-[0_18px_40px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:bg-[#111111] hover:shadow-[0_24px_60px_rgba(0,0,0,0.32)]"
  >
    {t.startNow}
    <ArrowRight size={18} />
  </button>
</div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-6 py-20 md:py-28 lg:grid-cols-2">
          <div>
            <div className="matmax-pill mb-7 px-4 py-2 text-sm font-bold">
              <Sparkles size={16} className="text-[#b88900]" />
              {t.saasBadge}
            </div>

            <h2 className="matmax-heading-gradient mb-7 text-5xl font-serif font-bold leading-[1.1] tracking-tight md:text-7xl">
              {t.heroTitle}
            </h2>

            <p className="mb-9 max-w-2xl text-lg leading-relaxed text-[#52525b] md:text-xl">
              {t.heroDescription}
            </p>

            <div className="mb-9 flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => onGetStarted('basic')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#050505] bg-[#050505] px-7 py-4 text-base font-black text-[#f4c542] shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition-all hover:-translate-y-0.5 hover:bg-[#111111] hover:shadow-[0_24px_60px_rgba(0,0,0,0.34)]"
              >
                {t.createAccount}
                <ArrowRight size={20} />
              </button>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center rounded-2xl border border-[#d9ceb8] bg-white/80 px-7 py-4 text-base font-bold text-[#111111] shadow-matmax-soft transition hover:bg-white"
              >
                {t.viewPlans}
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-[#71717a]">
              {[t.secureStripe, t.multiBusiness, t.realtimeDashboard].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#fff4c7] text-[#8a6a16]">
                    <Check size={15} />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 rounded-[3rem] bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.28),transparent_24rem)] blur-2xl" />
            <Card className="relative overflow-hidden border-[#e9e2d3] bg-white/90 shadow-matmax">
              <CardContent className="p-0">
                <div className="bg-[#050505] p-6 text-white">
                  <div className="mb-8 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/55">{t.monthlySummary}</p>
                      <h3 className="text-2xl font-bold">{t.executiveDashboard}</h3>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4c542] text-[#050505]">
                      <BarChart3 size={25} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                      <p className="text-xs uppercase tracking-widest text-white/55">{t.sales}</p>
                      <p className="mt-2 text-3xl font-black text-[#f4c542]">€12.8k</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                      <p className="text-xs uppercase tracking-widest text-white/55">{t.clients}</p>
                      <p className="mt-2 text-3xl font-black text-[#f4c542]">248</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 bg-white p-6">
                  {[t.todaySales, t.lowInventory, t.debtClients, t.pendingInvoices].map((item) => (
                    <div key={item} className="flex items-center justify-between rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff4c7] text-[#8a6a16]">
                          <Check size={18} />
                        </div>
                        <p className="font-bold text-[#18181b]">{item}</p>
                      </div>
                      <p className="text-sm font-black text-[#71717a]">{t.active}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-16">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-[#8a6a16]">{t.featuresTitle}</p>
            <h2 className="mb-4 text-4xl font-serif font-bold text-[#050505] md:text-5xl">{t.featuresHeading}</h2>
            <p className="text-lg text-[#52525b]">
              {t.featuresDescription}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {localizedFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-[#e9e2d3] bg-white/90 transition-all hover:-translate-y-1 hover:shadow-matmax">
                  <CardContent className="p-6">
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#050505] text-[#f4c542]">
                      <Icon size={25} />
                    </div>
                    <h3 className="mb-2 text-lg font-black text-[#050505]">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-[#52525b]">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-6 py-16">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-[#8a6a16]">{t.plansTitle}</p>
            <h2 className="mb-4 text-4xl font-serif font-bold text-[#050505] md:text-5xl">{t.plansHeading}</h2>
            <p className="text-lg text-[#52525b]">{t.plansDescription}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {localizedPlans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative h-full overflow-hidden border-[#e9e2d3] bg-white/90 ${
                  plan.featured ? 'ring-2 ring-[#f4c542] shadow-matmax' : 'shadow-matmax-soft'
                }`}
              >
                {plan.featured && (
                  <div className="absolute right-5 top-5 rounded-full bg-[#050505] px-3 py-1 text-xs font-black text-[#f4c542]">
                    {t.recommended}
                  </div>
                )}
                <CardContent className="flex h-full flex-col p-7">
                  <h3 className="mb-2 text-2xl font-black text-[#050505]">{plan.name}</h3>
                  <div className="mb-4 flex items-end gap-2">
                    <p className="text-5xl font-black text-[#050505]">{plan.price}</p>
                    <p className="mb-2 text-[#71717a]">{t.month}</p>
                  </div>
                  <p className="mb-6 min-h-[72px] text-[#52525b]">{plan.description}</p>

                  <ul className="mb-7 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm font-medium text-[#3f3f46]">
                        <Check size={17} className="text-[#8a6a16]" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => onGetStarted(plan.slug)}
                    className={`mt-auto flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 font-black transition ${
                      plan.featured
                        ? 'border border-[#050505] bg-[#050505] text-[#f4c542] shadow-[0_18px_40px_rgba(0,0,0,0.25)] hover:-translate-y-0.5 hover:bg-[#111111]'
                        : 'border border-[#d9ceb8] bg-white text-[#050505] hover:bg-[#fbfaf7]'
                    }`}
                  >
                    {t.start}
                    <ArrowRight className="shrink-0" size={18} />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="security" className="mx-auto max-w-7xl px-6 py-16">
          <Card className="overflow-hidden border-[#e9e2d3] bg-white/90 shadow-matmax-soft">
            <CardContent className="grid grid-cols-1 items-center gap-8 p-8 md:p-12 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#e9e2d3] bg-[#fffdf8] px-4 py-2 text-sm font-black text-[#8a6a16]">
                  <ShieldCheck size={17} />
                  {t.securityBadge}
                </div>
                <h2 className="mb-4 text-3xl font-serif font-bold text-[#050505] md:text-5xl">
                  {t.securityHeading}
                </h2>
                <p className="text-lg leading-relaxed text-[#52525b]">
                  {t.securityDescription}
                </p>
              </div>

              <div className="rounded-3xl bg-[#050505] p-7 text-white shadow-matmax">
                <Lock size={32} className="mb-5 text-[#f4c542]" />
                <p className="mb-2 text-sm uppercase tracking-widest text-white/50">{t.activeProtection}</p>
                <h3 className="mb-3 text-2xl font-black">{t.validatedSubscription}</h3>
                <p className="text-sm text-white/65">
                  {t.validatedDescription}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20 text-center">
          <div className="rounded-[2rem] bg-[#050505] p-10 text-white shadow-matmax md:p-16">
            <Crown size={42} className="mx-auto mb-5 text-[#f4c542]" />
            <h2 className="mb-4 text-4xl font-serif font-bold md:text-5xl">
              {t.ctaHeading}
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-white/70">
              {t.ctaDescription}
            </p>
            <button
              type="button"
              onClick={() => onGetStarted('basic')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#f4c542] bg-[#f4c542] px-8 py-4 text-base font-black text-[#050505] shadow-[0_18px_40px_rgba(244,197,66,0.28)] transition hover:-translate-y-0.5 hover:bg-[#ffd95a] hover:shadow-[0_24px_60px_rgba(244,197,66,0.34)]"
            >
              {t.createAccountNow}
              <ArrowRight size={20} />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
