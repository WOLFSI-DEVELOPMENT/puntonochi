import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Bookmark, ChevronLeft, MousePointerClick } from 'lucide-react';
import type { Category, Place } from '../types';
import { mockPlaces } from '../data';
import { getBookmarkedPlaceIds, setBookmarkedPlaceIds } from '../profileStorage';

type ClickCounts = Record<string, number>;

export function CategoryPage({ category, onClose, onSelectBusiness }: { category: Category; onClose: () => void; onSelectBusiness: (place: Place) => void }) {
  const places = mockPlaces.filter((place) => place.category === category.name);
  const [clickCounts, setClickCounts] = useState<ClickCounts>({});
  const [bookmarks, setBookmarks] = useState(getBookmarkedPlaceIds);

  useEffect(() => {
    let active = true;
    fetch('/api/activity/clicks', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : {})
      .then((data: ClickCounts) => { if (active && data && typeof data === 'object') setClickCounts(data); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const refresh = () => setBookmarks(getBookmarkedPlaceIds());
    window.addEventListener('puntonochi-bookmarks-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('puntonochi-bookmarks-updated', refresh); window.removeEventListener('storage', refresh); };
  }, []);

  const toggleBookmark = (place: Place) => {
    const next = bookmarks.includes(place.id) ? bookmarks.filter((id) => id !== place.id) : [...bookmarks, place.id];
    setBookmarks(next);
    setBookmarkedPlaceIds(next);
  };

  return <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .2 }} className="fixed inset-0 z-[45] overflow-y-auto bg-black text-white">
    <header className="sticky top-0 z-10 isolate flex items-center gap-3 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
      <div aria-hidden="true" className="pointer-events-none absolute -inset-x-2 -top-3 z-0 h-[128px] bg-gradient-to-b from-black/85 via-black/50 to-transparent backdrop-blur-[12px] [mask-image:linear-gradient(to_bottom,black_0%,black_46%,transparent_100%)]"/>
      <button type="button" onClick={onClose} aria-label="Volver a categorías" className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1b1b1d] text-white transition-colors hover:bg-[#29292c] active:scale-95"><ChevronLeft className="h-6 w-6"/></button>
      <div className="relative z-10 min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[.17em] text-white/40">CATEGORÍA</p><h1 className="truncate text-xl font-bold tracking-tight">{category.name}</h1></div>
      <span className="relative z-10 shrink-0 text-xs text-white/45">{places.length} {places.length === 1 ? 'negocio' : 'negocios'}</span>
    </header>
    <section className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-2.5 px-3 pb-[calc(env(safe-area-inset-bottom)+110px)] pt-2 sm:gap-3 sm:px-5">
      {places.map((place, index) => <motion.article key={place.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .012, .18), duration: .2 }} className="group relative min-w-0 overflow-hidden rounded-[20px] bg-[#151516] sm:rounded-[24px]">
        <button type="button" onClick={() => onSelectBusiness(place)} aria-label={`Abrir ${place.name}`} className="relative block aspect-[1.13] w-full overflow-hidden bg-[#202022] text-left">
          {place.images?.[0] ? <img src={place.images[0]} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"/> : <span aria-hidden="true" className="flex h-full w-full items-center justify-center text-3xl text-white/20">{category.emoji || '🏷️'}</span>}
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/25 to-transparent"/>
          <span className="absolute inset-x-3 bottom-3 line-clamp-2 text-[13px] font-bold leading-snug text-white sm:text-sm">{place.name}</span>
        </button>
        <span aria-label={`${Number(clickCounts[place.id] || 0)} clics totales`} title="Clics totales" className="absolute bottom-[52px] left-2.5 flex h-6 items-center gap-1 rounded-full bg-black/65 px-2 text-[10px] font-semibold text-white/90 backdrop-blur-sm sm:bottom-[56px]"><MousePointerClick aria-hidden="true" className="h-3 w-3"/>{Number(clickCounts[place.id] || 0).toLocaleString()}</span>
        <button type="button" onClick={() => toggleBookmark(place)} aria-pressed={bookmarks.includes(place.id)} aria-label={bookmarks.includes(place.id) ? `Quitar ${place.name} de guardados` : `Guardar ${place.name}`} title={bookmarks.includes(place.id) ? 'Quitar de guardados' : 'Guardar'} className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white opacity-100 backdrop-blur-md transition duration-150 hover:scale-105 hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100"><Bookmark aria-hidden="true" className={`h-4 w-4 ${bookmarks.includes(place.id) ? 'fill-current' : ''}`}/></button>
      </motion.article>)}
      {places.length === 0 && <div className="col-span-2 py-16 text-center"><p className="text-sm font-semibold text-white/75">Aún no hay negocios en esta categoría</p><p className="mt-1 text-xs text-white/40">Vuelve pronto para ver nuevos lugares.</p></div>}
    </section>
  </motion.main>;
}
