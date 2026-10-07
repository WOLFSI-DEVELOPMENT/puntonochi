import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import CornerKit from '@cornerkit/core';
import articleSource from '../data/100_articulos_nochistlan_de_mejia.md?raw';
import { articleCatalog } from '../data/articles-index';
import { articleImages } from '../data/article-images';
import { ArticleCover } from './ArticleCover';

export type LocalArticle = {
  id: number;
  slug: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  readMinutes: number;
};

const articleBodies = new Map(Array.from(articleSource.matchAll(/^# Artículo (\d+):[^\r\n]*\r?\n([\s\S]*?)(?=^# Artículo \d+:|(?![\s\S]))/gm), (match) => {
  const id = Number(match[1]);
  const source = match[2].replace(/\r/g, '').replace(/cite:[^]+/g, '').trim();
  return [id, source.replace(/^\*\*Categoría:\*\*\s*.+\n*/m, '').trim()] as const;
}));

export const localArticles: LocalArticle[] = articleCatalog.map((article) => ({ ...article, content: articleBodies.get(article.id) || '' }));

const articlesBySlug = new Map(localArticles.map((article) => [article.slug, article]));
const corners = new CornerKit();
const cardVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 44, scale: 0.985 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -32, scale: 0.99 }),
};

function accentFor(index: number) {
  const hue = (index * 47 + 208) % 360;
  return `radial-gradient(ellipse at 84% 12%, hsla(${hue}, 75%, 55%, .5), transparent 48%), linear-gradient(145deg, hsl(${hue}, 16%, 17%), #17181b 78%)`;
}

function getArticleFromPath() {
  const match = window.location.pathname.match(/^\/articulos\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function InlineMarkdown({ text }: { text: string }) {
  const tokenPattern = /(\[[^\]]+\]\([^)]+\)|!\[[^\]]*\]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|`[^`]+`|(?<!\*)\*[^*]+\*(?!\*))/g;
  return <>{text.split(tokenPattern).filter(Boolean).map((part, index) => {
    const link = part.match(/^(!?)\[([^\]]*)\]\(([^)]+)\)$/);
    if (link) {
      const [, image, label, rawUrl] = link;
      let url = '';
      try { const parsed = new URL(rawUrl, window.location.origin); if (['https:', 'http:'].includes(parsed.protocol)) url = parsed.href; } catch { /* Ignore malformed markdown URLs. */ }
      if (image) return url ? <img key={index} src={url} alt={label} loading="lazy" className="my-5 max-h-[440px] w-full rounded-2xl object-contain"/> : null;
      return url ? <a key={index} href={url} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2">{label}</a> : label;
    }
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) return <strong key={index} className="font-bold text-neutral-900">{part.slice(2, -2)}</strong>;
    if (part.startsWith('~~') && part.endsWith('~~')) return <del key={index}>{part.slice(2, -2)}</del>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index} className="rounded bg-neutral-200 px-1.5 py-0.5 font-mono text-[.9em]">{part.slice(1, -1)}</code>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  })}</>;
}

export function ArticleMarkdown({ content }: { content: string }) {
  const blocks = content.replace(/cite:[^]+/g, '').trim().split(/\n\s*\n/).filter(Boolean);
  return <div className="space-y-5 text-[15px] leading-8 text-neutral-700">{blocks.map((block, index) => {
    const lines = block.trim().split('\n');
    const heading = block.trim().match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const className = level <= 2 ? 'pt-3 text-2xl font-extrabold leading-tight tracking-tight text-neutral-900' : 'pt-2 text-lg font-bold leading-snug text-neutral-900';
      return <h2 key={index} className={className}><InlineMarkdown text={heading[2]}/></h2>;
    }
    if (/^(?:---+|\*\*\*+|___+)$/.test(block.trim())) return <hr key={index} className="border-neutral-200"/>;
    if (lines.every((line) => /^\s*>/.test(line))) return <blockquote key={index} className="border-l-4 border-blue-300 pl-4 text-neutral-600"><InlineMarkdown text={lines.map((line) => line.replace(/^\s*>\s?/, '')).join(' ')}/></blockquote>;
    if (lines.every((line) => /^\s*[-*+]\s+/.test(line))) return <ul key={index} className="space-y-2 pl-5">{lines.map((line, itemIndex) => <li key={itemIndex} className="list-disc marker:text-blue-500"><InlineMarkdown text={line.replace(/^\s*[-*+]\s+/, '')}/></li>)}</ul>;
    if (lines.every((line) => /^\s*\d+\.\s+/.test(line))) return <ol key={index} className="space-y-2 pl-5">{lines.map((line, itemIndex) => <li key={itemIndex} className="list-decimal marker:font-semibold marker:text-blue-600"><InlineMarkdown text={line.replace(/^\s*\d+\.\s+/, '')}/></li>)}</ol>;
    if (lines.length > 1 && lines[0].includes('|') && /^\s*\|?\s*:?-{3,}/.test(lines[1])) {
      const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
      const headings = cells(lines[0]);
      return <div key={index} className="overflow-x-auto rounded-2xl border border-neutral-200"><table className="w-full border-collapse text-left text-sm"><thead className="bg-neutral-100 text-neutral-900"><tr>{headings.map((cell, cellIndex) => <th key={cellIndex} className="px-3 py-2 font-bold"><InlineMarkdown text={cell}/></th>)}</tr></thead><tbody>{lines.slice(2).map((line, rowIndex) => <tr key={rowIndex} className="border-t border-neutral-200">{cells(line).map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2 align-top"><InlineMarkdown text={cell}/></td>)}</tr>)}</tbody></table></div>;
    }
    if (/^```/.test(lines[0]) && lines.at(-1)?.startsWith('```')) return <pre key={index} className="overflow-x-auto rounded-2xl bg-neutral-100 p-4 text-sm leading-relaxed"><code>{lines.slice(1, -1).join('\n')}</code></pre>;
    return <p key={index}><InlineMarkdown text={lines.join(' ')}/></p>;
  })}</div>;
}

export function ArticlesPage() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(getArticleFromPath);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const selectedArticle = selectedSlug ? articlesBySlug.get(selectedSlug) : undefined;
  const activeArticle = localArticles[activeIndex];
  const reduceMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  useEffect(() => {
    const syncArticlePath = () => {
      const articleSlug = getArticleFromPath();
      setSelectedSlug(articleSlug);
      if (!articleSlug && !/^\/articulos\/?$/.test(window.location.pathname)) window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'inicio' }));
    };
    window.addEventListener('popstate', syncArticlePath);
    return () => window.removeEventListener('popstate', syncArticlePath);
  }, []);

  useEffect(() => {
    if (!selectedSlug || !selectedArticle) {
      document.title = 'Artículos de Nochistlán | PuntoNochi';
      const meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
      const description = 'Historias, cultura y lugares para conocer mejor Nochistlán de Mejía.';
      if (meta) meta.content = description;
      const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (canonical) canonical.href = `${window.location.origin}/articulos`;
      const schema = document.getElementById('route-seo-schema');
      if (schema) schema.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Artículos de Nochistlán', description, url: `${window.location.origin}/articulos` });
      return;
    }
    document.title = `${selectedArticle.title} | Artículos de Nochistlán | PuntoNochi`;
    const url = `${window.location.origin}/articulos/${encodeURIComponent(selectedArticle.slug)}`;
    const updateMeta = (attribute: 'name' | 'property', key: string, content: string) => {
      let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!meta) { meta = document.createElement('meta'); meta.setAttribute(attribute, key); document.head.appendChild(meta); }
      meta.content = content;
    };
    updateMeta('name', 'description', selectedArticle.summary);
    updateMeta('property', 'og:title', document.title);
    updateMeta('property', 'og:description', selectedArticle.summary);
    updateMeta('property', 'og:url', url);
    updateMeta('name', 'twitter:title', document.title);
    updateMeta('name', 'twitter:description', selectedArticle.summary);
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = url;
    const schema = document.getElementById('route-seo-schema') || document.head.appendChild(Object.assign(document.createElement('script'), { id: 'route-seo-schema', type: 'application/ld+json' }));
    schema.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: selectedArticle.title, description: selectedArticle.summary, articleSection: selectedArticle.category, mainEntityOfPage: url, publisher: { '@type': 'Organization', name: 'PuntoNochi', url: window.location.origin } }).replace(/</g, '\\u003c');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [selectedSlug, selectedArticle]);

  useEffect(() => {
    if (!selectedArticle && document.querySelector('[data-article-squircle]')) corners.apply('[data-article-squircle]', { radius: 55, smoothing: 1 });
  }, [activeIndex, selectedArticle]);

  const moveCard = (step: number) => {
    setDirection(step);
    setActiveIndex((index) => (index + step + localArticles.length) % localArticles.length);
  };
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number }; velocity: { x: number } }) => {
    if (Math.abs(info.offset.x) > 40 || Math.abs(info.velocity.x) > 350) moveCard(info.offset.x < 0 ? 1 : -1);
  };
  const openArticle = (slug: string) => {
    window.history.pushState({}, '', `/articulos/${encodeURIComponent(slug)}`);
    setSelectedSlug(slug);
  };
  const closeArticle = () => {
    window.history.replaceState({}, '', '/articulos');
    setSelectedSlug(null);
  };

  if (selectedArticle) return <main className="min-h-screen bg-[#f8f9fa] px-5 pb-36 pt-7 text-neutral-900">
    <div className="mx-auto max-w-3xl"><button type="button" onClick={closeArticle} className="mb-5 flex items-center gap-2 text-sm font-semibold text-neutral-600 transition-colors hover:text-neutral-950"><ArrowLeft className="h-4 w-4"/>Todos los artículos</button>
      <article className="overflow-hidden rounded-[32px] bg-white [corner-shape:squircle]">
        <div style={{ backgroundImage: accentFor(selectedArticle.id) }} className="relative flex min-h-[250px] items-end overflow-hidden px-6 pb-7 pt-10 text-white sm:min-h-[340px] sm:px-10"><ArticleCover id={selectedArticle.id} sizes="(max-width: 768px) 100vw, 768px" className="absolute inset-0 h-full w-full object-cover"/><div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/15"/><BookOpen className="absolute right-7 top-7 h-12 w-12 text-white/60"/><div className="relative"><span className="text-[11px] font-bold uppercase tracking-[.18em] text-white/80">{selectedArticle.category}</span><h1 className="mt-2 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight drop-shadow sm:text-4xl">{selectedArticle.title}</h1><p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-white/75"><Clock3 className="h-3.5 w-3.5"/>{selectedArticle.readMinutes} min de lectura · Nochistlán de Mejía</p></div></div>
        {articleImages[selectedArticle.id] && <p className="bg-neutral-50 px-6 py-2 text-right text-[11px] text-neutral-500 sm:px-10">Imagen: <a className="underline underline-offset-2" href={articleImages[selectedArticle.id].sourceUrl} target="_blank" rel="noreferrer">{articleImages[selectedArticle.id].credit}</a></p>}
        <div className="px-6 py-7 sm:px-10 sm:py-9"><p className="mb-7 border-b border-neutral-100 pb-6 text-lg font-medium leading-relaxed text-neutral-600">{selectedArticle.summary}</p><ArticleMarkdown content={selectedArticle.content}/><p className="mt-8 rounded-2xl bg-neutral-50 px-4 py-3 text-xs leading-relaxed text-neutral-500">Contenido informativo. Las fechas, horarios y actividades pueden cambiar; confirma los datos operativos con fuentes oficiales antes de tu visita.</p></div>
      </article>
    </div>
  </main>;

  return <main className="min-h-screen bg-[#111214] px-4 pb-36 pt-5 text-white sm:px-6">
    <header className="mx-auto mb-5 max-w-5xl"><h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Artículos de Nochistlán</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-white/55">Historias, cultura y lugares para conocer mejor Nochistlán de Mejía.</p></header>
    {activeArticle && <section aria-label="Carrusel de artículos" className="mx-auto max-w-[470px]" data-no-tab-swipe>
      <div className="relative isolate h-[min(62vh,560px)] min-h-[400px] touch-pan-y select-none">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-3 top-5 h-[calc(100%-24px)] rounded-[55px] bg-[radial-gradient(ellipse_at_25%_20%,rgba(59,130,246,.32),transparent_48%),radial-gradient(ellipse_at_82%_82%,rgba(168,85,247,.3),transparent_48%)] blur-[38px]"/>
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.button type="button" aria-label={`Leer: ${activeArticle.title}`} onClick={() => openArticle(activeArticle.slug)} data-article-squircle data-explore-corner key={activeArticle.slug} custom={direction} variants={cardVariants} drag="x" dragDirectionLock dragConstraints={{ left: 0, right: 0 }} dragElastic={.12} onDragEnd={handleDragEnd} initial="enter" animate="center" exit="exit" transition={reduceMotion ? { duration: .01 } : { type: 'spring', stiffness: 190, damping: 27, mass: .9 }} style={{ backgroundImage: accentFor(activeArticle.id) }} className="group absolute inset-x-0 top-0 z-10 flex h-full cursor-grab flex-col justify-between overflow-hidden rounded-[55px] px-6 py-7 text-left active:cursor-grabbing sm:px-8 sm:py-9">
            <ArticleCover id={activeArticle.id} sizes="(max-width: 768px) 100vw, 470px" className="absolute inset-0 h-full w-full object-cover opacity-55 transition-transform duration-500 group-hover:scale-105"/><div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/15"/><div className="relative z-10 flex h-full flex-col justify-between"><div className="flex items-center justify-between"><span className="rounded-full bg-white/[.09] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-white/70">{activeArticle.category}</span><span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[.08]"><BookOpen className="h-5 w-5 text-white/75"/></span></div>
            <div><p className="mb-3 text-[11px] font-semibold uppercase tracking-[.15em] text-white/45">Artículo {activeArticle.id} de {localArticles.length}</p><h2 className="text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-[34px]">{activeArticle.title}</h2><p className="mt-4 line-clamp-5 text-sm leading-relaxed text-white/70">{activeArticle.summary}</p><div className="mt-5 flex items-center gap-1.5 text-xs text-white/45"><Clock3 className="h-3.5 w-3.5"/>{activeArticle.readMinutes} min de lectura</div><span className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full !bg-white text-sm font-bold !text-black transition-transform">Leer artículo <ArrowRight className="h-4 w-4"/></span></div></div>
          </motion.button>
        </AnimatePresence>
      </div>
      <div className="mt-4 flex items-center justify-center gap-5"><button type="button" aria-label="Artículo anterior" onClick={() => moveCard(-1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[.08] text-white/85"><ChevronLeft className="h-5 w-5"/></button><span className="min-w-14 text-center text-xs font-semibold tabular-nums text-white/55">{activeIndex + 1} / {localArticles.length}</span><button type="button" aria-label="Artículo siguiente" onClick={() => moveCard(1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[.08] text-white/85"><ChevronRight className="h-5 w-5"/></button></div>
    </section>}
  </main>;
}

