import { BookOpen, ChevronRight } from 'lucide-react';
import { articleCatalog } from '../data/articles-index';
import { ArticleCover } from './ArticleCover';

function articleAccent(index: number) {
  const hue = (index * 47 + 208) % 360;
  return `radial-gradient(ellipse at 84% 12%, hsla(${hue}, 75%, 55%, .5), transparent 48%), linear-gradient(145deg, hsl(${hue}, 16%, 17%), #17181b 78%)`;
}

export function HomeArticlesSection({ onViewAll, onOpenArticle }: { onViewAll: () => void; onOpenArticle: (slug: string) => void }) {
  return <section className="mb-10" aria-label="Artículos de Nochistlán">
    <div className="mb-4 flex items-end justify-between gap-3 px-5"><div><h2 className="text-2xl font-bold tracking-tight">Artículos de Nochistlán</h2><p className="mt-0.5 text-[15px] font-medium text-neutral-500">Historias, cultura y lugares para descubrir</p></div><button type="button" onClick={onViewAll} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-neutral-500">Ver todos <ChevronRight className="h-4 w-4"/></button></div>
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {articleCatalog.slice(0, 12).map((article, index) => <button type="button" key={article.slug} onClick={() => onOpenArticle(article.slug)} style={{ backgroundImage: articleAccent(index) }} className="group relative h-[210px] w-[270px] shrink-0 snap-start overflow-hidden rounded-[30px] p-5 text-left text-white [corner-shape:squircle]">
        <ArticleCover id={article.id} sizes="270px" className="absolute inset-0 h-full w-full object-cover opacity-65 transition-transform duration-500 group-hover:scale-105"/>
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/15"/>
        <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/[.08] text-white/80"><BookOpen className="h-5 w-5"/></span>
        <span className="absolute bottom-5 left-5 right-5"><span className="text-[10px] font-bold uppercase tracking-[.16em] text-white/55">{article.category}</span><span className="mt-2 block line-clamp-2 text-lg font-bold leading-snug">{article.title}</span><span className="mt-2 block line-clamp-2 text-xs leading-relaxed text-white/65">{article.summary}</span></span>
      </button>)}
    </div>
  </section>;
}
