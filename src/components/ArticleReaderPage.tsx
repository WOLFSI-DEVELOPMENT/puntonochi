import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bookmark, Pause, Play } from 'lucide-react';
import { motion } from 'motion/react';
import articleSource from '../data/100_articulos_nochistlan_de_mejia.md?raw';
import { articleCatalog } from '../data/articles-index';
import { getBookmarkedArticleSlugs, setBookmarkedArticleSlugs } from '../profileStorage';
import { ArticleCover } from './ArticleCover';

type ReaderArticle = (typeof articleCatalog)[number] & { content: string };
const articleBodies = new Map(Array.from(articleSource.matchAll(/^# Artículo (\d+):[^\r\n]*\r?\n([\s\S]*?)(?=^# Artículo \d+:|(?![\s\S]))/gm), (match) => {
  const id = Number(match[1]);
  const source = match[2].replace(/\r/g, '').replace(/cite:[^]+/g, '').trim();
  return [id, source.replace(/^\*\*Categoría:\*\*\s*.+\n*/m, '').trim()] as const;
}));
const readerArticles: ReaderArticle[] = articleCatalog.map((article) => ({ ...article, content: articleBodies.get(article.id) || '' }));

function InlineMarkdown({ text }: { text: string }) {
  const tokenPattern = /(\[[^\]]+\]\([^)]+\)|!\[[^\]]*\]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|`[^`]+`|(?<!\*)\*[^*]+\*(?!\*))/g;
  return <>{text.split(tokenPattern).filter(Boolean).map((part, index) => {
    const link = part.match(/^(!?)\[([^\]]*)\]\(([^)]+)\)$/);
    if (link) {
      const [, image, label, rawUrl] = link;
      let url = '';
      try { const parsed = new URL(rawUrl, window.location.origin); if (['https:', 'http:'].includes(parsed.protocol)) url = parsed.href; } catch { /* Ignore malformed links. */ }
      if (image) return url ? <img key={index} src={url} alt={label} loading="lazy" className="my-5 max-h-[440px] w-full rounded-2xl object-contain"/> : null;
      return url ? <a key={index} href={url} target="_blank" rel="noreferrer" className="font-semibold text-blue-300 underline decoration-blue-300/40 underline-offset-2">{label}</a> : label;
    }
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) return <strong key={index} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith('~~') && part.endsWith('~~')) return <del key={index}>{part.slice(2, -2)}</del>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[.9em]">{part.slice(1, -1)}</code>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  })}</>;
}

function ArticleBody({ content }: { content: string }) {
  const blocks = content.replace(/cite:[^]+/g, '').trim().split(/\n\s*\n/).filter(Boolean);
  return <div className="space-y-5 text-[16px] leading-[1.85] text-white/75">{blocks.map((block, index) => {
    const lines = block.trim().split('\n');
    const heading = block.trim().match(/^(#{1,6})\s+(.+)$/);
    if (heading) return <h2 key={index} className="pt-3 text-xl font-bold leading-tight tracking-tight text-white">{heading[2]}</h2>;
    if (/^(?:---+|\*\*\*+|___+)$/.test(block.trim())) return null;
    if (lines.every((line) => /^\s*>/.test(line))) return <blockquote key={index} className="border-l-2 border-white/20 pl-4 text-white/55"><InlineMarkdown text={lines.map((line) => line.replace(/^\s*>\s?/, '')).join(' ')}/></blockquote>;
    if (lines.every((line) => /^\s*[-*+]\s+/.test(line))) return <ul key={index} className="space-y-2 pl-5">{lines.map((line, itemIndex) => <li key={itemIndex} className="list-disc marker:text-white/35"><InlineMarkdown text={line.replace(/^\s*[-*+]\s+/, '')}/></li>)}</ul>;
    if (/^```/.test(lines[0]) && lines.at(-1)?.startsWith('```')) return <pre key={index} className="overflow-x-auto rounded-2xl bg-white/[.06] p-4 text-sm leading-relaxed"><code>{lines.slice(1, -1).join('\n')}</code></pre>;
    return <p key={index}><InlineMarkdown text={lines.join(' ')}/></p>;
  })}</div>;
}

function toSpeechText(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`~>#|]/g, '')
    .replace(/cite:[^]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function ArticleReaderPage({ onClose }: { onClose: () => void }) {
  const slug = decodeURIComponent(window.location.pathname.match(/^\/articulos\/([^/]+)\/?$/)?.[1] || '');
  const article = readerArticles.find((item) => item.slug === slug);
  const [bookmarks, setBookmarks] = useState(getBookmarkedArticleSlugs);
  const [speechState, setSpeechState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [speechProgress, setSpeechProgress] = useState(0);
  const [spanishVoice, setSpanishVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<'loading' | 'ready' | 'missing'>('loading');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechText = useMemo(() => article ? `${article.title}. ${article.summary}. ${toSpeechText(article.content)}` : '', [article]);
  const speechAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

  useEffect(() => {
    const refresh = () => setBookmarks(getBookmarkedArticleSlugs());
    window.addEventListener('puntonochi-article-bookmarks-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('puntonochi-article-bookmarks-updated', refresh); window.removeEventListener('storage', refresh); };
  }, []);

  useEffect(() => {
    if (!speechAvailable) { setVoiceStatus('missing'); return; }
    const chooseSpanishVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const spanishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith('es'));
      const preferredLocale = ['es-mx', 'es-us', 'es-419', 'es-es'];
      const voice = preferredLocale.map((locale) => spanishVoices.find((item) => item.lang.toLowerCase() === locale)).find(Boolean) || spanishVoices[0];
      if (voice) {
        setSpanishVoice(voice);
        setVoiceStatus('ready');
        return true;
      }
      return false;
    };
    if (chooseSpanishVoice()) return;
    setVoiceStatus('loading');
    const onVoicesChanged = () => chooseSpanishVoice();
    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    const timeout = window.setTimeout(() => {
      if (!chooseSpanishVoice()) setVoiceStatus('missing');
    }, 2500);
    return () => {
      window.clearTimeout(timeout);
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
    };
  }, [speechAvailable]);

  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);

  useEffect(() => {
    if (!article) return;
    document.title = `${article.title} | PuntoNochi`;
    const description = article.summary;
    const meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta) meta.content = description;
  }, [article]);

  const toggleBookmark = () => {
    if (!article) return;
    const next = bookmarks.includes(article.slug) ? bookmarks.filter((item) => item !== article.slug) : [...bookmarks, article.slug];
    setBookmarks(next);
    setBookmarkedArticleSlugs(next);
  };

  const toggleSpeech = () => {
    if (!speechAvailable || !spanishVoice || !article) return;
    if (speechState === 'playing') {
      window.speechSynthesis.pause();
      setSpeechState('paused');
      return;
    }
    if (speechState === 'paused') {
      window.speechSynthesis.resume();
      setSpeechState('playing');
      return;
    }
    window.speechSynthesis.cancel();
    setSpeechProgress(0);
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.voice = spanishVoice;
    utterance.lang = spanishVoice.lang;
    utterance.rate = 0.98;
    utterance.onstart = () => setSpeechState('playing');
    utterance.onboundary = (event) => setSpeechProgress(Math.min(100, Math.round((event.charIndex / Math.max(1, speechText.length)) * 100)));
    utterance.onend = () => { setSpeechState('idle'); setSpeechProgress(100); };
    utterance.onerror = () => setSpeechState('idle');
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setSpeechState('playing');
  };

  if (!article) return <main className="min-h-dvh bg-black px-6 pt-24 text-white"><button type="button" onClick={onClose} aria-label="Volver" className="flex h-11 w-11 items-center justify-center text-white"><ArrowLeft className="h-6 w-6"/></button><p className="mt-8 text-white/60">No encontramos este artículo.</p></main>;

  return <main className="min-h-dvh bg-black pb-[calc(120px+env(safe-area-inset-bottom))] text-white">
    <header className="relative h-[42dvh] min-h-[280px] max-h-[460px] overflow-hidden bg-black">
      <motion.div layoutId={`article-image-${article.slug}`} className="absolute inset-0"><ArticleCover id={article.id} sizes="100vw" className="h-full w-full object-cover opacity-80"/></motion.div>
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black"/>
      <div aria-hidden="true" className="reader-image-progressive-blur absolute inset-x-0 bottom-0 h-[78%]"/>
      <button type="button" onClick={onClose} aria-label="Volver" className="absolute left-4 top-[max(16px,env(safe-area-inset-top))] z-10 flex h-11 w-11 items-center justify-center text-white drop-shadow-lg"><ArrowLeft className="h-6 w-6"/></button>
      <div className="absolute right-4 top-[max(16px,env(safe-area-inset-top))] z-10 flex items-center gap-2">
        <motion.button type="button" onClick={toggleBookmark} aria-label={bookmarks.includes(article.slug) ? 'Quitar artículo de guardados' : 'Guardar artículo'} aria-pressed={bookmarks.includes(article.slug)} whileTap={{ scale: .82 }} animate={bookmarks.includes(article.slug) ? { scale: [1, 1.22, 1], backgroundColor: ['rgba(0,0,0,.4)', 'rgba(255,255,255,.22)', 'rgba(0,0,0,.4)'] } : { scale: 1 }} transition={{ type: 'spring', stiffness: 480, damping: 18 }} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xl"><motion.span key={bookmarks.includes(article.slug) ? 'saved' : 'unsaved'} initial={{ scale: .65, rotate: bookmarks.includes(article.slug) ? -18 : 12, opacity: .6 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 460, damping: 20 }}><Bookmark className={`h-5 w-5 ${bookmarks.includes(article.slug) ? 'fill-current' : ''}`}/></motion.span></motion.button>
      </div>
    </header>

    <section className="relative z-[2] mx-auto -mt-7 w-full max-w-2xl px-5 sm:px-7">
      <p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/45">{article.category} · Nochistlán</p>
      <h1 className="mt-2 text-[clamp(28px,8vw,38px)] font-extrabold leading-[1.05] tracking-[-.04em]">{article.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/60">{article.summary}</p>

      <div className="mt-8"><ArticleBody content={article.content}/></div>
      <p className="mt-8 text-xs leading-relaxed text-white/35">Contenido informativo. Las fechas, horarios y actividades pueden cambiar; confirma los datos operativos con fuentes oficiales antes de tu visita.</p>
    </section>
    <div aria-hidden="true" className="reader-player-progressive-blur pointer-events-none fixed inset-x-0 bottom-0 z-[110] h-[calc(116px+env(safe-area-inset-bottom))]"/>
    <div className="fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-[111] mx-auto max-w-[620px]">
      <div className="relative flex h-[58px] items-center gap-3 overflow-hidden rounded-full border-0 bg-[#8d8d91]/20 px-2.5 text-white shadow-none outline-none backdrop-blur-2xl backdrop-saturate-150">
        <div className="relative aspect-square h-10 w-10 shrink-0 overflow-hidden rounded-full [clip-path:circle(50%)] bg-white/10"><ArticleCover id={article.id} sizes="40px" className="h-full w-full rounded-full object-cover"/><div aria-hidden="true" className="reader-image-progressive-blur absolute inset-x-0 bottom-0 h-2/3 rounded-full"/></div>
        <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold">{article.title}</p><p className="mt-0.5 truncate text-[10px] text-white/60">{!speechAvailable ? 'Voz del navegador no disponible' : voiceStatus === 'loading' ? 'Cargando voz en español…' : voiceStatus === 'missing' ? 'No hay una voz en español instalada' : speechState === 'playing' ? `Leyendo en español · ${spanishVoice?.name}` : speechState === 'paused' ? 'Narración en pausa' : `Voz en español · ${spanishVoice?.name}`}</p></div>
        <span className="shrink-0 text-[10px] tabular-nums text-white/45">{article.readMinutes} min</span>
        <button type="button" onClick={toggleSpeech} disabled={!speechAvailable || voiceStatus !== 'ready'} aria-label={speechState === 'playing' ? 'Pausar narración' : 'Reproducir narración'} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/20 active:scale-95 disabled:opacity-40">{speechState === 'playing' ? <Pause className="h-4 w-4 fill-current"/> : <Play className="ml-0.5 h-4 w-4 fill-current"/>}</button>
        <div className="absolute inset-x-6 bottom-0 h-[2px] overflow-hidden rounded-full bg-white/[.08]"><motion.div className="h-full rounded-full bg-white/75" animate={{ width: `${speechProgress}%` }} transition={{ duration: .2, ease: 'linear' }}/></div>
      </div>
    </div>
  </main>;
}
