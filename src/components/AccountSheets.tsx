import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, UserRound, X } from 'lucide-react';
import { SheetDragHandle, useSheetDrag } from './SheetDragHandle';

export function AccountAuthSheet({ onClose, initialMode = 'signup' }: { onClose: () => void; initialMode?: 'signup' | 'login' }) {
  const drag = useSheetDrag(onClose);
  const [mode, setMode] = useState<'signup' | 'login'>(initialMode);
  const continueWithGoogle = () => window.location.assign(`/api/account/oauth/start?mode=${mode}`);

  return <>
    <motion.button type="button" aria-label="Cerrar Perfiles" onClick={onClose} className="fixed inset-0 z-[119] bg-black/65 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
    <motion.section {...drag} role="dialog" aria-modal="true" aria-label="Perfiles beta" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 360 }} className="fixed inset-x-0 bottom-0 z-[120] mx-auto w-full max-w-[640px] rounded-t-[30px] bg-[#202124] px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-2 text-white shadow-2xl">
      <SheetDragHandle controls={drag.dragControls}/>
      <div className="mb-5 flex items-start justify-between gap-4"><div><span className="inline-flex rounded-md bg-blue-500 px-2 py-1 text-[10px] font-extrabold tracking-wide text-white">BETA</span><h2 className="mt-2 text-2xl font-bold">Perfiles</h2><p className="mt-1 max-w-sm text-sm leading-relaxed text-white/55">Crea tu cuenta para tener tu perfil y tu actividad disponibles en PuntoNochi.</p></div><button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.08]"><X className="h-5 w-5"/></button></div>
      <div className="mb-4 flex rounded-full bg-[#151618] p-1"><button type="button" onClick={() => setMode('signup')} aria-pressed={mode === 'signup'} className={`flex-1 rounded-full py-2.5 text-sm font-semibold ${mode === 'signup' ? 'bg-[#35363a] text-white' : 'text-white/50'}`}>Crear cuenta</button><button type="button" onClick={() => setMode('login')} aria-pressed={mode === 'login'} className={`flex-1 rounded-full py-2.5 text-sm font-semibold ${mode === 'login' ? 'bg-[#35363a] text-white' : 'text-white/50'}`}>Iniciar sesión</button></div>
      <button type="button" onClick={continueWithGoogle} className="flex h-12 w-full items-center justify-center gap-3 rounded-full bg-white text-sm font-bold text-[#202124]"><span className="bg-gradient-to-r from-blue-600 via-red-500 to-yellow-500 bg-clip-text text-xl font-extrabold text-transparent">G</span>{mode === 'signup' ? 'Crear cuenta con Google' : 'Continuar con Google'}</button>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-white/40">Usaremos tu nombre, correo y foto de perfil de Google.</p>
    </motion.section>
  </>;
}

export function AccountRequiredPrompt({ onClose, message = 'Crea una cuenta o inicia sesión para participar en la comunidad.' }: { onClose: () => void; message?: string }) {
  const [showAuth, setShowAuth] = useState(false);
  const drag = useSheetDrag(onClose);
  return <>
    <motion.button type="button" aria-label="Cerrar" onClick={onClose} className="fixed inset-0 z-[108] bg-black/65 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
    <motion.section {...drag} role="dialog" aria-modal="true" aria-label="Inicia sesión para continuar" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 360 }} className="fixed inset-x-0 bottom-0 z-[109] mx-auto w-full max-w-[560px] rounded-t-[30px] bg-[#202124] px-5 pb-[calc(env(safe-area-inset-bottom)+26px)] pt-2 text-white shadow-2xl">
      <SheetDragHandle controls={drag.dragControls} />
      <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white"><UserRound className="h-6 w-6"/></span><div className="min-w-0 flex-1"><span className="inline-flex rounded-md bg-blue-500 px-2 py-0.5 text-[9px] font-extrabold tracking-wide text-white">BETA · PERFILES</span><h2 className="mt-1 text-xl font-bold">Únete a la comunidad</h2></div><button type="button" aria-label="Cerrar" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08]"><X className="h-4 w-4"/></button></div>
      <p className="mt-3 text-sm leading-relaxed text-white/55">{message}</p>
      <button type="button" onClick={() => setShowAuth(true)} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black">Iniciar sesión o crear cuenta <ArrowRight className="h-4 w-4"/></button>
    </motion.section>
    <AnimatePresence>{showAuth && <AccountAuthSheet initialMode="login" onClose={() => setShowAuth(false)}/>}</AnimatePresence>
  </>;
}
