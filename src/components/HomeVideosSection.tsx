import { useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import CornerKit from '@cornerkit/core';
import { motion, useReducedMotion } from 'motion/react';

const videoUrl = 'https://res.cloudinary.com/dwthgcx5j/video/upload/v1790871656/Expo_Eventos_2026_qekh1y.mp4';
const cornerKit = new CornerKit();
const videoCardCorners = { radius: 28, smoothing: 1 };

export function HomeVideosSection({ onViewAll }: { onViewAll: () => void }) {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackRef.current?.querySelectorAll<HTMLElement>('[data-home-video-card]').forEach((card) => cornerKit.apply(card, videoCardCorners));
  }, []);

  return <section aria-label="Videos de Nochistlán" className="mb-10">
    <div className="mb-4 flex items-end justify-between gap-3 px-5">
      <div><h2 className="text-2xl font-bold tracking-tight">Videos</h2><p className="mt-0.5 text-[15px] font-medium text-neutral-500">Reels de Nochistlán</p></div>
      <button type="button" onClick={onViewAll} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-neutral-500">Noticias <ChevronRight className="h-4 w-4"/></button>
    </div>
    <div ref={trackRef} className="flex snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-visible px-8 py-5 [perspective:1100px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <motion.div
        key="expo-eventos-2026"
        data-home-video-card
        initial={reduceMotion ? false : { opacity: 0, y: 14, rotateY: -4 }}
        whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
        viewport={{ once: true, amount: .3 }}
        whileHover={reduceMotion ? undefined : { rotateY: 3, rotateX: 1, scale: 1.01, z: 6 }}
        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
        style={{ flex: '0 0 min(86vw, 430px)', minWidth: 300, maxWidth: 430, overflow: 'hidden', background: '#111', boxShadow: '0 8px 24px rgba(0,0,0,.16)', transformStyle: 'preserve-3d' }}
        className="snap-start"
      >
        <video src={videoUrl} controls playsInline preload="metadata" aria-label="Expo Eventos 2026" className="block aspect-video w-full object-cover" />
      </motion.div>
    </div>
  </section>;
}
