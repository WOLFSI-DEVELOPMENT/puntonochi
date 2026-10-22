import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Clock3, MapPin, Search, SlidersHorizontal, Star, Store, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { Place } from '../types';
import { categories as directoryCategories } from '../data';
import { VerifiedBusinessName } from './VerifiedBusinessName';
import { isInstalledMobilePwa } from '../pwaDisplay';

const PAGE_SIZE = 24;
const WEEKDAY_KEYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function normalize(value: string) {
  return value.toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isPlaceOpenNow(place: Place, now: number) {
  if (!place.weeklyHours) return place.isOpen;

  const formatter = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(now)).map(({ type, value }) => [type, value]));
  const weekday = normalize(parts.weekday || '');
  const dayIndex = WEEKDAY_KEYS.findIndex((day) => normalize(day) === weekday);
  const minuteOfDay = Number(parts.hour) * 60 + Number(parts.minute);
  const scheduleFor = (index: number) => {
    const key = WEEKDAY_KEYS[(index + WEEKDAY_KEYS.length) % WEEKDAY_KEYS.length];
    return Object.entries(place.weeklyHours || {}).find(([day]) => normalize(day) === key)?.[1];
  };
  const isWithin = (interval: { open: string; close: string }, minute: number) => {
    const [openHour, openMinute] = interval.open.split(':').map(Number);
    const [closeHour, closeMinute] = interval.close.split(':').map(Number);
    const opensAt = openHour * 60 + openMinute;
    const closesAt = closeHour * 60 + closeMinute;
    return closesAt > opensAt ? minute >= opensAt && minute < closesAt : minute >= opensAt || minute < closesAt;
  };

  const today = scheduleFor(dayIndex);
  if (today && !today.closed && today.intervals.some((interval) => isWithin(interval, minuteOfDay))) return true;

  // Include overnight hours that began on the previous local day.
  const previous = scheduleFor(dayIndex - 1);
  return Boolean(previous && !previous.closed && previous.intervals.some((interval) => {
    const [openHour, openMinute] = interval.open.split(':').map(Number);
    const [closeHour, closeMinute] = interval.close.split(':').map(Number);
    return closeHour * 60 + closeMinute <= openHour * 60 + openMinute && minuteOfDay < closeHour * 60 + closeMinute;
  }));
}

function BusinessTile({ place, onSelect }: { place: Place; onSelect: () => void }) {
  const imageCandidates = [...(place.images || []), ...(place.communityPosts || []).map((post) => post.imageUrl), place.logo]
    .filter((image): image is string => Boolean(image?.trim()))
    .filter((image, index, all) => all.indexOf(image) === index);
  const [imageIndex, setImageIndex] = useState(0);
  useEffect(() => setImageIndex(0), [place.id]);
  const image = imageCandidates[imageIndex];
  const reduceMotion = useReducedMotion();
  return <motion.button
    type="button"
    onClick={onSelect}
    aria-label={`Ver ${place.name}, ${place.category}`}
    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
    whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.08 }}
    transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
    style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 240px' }}
    data-explore-card
    className="group relative block w-full touch-pan-y overflow-hidden rounded-[15px] bg-[#202124] p-[5px] text-left shadow-[0_3px_12px_rgba(0,0,0,.18)] outline-none ring-1 ring-white/[.06] transition-transform duration-150 active:scale-[.99] focus-visible:ring-2 focus-visible:ring-blue-300 [corner-shape:squircle]"
  >
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[10px] bg-[#292a2d]">
      {image
        ? <img src={image} alt="" loading="lazy" decoding="async" fetchPriority="low" onError={() => setImageIndex((index) => index + 1)} className="h-full w-full object-cover transition-transform duration-300 ease-out [@media(hover:hover)]:group-hover:scale-[1.03]" />
        : <div className="flex h-full items-center justify-center bg-[radial-gradient(ellipse_at_25%_20%,rgba(96,165,250,.24),transparent_48%),linear-gradient(145deg,#30333a,#191a1d)]"><Store aria-hidden="true" className="h-9 w-9 text-white/30"/></div>}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      <span className="absolute left-2.5 top-2.5 max-w-[calc(100%-20px)] truncate rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[9px] font-semibold text-white/90">{place.category || 'Negocio local'}</span>
      <span className="absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white/85" aria-hidden="true"><ArrowUpRight className="h-3.5 w-3.5"/></span>
    </div>
    <span data-explore-card-content className="mt-[5px] block rounded-[16px] bg-[#292a2d] px-2.5 pb-2 pt-2">
      <span className="line-clamp-2 text-[11px] font-bold leading-4 text-white"><VerifiedBusinessName name={place.name}/></span>
      <span className="mt-1 flex min-w-0 items-center gap-1 text-[9px] text-white/55"><MapPin aria-hidden="true" className="h-3 w-3 shrink-0"/><span className="truncate">{place.location || 'Nochistlán'}</span></span>
      <span className="mt-1 flex items-center gap-1 text-[9px] text-white/65"><Star aria-hidden="true" className="h-3 w-3 fill-amber-300 text-amber-300"/>{place.rating ? place.rating.toFixed(1) : 'Nuevo'}<span className="text-white/35">·</span><span className={place.isOpen ? 'text-emerald-300/85' : 'text-white/45'}>{place.isOpen ? 'Abierto' : 'Ver horario'}</span></span>
    </span>
  </motion.button>;
}

export function BusinessExplorePage({ places, directoryVersion, onSelectBusiness, onOpenSearch }: {
  places: Place[];
  directoryVersion: number;
  onSelectBusiness: (place: Place) => void;
  onOpenSearch: (query?: string) => void;
}) {
  const [installedMobilePwa] = useState(isInstalledMobilePwa);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = normalize(deferredQuery.trim());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const availableCategories = useMemo(() => {
    const usedCategories = new Set(places.map((place) => normalize(place.category || '')).filter(Boolean));
    return directoryCategories.filter((item) => usedCategories.has(normalize(item.name))).map((item) => item.name);
  }, [places, directoryVersion]);
  const filteredPlaces = useMemo(() => places.filter((place) => {
    if (category && normalize(place.category || '') !== normalize(category)) return false;
    if (openNowOnly && !isPlaceOpenNow(place, now)) return false;
    if (!normalizedQuery) return true;
    const searchable = normalize([place.name, place.category, place.subtitle, place.location, place.address, ...(place.goodToKnow || [])].filter(Boolean).join(' '));
    return normalizedQuery.split(/\s+/).every((term) => searchable.includes(term));
  }), [places, directoryVersion, category, normalizedQuery, openNowOnly, now]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [normalizedQuery, category, openNowOnly, directoryVersion]);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= filteredPlaces.length || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredPlaces.length));
    }, { rootMargin: '700px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredPlaces.length, visibleCount]);

  const shownPlaces = filteredPlaces.slice(0, visibleCount);
  return <main
    data-explore-page
    style={installedMobilePwa ? { paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 24px) + 12px)' } : undefined}
    className="min-h-dvh touch-pan-y bg-[#111214] px-3 pb-[calc(104px+env(safe-area-inset-bottom,0px))] pt-3 text-white sm:px-5 lg:min-h-[calc(100dvh-64px)] lg:pt-6"
  >
    <div className="sticky top-2 z-30 mx-auto mb-5 max-w-5xl" style={installedMobilePwa ? { top: 'calc(max(env(safe-area-inset-top, 0px), 24px) + 12px)' } : undefined}>
      <label className="flex h-[50px] items-center gap-3 rounded-full border-0 bg-white/[.08] px-4 text-white/70 shadow-none outline-none ring-0 backdrop-blur-xl focus-within:bg-white/[.12]">
        <Search aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-white/65"/>
        <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onOpenSearch(query.trim()); }} placeholder="Busca negocios, lugares o servicios" aria-label="Buscar negocios y lugares" className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/40" />
        {query && <button type="button" aria-label="Borrar búsqueda" onClick={() => setQuery('')} className="flex h-7 w-7 items-center justify-center rounded-full text-white/55 hover:bg-white/[.08]"><X className="h-4 w-4"/></button>}
      </label>
    </div>

    <section className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-end justify-between gap-3 px-1">
        <div><h1 className="text-[23px] font-bold tracking-[-.045em] sm:text-[27px]">Explora negocios</h1></div>
        <span className="mb-1 flex shrink-0 items-center gap-1.5 text-[10px] font-medium text-white/40"><SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5"/>{filteredPlaces.length} lugares</span>
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button type="button" onClick={() => setOpenNowOnly((value) => !value)} aria-pressed={openNowOnly} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[10px] font-semibold transition-[color,background-color,transform] duration-150 active:scale-95 ${openNowOnly ? 'bg-emerald-300 text-[#10251a]' : 'bg-white/[.07] text-white/70 hover:bg-white/[.12]'}`}>
          <Clock3 aria-hidden="true" className="h-3.5 w-3.5"/>Abierto ahora
        </button>
      </div>

      {availableCategories.length > 0 && <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button type="button" onClick={() => setCategory('')} aria-pressed={!category} className={`shrink-0 rounded-full px-3.5 py-2 text-[10px] font-semibold transition-[color,background-color,transform] duration-150 active:scale-95 ${!category ? 'bg-white text-[#17181a]' : 'bg-white/[.07] text-white/70 hover:bg-white/[.12]'}`}>Todo</button>
        {availableCategories.map((item) => <button key={item} type="button" onClick={() => setCategory((current) => current === item ? '' : item)} aria-pressed={category === item} className={`max-w-[160px] shrink-0 truncate rounded-full px-3.5 py-2 text-[10px] font-semibold transition-[color,background-color,transform] duration-150 active:scale-95 ${category === item ? 'bg-white text-[#17181a]' : 'bg-white/[.07] text-white/70 hover:bg-white/[.12]'}`}>{item}</button>)}
      </div>}

      {shownPlaces.length > 0 ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shownPlaces.map((place) => <BusinessTile key={place.id} place={place} onSelect={() => onSelectBusiness(place)} />)}
      </div> : places.length === 0 ? <div role="status" className="grid min-h-[35vh] place-items-center rounded-[24px] bg-white/[.04] text-center text-sm text-white/50">Cargando negocios…</div> : <div className="grid min-h-[35vh] place-items-center rounded-[24px] bg-white/[.04] px-5 text-center"><div><Search aria-hidden="true" className="mx-auto h-7 w-7 text-white/30"/><p className="mt-3 text-sm font-semibold text-white/75">No encontramos resultados</p><p className="mt-1 text-xs text-white/40">Prueba con otra búsqueda o categoría.</p></div></div>}
      <div ref={sentinelRef} className="h-4" aria-hidden="true" />
      {shownPlaces.length > 0 && shownPlaces.length < filteredPlaces.length && <p className="py-3 text-center text-[10px] text-white/35">Desliza para descubrir más negocios</p>}
    </section>
  </main>;
}
