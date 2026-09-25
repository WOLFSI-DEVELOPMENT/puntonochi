import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, MapPin, Plus, Star } from 'lucide-react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import CornerKit, { type SquircleConfig } from '@cornerkit/core';
import { mockPlaces } from '../data';
import type { Place } from '../types';
import { getBookmarkedPlaceIds, setBookmarkedPlaceIds } from '../profileStorage';
import { CreatePostFlow } from './CreatePostFlow';
import { BusinessPromotionSheet } from './BusinessPromotionSheet';
import { ProfileSheet } from './ProfileSheet';
import { AnimatePresence } from 'motion/react';

const cornerKit = new CornerKit();
const feedCorners: SquircleConfig = { radius: 28, smoothing: 1 };
const adClient = 'ca-pub-7029279570287128';
const overviewStorageKey = (placeId: string) => `puntonochi-ai-overview-v2:${placeId}`;

function OverviewIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-blue-300" fill="currentColor">
    <path d="m14.878 1.282l.348 1.071a2.205 2.205 0 0 0 1.399 1.397l1.071.348l.021.006a.423.423 0 0 1 0 .798l-1.071.348a2.208 2.208 0 0 0-1.399 1.397l-.348 1.07a.423.423 0 0 1-.798 0l-.349-1.07a2.23 2.23 0 0 0-.532-.867a2.224 2.224 0 0 0-.866-.536l-1.071-.348a.423.423 0 0 1 0-.798l1.071-.348a2.208 2.208 0 0 0 1.377-1.397l.348-1.07a.423.423 0 0 1 .799 0Zm4.905 7.931l-.766-.248a1.577 1.577 0 0 1-.998-.999l-.25-.764a.302.302 0 0 0-.57 0l-.248.764a1.576 1.576 0 0 1-.984.999l-.765.248a.303.303 0 0 0 0 .57l.765.249a1.578 1.578 0 0 1 1 1.002l.248.764a.302.302 0 0 0 .57 0l.249-.764a1.576 1.576 0 0 1 .999-.999l.765-.248a.303.303 0 0 0 0-.57l-.015-.004ZM17 12.901a1.453 1.453 0 0 0 1 .02v.579a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 2 13.5v-7A2.5 2.5 0 0 1 4.5 4h5.588a1.419 1.419 0 0 0-.088.496c0 .176.031.346.09.504H4.5A1.5 1.5 0 0 0 3 6.5v7A1.5 1.5 0 0 0 4.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-.6ZM5 7.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5ZM5 10a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 5 10Zm.5 2a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5Z" />
  </svg>;
}

function AIOverview({ place }: { place: Place }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [overview, setOverview] = useState(() => {
    try { return localStorage.getItem(overviewStorageKey(place.id)) || ''; } catch { return ''; }
  });
  const [state, setState] = useState<'idle' | 'loading' | 'error'>(overview ? 'idle' : 'loading');

  useEffect(() => {
    if (overview) return;
    const host = hostRef.current;
    if (!host) return;
    let active = true;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      setState('loading');
      fetch(`/api/places/${encodeURIComponent(place.id)}/overview`)
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || 'No se pudo generar el resumen.');
          if (typeof data.overview !== 'string' || !data.overview.trim()) throw new Error('Resumen no disponible.');
          return data.overview.trim();
        })
        .then((text) => {
          if (!active) return;
          setOverview(text);
          setState('idle');
          try { localStorage.setItem(overviewStorageKey(place.id), text); } catch { /* Cache is optional. */ }
        })
        .catch(() => { if (active) setState('error'); });
    }, { rootMargin: '140px 0px', threshold: 0.05 });
    observer.observe(host);
    return () => { active = false; observer.disconnect(); };
  }, [overview, place.id]);

  return <div ref={hostRef} className="mt-3 w-full" aria-live="polite">
    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white/75"><OverviewIcon/>Resumen con IA</div>
    {overview ? <p className="text-[13px] leading-relaxed text-white/75">{overview}</p> : state === 'error' ? <p className="text-xs leading-relaxed text-white/50">Resumen temporalmente no disponible.</p> : <div className="space-y-2 py-0.5" role="status" aria-label="Generando resumen"><div className="h-3 w-[92%] animate-pulse rounded-full bg-white/10"/><div className="h-3 w-[68%] animate-pulse rounded-full bg-white/[0.07]"/></div>}
  </div>;
}

function ExplorePlaceCard({ place, index, saved, onOpen, onToggleBookmark, reduceMotion }: {
  place: Place;
  index: number;
  saved: boolean;
  onOpen: (place: Place) => void;
  onToggleBookmark: (place: Place) => void;
  reduceMotion: boolean | null;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: cardRef, offset: ['start end', 'end start'] });
  const imageY = useTransform(scrollYProgress, [0, 1], [8, -8]);
  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.07, 1.12, 1.07]);
  const image = place.images[0];

  return <motion.article ref={cardRef} data-explore-squircle className="snap-start [scroll-snap-stop:always] relative isolate aspect-[9/16] w-full overflow-hidden rounded-[28px] bg-[#1a1b1e] shadow-xl shadow-black/25" initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.985 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: 0.08 }} transition={{ type: 'spring', damping: 27, stiffness: 165, mass: 0.85 }}>
    <img src={image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-55 blur-3xl" />
    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.03)_0%,rgba(10,11,13,0.16)_44%,rgba(17,18,20,0.76)_100%)]" />
    <button type="button" onClick={() => onOpen(place)} aria-label={`Abrir ${place.name}`} className="absolute inset-0 z-[1] cursor-pointer" />
    <div className="absolute inset-x-0 top-0 z-[2] p-2.5">
      <div data-explore-squircle className="relative aspect-video overflow-hidden rounded-[24px] bg-black/30 shadow-lg shadow-black/20">
        <motion.img src={image} alt={`${place.name} en Nochistlán`} loading={index < 2 ? 'eager' : 'lazy'} style={{ y: reduceMotion ? 0 : imageY, scale: reduceMotion ? 1.07 : imageScale }} className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/[0.06]" />
      </div>
    </div>
    <button type="button" onClick={() => onToggleBookmark(place)} aria-pressed={saved} aria-label={saved ? `Quitar ${place.name} de guardados` : `Guardar ${place.name}`} className={`absolute right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full shadow-lg backdrop-blur-md transition-transform active:scale-90 ${saved ? 'bg-blue-500 text-white' : 'bg-black/45 text-white'}`}><Bookmark className={`h-5 w-5 ${saved ? 'fill-current' : ''}`}/></button>
    <button type="button" onClick={() => onOpen(place)} className="absolute inset-x-0 bottom-0 z-[2] flex h-[68%] flex-col items-start justify-start p-5 pt-7 text-left">
      <span className="mb-3 rounded-full bg-black/30 px-3 py-1.5 text-[11px] font-semibold text-white/80 backdrop-blur-md">{place.category}</span>
      <h2 className="line-clamp-2 text-[26px] font-bold leading-tight tracking-tight drop-shadow-sm">{place.name}</h2>
      <p className="mt-2 flex items-center gap-1.5 text-sm text-white/65"><MapPin className="h-4 w-4 shrink-0"/><span className="line-clamp-1">{place.address || place.location}</span></p>
      <div className="mt-4 flex w-full items-center justify-between border-t border-white/15 pt-3 text-xs text-white/60"><span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-amber-300 text-amber-300"/>{place.rating.toFixed(1)} <span className="text-white/40">({place.reviewCount})</span></span><span>{place.isOpen ? 'Abierto ahora' : 'Consulta horario'}</span></div>
      <AIOverview place={place}/>
    </button>
  </motion.article>;
}

function FeedAd() {
  useEffect(() => {
    const ad = document.querySelector<HTMLModElement>('[data-explore-feed-ad]');
    if (!ad || ad.dataset.initialized) return;
    ad.dataset.initialized = 'true';
    try {
      const adsWindow = window as Window & { adsbygoogle?: unknown[] };
      adsWindow.adsbygoogle = adsWindow.adsbygoogle || [];
      adsWindow.adsbygoogle.push({});
    } catch (error) {
      console.error('AdSense feed unit could not be initialized.', error);
    }
  }, []);
  return <div className="my-2 w-full" aria-label="Publicidad"><ins data-explore-feed-ad className="adsbygoogle block w-full" style={{ display: 'block' }} data-ad-format="fluid" data-ad-layout-key="-6t+ed+2i-1n-4w" data-ad-client={adClient} data-ad-slot="7895105729" /></div>;
}

export function DiscoverPage({ onSelectBusiness }: { onSelectBusiness: (place: Place) => void }) {
  const [showPromotion, setShowPromotion] = useState(false);
  const [showCreateFlow, setShowCreateFlow] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [feedVersion, setFeedVersion] = useState(0);
  const [bookmarkIds, setBookmarkIds] = useState<string[]>(getBookmarkedPlaceIds);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const refreshFeed = (event?: Event) => {
      const detail = (event as CustomEvent<{ placeId?: string; imageUrl?: string }> | undefined)?.detail;
      if (detail?.placeId && detail.imageUrl) {
        const place = mockPlaces.find((candidate) => candidate.id === detail.placeId);
        if (place && !place.images.includes(detail.imageUrl)) place.images = [...place.images, detail.imageUrl];
      }
      setFeedVersion((version) => version + 1);
    };
    const refreshBookmarks = () => setBookmarkIds(getBookmarkedPlaceIds());
    window.addEventListener('community-post-published', refreshFeed);
    window.addEventListener('business-directory-updated', refreshFeed);
    window.addEventListener('puntonochi-bookmarks-updated', refreshBookmarks);
    window.addEventListener('storage', refreshBookmarks);
    return () => {
      window.removeEventListener('community-post-published', refreshFeed);
      window.removeEventListener('business-directory-updated', refreshFeed);
      window.removeEventListener('puntonochi-bookmarks-updated', refreshBookmarks);
      window.removeEventListener('storage', refreshBookmarks);
    };
  }, []);

  const places = useMemo(() => mockPlaces.filter((place) => place.images?.[0]), [feedVersion]);

  useEffect(() => {
    cornerKit.applyAll('[data-explore-squircle]', feedCorners);
  }, [places, bookmarkIds]);

  const toggleBookmark = (place: Place) => {
    const next = bookmarkIds.includes(place.id) ? bookmarkIds.filter((id) => id !== place.id) : [...bookmarkIds, place.id];
    setBookmarkIds(next);
    setBookmarkedPlaceIds(next);
  };

  const openPromotion = () => setShowPromotion(true);

  return <motion.main style={{ height: 'calc(100dvh - env(safe-area-inset-top, 0px))', scrollPaddingTop: 72 }} className="snap-y snap-mandatory overflow-y-auto overscroll-y-contain bg-[#111111] px-4 pb-36 pt-3 text-white">
    <header className="sticky top-0 z-30 isolate -mx-4 mb-4 flex items-center justify-between gap-3 px-4 py-3">
      <div aria-hidden="true" className="pointer-events-none absolute -left-8 -right-8 -top-10 z-0 h-[172px]" style={{ background: 'linear-gradient(to bottom, rgba(17,17,17,0.08) 0%, rgba(17,17,17,0.42) 36%, rgba(17,17,17,0.62) 58%, rgba(17,17,17,0.28) 82%, transparent 100%)', filter: 'blur(24px)' }} />
      <div className="relative z-10"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">PuntoNochi</p><h1 className="text-xl font-bold">Explorar</h1></div>
      <div className="relative z-10 ml-auto flex items-center gap-2">
        <button type="button" onClick={() => setShowProfile(true)} className="flex h-10 items-center gap-2 rounded-full bg-[#292a2d] px-4 text-sm font-semibold text-white"><Bookmark className="h-4 w-4"/><span>Perfil</span></button>
        <button type="button" onClick={() => setShowCreateFlow(true)} aria-label="Crear publicación" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition-transform active:scale-95"><Plus className="h-5 w-5" strokeWidth={2.5}/></button>
      </div>
    </header>

    <div className="mx-auto flex max-w-[460px] flex-col gap-2 [scroll-behavior:smooth]">
      {places.map((place, index) => {
        const saved = bookmarkIds.includes(place.id);
        return <Fragment key={`${place.id}-${feedVersion}`}>
          <ExplorePlaceCard place={place} index={index} saved={saved} onOpen={onSelectBusiness} onToggleBookmark={toggleBookmark} reduceMotion={reduceMotion}/>
          {(index + 1) % 7 === 0 && <div className="mt-4"><button type="button" onClick={openPromotion} data-explore-squircle className="w-full rounded-[24px] bg-[#202124] p-4 text-left"><p className="text-sm font-bold">¿Tienes un negocio?</p><p className="mt-1 text-xs text-white/50">Promociónalo en PuntoNochi</p><span className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold text-black">Promocionar</span></button><FeedAd/></div>}
        </Fragment>;
      })}
      {!places.length && <div className="aspect-[9/16] animate-pulse rounded-[28px] bg-[#202124]" aria-label="Cargando lugares" role="status"/>}
    </div>

    <AnimatePresence>{showPromotion && <BusinessPromotionSheet onClose={() => setShowPromotion(false)} />}</AnimatePresence>
    <AnimatePresence>{showCreateFlow && <CreatePostFlow onClose={() => setShowCreateFlow(false)} />}</AnimatePresence>
    <AnimatePresence>{showProfile && <ProfileSheet onClose={() => setShowProfile(false)} onSelectBusiness={onSelectBusiness} />}</AnimatePresence>
  </motion.main>;
}
