import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { ArrowLeft, ArrowRight, Facebook, Fingerprint, KeyRound, Phone, UserRound, X } from 'lucide-react';
import CornerKit from '@cornerkit/core';
import { SheetDragHandle, useSheetDrag } from './SheetDragHandle';

async function readResponse(response: Response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'No se pudo completar el inicio de sesión.');
  return result;
}

export async function registerCurrentPasskey() {
  const options = await readResponse(await fetch('/api/account/passkey/registration-options', { credentials: 'same-origin', cache: 'no-store' }));
  const attestation = await startRegistration({ optionsJSON: options });
  await readResponse(await fetch('/api/account/passkey/register', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(attestation) }));
}

export function AccountAuthSheet({ onClose, initialMode = 'login' }: { onClose: () => void; initialMode?: 'signup' | 'login' }) {
  const drag = useSheetDrag(onClose);
  const [mode, setMode] = useState<'signup' | 'login'>(initialMode);
  const [step, setStep] = useState<'methods' | 'phone' | 'passkey'>('methods');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() => new URLSearchParams(window.location.search).get('accountAuthError') || '');
  const [oauthBusy, setOauthBusy] = useState<'google' | 'facebook' | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => new CornerKit().applyAll('[data-account-sheet]', { radius: 32, smoothing: 1 }), 50);
    return () => window.clearTimeout(timer);
  }, []);
  const continueWithGoogle = () => window.location.assign(`/api/account/oauth/start?mode=${mode}`);
  const continueWithFacebook = () => window.location.assign(`/api/account/oauth/facebook/start?mode=${mode}`);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('accountAuth') && !url.searchParams.has('accountAuthError')) return;
    url.searchParams.delete('accountAuth'); url.searchParams.delete('accountAuthError');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);
  const finish = () => { window.dispatchEvent(new Event('account-session-updated')); onClose(); };
  const submitPhone = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const data = await readResponse(await fetch(`/api/account/phone/${mode}`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, password }) }));
      if (!data.account) throw new Error('No se recibió la cuenta.');
      if (mode === 'signup') { window.dispatchEvent(new Event('account-session-updated')); setStep('passkey'); }
      else finish();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo completar el inicio de sesión.'); }
    finally { setBusy(false); }
  };
  const signInWithPasskey = async () => {
    setBusy(true); setError('');
    try {
      const options = await readResponse(await fetch('/api/account/passkey/authentication-options', { credentials: 'same-origin', cache: 'no-store' }));
      const assertion = await startAuthentication({ optionsJSON: options });
      const data = await readResponse(await fetch('/api/account/passkey/authenticate', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assertion) }));
      if (!data.account) throw new Error('No se recibió la cuenta.');
      finish();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo usar la passkey.'); }
    finally { setBusy(false); }
  };

  return <>
    <motion.button type="button" aria-label="Cerrar inicio de sesión" onClick={onClose} className="fixed inset-0 z-[119] bg-black/65 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
    <motion.section {...drag} data-account-sheet role="dialog" aria-modal="true" aria-label="Inicia sesión o crea una cuenta" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%', transition: { type: 'spring', damping: 38, stiffness: 240, mass: 1 } }} transition={{ type: 'spring', damping: 32, stiffness: 360 }} className="fixed inset-x-[5px] bottom-[5px] z-[120] mx-auto w-auto max-w-[460px] rounded-[32px] bg-[#202124] px-7 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 text-white shadow-2xl">
      <SheetDragHandle controls={drag.dragControls}/>
      <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute right-3 top-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.08]"><X className="h-4 w-4"/></button>
      <div className="mb-6 pr-11"><h2 className="text-xl font-extrabold leading-tight">{step === 'phone' ? (mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta') : step === 'passkey' ? 'Cuenta creada' : 'Inicia sesión o crea una cuenta'}</h2><p className="mt-2 text-xs text-white/45">{step === 'phone' ? 'Usa tu teléfono y contraseña.' : step === 'passkey' ? 'Agrega una passkey para acceder más rápido y con seguridad.' : 'Tu actividad y comunidad, en un solo lugar.'}</p></div>
      {step === 'methods' ? <>
        <button type="button" onClick={() => { setError(''); setStep('phone'); }} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-[#202124] transition active:scale-[.99]"><Phone className="h-4 w-4"/>Continuar con teléfono</button>
        <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-white/10"/><span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">o continúa con</span><span className="h-px flex-1 bg-white/10"/></div>
        <div className="grid grid-cols-3 gap-3">
          <button type="button" aria-label="Continuar con Google" onClick={() => { setOauthBusy('google'); continueWithGoogle(); }} className="flex h-12 items-center justify-center rounded-full bg-[#292a2d] text-xl font-extrabold text-white"><span className="bg-gradient-to-r from-blue-500 via-red-500 to-yellow-400 bg-clip-text text-transparent">G</span></button>
          <button type="button" aria-label="Continuar con Facebook" onClick={() => { setOauthBusy('facebook'); continueWithFacebook(); }} className="flex h-12 items-center justify-center rounded-full bg-[#292a2d] text-[#1877f2]"><Facebook className="h-5 w-5 fill-current"/></button>
          <button type="button" aria-label="Iniciar sesión con passkey" disabled={busy || Boolean(oauthBusy)} onClick={() => void signInWithPasskey()} className="flex h-12 items-center justify-center rounded-full bg-[#292a2d] text-white disabled:opacity-45"><Fingerprint className="h-5 w-5"/></button>
        </div>
        {error && <p role="alert" className="mt-4 text-center text-xs text-red-300">{error}</p>}
        <button type="button" onClick={() => { setMode((current) => current === 'login' ? 'signup' : 'login'); setError(''); }} className="mt-4 block w-full text-center text-xs text-white/50">{mode === 'login' ? '¿Nuevo en PuntoNochi? Crear cuenta' : '¿Ya tienes cuenta? Iniciar sesión'}</button>
        <p className="mt-5 text-center text-[10px] leading-relaxed text-white/35">Al continuar, aceptas nuestros términos y la política de privacidad.</p>
      </> : step === 'phone' ? <>
        <button type="button" onClick={() => { setError(''); setStep('methods'); }} className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-white/55"><ArrowLeft className="h-4 w-4"/>Volver</button>
        <div className="mb-4 flex rounded-full bg-[#151618] p-1"><button type="button" onClick={() => { setMode('login'); setError(''); }} aria-pressed={mode === 'login'} className={`flex-1 rounded-full py-2 text-xs font-semibold ${mode === 'login' ? 'bg-[#35363a] text-white' : 'text-white/50'}`}>Iniciar sesión</button><button type="button" onClick={() => { setMode('signup'); setError(''); }} aria-pressed={mode === 'signup'} className={`flex-1 rounded-full py-2 text-xs font-semibold ${mode === 'signup' ? 'bg-[#35363a] text-white' : 'text-white/50'}`}>Crear cuenta</button></div>
        <form onSubmit={submitPhone} className="space-y-3">
          <label className="block text-xs font-semibold text-white/65">Número de teléfono<input required autoComplete="tel" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+52 951 123 4567" className="mt-1.5 h-12 w-full rounded-2xl border border-white/[.08] bg-[#292a2d] px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-blue-400"/></label>
          <label className="block text-xs font-semibold text-white/65">Contraseña<input required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'signup' ? 10 : undefined} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'signup' ? 'Mínimo 10 caracteres' : 'Tu contraseña'} className="mt-1.5 h-12 w-full rounded-2xl border border-white/[.08] bg-[#292a2d] px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-blue-400"/></label>
          {error && <p role="alert" className="text-xs leading-relaxed text-red-300">{error}</p>}
          <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-[#202124] disabled:opacity-55">{busy ? 'Un momento…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}<KeyRound className="h-4 w-4"/></button>
        </form>
      </> : <div className="space-y-3 pb-1"><button type="button" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await registerCurrentPasskey(); finish(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo configurar la passkey.'); } finally { setBusy(false); } }} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-[#202124] disabled:opacity-55"><Fingerprint className="h-5 w-5"/>{busy ? 'Configurando…' : 'Configurar passkey'}</button>{error && <p role="alert" className="text-center text-xs text-red-300">{error}</p>}<button type="button" onClick={finish} className="h-11 w-full rounded-full bg-white/[.08] text-sm font-semibold text-white/80">Ahora no, continuar</button></div>}
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
