import { useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import CornerKit from '@cornerkit/core';
import { motion, useReducedMotion } from 'motion/react';

type InstagramReel = { id: string; url: string };
type InstagramEmbedWindow = Window & { instgrm?: { Embeds?: { process: () => void } } };
const reels: InstagramReel[] = [
  { id: 'DdAZyNZlKlj', url: 'https://www.instagram.com/ayuntamientodenochistlan/reel/DdAZyNZlKlj/' },
  { id: 'Dd4s-ojCDrY', url: 'https://www.instagram.com/ayuntamientodenochistlan/reel/Dd4s-ojCDrY/' },
];
const cornerKit = new CornerKit();
const videoCardCorners = { radius: 28, smoothing: 1 };

export function HomeVideosSection({ onViewAll }: { onViewAll: () => void }) {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackRef.current?.querySelectorAll<HTMLElement>('[data-home-video-card]').forEach((card) => cornerKit.apply(card, videoCardCorners));
    let active = true;
    const processEmbeds = () => { if (active) (window as InstagramEmbedWindow).instgrm?.Embeds?.process(); };
    const script = document.querySelector<HTMLScriptElement>('script[src="https://www.instagram.com/embed.js"]');
    if ((window as InstagramEmbedWindow).instgrm?.Embeds) processEmbeds();
    else if (script) script.addEventListener('load', processEmbeds, { once: true });
    else {
      const embedScript = document.createElement('script');
      embedScript.src = 'https://www.instagram.com/embed.js';
      embedScript.async = true;
      embedScript.onload = processEmbeds;
      document.body.appendChild(embedScript);
    }
    const processTimer = window.setTimeout(processEmbeds, 300);
    return () => {
      active = false;
      window.clearTimeout(processTimer);
      script?.removeEventListener('load', processEmbeds);
    };
  }, []);

  return <section aria-label="Videos de Nochistlán" className="mb-10">
    <div className="mb-4 flex items-end justify-between gap-3 px-5">
      <div><h2 className="text-2xl font-bold tracking-tight">Videos</h2><p className="mt-0.5 text-[15px] font-medium text-neutral-500">Reels de Nochistlán</p></div>
      <button type="button" onClick={onViewAll} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-neutral-500">Noticias <ChevronRight className="h-4 w-4"/></button>
    </div>
    <div ref={trackRef} className="flex snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-visible px-8 py-5 [perspective:1100px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {reels.map((reel, index) => <motion.div
        key={reel.id}
        data-home-video-card
        initial={reduceMotion ? false : { opacity: 0, y: 14, rotateY: index % 2 ? 4 : -4 }}
        whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
        viewport={{ once: true, amount: .3 }}
        whileHover={reduceMotion ? undefined : { rotateY: index % 2 ? -3 : 3, rotateX: 1, scale: 1.01, z: 6 }}
        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
        style={{ flex: '0 0 min(90vw, 460px)', minWidth: 326, maxWidth: 460, overflow: 'hidden', borderRadius: 28, background: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,.16)', transformStyle: 'preserve-3d' }}
        className="snap-start"
      >
        <blockquote className="instagram-media" data-instgrm-permalink={`${reel.url}?utm_source=ig_embed`} data-instgrm-version="14" style={{ background: '#fff', border: 0, borderRadius: 28, boxShadow: 'none', margin: '0 auto', maxWidth: 460, minWidth: 326, padding: 0, width: '100%' }}>
          <div style={{ padding: 16 }}><a href={reel.url} target="_blank" rel="noopener noreferrer" style={{ color: '#262626', display: 'block', fontFamily: 'Arial,sans-serif', fontSize: 14, lineHeight: '18px', padding: '140px 0', textAlign: 'center', textDecoration: 'none' }}>Reproducir Reel en Instagram</a></div>
        </blockquote>
      </motion.div>)}
    </div>
  </section>;
}
