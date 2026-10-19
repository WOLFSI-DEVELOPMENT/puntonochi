import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Bookmark, BookOpen, MousePointerClick, X } from 'lucide-react';
import { mockPlaces } from '../data';
import type { Place } from '../types';
import { getBookmarkedPlaceIds, setBookmarkedPlaceIds } from '../profileStorage';
import { getBookmarkedArticleSlugs, setBookmarkedArticleSlugs } from '../profileStorage';
import { articleCatalog } from '../data/articles-index';
import { ArticleCover } from './ArticleCover';
import { SheetDragHandle, useSheetDrag } from './SheetDragHandle';

export function BookmarksSheet({ onClose, onSelectBusiness, onOpenArticle }: { onClose: () => void; onSelectBusiness: (place: Place) => void; onOpenArticle: (slug: string) => void }) {
  const drag = useSheetDrag(onClose);
  const [ids, setIds] = useState(getBookmarkedPlaceIds);
  const [articleSlugs, setArticleSlugs] = useState(getBookmarkedArticleSlugs);
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const refresh = () => setIds(getBookmarkedPlaceIds());
    const refreshArticles = () => setArticleSlugs(getBookmarkedArticleSlugs());
    window.addEventListener('puntonochi-bookmarks-updated', refresh);
    window.addEventListener('puntonochi-article-bookmarks-updated', refreshArticles);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('puntonochi-bookmarks-updated', refresh); window.removeEventListener('puntonochi-article-bookmarks-updated', refreshArticles); window.removeEventListener('storage', refresh); };
  }, []);
  useEffect(() => {
    let active = true;
    fetch('/api/activity/clicks', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : {})
      .then((data: Record<string, number>) => { if (active && data && typeof data === 'object') setClickCounts(data); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  const places = ids.map((id) => mockPlaces.find((place) => place.id === id)).filter((place): place is Place => Boolean(place));
  const articles = articleSlugs.map((slug) => articleCatalog.find((article) => article.slug === slug)).filter((article): article is (typeof articleCatalog)[number] => Boolean(article));
  const remove = (place: Place) => { const next = ids.filter((id) => id !== place.id); setIds(next); setBookmarkedPlaceIds(next); };
  const removeArticle = (slug: string) => { const next = articleSlugs.filter((item) => item !== slug); setArticleSlugs(next); setBookmarkedArticleSlugs(next); };

  return <>
    <motion.button data-sheet-close aria-label="Cerrar guardados" onClick={onClose} className="fixed inset-0 z-[129] bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}/>
    <motion.section {...drag} role="dialog" aria-modal="true" aria-label="Guardados" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 360, mass: .82 }} className="fixed inset-x-0 bottom-0 z-[130] mx-auto flex max-h-[86dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-[30px] bg-black text-white shadow-2xl">
      <header className="relative shrink-0 border-b border-white/[.08] px-5 pb-4 pt-1"><SheetDragHandle controls={drag.dragControls}/><p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/40">TU ESPACIO</p><h2 className="mt-1 text-2xl font-bold">Guardados</h2><button type="button" onClick={onClose} data-sheet-close aria-label="Cerrar" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/[.08]"><X className="h-5 w-5"/></button></header>
      <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+24px)] sm:px-5">{places.length || articles.length ? <div className="space-y-5">
        {articles.length > 0 && <section><h3 className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[.15em] text-white/40">Artículos</h3><div className="grid grid-cols-2 gap-2.5 sm:gap-3">{articles.map((article) => <article key={article.slug} className="overflow-hidden rounded-[20px] bg-[#151516] sm:rounded-[24px]"><button type="button" onClick={() => { onOpenArticle(article.slug); onClose(); }} aria-label={`Abrir ${article.title}`} className="relative block aspect-[1.13] w-full overflow-hidden bg-[#202022] text-left"><ArticleCover id={article.id} className="h-full w-full object-cover"/><span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent"/><span className="absolute inset-x-3 bottom-3 line-clamp-2 text-[13px] font-bold leading-snug sm:text-sm">{article.title}</span><span className="absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur"><BookOpen aria-hidden="true" className="h-3.5 w-3.5"/></span></button><button type="button" onClick={() => removeArticle(article.slug)} aria-label={`Quitar ${article.title} de guardados`} className="w-full px-3 py-2 text-left text-[11px] font-semibold text-white/45 transition-colors hover:text-white/80">Quitar de guardados</button></article>)}</div></section>}
        {places.length > 0 && <section><h3 className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[.15em] text-white/40">Negocios</h3><div className="grid grid-cols-2 gap-2.5 sm:gap-3">{places.map((place) => <article key={place.id} className="overflow-hidden rounded-[20px] bg-[#151516] sm:rounded-[24px]"><button type="button" onClick={() => { onSelectBusiness(place); onClose(); }} aria-label={`Abrir ${place.name}`} className="relative block aspect-[1.13] w-full overflow-hidden bg-[#202022] text-left">{place.images?.[0] ? <img src={place.images[0]} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover"/> : <span className="flex h-full w-full items-center justify-center text-3xl text-white/20">🏷️</span>}<span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/20 to-transparent"/><span className="absolute inset-x-3 bottom-3 line-clamp-2 text-[13px] font-bold leading-snug sm:text-sm">{place.name}</span><span className="absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur"><Bookmark aria-hidden="true" className="h-3.5 w-3.5 fill-current"/></span><span className="absolute bottom-[52px] left-2.5 flex h-6 items-center gap-1 rounded-full bg-black/65 px-2 text-[10px] font-semibold text-white/90 backdrop-blur-sm"><MousePointerClick aria-hidden="true" className="h-3 w-3"/>{Number(clickCounts[place.id] || 0).toLocaleString()}</span></button><button type="button" onClick={() => remove(place)} aria-label={`Quitar ${place.name} de guardados`} className="w-full px-3 py-2 text-left text-[11px] font-semibold text-white/45 transition-colors hover:text-white/80">Quitar de guardados</button></article>)}</div></section>}
      </div> : <div className="flex flex-col items-center py-14 text-center"><Bookmark className="h-7 w-7 text-white/35"/><p className="mt-4 text-sm font-semibold">Aún no hay elementos guardados</p><p className="mt-1 max-w-xs text-xs leading-relaxed text-white/45">Guarda negocios o artículos para encontrarlos aquí después.</p></div>}</div>
    </motion.section>
  </>;
}
