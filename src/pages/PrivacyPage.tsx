import { ArrowLeft, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const privacyCopy = {
  es: {
    brand: 'MatMax Business Suite',
    home: 'Inicio',
    title: 'Política de Privacidad',
    updated: 'Última actualización: 10 de julio de 2026',
    sections: [
      {
        heading: '1. Quiénes somos',
        body: [
          'MatMax Business Suite es operado por MatMax Consulting SARL-S ("nosotros"). Esta Política de Privacidad explica qué datos recopilamos, cómo los usamos y qué derechos tienes sobre ellos.'
        ]
      },
      {
        heading: '2. Qué datos recopilamos',
        body: [
          'Datos de cuenta: nombre, correo electrónico y contraseña (almacenada de forma cifrada) al registrarte.',
          'Datos de tu negocio: la información que ingresas al usar el Servicio, incluyendo productos, ventas, clientes, cotizaciones, facturas, pagos y configuración de tu negocio.',
          'Datos de facturación: gestionados directamente por Stripe; no almacenamos números completos de tarjetas en nuestros servidores.',
          'Datos de uso: información técnica como dirección IP, tipo de navegador y registros de errores, recopilada automáticamente para operar y mejorar el Servicio.'
        ]
      },
      {
        heading: '3. Cómo usamos los datos',
        body: [
          'Usamos los datos para: prestar y operar el Servicio, procesar pagos de suscripción, enviarte notificaciones operativas (confirmación de cuenta, restablecimiento de contraseña, facturas, cotizaciones, alertas de soporte), detectar y corregir errores, y cumplir obligaciones legales.',
          'No vendemos tus datos ni los de tus clientes a terceros.'
        ]
      },
      {
        heading: '4. Con quién compartimos los datos',
        body: [
          'Utilizamos proveedores externos ("subencargados") estrictamente necesarios para operar el Servicio: Supabase (base de datos y autenticación, alojado en la Unión Europea), Stripe (procesamiento de pagos), Resend (envío de correos transaccionales), Sentry (monitoreo de errores) y Cloudflare (hosting y entrega de contenido).',
          'Cada uno de estos proveedores procesa datos únicamente en la medida necesaria para prestar su servicio específico, bajo sus propios acuerdos de protección de datos.'
        ]
      },
      {
        heading: '5. Dónde se almacenan los datos',
        body: [
          'Tu base de datos principal se aloja en la región de Irlanda (Unión Europea) a través de Supabase. Los correos transaccionales se procesan desde la región eu-west-1 a través de Resend.'
        ]
      },
      {
        heading: '6. Seguridad y respaldos',
        body: [
          'Aplicamos controles de acceso basados en roles y aislamiento de datos por negocio (Row Level Security) a nivel de base de datos. Realizamos respaldos automáticos periódicos de la plataforma como medida de continuidad, almacenados de forma privada y accesibles únicamente por administradores autorizados.',
          'Ningún sistema es 100% seguro; te recomendamos usar contraseñas robustas y no compartir tus credenciales.'
        ]
      },
      {
        heading: '7. Retención de datos',
        body: [
          'Conservamos tus datos mientras tu cuenta esté activa. Si cancelas tu cuenta, conservamos los datos por un período limitado para permitirte exportarlos o reactivar el servicio, transcurrido el cual podrán eliminarse o anonimizarse, salvo que la ley exija un período de retención mayor (por ejemplo, registros fiscales o contables).'
        ]
      },
      {
        heading: '8. Tus derechos',
        body: [
          'Dependiendo de tu jurisdicción, puedes tener derecho a acceder, rectificar, eliminar o exportar tus datos personales, así como a oponerte u obtener la limitación de ciertos tratamientos. Puedes ejercer estos derechos escribiéndonos a contact@matmaxsuite.com.',
          'Como negocio que usa la plataforma, eres responsable de atender las solicitudes de privacidad de tus propios clientes respecto a los datos que ingresaste sobre ellos; nosotros actuamos como encargados del tratamiento de esos datos en tu nombre.'
        ]
      },
      {
        heading: '9. Cookies',
        body: [
          'Usamos cookies y almacenamiento local estrictamente necesarios para mantener tu sesión iniciada y recordar preferencias como el idioma. No usamos cookies de publicidad o rastreo de terceros.'
        ]
      },
      {
        heading: '10. Cambios a esta política',
        body: [
          'Podemos actualizar esta Política ocasionalmente. Publicaremos la versión vigente en esta página con la fecha de última actualización.'
        ]
      },
      {
        heading: '11. Contacto',
        body: [
          'Para preguntas sobre esta Política de Privacidad o para ejercer tus derechos, contáctanos en contact@matmaxsuite.com.'
        ]
      }
    ]
  },
  en: {
    brand: 'MatMax Business Suite',
    home: 'Home',
    title: 'Privacy Policy',
    updated: 'Last updated: July 10, 2026',
    sections: [
      {
        heading: '1. Who we are',
        body: [
          'MatMax Business Suite is operated by MatMax Consulting SARL-S ("we"). This Privacy Policy explains what data we collect, how we use it, and what rights you have over it.'
        ]
      },
      {
        heading: '2. What data we collect',
        body: [
          'Account data: name, email address, and password (stored encrypted) when you register.',
          'Business data: information you enter while using the Service, including products, sales, clients, quotes, invoices, payments, and business configuration.',
          'Billing data: handled directly by Stripe; we do not store full card numbers on our servers.',
          'Usage data: technical information such as IP address, browser type, and error logs, collected automatically to operate and improve the Service.'
        ]
      },
      {
        heading: '3. How we use the data',
        body: [
          'We use data to: provide and operate the Service, process subscription payments, send you operational notifications (account confirmation, password reset, invoices, quotes, support alerts), detect and fix errors, and comply with legal obligations.',
          'We do not sell your data or your customers’ data to third parties.'
        ]
      },
      {
        heading: '4. Who we share data with',
        body: [
          'We use external providers ("subprocessors") strictly necessary to operate the Service: Supabase (database and authentication, hosted in the European Union), Stripe (payment processing), Resend (transactional email delivery), Sentry (error monitoring), and Cloudflare (hosting and content delivery).',
          'Each of these providers processes data only to the extent necessary to provide their specific service, under their own data protection agreements.'
        ]
      },
      {
        heading: '5. Where data is stored',
        body: [
          'Your primary database is hosted in the Ireland region (European Union) via Supabase. Transactional emails are processed from the eu-west-1 region via Resend.'
        ]
      },
      {
        heading: '6. Security and backups',
        body: [
          'We apply role-based access controls and per-business data isolation (Row Level Security) at the database level. We run periodic automatic platform backups as a continuity measure, stored privately and accessible only to authorized administrators.',
          'No system is 100% secure; we recommend using strong passwords and not sharing your credentials.'
        ]
      },
      {
        heading: '7. Data retention',
        body: [
          'We retain your data while your account is active. If you cancel your account, we retain the data for a limited period to allow you to export it or reactivate the service, after which it may be deleted or anonymized, unless the law requires a longer retention period (for example, tax or accounting records).'
        ]
      },
      {
        heading: '8. Your rights',
        body: [
          'Depending on your jurisdiction, you may have the right to access, correct, delete, or export your personal data, as well as to object to or obtain the restriction of certain processing. You can exercise these rights by writing to contact@matmaxsuite.com.',
          'As a business using the platform, you are responsible for handling the privacy requests of your own customers regarding the data you entered about them; we act as a data processor on your behalf for that data.'
        ]
      },
      {
        heading: '9. Cookies',
        body: [
          'We use cookies and local storage strictly necessary to keep you signed in and remember preferences like language. We do not use third-party advertising or tracking cookies.'
        ]
      },
      {
        heading: '10. Changes to this policy',
        body: [
          'We may update this Policy from time to time. We will post the current version on this page along with the last-updated date.'
        ]
      },
      {
        heading: '11. Contact',
        body: [
          'For questions about this Privacy Policy or to exercise your rights, contact us at contact@matmaxsuite.com.'
        ]
      }
    ]
  }
} as const;

export function PrivacyPage() {
  const { language } = useLanguage();
  const t = privacyCopy[language];

  return (
    <div className="matmax-page relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-8 top-16 h-80 w-80 rounded-full bg-[#f4c542]/20 blur-3xl" />
        <div className="absolute right-6 top-32 h-80 w-80 rounded-full bg-black/10 blur-3xl" />
      </div>

      <header className="relative border-b border-[#e9e2d3] bg-[#fbfaf7]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#050505] text-[#f4c542]">
              <Sparkles className="shrink-0" size={18} />
            </div>
            <span className="font-serif text-lg font-bold text-[#050505]">{t.brand}</span>
          </div>

          <button
            type="button"
            onClick={() => (window.location.href = '/')}
            className="inline-flex items-center gap-2 rounded-full border border-[#e9e2d3] bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#71717a] shadow-sm transition hover:border-[#f4c542] hover:bg-[#fff9e8] hover:text-[#050505]"
          >
            <ArrowLeft className="shrink-0" size={14} />
            {t.home}
          </button>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-6 py-14">
        <h1 className="mb-2 text-4xl font-serif font-bold tracking-tight text-[#050505] md:text-5xl">
          {t.title}
        </h1>
        <p className="mb-10 text-sm font-medium text-[#71717a]">{t.updated}</p>

        <div className="space-y-9 rounded-[2rem] border border-[#e9e2d3] bg-white/90 p-8 shadow-[0_30px_90px_rgba(15,15,15,0.06)] backdrop-blur-2xl md:p-12">
          {t.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-3 text-xl font-serif font-bold text-[#050505]">{section.heading}</h2>
              <div className="space-y-3">
                {section.body.map((paragraph, index) => (
                  <p key={index} className="text-sm leading-relaxed text-[#52525b]">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
