import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Compass, LayoutList, PlusCircle, QrCode, Sparkles, Zap } from 'lucide-react';

// Bump this on every release that should show the overlay again.
export const APP_RELEASE = '2026.11';
const SEEN_KEY = 'puntonochi-whats-new-seen';

const FEATURES = [
  { icon: Sparkles, color: '#0a84ff', title: 'Nueva barra de navegación', text: 'Un diseño de cristal líquido más limpio, con un indicador que refleja los íconos como una lente.' },
  { icon: PlusCircle, color: '#ff375f', title: 'Sube tus reels', text: 'Toca el botón + en la barra para compartir videos de Nochistlán con la comunidad.' },
  { icon: Compass, color: '#ff9f0a', title: 'Explorar renovado', text: 'Tarjetas con modo ambiente, fotos más grandes y la información de cada negocio más clara.' },
  { icon: LayoutList, color: '#30d158', title: 'Fichas más ordenadas', text: 'Ahora ves primero las fotos, luego el horario y al final las opiniones.' },
  { icon: QrCode, color: '#bf5af2', title: 'Tarjeta digital mejorada', text: 'Código QR más grande y un diseño pensado para compartir desde tu celular.' },
  { icon: Zap, color: '#ffd60a', title: 'Más rápida', text: 'PuntoNochi carga más rápido y responde mejor, incluso con poca señal.' },
];

function isReturningUser() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      if (key.startsWith('puntonochi-') && key !== SEEN_KEY) return true;
    }
  } catch { /* storage unavailable */ }
  return false;
}

export function WhatsNewOverlay() {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(SEEN_KEY);
      if (seen === APP_RELEASE) return;
      if (!seen && !isReturningUser()) { localStorage.setItem(SEEN_KEY, APP_RELEASE); return; } // brand-new visitor
      const timer = window.setTimeout(() => setOpen(true), 400);
      return () => window.clearTimeout(timer);
    } catch { /* storage unavailable: skip the overlay */ }
  }, []);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => { root.style.overflow = previous; };
  }, [open]);

  const close = () => {
    try { localStorage.setItem(SEEN_KEY, APP_RELEASE); } catch { /* ignore */ }
    setOpen(false);
  };

  return <AnimatePresence>
    {open && <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0.1 : 0.3 }}
      className="fixed inset-0 z-[200] flex flex-col bg-black text-white"
    >
      <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col overflow-y-auto px-7 pt-[max(56px,calc(env(safe-area-inset-top)+40px))]">
        <motion.h1
          id="whats-new-title"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center text-[34px] font-extrabold leading-[1.1] tracking-tight"
        >
          Novedades de<br /><span className="text-[#0a84ff]">PuntoNochi</span>
        </motion.h1>
        <p className="mt-3 text-center text-[15px] text-white/55">Actualizamos la app. Esto es lo nuevo:</p>

        <ul className="mt-10 space-y-7 pb-8">
          {FEATURES.map(({ icon: Icon, color, title, text }, index) => <motion.li
            key={title}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-start gap-4"
          >
            <Icon aria-hidden="true" className="mt-0.5 h-9 w-9 shrink-0" style={{ color }} strokeWidth={1.8} />
            <div>
              <h2 className="text-[16px] font-semibold leading-snug">{title}</h2>
              <p className="mt-0.5 text-[14px] leading-snug text-white/60">{text}</p>
            </div>
          </motion.li>)}
        </ul>
      </div>

      <div className="mx-auto w-full max-w-[460px] shrink-0 px-7 pb-[max(28px,calc(env(safe-area-inset-bottom)+16px))] pt-3">
        <button
          type="button"
          onClick={close}
          autoFocus
          className="h-[52px] w-full rounded-[14px] bg-[#0a84ff] text-[17px] font-semibold text-white transition-transform active:scale-[.98]"
        >
          Continuar
        </button>
      </div>
    </motion.div>}
  </AnimatePresence>;
}
