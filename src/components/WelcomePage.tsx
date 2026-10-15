import { useEffect } from 'react';
import { motion } from 'motion/react';
import { track } from '@vercel/analytics/react';

const WELCOME_IMAGE = 'https://res.cloudinary.com/dwthgcx5j/image/upload/v1790361183/ChatGPT_Image_Sep_25_2026_12_32_17_PM_p9tfw0.png';

export function WelcomePage({ onContinue }: { onContinue: () => void }) {
  useEffect(() => {
    track('Welcome Viewed');
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
    <div className="relative h-[27dvh] min-h-[170px] max-h-[270px] w-full shrink-0 overflow-hidden bg-[#111214]">
      <img src={WELCOME_IMAGE} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(17,18,20,0.02)_35%,rgba(17,18,20,0.4)_72%,#111214_100%)]" />
    </div>

    <div className="relative z-10 mx-auto -mt-5 w-full max-w-xl flex-1 px-6 pb-2">
      <motion.div initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12, duration: 0.4 }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">PuntoNochi</p>
        <h1 id="welcome-title" className="mt-2 text-[32px] font-bold leading-tight tracking-tight">Encuentra lo que buscas<br/><span className="text-blue-300">en Nochistlán.</span></h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/65">Negocios, horarios, eventos y lugares locales, en un solo sitio.</p>

        <div className="mt-5 flex flex-wrap gap-2" aria-label="Explora PuntoNochi">
          {['Negocios y servicios', 'Qué hacer', 'Noticias y eventos'].map((item) => <span key={item} className="rounded-full border border-white/10 bg-white/[.05] px-3 py-2 text-[12px] font-medium text-white/75">{item}</span>)}
        </div>
      </motion.div>
    </div>

    <div className="sticky bottom-0 z-20 mt-auto bg-[linear-gradient(to_bottom,rgba(17,18,20,0),#111214_22%)] px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-5">
      <button type="button" onClick={onContinue} className="mx-auto flex h-13 min-h-[52px] w-full max-w-xl items-center justify-center rounded-full bg-[#007aff] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#0a84ff] active:scale-[0.98] active:bg-[#0066d6]">Explorar negocios y lugares</button>
      <p className="mt-3 text-center text-[11px] text-white/45">Empieza a explorar sin crear una cuenta</p>
    </div>
  </motion.main>;
}
