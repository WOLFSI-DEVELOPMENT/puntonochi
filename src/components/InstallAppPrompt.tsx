import { useEffect, useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
type Platform = 'ios' | 'android' | 'desktop';
const SHOWN_KEY = 'puntonochi-install-prompt-shown-v1';

function getPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export function InstallAppPrompt({ enabled }: { enabled: boolean }) {
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [visible, setVisible] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => closePrompt();
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    try {
      if (localStorage.getItem(SHOWN_KEY) || window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone) return;
      setPlatform(getPlatform());
      const timer = window.setTimeout(() => {
        setVisible(true);
        localStorage.setItem(SHOWN_KEY, 'true');
      }, 2600);
      return () => window.clearTimeout(timer);
    } catch { return; }
  }, [enabled]);

  const closePrompt = () => setVisible(false);
  const install = async () => {
    if (!installEvent) return closePrompt();
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    closePrompt();
  };

  if (!visible) return null;
  const isIOS = platform === 'ios';
  const title = isIOS ? 'Instala PuntoNochi en tu iPhone' : platform === 'android' ? 'Instala PuntoNochi en tu Android' : 'Instala PuntoNochi en tu dispositivo';

  return <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-3 sm:items-center" role="presentation" onClick={closePrompt}>
    <section role="dialog" aria-modal="true" aria-labelledby="install-prompt-title" className="w-full max-w-md rounded-[28px] bg-[#292a2d] p-5 text-white shadow-2xl sm:p-6" onClick={(event) => event.stopPropagation()}>
      <div className="mb-4 flex items-start justify-between"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#202124]"><Smartphone className="h-6 w-6" /></span><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">PuntoNochi · App</p><h2 id="install-prompt-title" className="mt-1 text-lg font-bold">{title}</h2></div></div><button type="button" onClick={closePrompt} aria-label="Cerrar" className="rounded-full bg-white/[0.08] p-2 text-white/70"><X className="h-5 w-5" /></button></div>
      <p className="text-sm leading-relaxed text-white/65">Agrégala a tu pantalla de inicio para abrirla rápido y usarla como una app.</p>
      {isIOS ? <div className="mt-4 space-y-3 rounded-2xl bg-white/[0.05] p-4 text-sm"><p className="flex gap-3"><Share className="mt-0.5 h-4 w-4 shrink-0 text-white" /><span>En Safari, toca <strong className="text-white">Compartir</strong> en la barra inferior.</span></p><p className="pl-7 text-white/65">Desliza las opciones y elige <strong className="text-white">Agregar a pantalla de inicio</strong>; luego toca Agregar.</p></div> : <div className="mt-4 space-y-3 rounded-2xl bg-white/[0.05] p-4 text-sm"><p className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-[#202124]">1</span><span>Abre el menú del navegador <strong className="text-white">⋮</strong> (Android) o busca el icono de instalar en la barra de dirección (computadora).</span></p><p className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-[#202124]">2</span><span>Toca <strong className="text-white">Instalar aplicación</strong> o <strong className="text-white">Agregar a pantalla de inicio</strong>.</span></p></div>}
      {installEvent && <button type="button" onClick={install} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-bold text-black"><Download className="h-4 w-4" />Instalar aplicación</button>}
      <button type="button" onClick={closePrompt} className="mt-3 w-full rounded-full bg-white/[0.08] py-3 text-sm font-semibold text-white/75">Ahora no</button>
    </section>
  </div>;
}
