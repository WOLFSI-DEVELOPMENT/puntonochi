import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, Bookmark, Clock3 } from 'lucide-react';
import CornerKit from '@cornerkit/core';
import { articleCatalog } from '../data/articles-index';
import { getBookmarkedArticleSlugs, setBookmarkedArticleSlugs } from '../profileStorage';
import { ArticleCover } from './ArticleCover';

const tourismCorners = new CornerKit();

export function TourismArticleCarousel({ onBack, onOpenArticle, initialArticleSlug }: { onBack: () => void; onOpenArticle: (slug: string, origin: DOMRect) => void; initialArticleSlug?: string | null }) {
  const reduceMotion = useReducedMotion();
  const [bookmarks, setBookmarks] = useState(getBookmarkedArticleSlugs);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, articleCatalog.findIndex((article) => article.slug === initialArticleSlug)));
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const refresh = () => setBookmarks(getBookmarkedArticleSlugs());
    window.addEventListener('puntonochi-article-bookmarks-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('puntonochi-article-bookmarks-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => tourismCorners.applyAll('[data-tourism-article-card]', { radius: 34, smoothing: 1 }), 40);
    return () => window.clearTimeout(timer);
  }, [activeIndex]);

  const toggleBookmark = (slug: string) => {
    const next = bookmarks.includes(slug) ? bookmarks.filter((item) => item !== slug) : [...bookmarks, slug];
    setBookmarks(next);
    setBookmarkedArticleSlugs(next);
  };

  const showArticle = (nextIndex: number, nextDirection: number) => {
    if (articleCatalog.length < 1) return;
    setDirection(nextDirection);
    setActiveIndex((nextIndex + articleCatalog.length) % articleCatalog.length);
  };
  const activeArticle = articleCatalog[activeIndex];
  const previousArticle = articleCatalog[(activeIndex - 1 + articleCatalog.length) % articleCatalog.length];
  const topBackArticle = articleCatalog[(activeIndex - 2 + articleCatalog.length) % articleCatalog.length];
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { y: number }; velocity: { y: number } }) => {
    const movement = info.offset.y;
    const velocity = info.velocity.y;
    if (movement < -32 || velocity < -260) showArticle(activeIndex + 1, 1);
    else if (movement > 32 || velocity > 260) showArticle(activeIndex - 1, -1);
  };

  return <motion.section data-tourism-discovery aria-label="Descubre Nochistlán" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .24 }} className="relative isolate h-dvh min-h-[520px] w-full overflow-hidden bg-[#070809] text-white">
    <div aria-hidden="true" className="tourism-discovery-background absolute inset-0">
      <img src="https://res.cloudinary.com/dwthgcx5j/image/upload/v1792360806/Golden_Hour_Colonial_Plaza_aqcowh.png" alt="" className="h-full w-full object-cover"/>
      <div data-tourism-discovery-overlay className="absolute inset-0 bg-black/55"/>
    </div>
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-[max(16px,env(safe-area-inset-top))]">
      <button data-tourism-back type="button" onClick={onBack} aria-label="Volver a Turismo" className="pointer-events-auto flex h-11 items-center gap-2 rounded-full bg-black/55 px-4 text-sm font-semibold text-white backdrop-blur-xl transition-colors hover:bg-black/70"><ArrowLeft className="h-4 w-4"/>Turismo</button>
      <span data-tourism-label className="rounded-full bg-black/45 px-3 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-white/65 backdrop-blur-xl">Nochistlán · Guías</span>
    </header>
    <div className="absolute inset-x-0 top-1/2 z-10 mx-auto h-[min(500px,calc(100dvh-210px))] w-full max-w-[380px] -translate-y-1/2 px-5">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 z-0 flex justify-center overflow-visible">
        <div data-tourism-article-card className="relative -translate-y-7 h-[min(330px,66%)] w-[min(54vw,214px)] overflow-hidden rounded-[32px] bg-[#111214] opacity-25 [corner-shape:squircle]">
          <ArticleCover id={topBackArticle.id} sizes="214px" className="h-full w-full object-cover opacity-60"/><span className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/75"/>
        </div>
      </div>
      <div aria-hidden="true" className="absolute inset-x-5 top-0 flex h-full items-start justify-center overflow-hidden">
        <div data-tourism-article-card className="relative mt-0 h-[min(360px,72%)] w-[min(62vw,246px)] overflow-hidden rounded-[34px] bg-[#111214] [corner-shape:squircle]">
          <ArticleCover id={previousArticle.id} sizes="246px" className="h-full w-full object-cover opacity-85"/><span className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/65"/><span className="absolute inset-x-4 top-3 line-clamp-1 text-xs font-bold text-white/90">{previousArticle.title}</span>
        </div>
      </div>
      <AnimatePresence custom={direction} mode="sync" initial={false}>
        <motion.div key={activeArticle.slug} data-tourism-article-card data-tourism-active-card drag="y" dragDirectionLock dragConstraints={{ top: 0, bottom: 0 }} dragElastic={.22} dragMomentum={false} onDragEnd={handleDragEnd} initial={{ opacity: 0, y: direction > 0 ? 42 : -42, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: direction > 0 ? -34 : 34, scale: .97 }} transition={reduceMotion ? { duration: .01 } : { type: 'spring', stiffness: 420, damping: 32, mass: .55 }} className="absolute inset-x-5 top-1/2 mx-auto h-[min(390px,78%)] w-[min(68vw,270px)] -translate-y-1/2 cursor-grab overflow-hidden rounded-[34px] bg-[#111214]/95 shadow-[0_24px_70px_rgba(0,0,0,.48)] active:cursor-grabbing [corner-shape:squircle]">
          <button type="button" onClick={(event) => onOpenArticle(activeArticle.slug, event.currentTarget.getBoundingClientRect())} aria-label={`Leer ${activeArticle.title}`} className="absolute inset-0 z-0 w-full text-left">
            <motion.div layoutId={`article-image-${activeArticle.slug}`} className="absolute inset-0"><ArticleCover id={activeArticle.id} sizes="270px" className="h-full w-full object-cover opacity-80"/></motion.div>
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/5 to-black/85"/>
            <span aria-hidden="true" className="tourism-card-progressive-blur absolute inset-x-0 bottom-0 h-[72%]"/>
            <span data-tourism-card-title className="absolute inset-x-4 top-4 pr-12 text-[clamp(21px,6vw,27px)] font-extrabold leading-[1.04] tracking-[-.04em] drop-shadow-[0_2px_18px_rgba(0,0,0,.5)]">{activeArticle.title}</span>
            <span data-tourism-card-footer className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#101113] via-[#101113]/95 to-transparent px-4 pb-4 pt-20">
              <span className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.16em] text-white/55"><span>{activeArticle.category}</span><span aria-hidden="true" className="h-1 w-1 rounded-full bg-white/35"/><Clock3 className="h-3 w-3"/>{activeArticle.readMinutes} min</span>
              <span className="mt-2 block line-clamp-3 text-xs leading-relaxed text-white/75">{activeArticle.summary}</span>
              <span className="mt-3 inline-flex rounded-full bg-white/[.12] px-3.5 py-1.5 text-[11px] font-semibold text-white/90 backdrop-blur-md">Leer artículo</span>
            </span>
          </button>
          <button data-tourism-card-bookmark type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => toggleBookmark(activeArticle.slug)} aria-label={bookmarks.includes(activeArticle.slug) ? 'Quitar de guardados' : 'Guardar artículo'} aria-pressed={bookmarks.includes(activeArticle.slug)} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xl transition-transform active:scale-90">
            <Bookmark className={`h-4 w-4 ${bookmarks.includes(activeArticle.slug) ? 'fill-current' : ''}`}/>
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
    <p data-tourism-hint aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-[calc(112px+env(safe-area-inset-bottom))] z-20 text-center text-[10px] font-semibold uppercase tracking-[.16em] text-white/55">Desliza hacia arriba para descubrir</p>
    <div data-tourism-pagination className="absolute inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 flex items-center justify-center gap-1.5" aria-label={`Artículo ${activeIndex + 1} de ${articleCatalog.length}`}>
      {articleCatalog.slice(Math.max(0, activeIndex - 3), Math.min(articleCatalog.length, activeIndex + 4)).map((article) => <button key={article.slug} type="button" onClick={() => showArticle(articleCatalog.indexOf(article), articleCatalog.indexOf(article) > activeIndex ? 1 : -1)} aria-label={`Mostrar ${article.title}`} aria-current={articleCatalog.indexOf(article) === activeIndex ? 'step' : undefined} className={`h-1.5 rounded-full transition-all ${articleCatalog.indexOf(article) === activeIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/35'}`}/>)}
    </div>
    <div data-tourism-discovery-footer aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-10 bg-gradient-to-t from-black/55 to-transparent"/>
  </motion.section>;
}
