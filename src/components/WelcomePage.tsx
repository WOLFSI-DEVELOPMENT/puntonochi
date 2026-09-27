import { useEffect } from 'react';
import { motion } from 'motion/react';

const WELCOME_IMAGE = 'https://res.cloudinary.com/dwthgcx5j/image/upload/v1790361183/ChatGPT_Image_Sep_25_2026_12_32_17_PM_p9tfw0.png';

export function WelcomePage({ onContinue }: { onContinue: () => void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  return <motion.main
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.35 }}
    className="fixed inset-0 z-[9998] flex h-[100dvh] flex-col overflow-y-auto overscroll-contain bg-[#111214] text-white"
    aria-labelledby="welcome-title"
  >
    <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-[#111214]">
      <img src={WELCOME_IMAGE} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(17,18,20,0.02)_35%,rgba(17,18,20,0.4)_72%,#111214_100%)]" />
    </div>

    <div className="relative z-10 mx-auto -mt-5 w-full max-w-xl flex-1 px-6 pb-5">
      <motion.div initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12, duration: 0.4 }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">PuntoNochi</p>
        <h1 id="welcome-title" className="mt-2 text-[32px] font-bold leading-tight tracking-tight">Todo Nochistlán,<br/><span className="text-blue-300">más cerca.</span></h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/65">Descubre negocios, encuentra qué hacer y mantente al día con lo que pasa en tu comunidad.</p>

        <div className="mt-7 divide-y divide-white/10">
          <section className="py-4 first:pt-0">
            <h2 className="text-[16px] font-semibold">Encuentra negocios locales</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-white/55">Explora por categoría, revisa horarios y detalles, y encuentra cómo llegar.</p>
          </section>
          <section className="py-4">
            <h2 className="text-[16px] font-semibold">Comparte con la comunidad</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-white/55">Guarda tus lugares favoritos, deja reseñas y ayuda a mantener la información actualizada.</p>
          </section>
          <section className="py-4">
            <h2 className="text-[16px] font-semibold">Descubre qué está pasando</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-white/55">Encuentra noticias, eventos y nuevas recomendaciones de Nochistlán.</p>
          </section>
        </div>
      </motion.div>
    </div>

    <div className="sticky bottom-0 z-20 mt-auto bg-[linear-gradient(to_bottom,rgba(17,18,20,0),#111214_22%)] px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-5">
      <button type="button" onClick={onContinue} className="mx-auto flex h-13 min-h-[52px] w-full max-w-xl items-center justify-center rounded-full bg-[#007aff] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#0a84ff] active:scale-[0.98] active:bg-[#0066d6]">Empezar</button>
      <p className="mt-3 text-center text-[11px] text-white/35">Tu guía para descubrir Nochistlán</p>
    </div>
  </motion.main>;
}
