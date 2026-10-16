import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, MapPin, Search, SlidersHorizontal, Star, Store, X } from 'lucide-react';
import type { Place } from '../types';
import { VerifiedBusinessName } from './VerifiedBusinessName';
import { isInstalledMobilePwa } from '../pwaDisplay';

const PAGE_SIZE = 18;

function normalize(value: string) {
  return value.toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function BusinessTile({ place, onSelect }: { place: Place; onSelect: () => void }) {
  const image = place.images?.find(Boolean) || place.logo;
  return <button
    type="button"
    onClick={onSelect}
    aria-label={`Ver ${place.name}, ${place.category}`}
    style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 320px' }}
    className="group relative block w-full overflow-hidden rounded-[24px] bg-[#202124] p-[5px] text-left shadow-[0_3px_12px_rgba(0,0,0,.18)] outline-none ring-1 ring-white/[.06] focus-visible:ring-2 focus-visible:ring-blue-300 [corner-shape:squircle]"
  >
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[19px] bg-[#292a2d]">
      {image
        ? <img src={image} alt="" loading="lazy" decoding="async" fetchPriority="low" className="h-full w-full object-cover transition-transform duration-300 ease-out [@media(hover:hover)]:group-hover:scale-[1.03]" />
        : <div className="flex h-full items-center justify-center bg-[radial-gradient(ellipse_at_25%_20%,rgba(96,165,250,.24),transparent_48%),linear-gradient(145deg,#30333a,#191a1d)]"><Store aria-hidden="true" className="h-9 w-9 text-white/30"/></div>}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      <span className="absolute left-2.5 top-2.5 max-w-[calc(100%-20px)] truncate rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[9px] font-semibold text-white/90">{place.category || 'Negocio local'}</span>
      <span className="absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white/85" aria-hidden="true"><ArrowUpRight className="h-3.5 w-3.5"/></span>
    </div>
    <span className="mt-[5px] block rounded-[16px] bg-[#292a2d] px-2.5 pb-2 pt-2">
      <span className="line-clamp-2 min-h-[2rem] text-[11px] font-bold leading-4 text-white"><VerifiedBusinessName name={place.name}/></span>
      <span className="mt-1 flex min-w-0 items-center gap-1 text-[9px] text-white/55"><MapPin aria-hidden="true" className="h-3 w-3 shrink-0"/><span className="truncate">{place.location || 'Nochistlán'}</span></span>
      <span className="mt-1 flex items-center gap-1 text-[9px] text-white/65"><Star aria-hidden="true" className="h-3 w-3 fill-amber-300 text-amber-300"/>{place.rating ? place.rating.toFixed(1) : 'Nuevo'}<span className="text-white/35">·</span><span className={place.isOpen ? 'text-emerald-300/85' : 'text-white/45'}>{place.isOpen ? 'Abierto' : 'Ver horario'}</span></span>
    </span>
  </button>;
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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = normalize(deferredQuery.trim());

  const categories = useMemo(() => [...new Set(places.map((place) => place.category?.trim()).filter((value): value is string => Boolean(value)))].slice(0, 12), [places, directoryVersion]);
  const filteredPlaces = useMemo(() => places.filter((place) => {
    if (category && place.category !== category) return false;
    if (!normalizedQuery) return true;
    const searchable = normalize([place.name, place.category, place.subtitle, place.location, place.address, ...(place.goodToKnow || [])].filter(Boolean).join(' '));
    return normalizedQuery.split(/\s+/).every((term) => searchable.includes(term));
  }), [places, directoryVersion, category, normalizedQuery]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [normalizedQuery, category, directoryVersion]);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= filteredPlaces.length || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredPlaces.length));
    }, { rootMargin: '420px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredPlaces.length, visibleCount]);

  const shownPlaces = filteredPlaces.slice(0, visibleCount);
  return <main
    style={installedMobilePwa ? { paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 24px) + 12px)' } : undefined}
    className="min-h-dvh bg-[#111214] px-3 pb-[calc(104px+env(safe-area-inset-bottom,0px))] pt-3 text-white sm:px-5 lg:min-h-[calc(100dvh-64px)] lg:pt-6"
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
        <div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-white/40">PuntoNochi · Nochistlán</p><h1 className="mt-1 text-[23px] font-bold tracking-[-.045em] sm:text-[27px]">Explora negocios</h1></div>
        <span className="mb-1 flex shrink-0 items-center gap-1.5 text-[10px] font-medium text-white/40"><SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5"/>{filteredPlaces.length} lugares</span>
      </div>

      {categories.length > 0 && <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button type="button" onClick={() => setCategory('')} aria-pressed={!category} className={`shrink-0 rounded-full px-3.5 py-2 text-[10px] font-semibold transition-colors ${!category ? 'bg-white text-[#17181a]' : 'bg-white/[.07] text-white/70 hover:bg-white/[.12]'}`}>Todo</button>
        {categories.slice(0, 7).map((item) => <button key={item} type="button" onClick={() => setCategory((current) => current === item ? '' : item)} aria-pressed={category === item} className={`max-w-[160px] shrink-0 truncate rounded-full px-3.5 py-2 text-[10px] font-semibold transition-colors ${category === item ? 'bg-white text-[#17181a]' : 'bg-white/[.07] text-white/70 hover:bg-white/[.12]'}`}>{item}</button>)}
      </div>}

      {shownPlaces.length > 0 ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shownPlaces.map((place) => <BusinessTile key={place.id} place={place} onSelect={() => onSelectBusiness(place)} />)}
      </div> : places.length === 0 ? <div role="status" className="grid min-h-[35vh] place-items-center rounded-[24px] bg-white/[.04] text-center text-sm text-white/50">Cargando negocios…</div> : <div className="grid min-h-[35vh] place-items-center rounded-[24px] bg-white/[.04] px-5 text-center"><div><Search aria-hidden="true" className="mx-auto h-7 w-7 text-white/30"/><p className="mt-3 text-sm font-semibold text-white/75">No encontramos resultados</p><p className="mt-1 text-xs text-white/40">Prueba con otra búsqueda o categoría.</p></div></div>}
      <div ref={sentinelRef} className="h-4" aria-hidden="true" />
      {shownPlaces.length > 0 && shownPlaces.length < filteredPlaces.length && <p className="py-3 text-center text-[10px] text-white/35">Desliza para descubrir más negocios</p>}
    </section>
  </main>;
}
