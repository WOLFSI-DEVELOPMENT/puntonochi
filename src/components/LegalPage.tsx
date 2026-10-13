import { ArrowLeft, ExternalLink, ShieldCheck, Scale } from 'lucide-react';
import type { ReactNode } from 'react';

export type LegalDocument = 'privacidad' | 'terminos';

const UPDATED = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date());
const CONTACT_URL = 'https://www.instagram.com/puntonochistlan/';
const GOOGLE_DATA_URL = 'https://business.safety.google/privacy/';

function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="border-b border-white/[.07] py-6 last:border-0"><h2 className="text-base font-bold tracking-tight text-white">{title}</h2><div className="mt-2 space-y-3 text-[14px] leading-7 text-white/65">{children}</div></section>;
}

export function LegalPage({ document, onClose }: { document: LegalDocument; onClose: () => void }) {
  const isPrivacy = document === 'privacidad';
  const title = isPrivacy ? 'Política de privacidad' : 'Términos y condiciones';
  return <main className="fixed inset-0 z-[300] overflow-y-auto bg-[#111214] text-white" aria-labelledby="legal-page-title">
    <header className="sticky top-0 z-20 border-b border-white/[.07] bg-[#111214]/90 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <button type="button" onClick={onClose} aria-label="Volver" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[.08] text-white/80 transition-colors hover:bg-white/[.14]"><ArrowLeft className="h-5 w-5"/></button>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/40">PuntoNochi · Información legal</p><h1 id="legal-page-title" className="truncate text-lg font-bold">{title}</h1></div>
      </div>
    </header>
    <article className="mx-auto max-w-3xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[17px] bg-white/[.08] text-white/75">{isPrivacy ? <ShieldCheck className="h-6 w-6"/> : <Scale className="h-6 w-6"/>}</div>
      <p className="text-xs text-white/40">Última actualización: {UPDATED}</p>
      <p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/65">{isPrivacy ? 'En PuntoNochi cuidamos la información que compartes al descubrir y participar en la comunidad de Nochistlán. Aquí explicamos qué datos usamos, para qué los usamos y las opciones que tienes.' : 'Estos términos describen las reglas para usar PuntoNochi, una plataforma para descubrir negocios, lugares, publicaciones y eventos de Nochistlán.'}</p>

      {isPrivacy ? <>
        <LegalSection title="1. Responsable y contacto">
          <p>El responsable del sitio y de los datos tratados por sus funciones propias es PuntoNochi, con contacto en Nochistlán de Mejía, Zacatecas, México. Para consultas de privacidad, solicitudes de acceso, rectificación, cancelación u oposición (derechos ARCO), escríbenos a través de <a className="font-semibold text-white underline decoration-white/30 underline-offset-4" href={CONTACT_URL} target="_blank" rel="noreferrer">Instagram @puntonochistlan <ExternalLink className="inline h-3 w-3"/></a> e indica “Privacidad” en tu mensaje.</p>
          <p>El domicilio y la identidad legal completa del operador deben añadirse aquí antes de publicar el aviso definitivo.</p>
        </LegalSection>
        <LegalSection title="2. Información que podemos tratar">
          <ul className="list-disc space-y-2 pl-5"><li>Datos de cuenta: nombre, correo, foto de perfil y, si eliges proporcionarlo, teléfono, mediante los métodos de acceso disponibles.</li><li>Contenido que compartes: publicaciones, reseñas, comentarios, fotos, notas sobre negocios y datos de contacto que incluyas en solicitudes o registros de negocios.</li><li>Datos de uso: búsquedas, páginas visitadas, interacciones con negocios, datos técnicos del navegador y registros necesarios para seguridad y funcionamiento.</li><li>Ubicación aproximada o del dispositivo solo cuando autorizas el permiso del navegador para funciones cercanas; puedes denegarlo desde el navegador.</li><li>Preferencias guardadas en el dispositivo, como favoritos y búsquedas recientes.</li></ul>
        </LegalSection>
        <LegalSection title="3. Para qué usamos la información">
          <p>Usamos estos datos para operar la cuenta y las funciones solicitadas, mostrar resultados relevantes, conservar tus publicaciones, responder solicitudes, moderar contenido, prevenir abusos, mejorar el servicio y medir el uso general del sitio. También podemos comunicar cambios importantes o responder a mensajes que nos envíes.</p>
        </LegalSection>
        <LegalSection title="4. Cookies, almacenamiento y servicios externos">
          <p>El sitio utiliza almacenamiento local para recordar preferencias y datos de uso en el dispositivo. Las funciones de cuenta pueden usar cookies de sesión necesarias para autenticación y seguridad. Google, Meta/Facebook, Vercel, Neon, Mapbox y otros proveedores pueden recibir información cuando utilizas las funciones que dependen de sus servicios; cada proveedor trata la información conforme a sus propios avisos y condiciones.</p>
          <p>Los enlaces a sitios externos se rigen por las políticas de sus respectivos operadores. No controlamos sus prácticas de privacidad.</p>
        </LegalSection>
        <LegalSection title="5. Publicidad y Google AdSense">
          <p>Si PuntoNochi habilita anuncios de Google, Google y otros proveedores de publicidad pueden usar cookies, identificadores, direcciones IP o tecnologías similares para mostrar, medir y limitar anuncios. Estos proveedores podrían leer o guardar cookies en tu navegador y usar información sobre visitas anteriores a este sitio o a otros sitios para personalizar anuncios, de acuerdo con tu configuración y las opciones disponibles.</p>
          <p>Puedes administrar la personalización de anuncios de Google en <a className="font-semibold text-white underline decoration-white/30 underline-offset-4" href="https://adssettings.google.com/" target="_blank" rel="noreferrer">Configuración de anuncios de Google <ExternalLink className="inline h-3 w-3"/></a>. También puedes consultar opciones de exclusión de ciertos proveedores en <a className="font-semibold text-white underline decoration-white/30 underline-offset-4" href="https://www.aboutads.info/choices/" target="_blank" rel="noreferrer">aboutads.info <ExternalLink className="inline h-3 w-3"/></a>.</p>
          <p>Consulta <a className="font-semibold text-white underline decoration-white/30 underline-offset-4" href={GOOGLE_DATA_URL} target="_blank" rel="noreferrer">cómo usa Google la información de los sitios que utilizan sus servicios <ExternalLink className="inline h-3 w-3"/></a>.</p>
          <p>Cuando se activen otros proveedores publicitarios, identificaremos los proveedores que sirven anuncios y enlazaremos sus avisos y opciones de exclusión. En regiones donde se requiera consentimiento para cookies o publicidad personalizada, PuntoNochi deberá mostrar un mecanismo de consentimiento válido antes de activar esos usos.</p>
        </LegalSection>
        <LegalSection title="6. Conservación y seguridad">
          <p>Conservamos los datos durante el tiempo necesario para prestar las funciones, atender obligaciones aplicables, resolver disputas y proteger el servicio. Aplicamos medidas razonables para restringir el acceso y proteger la información; ningún sistema de transmisión o almacenamiento puede garantizar seguridad absoluta.</p>
        </LegalSection>
        <LegalSection title="7. Tus opciones y derechos">
          <p>Puedes actualizar los datos de perfil disponibles desde tu cuenta, retirar el permiso de ubicación desde el navegador y borrar datos locales desde la configuración del dispositivo. También puedes solicitar acceso, rectificación, cancelación u oposición (ARCO), o revocar el consentimiento cuando corresponda, escribiendo a nuestro contacto de privacidad. Verificaremos tu identidad y atenderemos la solicitud conforme a la legislación aplicable.</p>
        </LegalSection>
        <LegalSection title="8. Cambios a este aviso">
          <p>Podemos actualizar este aviso cuando cambien el servicio, los proveedores o las obligaciones aplicables. Publicaremos la versión vigente en esta página e indicaremos la fecha de actualización.</p>
        </LegalSection>
      </> : <>
        <LegalSection title="1. Uso de PuntoNochi">
          <p>PuntoNochi ofrece herramientas para consultar negocios, lugares, noticias, eventos y contenido comunitario de Nochistlán. Al navegar, crear una cuenta o publicar contenido, aceptas estos términos. Si no estás de acuerdo, deja de usar las funciones correspondientes.</p>
        </LegalSection>
        <LegalSection title="2. Cuentas y seguridad">
          <p>Proporciona información correcta y mantén bajo tu control los métodos de acceso a tu cuenta. Eres responsable de la actividad realizada desde tu sesión. Podemos limitar o suspender cuentas ante uso fraudulento, riesgos de seguridad o incumplimientos de estos términos.</p>
        </LegalSection>
        <LegalSection title="3. Contenido de la comunidad">
          <p>Conservas tus derechos sobre el contenido que publicas. Al compartirlo, autorizas a PuntoNochi a alojarlo, reproducirlo y mostrarlo dentro del servicio, y a adaptarlo técnicamente (por ejemplo, cambiar tamaño o formato) para operar y promocionar las funciones relacionadas. Solo debes publicar material que tengas derecho a compartir.</p>
          <p>No publiques contenido ilegal, engañoso, invasivo de la privacidad, discriminatorio, abusivo, con spam o que infrinja derechos de otras personas. Puedes reportar contenido o solicitar su revisión desde las opciones disponibles en la plataforma.</p>
        </LegalSection>
        <LegalSection title="4. Negocios, eventos y anuncios">
          <p>La información de negocios y eventos puede ser enviada por usuarios, propietarios o proveedores externos. Revisamos las solicitudes cuando corresponde, pero no garantizamos que cada dato esté actualizado, que un negocio esté abierto o que una oferta siga vigente. Confirma directamente con el establecimiento antes de tomar decisiones.</p>
          <p>El contenido patrocinado o la publicidad se identificará cuando corresponda. Los acuerdos de promoción no implican una garantía o recomendación de PuntoNochi sobre los productos o servicios anunciados.</p>
        </LegalSection>
        <LegalSection title="5. Servicios y enlaces de terceros">
          <p>Algunas funciones dependen de servicios externos, como proveedores de inicio de sesión, mapas, alojamiento y analítica. Sus servicios se rigen también por sus propios términos. PuntoNochi no controla ni responde por sitios o servicios externos.</p>
        </LegalSection>
        <LegalSection title="6. Disponibilidad y responsabilidad">
          <p>Trabajamos para mantener el servicio disponible y útil, pero podemos modificar, interrumpir o retirar funciones. En la medida permitida por la ley, PuntoNochi se ofrece según disponibilidad y no garantiza que la información de terceros sea exacta o que el servicio esté libre de interrupciones. Estos términos no limitan derechos que no puedan excluirse conforme a la legislación aplicable.</p>
        </LegalSection>
        <LegalSection title="7. Cambios y contacto">
          <p>Podemos actualizar estos términos y publicaremos los cambios en esta página con su fecha de actualización. Si tienes preguntas sobre estas condiciones, escríbenos a <a className="font-semibold text-white underline decoration-white/30 underline-offset-4" href={CONTACT_URL} target="_blank" rel="noreferrer">Instagram @puntonochistlan <ExternalLink className="inline h-3 w-3"/></a>.</p>
          <p>Estos términos se interpretan conforme a las leyes aplicables en México, sin perjuicio de los derechos irrenunciables que correspondan a cada usuario.</p>
        </LegalSection>
      </>}
    </article>
  </main>;
}
