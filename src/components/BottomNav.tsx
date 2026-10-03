import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../utils';
import { getNavDesign, type NavDesign } from '../profileStorage';

type Tab = { id: string; label: string; icon: string };
const extraTabs: Tab[] = [
  { id: 'videos', label: 'Mercado', icon: 'storefront' },
  { id: 'noticias', label: 'Noticias', icon: 'newspaper' },
  { id: 'guias', label: 'Guías locales', icon: 'menu_book' },
  { id: 'crear', label: 'Crear', icon: 'add' },
];
const askTab: Tab = { id: 'ask-nochi', label: 'Pregúntale a Nochi', icon: 'sparkle_filled' };
const askNochiIconUrl = 'https://images.icon-icons.com/3250/PNG/512/sparkle_filled_icon_201872.png';

export function BottomNav({ activeTab, onChangeTab, onOpenSearch, onCloseSearch, onOpenProfile, profilePicture, profileName }: { activeTab: string; onChangeTab: (tab: string) => void; onOpenSearch: () => void; onCloseSearch: () => void; onOpenProfile: () => void; profilePicture?: string | null; profileName?: string }) {
  const [isSearching, setIsSearching] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [design, setDesign] = useState<NavDesign>(getNavDesign);
  const inputRef = useRef<HTMLInputElement>(null);

  const closeSearch = () => {
    setIsSearching(false);
    window.dispatchEvent(new CustomEvent('appSearchQuery', { detail: '' }));
    onCloseSearch();
  };

  useEffect(() => {
    if (isSearching) inputRef.current?.focus();
  }, [isSearching]);

  useEffect(() => {
    const update = () => setDesign(getNavDesign());
    window.addEventListener('puntonochi-nav-design-updated', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('puntonochi-nav-design-updated', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  const handleTabClick = (id: string) => {
    setMenuOpen(false);
    setIsSearching(false);
    onChangeTab(id);
  };

  const buttonClass = cn(
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
    design === 'dynamic'
      ? 'liquid-glass shadow-lg shadow-black/25'
      : 'bg-white/[0.10] shadow-[0_8px_28px_rgba(0,0,0,0.24)] backdrop-blur-[36px] backdrop-saturate-150',
  );

  return (
    <div style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }} className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-3 sm:px-4">
      <div className="pointer-events-auto relative flex h-[60px] w-full max-w-[420px] items-center gap-2 rounded-full">
        <AnimatePresence>
          {menuOpen && <>
            <motion.button aria-label="Cerrar menú" className="fixed inset-0 z-0 pointer-events-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} />
            <motion.div initial={{ opacity: 0, y: 10, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .96 }} className="absolute bottom-[68px] right-0 z-20 w-52 overflow-hidden rounded-[24px] bg-[#202124]/90 p-2 text-white shadow-2xl backdrop-blur-2xl">
              {[...extraTabs, askTab].map(({ id, label, icon }) => <button key={id} type="button" onClick={() => handleTabClick(id)} className={cn('flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition-colors', activeTab === id ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10')}>{id === 'ask-nochi' ? <img src={askNochiIconUrl} alt="" aria-hidden="true" className="h-7 w-7 shrink-0 object-contain brightness-0 invert" /> : <span className="material-symbols-rounded text-[21px] font-bold">{icon}</span>}<span>{label}</span></button>)}
            </motion.div>
          </>}
        </AnimatePresence>

        {!isSearching ? <>
          <button type="button" aria-label="Inicio" aria-pressed={activeTab === 'inicio'} title="Inicio" onClick={() => handleTabClick('inicio')} className={cn(buttonClass, 'text-white/20')}><span className={cn('material-symbols-rounded text-[23px] font-bold', activeTab === 'inicio' ? 'text-white' : 'text-white/35')}>home</span></button>
          <button type="button" aria-label="Explorar" aria-pressed={activeTab === 'explorar'} title="Explorar" onClick={() => handleTabClick('explorar')} className={cn(buttonClass, 'text-white/20')}><span className={cn('material-symbols-rounded text-[23px] font-bold', activeTab === 'explorar' ? 'text-white' : 'text-white/35')}>explore</span></button>

          <button type="button" aria-label="Buscar" onClick={() => { setMenuOpen(false); setIsSearching(true); onOpenSearch(); }} className={cn('flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full px-4 text-left text-white/65 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70', design === 'dynamic' ? 'liquid-glass' : 'bg-white/[0.10] shadow-[0_8px_28px_rgba(0,0,0,0.24)] backdrop-blur-[36px] backdrop-saturate-150')}><span className="material-symbols-rounded shrink-0 text-[20px] font-bold">search</span><span className="truncate text-xs font-medium">Buscar</span></button>

          <button type="button" aria-label="Más secciones" aria-expanded={menuOpen} title="Más secciones" onClick={() => setMenuOpen((open) => !open)} className={cn(buttonClass, 'text-white/20')}><span className={cn('material-symbols-rounded text-[23px] font-bold', menuOpen || ['videos', 'noticias', 'crear', 'guias'].includes(activeTab) ? 'text-white' : 'text-white/35')}>grid_view</span></button>
          <button type="button" aria-label="Perfil" title="Perfil" onClick={() => { setMenuOpen(false); onOpenProfile(); }} className={cn(buttonClass, 'overflow-hidden p-0')}>
            {profilePicture ? <img src={profilePicture} alt="" referrerPolicy="no-referrer" className="h-full w-full rounded-full object-cover"/> : profileName ? <span className="flex h-full w-full items-center justify-center rounded-full bg-blue-500 text-sm font-bold">{profileName.slice(0, 1).toUpperCase()}</span> : <span className="material-symbols-rounded text-[23px] font-bold text-white/35">person</span>}
          </button>
        </> : <motion.div key="search" initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} className={cn('flex h-[52px] w-full items-center rounded-full px-4 text-white', design === 'dynamic' ? 'liquid-glass' : 'bg-[#202124]/90 shadow-2xl backdrop-blur-2xl')}>
          <span className="material-symbols-rounded mr-3 shrink-0 text-[21px] font-bold text-white/50">search</span>
          <input ref={inputRef} type="text" aria-label="Buscar en México" placeholder={activeTab === 'inicio' || activeTab === 'explorar' ? 'Buscar en México…' : 'Buscar en esta sección…'} className="search-input-fix w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/40" onChange={(event) => window.dispatchEvent(new CustomEvent('appSearchQuery', { detail: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Escape') closeSearch(); }} />
          <button type="button" aria-label="Cancelar búsqueda" onClick={closeSearch} className="ml-2 shrink-0 rounded-full px-2 py-2 text-xs font-semibold text-white/75 hover:bg-white/10">Cancelar</button>
        </motion.div>}
      </div>
    </div>
  );
}
