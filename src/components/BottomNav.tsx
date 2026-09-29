import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search } from 'lucide-react';
import { cn } from '../utils';
import { getNavDesign, type NavDesign } from '../profileStorage';

// Fill Icons (Apple style)

export function BottomNav({ activeTab, onChangeTab, onOpenSearch }: { activeTab: string, onChangeTab: (tab: string) => void, onOpenSearch: () => void }) {
  const [isSearching, setIsSearching] = useState(false);
  const [design, setDesign] = useState<NavDesign>(getNavDesign);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearching && inputRef.current) {
      inputRef.current.focus();
    }
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
    if (id === 'buscar') {
      setIsSearching(true);
      onOpenSearch();
      return;
    }
    setIsSearching(false);
    onChangeTab(id);
  };

  return (
    <div style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }} className="fixed left-0 right-0 w-full flex justify-center z-50 pointer-events-none px-4">
      <motion.div 
        layout
        className={cn(
          'pointer-events-auto relative flex items-center px-0 w-[min(100%,340px)]',
          design === 'dynamic'
            ? 'liquid-glass h-[60px] rounded-[30px] shadow-2xl shadow-black/40'
            : 'h-[52px] rounded-[30px] bg-white/[0.08] shadow-[0_8px_28px_rgba(0,0,0,0.2)] backdrop-blur-[36px] backdrop-saturate-150'
        )}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
        <div className="relative z-10 flex items-center w-full h-full">
          <AnimatePresence mode="popLayout" initial={false}>
            {!isSearching ? (
              <motion.div 
                key="nav"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="flex items-center h-full gap-0.5 w-full"
              >
                <NavTab id="inicio" icon={<span className={`material-symbols-rounded ${design === 'simple' ? 'text-[21px]' : 'text-[26px]'}`}>home</span>} label="Inicio" active={activeTab === 'inicio'} onClick={() => handleTabClick('inicio')} simple={design === 'simple'} />
                <NavTab id="explorar" icon={<span className={`material-symbols-rounded ${design === 'simple' ? 'text-[21px]' : 'text-[26px]'}`}>explore</span>} label="Explorar" active={activeTab === 'explorar'} onClick={() => handleTabClick('explorar')} simple={design === 'simple'} />
                <NavTab id="videos" icon={<span className={`material-symbols-rounded ${design === 'simple' ? 'text-[21px]' : 'text-[26px]'}`}>storefront</span>} label="Mercado" active={activeTab === 'videos'} onClick={() => handleTabClick('videos')} simple={design === 'simple'} />
                <NavTab id="noticias" icon={<span className={`material-symbols-rounded ${design === 'simple' ? 'text-[21px]' : 'text-[26px]'}`}>newspaper</span>} label="Noticias" active={activeTab === 'noticias'} onClick={() => handleTabClick('noticias')} simple={design === 'simple'} />
                <NavTab id="crear" icon={<Plus className={design === 'simple' ? 'h-[21px] w-[21px]' : 'h-[25px] w-[25px]'}/>} label="Crear" active={activeTab === 'crear'} onClick={() => handleTabClick('crear')} simple={design === 'simple'} />
                <NavTab id="buscar" icon={<span className={`material-symbols-rounded ${design === 'simple' ? 'text-[21px]' : 'text-[26px]'}`}>search</span>} label="Buscar" active={activeTab === 'buscar'} onClick={() => handleTabClick('buscar')} simple={design === 'simple'} />
              </motion.div>
            ) : (
              <motion.div 
                key="search"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="flex items-center h-full px-2 w-full"
              >
                <span className="material-symbols-rounded text-white/50 shrink-0 ml-2 mr-3 text-[22px]">search</span>
                <input 
                  ref={inputRef}
                  type="text" 
                  placeholder="Buscar lugares..." 
                  style={{ backgroundColor: 'transparent', background: 'transparent' }}
                  className="search-input-fix bg-transparent outline-none w-full text-white placeholder:text-white/40 text-[16px] font-medium"
                  onChange={(event) => window.dispatchEvent(new CustomEvent('appSearchQuery', { detail: event.target.value }))}
                  onKeyDown={(event) => { if (event.key === 'Escape') { setIsSearching(false); onChangeTab('inicio'); } }}
                />
                <button 
                  onClick={() => setIsSearching(false)}
                  className="w-10 h-10 flex items-center justify-center shrink-0 ml-1 rounded-full hover:bg-[#ffffff]/10 transition-colors"
                >
                  <span className="material-symbols-rounded text-white/70 text-[20px]">close</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function NavTab({ id, icon, label, active, onClick, simple }: { id: string, icon: any, label: string, active: boolean, onClick: () => void; simple: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        `relative flex-1 flex flex-col items-center justify-center ${simple ? 'gap-0 h-[48px] rounded-full' : 'gap-0.5 h-[54px] rounded-full'} transition-colors z-10 text-white/60 min-w-0`,
        active ? "text-white" : "hover:text-white hover:bg-[#ffffff]/5"
      )}
    >
      {active && (
        <motion.div 
          layoutId="activeTabIndicator"
          className={cn('absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-8px)] -z-10 rounded-full', simple ? 'h-[40px] max-w-[62px] bg-white/[0.14] backdrop-blur-[24px] backdrop-saturate-150 shadow-none' : 'h-[50px] max-w-[62px] bg-[#ffffff]/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]')}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <div className="flex items-center justify-center">
        {icon}
      </div>
      <span className={cn('font-semibold tracking-wide leading-none', simple ? 'text-[9px]' : 'text-[10px]')}>{label}</span>
    </button>
  );
}
