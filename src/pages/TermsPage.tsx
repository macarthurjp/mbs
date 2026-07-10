import { ArrowLeft, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const termsCopy = {
  es: {
    brand: 'MatMax Business Suite',
    home: 'Inicio',
    title: 'Términos de Servicio',
    updated: 'Última actualización: 10 de julio de 2026',
    sections: [
      {
        heading: '1. Aceptación de los términos',
        body: [
          'Estos Términos de Servicio ("Términos") regulan el acceso y uso de MatMax Business Suite ("el Servicio"), operado por MatMax Consulting SARL-S ("nosotros", "la Empresa"). Al crear una cuenta o utilizar el Servicio, aceptas quedar vinculado por estos Términos y por nuestra Política de Privacidad.',
          'Si estás aceptando estos Términos en nombre de un negocio u organización, declaras tener autoridad para vincular a esa entidad.'
        ]
      },
      {
        heading: '2. Descripción del servicio',
        body: [
          'MatMax Business Suite es una plataforma SaaS multi-negocio de punto de venta que incluye, entre otros módulos, ventas, inventario, clientes, facturación, cotizaciones, compras, caja, cuentas por cobrar, reportes y administración de usuarios.',
          'Nos reservamos el derecho de modificar, agregar o discontinuar funciones del Servicio en cualquier momento, notificando cambios significativos con una antelación razonable cuando sea posible.'
        ]
      },
      {
        heading: '3. Cuentas y registro',
        body: [
          'Debes proporcionar información veraz y completa al crear tu cuenta, y mantenerla actualizada. Eres responsable de mantener la confidencialidad de tus credenciales y de toda actividad que ocurra bajo tu cuenta.',
          'Debes notificarnos de inmediato ante cualquier uso no autorizado de tu cuenta.'
        ]
      },
      {
        heading: '4. Planes, precios y facturación',
        body: [
          'El Servicio se ofrece mediante planes de suscripción de pago recurrente, procesados a través de Stripe, Inc. Al suscribirte, autorizas el cobro automático y periódico según el plan seleccionado.',
          'Las suscripciones se renuevan automáticamente al final de cada período de facturación salvo que canceles antes de la fecha de renovación. Puedes cancelar en cualquier momento desde el panel de administración; la cancelación aplica al final del período ya pagado, sin reembolsos proporcionales salvo que la ley aplicable exija lo contrario.',
          'Nos reservamos el derecho de modificar los precios de los planes, notificando con antelación razonable antes de que el cambio afecte tu siguiente ciclo de facturación.'
        ]
      },
      {
        heading: '5. Uso aceptable',
        body: [
          'No debes usar el Servicio para actividades ilegales, para almacenar o transmitir contenido que infrinja derechos de terceros, ni para intentar vulnerar la seguridad de la plataforma o acceder a datos de otros negocios sin autorización.',
          'Nos reservamos el derecho de suspender o terminar cuentas que incumplan esta sección.'
        ]
      },
      {
        heading: '6. Datos y contenido del usuario',
        body: [
          'Tú conservas la propiedad de todos los datos que ingreses al Servicio (información de tu negocio, tus clientes, ventas, inventario, etc.). Nos otorgas una licencia limitada para almacenar, procesar y mostrar esos datos únicamente con el fin de prestarte el Servicio.',
          'Eres el único responsable de la legalidad de los datos de terceros (por ejemplo, información de tus propios clientes) que ingreses en la plataforma, incluyendo el cumplimiento de las leyes de protección de datos que te apliquen como negocio.'
        ]
      },
      {
        heading: '7. Propiedad intelectual',
        body: [
          'El Servicio, su código, diseño, marca y contenido (excluyendo los datos que tú ingreses) son propiedad de MatMax Consulting SARL-S y están protegidos por leyes de propiedad intelectual. No se te otorga ningún derecho sobre ellos salvo el uso del Servicio conforme a estos Términos.'
        ]
      },
      {
        heading: '8. Disponibilidad del servicio y respaldos',
        body: [
          'Nos esforzamos por mantener el Servicio disponible y realizamos respaldos periódicos de los datos, pero no garantizamos disponibilidad ininterrumpida ni la ausencia total de pérdida de datos. Te recomendamos exportar tu información periódicamente si es crítica para tu negocio.'
        ]
      },
      {
        heading: '9. Limitación de responsabilidad',
        body: [
          'En la máxima medida permitida por la ley aplicable, MatMax Consulting SARL-S no será responsable por daños indirectos, incidentales, especiales o consecuentes derivados del uso o la imposibilidad de uso del Servicio, incluyendo pérdida de ingresos, datos o beneficios.',
          'Nuestra responsabilidad total frente a ti por cualquier reclamo relacionado con el Servicio no excederá el monto pagado por ti en los tres meses anteriores al hecho que origine el reclamo.'
        ]
      },
      {
        heading: '10. Terminación',
        body: [
          'Puedes dejar de usar el Servicio y cancelar tu cuenta en cualquier momento. Podemos suspender o terminar tu acceso si incumples estos Términos, con notificación previa cuando sea razonablemente posible.',
          'Tras la terminación, conservaremos tus datos por un período limitado para permitirte exportarlos, transcurrido el cual podrán ser eliminados conforme a nuestra Política de Privacidad.'
        ]
      },
      {
        heading: '11. Modificaciones a estos Términos',
        body: [
          'Podemos actualizar estos Términos ocasionalmente. Publicaremos la versión vigente en esta página con la fecha de última actualización. El uso continuado del Servicio tras un cambio implica tu aceptación de los nuevos Términos.'
        ]
      },
      {
        heading: '12. Ley aplicable y jurisdicción',
        body: [
          'Estos Términos se rigen por las leyes del Gran Ducado de Luxemburgo, sin perjuicio de las disposiciones imperativas de protección al consumidor que puedan aplicarte según tu país de residencia. Cualquier disputa que no pueda resolverse amistosamente será sometida a los tribunales competentes de Luxemburgo.'
        ]
      },
      {
        heading: '13. Contacto',
        body: [
          'Para preguntas sobre estos Términos, contáctanos en contact@matmaxsuite.com.'
        ]
      }
    ]
  },
  en: {
    brand: 'MatMax Business Suite',
    home: 'Home',
    title: 'Terms of Service',
    updated: 'Last updated: July 10, 2026',
    sections: [
      {
        heading: '1. Acceptance of terms',
        body: [
          'These Terms of Service ("Terms") govern access to and use of MatMax Business Suite ("the Service"), operated by MatMax Consulting SARL-S ("we", "the Company"). By creating an account or using the Service, you agree to be bound by these Terms and by our Privacy Policy.',
          'If you are accepting these Terms on behalf of a business or organization, you represent that you have the authority to bind that entity.'
        ]
      },
      {
        heading: '2. Description of the service',
        body: [
          'MatMax Business Suite is a multi-business SaaS point-of-sale platform including, among other modules, sales, inventory, clients, invoicing, quotes, purchases, cash register, accounts receivable, reports, and user administration.',
          'We reserve the right to modify, add, or discontinue features of the Service at any time, notifying significant changes with reasonable advance notice when possible.'
        ]
      },
      {
        heading: '3. Accounts and registration',
        body: [
          'You must provide accurate and complete information when creating your account, and keep it up to date. You are responsible for keeping your credentials confidential and for all activity that occurs under your account.',
          'You must notify us immediately of any unauthorized use of your account.'
        ]
      },
      {
        heading: '4. Plans, pricing, and billing',
        body: [
          'The Service is offered through recurring paid subscription plans, processed via Stripe, Inc. By subscribing, you authorize automatic, recurring charges according to your selected plan.',
          'Subscriptions renew automatically at the end of each billing period unless you cancel before the renewal date. You may cancel at any time from the admin panel; cancellation takes effect at the end of the already-paid period, with no prorated refunds unless required by applicable law.',
          'We reserve the right to change plan pricing, providing reasonable advance notice before a change affects your next billing cycle.'
        ]
      },
      {
        heading: '5. Acceptable use',
        body: [
          'You may not use the Service for illegal activities, to store or transmit content that infringes third-party rights, or to attempt to breach the platform’s security or access other businesses’ data without authorization.',
          'We reserve the right to suspend or terminate accounts that violate this section.'
        ]
      },
      {
        heading: '6. User data and content',
        body: [
          'You retain ownership of all data you enter into the Service (your business information, your customers, sales, inventory, etc.). You grant us a limited license to store, process, and display that data solely to provide you the Service.',
          'You are solely responsible for the legality of any third-party data (for example, your own customers’ information) that you enter into the platform, including compliance with any data protection laws applicable to your business.'
        ]
      },
      {
        heading: '7. Intellectual property',
        body: [
          'The Service, its code, design, brand, and content (excluding data you enter) are owned by MatMax Consulting SARL-S and protected by intellectual property laws. No rights are granted to you other than the use of the Service under these Terms.'
        ]
      },
      {
        heading: '8. Service availability and backups',
        body: [
          'We strive to keep the Service available and perform periodic data backups, but we do not guarantee uninterrupted availability or the complete absence of data loss. We recommend exporting your data periodically if it is critical to your business.'
        ]
      },
      {
        heading: '9. Limitation of liability',
        body: [
          'To the maximum extent permitted by applicable law, MatMax Consulting SARL-S will not be liable for indirect, incidental, special, or consequential damages arising from use or inability to use the Service, including loss of revenue, data, or profits.',
          'Our total liability to you for any claim related to the Service will not exceed the amount you paid in the three months prior to the event giving rise to the claim.'
        ]
      },
      {
        heading: '10. Termination',
        body: [
          'You may stop using the Service and cancel your account at any time. We may suspend or terminate your access if you breach these Terms, with prior notice when reasonably possible.',
          'After termination, we will retain your data for a limited period to allow you to export it, after which it may be deleted in accordance with our Privacy Policy.'
        ]
      },
      {
        heading: '11. Changes to these Terms',
        body: [
          'We may update these Terms from time to time. We will post the current version on this page along with the last-updated date. Continued use of the Service after a change constitutes acceptance of the new Terms.'
        ]
      },
      {
        heading: '12. Governing law and jurisdiction',
        body: [
          'These Terms are governed by the laws of the Grand Duchy of Luxembourg, without prejudice to any mandatory consumer protection provisions that may apply to you based on your country of residence. Any dispute that cannot be resolved amicably will be submitted to the competent courts of Luxembourg.'
        ]
      },
      {
        heading: '13. Contact',
        body: [
          'For questions about these Terms, contact us at contact@matmaxsuite.com.'
        ]
      }
    ]
  }
} as const;

export function TermsPage() {
  const { language } = useLanguage();
  const t = termsCopy[language];

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
