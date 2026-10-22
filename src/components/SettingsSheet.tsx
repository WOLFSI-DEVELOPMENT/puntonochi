import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LogOut, Moon, Sun, UserRound, X } from 'lucide-react';
import { getHomeTheme, getNavDesign, setHomeTheme, setNavDesign, type HomeTheme, type NavDesign } from '../profileStorage';
import { getAppLanguage, setAppLanguage, type AppLanguage } from '../i18n';
import { SheetDragHandle, useSheetDrag } from './SheetDragHandle';

type Account = { id: string; name: string; email: string; picture: string | null; phone?: string };

const navOptions: { id: NavDesign; label: string }[] = [
  { id: 'dynamic', label: 'Dinámica' },
  { id: 'simple', label: 'Simple' },
  { id: 'experimental', label: 'Esmerilada' },
];

export function SettingsSheet({ account, onClose, onRequireAuth }: { account: Account | null; onClose: () => void; onRequireAuth: () => void }) {
  const drag = useSheetDrag(onClose);
  const [language, setLanguage] = useState<AppLanguage>(getAppLanguage);
  const [navDesign, setCurrentNavDesign] = useState<NavDesign>(getNavDesign);
  const [homeTheme, setCurrentHomeTheme] = useState<HomeTheme>(getHomeTheme);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onLanguage = (event: Event) => setLanguage((event as CustomEvent<{ language: AppLanguage }>).detail?.language || getAppLanguage());
    const onNav = () => setCurrentNavDesign(getNavDesign());
    const onHomeTheme = (event: Event) => setCurrentHomeTheme((event as CustomEvent<{ theme: HomeTheme }>).detail?.theme || getHomeTheme());
    window.addEventListener('puntonochi-language-changed', onLanguage);
    window.addEventListener('puntonochi-nav-design-updated', onNav);
    window.addEventListener('puntonochi-home-theme-updated', onHomeTheme);
    return () => { window.removeEventListener('puntonochi-language-changed', onLanguage); window.removeEventListener('puntonochi-nav-design-updated', onNav); window.removeEventListener('puntonochi-home-theme-updated', onHomeTheme); };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previous = [root.style.overflow, body.style.overflow];
    root.style.overflow = 'hidden'; body.style.overflow = 'hidden';
    return () => { root.style.overflow = previous[0]; body.style.overflow = previous[1]; };
  }, []);

  const signOut = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/account/logout', { method: 'POST', credentials: 'same-origin' });
      if (!response.ok) throw new Error('No se pudo cerrar sesión. Intenta otra vez.');
      window.dispatchEvent(new Event('account-session-updated'));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cerrar sesión. Intenta otra vez.'); }
    finally { setBusy(false); }
  };

  const setLanguageChoice = (next: AppLanguage) => { setLanguage(next); setAppLanguage(next); };
  const setNavigationChoice = (next: NavDesign) => { setCurrentNavDesign(next); setNavDesign(next); };
  const setHomeThemeChoice = (next: HomeTheme) => { setCurrentHomeTheme(next); setHomeTheme(next); };

  return <>
    <motion.button data-sheet-close aria-label="Cerrar ajustes" onClick={onClose} className="fixed inset-0 z-[129] bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
    <motion.section {...drag} role="dialog" aria-modal="true" aria-label="Ajustes" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 360, mass: .82 }} className="fixed inset-x-0 bottom-0 z-[130] mx-auto flex max-h-[92dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-[30px] bg-[#202124] text-white shadow-2xl">
      <header className="relative shrink-0 px-5 pb-4 pt-1"><SheetDragHandle controls={drag.dragControls}/><p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/40">PUNTONOCHI</p><h2 className="mt-1 text-2xl font-bold">Ajustes</h2><button type="button" onClick={onClose} data-sheet-close aria-label="Cerrar" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/[.08]"><X className="h-5 w-5"/></button></header>
      <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom)+28px)]">
        <section className="flex items-center gap-3 py-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[.08] text-white/60">{account?.picture ? <img src={account.picture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover"/> : <UserRound className="h-6 w-6"/>}</span>
          <div className="min-w-0 flex-1">{account ? <><p className="truncate text-sm font-semibold">{account.name}</p><p className="mt-0.5 truncate text-xs text-white/50">{account.email}</p></> : <><p className="text-sm font-semibold">Sin sesión iniciada</p><button type="button" onClick={onRequireAuth} className="mt-1 text-xs font-semibold text-blue-300">Iniciar sesión</button></>}</div>
          {account && <button type="button" disabled={busy} onClick={() => void signOut()} className="flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-semibold text-white/70 transition-colors hover:bg-white/[.07] disabled:opacity-50"><LogOut className="h-4 w-4"/>{busy ? 'Saliendo…' : 'Cerrar sesión'}</button>}
        </section>
        {error && <p role="alert" className="pt-3 text-xs text-red-300">{error}</p>}
        <section className="py-5"><div className="mb-3"><h3 className="text-sm font-semibold">Idioma</h3><p className="mt-1 text-xs text-white/45">Elige el idioma de la aplicación.</p></div><div className="grid grid-cols-2 rounded-full bg-[#2b2c2f] p-1" role="group" aria-label="Idioma de la aplicación">
          <button type="button" aria-pressed={language === 'es'} onClick={() => setLanguageChoice('es')} className={`h-10 rounded-full text-sm font-semibold transition-colors ${language === 'es' ? 'bg-[#45464a] text-white' : 'text-white/55'}`}><span className="mr-2" aria-hidden="true">🇲🇽</span>Español</button>
          <button type="button" aria-pressed={language === 'en'} onClick={() => setLanguageChoice('en')} className={`h-10 rounded-full text-sm font-semibold transition-colors ${language === 'en' ? 'bg-[#45464a] text-white' : 'text-white/55'}`}><span className="mr-2" aria-hidden="true">🇺🇸</span>English</button>
        </div></section>
        <section className="py-5"><div className="mb-3"><h3 className="text-sm font-semibold">Estilo de navegación</h3><p className="mt-1 text-xs text-white/45">Elige cómo quieres ver la barra inferior.</p></div><div className="grid grid-cols-3 rounded-full bg-[#2b2c2f] p-1" role="group" aria-label="Estilo de navegación">{navOptions.map((option) => <button key={option.id} type="button" aria-pressed={navDesign === option.id} onClick={() => setNavigationChoice(option.id)} className={`h-10 rounded-full px-2 text-xs font-semibold transition-colors ${navDesign === option.id ? 'bg-[#45464a] text-white' : 'text-white/55'}`}>{option.label}</button>)}</div></section>
        <section className="py-5"><div className="mb-3"><h3 className="text-sm font-semibold">Apariencia</h3><p className="mt-1 text-xs text-white/45">El tema claro se aplica a las pantallas compatibles.</p></div><div className="grid grid-cols-2 rounded-full bg-[#2b2c2f] p-1" role="group" aria-label="Apariencia"><button type="button" aria-pressed={homeTheme === 'dark'} onClick={() => setHomeThemeChoice('dark')} className={`flex h-10 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors ${homeTheme === 'dark' ? 'bg-[#45464a] text-white' : 'text-white/55'}`}><Moon className="h-4 w-4"/>Oscuro</button><button type="button" aria-pressed={homeTheme === 'light'} onClick={() => setHomeThemeChoice('light')} className={`flex h-10 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors ${homeTheme === 'light' ? 'bg-[#45464a] text-white' : 'text-white/55'}`}><Sun className="h-4 w-4"/>Claro</button></div></section>
      </div>
    </motion.section>
  </>;
}
