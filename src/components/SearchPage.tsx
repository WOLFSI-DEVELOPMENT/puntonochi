import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, MapPin, Plus, Search, Star, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { mockPlaces } from '../data';
import { Place } from '../types';
import CornerKit from '@cornerkit/core';
import { getBookmarkedPlaceIds } from '../profileStorage';

const SEARCH_HISTORY_KEY = 'puntonochi-recent-searches-v1';
const RECENT_PLACES_KEY = 'puntonochi-recent-places-v1';
const ASK_RECENTS_KEY = 'puntonochi-ask-nochi-recent-v1';
const AskNochiMap = lazy(() => import('./BusinessLocationMap').then((module) => ({ default: module.BusinessLocationMap })));
const cornerKit = new CornerKit();

function readLocalList(key: string) {
  try {
    const items: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(items) ? items.filter((item): item is string => typeof item === 'string') : [];
  } catch { return []; }
}

function BusinessCard({ place, onSelect }: { place: Place; onSelect: (place: Place) => void }) {
  return <button type="button" data-search-squircle onClick={() => onSelect(place)} className="flex h-[106px] w-full items-center gap-3 rounded-[24px] bg-[#292a2d] p-[5px] text-left text-white transition-colors hover:bg-[#303135] active:scale-[0.99]">
    <div data-search-image className="relative aspect-video w-[42%] max-w-[170px] shrink-0 overflow-hidden rounded-[19px] bg-[#35363a]">
      {place.images?.[0] ? <img src={place.images[0]} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-white/35"><MapPin className="h-7 w-7"/></div>}
    </div>
    <div className="flex min-w-0 flex-1 flex-col justify-center py-2 pr-3">
      <h2 className="line-clamp-2 text-[15px] font-bold leading-snug">{place.name}</h2>
      <p className="mt-1 line-clamp-1 text-[12px] font-medium text-white/60">{place.category}{place.subtitle ? ` · ${place.subtitle}` : ''}</p>
      <p className="mt-1.5 flex min-w-0 items-center gap-1 text-[11px] text-white/45"><MapPin className="h-3 w-3 shrink-0"/><span className="truncate">{place.location || place.address || 'Nochistlán'}</span></p>
      {place.rating > 0 && <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-white/70"><Star className="h-3 w-3 fill-amber-300 text-amber-300"/>{place.rating.toFixed(1)}<span className="font-normal text-white/40">· {place.reviewCount || 0} reseñas</span></p>}
    </div>
  </button>;
}

type SearchPageProps = {
  query: string;
  onQueryChange: (query: string) => void;
  onClose: () => void;
  onSelectBusiness: (place: Place) => void;
};

export function SearchSparkleIcon() {
  return <svg aria-hidden="true" viewBox="0 0 28 28" className="h-5 w-5 shrink-0 text-white/70" fill="currentColor">
    <path d="M17.171 6.829a3.16 3.16 0 0 1 .761 1.238l.498 1.53a.605.605 0 0 0 1.14 0l.498-1.53a3.15 3.15 0 0 1 1.998-1.996l1.53-.497a.605.605 0 0 0 0-1.14l-.03-.008l-1.531-.497a3.15 3.15 0 0 1-1.998-1.996L19.54.403a.604.604 0 0 0-1.14 0l-.498 1.53l-.013.038a3.15 3.15 0 0 1-1.955 1.958l-1.53.497a.605.605 0 0 0 0 1.14l1.53.497c.467.156.89.418 1.237.766m8.65 3.529l.918.298l.019.004a.362.362 0 0 1 0 .684l-.919.299a1.9 1.9 0 0 0-1.198 1.197l-.299.918a.363.363 0 0 1-.684 0l-.299-.918a1.89 1.89 0 0 0-1.198-1.202l-.919-.298a.362.362 0 0 1 0-.684l.919-.299a1.9 1.9 0 0 0 1.18-1.197l.299-.918a.363.363 0 0 1 .684 0l.298.918a1.89 1.89 0 0 0 1.199 1.197M11.5 3a8.5 8.5 0 0 1 2.738.45l-.149.05a1.57 1.57 0 0 0-.79.59a1.58 1.58 0 0 0-.29 1.086a6.5 6.5 0 1 0 4.933 5.449q.06.056.127.104a1.64 1.64 0 0 0 1.86 0l.034-.028q.037.395.037.799a8.46 8.46 0 0 1-1.824 5.262l6.531 6.53a1 1 0 0 1-1.414 1.415l-6.531-6.531A8.5 8.5 0 1 1 11.5 3" />
  </svg>;
}

export function AskNochiInline({ places, onSelectPlace, onClose }: { places: Place[]; onSelectPlace: (place: Place) => void; onClose: () => void }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [answerPlaces, setAnswerPlaces] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const text = question.trim(); if (!text || busy) return;
    setBusy(true); setError(''); setAnswer(''); setAnswerPlaces([]);
    try {
      const response = await fetch('/api/ask-nochi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: text, history: history.slice(-8) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data?.error || 'No se pudo completar la pregunta.');
      setAnswer(String(data.answer || '')); setAnswerPlaces(Array.isArray(data.places) ? data.places : []);
      setHistory((current) => [...current, { role: 'user', content: text }, { role: 'assistant', content: String(data.answer || '') }].slice(-10)); setQuestion('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo completar la pregunta.'); }
    finally { setBusy(false); }
  };
  return <div className="mt-5">
    <form onSubmit={(event) => void send(event)} className="flex h-12 w-full items-center gap-2 rounded-2xl bg-[#292929] px-2.5 text-white">
      <button type="button" onClick={onClose} aria-label="Cerrar pregunta de Ask Nochi" title="Cancelar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"><span className="material-symbols-rounded text-[21px]">close</span></button>
      <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Pregunta lo que quieras a Nochi" aria-label="Pregunta a Ask Nochi" autoComplete="off" className="min-w-0 flex-1 appearance-none border-0 !bg-transparent p-0 text-[16px] text-white outline-none placeholder:text-white/40 focus:!bg-transparent focus:outline-none focus:ring-0"/>
      <button type="submit" disabled={!question.trim() || busy} aria-label="Enviar pregunta" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white transition-opacity disabled:opacity-40"><span className="material-symbols-rounded text-[22px]">arrow_upward</span></button>
    </form>
    {(busy || error || answer) && <section aria-live="polite" className="mt-3 rounded-[22px] bg-[#202124] p-4 text-white">
      <div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.14em] text-blue-300">Ask Nochi</span><button type="button" onClick={() => { setAnswer(''); setAnswerPlaces([]); setError(''); }} aria-label="Cerrar respuesta de Ask Nochi" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[.07] text-white/60"><span className="material-symbols-rounded text-[18px]">close</span></button></div>
      {busy ? <p className="flex items-center gap-2 py-2 text-sm text-white/55"><span className="h-2 w-2 animate-pulse rounded-full bg-blue-300"/>Ask Nochi está buscando…</p> : error ? <p role="alert" className="text-sm text-rose-200">{error}</p> : <><MarkdownAnswer content={answer}/>{!!answerPlaces.length && <div className="mt-4 space-y-2.5">{answerPlaces.map((place) => <BusinessCard key={place.id} place={place} onSelect={onSelectPlace}/>)}</div>}</>}
    </section>}
  </div>;
}

export function SearchBar({ value, onChange, className = '', askMode = false, onToggleAsk }: { value: string; onChange: (value: string) => void; className?: string; askMode?: boolean; onToggleAsk?: () => void }) {
  return <div className={`flex h-12 w-full items-center gap-3 rounded-2xl border-0 bg-[#292929] px-4 text-white/45 shadow-none outline-none ring-0 ${className}`}>
    {onToggleAsk ? <button type="button" onClick={onToggleAsk} aria-label={askMode ? 'Volver a buscar negocios' : 'Preguntar a Ask Nochi'} title={askMode ? 'Buscar negocios' : 'Preguntar a Ask Nochi'} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"><SearchSparkleIcon /></button> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"><SearchSparkleIcon /></span>}
    <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={askMode ? 'Pregunta lo que quieras a Nochi' : 'Buscar lugares y negocios'} aria-label={askMode ? 'Pregunta a Ask Nochi' : 'Buscar lugares y negocios'} className="search-input-fix min-w-0 flex-1 appearance-none border-0 !bg-transparent p-0 text-[16px] text-white !shadow-none outline-none ring-0 placeholder:text-white/40 focus:border-0 focus:!bg-transparent focus:outline-none focus:!shadow-none focus:ring-0" />
  </div>;
}

type AskMessage = { id: string; role: 'user' | 'assistant'; content: string; places?: Place[] };
type AskRecent = { id: string; query: string; at: number };

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);
  return parts.map((part, index) => {
    const strong = part.match(/^\*\*(.+)\*\*$/);
    const code = part.match(/^`(.+)`$/);
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (strong) return <strong key={index} className="font-semibold text-white">{strong[1]}</strong>;
    if (code) return <code key={index} className="rounded bg-white/10 px-1 py-0.5 text-[0.92em]">{code[1]}</code>;
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer" className="text-blue-300 underline underline-offset-2">{link[1]}</a>;
    return <span key={index}>{part}</span>;
  });
}

function MarkdownAnswer({ content }: { content: string }) {
  const blocks = content.trim().split(/\n\s*\n/).filter(Boolean);
  return <div className="space-y-3 text-[15px] leading-7 text-white/85">
    {blocks.map((block, index) => {
      const lines = block.split('\n');
      if (lines.every((line) => /^\s*[-*]\s+/.test(line))) return <ul key={index} className="space-y-1.5 pl-5 marker:text-blue-300">{lines.map((line, lineIndex) => <li key={lineIndex} className="list-disc">{renderInlineMarkdown(line.replace(/^\s*[-*]\s+/, ''))}</li>)}</ul>;
      const heading = block.match(/^#{1,3}\s+(.+)$/);
      if (heading) return <h3 key={index} className="text-base font-bold tracking-tight text-white">{renderInlineMarkdown(heading[1])}</h3>;
      return <p key={index}>{lines.map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br />}{renderInlineMarkdown(line)}</span>)}</p>;
    })}
  </div>;
}

function AskNochiSheet({ places, onClose, onSelectPlace }: { places: Place[]; onClose: () => void; onSelectPlace: (place: Place) => void }) {
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [recent, setRecent] = useState<AskRecent[]>(() => {
    try { const value = JSON.parse(localStorage.getItem(ASK_RECENTS_KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showRecent, setShowRecent] = useState(false);
  const [mapFor, setMapFor] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', escape);
    return () => { document.body.style.overflow = old; window.removeEventListener('keydown', escape); };
  }, [onClose]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  const startNew = () => { setMessages([]); setInput(''); setError(''); setShowRecent(false); setMapFor(null); window.setTimeout(() => composerRef.current?.focus(), 80); };
  const sendMessage = async (raw: string, historyOverride = messages) => {
    const text = raw.trim();
    if (!text || busy) return;
    setShowRecent(false); setInput(''); setError('');
    const userMessage: AskMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    const previous = historyOverride;
    setMessages((current) => [...current, userMessage]);
    setBusy(true);
    const nextRecent = [{ id: crypto.randomUUID(), query: text, at: Date.now() }, ...recent.filter((item) => item.query.toLocaleLowerCase('es') !== text.toLocaleLowerCase('es'))].slice(0, 12);
    setRecent(nextRecent);
    try { localStorage.setItem(ASK_RECENTS_KEY, JSON.stringify(nextRecent)); } catch { /* storage is optional */ }
    try {
      const response = await fetch('/api/ask-nochi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: text, history: previous.slice(-8).map(({ role, content }) => ({ role, content })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'No se pudo completar la búsqueda.');
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', content: data.answer, places: Array.isArray(data.places) ? data.places : [] }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo completar la búsqueda.');
    } finally { setBusy(false); }
  };

  return <AnimatePresence>
    <motion.div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/55 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.section role="dialog" aria-modal="true" aria-label="Ask Nochi" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 280 }} onClick={(event) => event.stopPropagation()} className="relative flex h-[min(92dvh,900px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[30px] bg-[#171717] text-white shadow-[0_-20px_90px_rgba(0,0,0,.45)]">
        <div className="shrink-0 px-5 pt-3">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/25" />
          <header className="flex items-center justify-between gap-2 pb-3">
            <div className="min-w-0"><h2 className="text-[20px] font-bold tracking-tight">Ask Nochi</h2></div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={startNew} aria-label="Nueva búsqueda con IA" className="flex h-9 items-center gap-1 rounded-full bg-[#292a2d] px-2.5 text-[11px] font-semibold text-white/80"><Plus className="h-3.5 w-3.5"/>Nueva</button>
              <button type="button" onClick={() => setShowRecent((value) => !value)} className="flex h-9 items-center gap-1 rounded-full bg-[#292a2d] px-2.5 text-[11px] font-semibold text-white/80"><Bookmark className="h-3.5 w-3.5"/>Recientes</button>
              <button type="button" onClick={onClose} aria-label="Cerrar Ask Nochi" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#292a2d] text-white/80"><X className="h-4 w-4"/></button>
            </div>
          </header>
        </div>

        {showRecent && <div className="mx-5 mb-2 max-h-48 shrink-0 overflow-y-auto rounded-2xl bg-[#242528] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">Búsquedas recientes</p>
          {recent.length ? recent.map((item) => <button key={item.id} type="button" onClick={() => { startNew(); void sendMessage(item.query, []); }} className="block w-full truncate py-2 text-left text-sm text-white/75">{item.query}</button>) : <p className="py-2 text-sm text-white/45">Tus preguntas recientes aparecerán aquí.</p>}
        </div>}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-2">
          {!messages.length && <div className="flex min-h-full flex-col justify-center pb-12">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-300">Descubre con Nochi</div>
            <h3 className="max-w-md text-[28px] font-semibold leading-tight tracking-tight">¿Qué negocio buscas hoy?</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/50">Pide recomendaciones por tipo de lugar, zona, horario o lo que necesitas. Te mostraré negocios reales de Nochistlán.</p>
            <div className="mt-6 flex flex-wrap gap-2">{['¿Dónde puedo desayunar?', 'Busca un hotel en el centro', 'Un lugar abierto ahora'].map((prompt) => <button key={prompt} type="button" onClick={() => void sendMessage(prompt)} className="rounded-full bg-[#292a2d] px-3.5 py-2.5 text-xs text-white/75 transition-colors hover:bg-[#333438]">{prompt}</button>)}</div>
          </div>}

          <div className="space-y-6">
            {messages.map((message) => message.role === 'user' ? <div key={message.id} className="flex justify-end"><p className="max-w-[84%] rounded-[22px] bg-[#292a2d] px-4 py-3 text-[15px] leading-6 text-white/90">{message.content}</p></div> : <article key={message.id} className="space-y-4 py-1">
              <MarkdownAnswer content={message.content}/>
              {!!message.places?.length && <div className="space-y-3">{message.places.map((place) => <div key={place.id} className="space-y-2"><BusinessCard place={place} onSelect={onSelectPlace}/><button type="button" onClick={() => setMapFor((current) => current === place.id ? null : place.id)} className="ml-1 text-xs font-semibold text-blue-300">{mapFor === place.id ? 'Ocultar mapa' : 'Ver mapa'}</button>{mapFor === place.id && <Suspense fallback={<div className="h-[210px] animate-pulse rounded-[24px] bg-[#292a2d]"/>}><AskNochiMap place={place}/></Suspense>}</div>)}</div>}
            </article>)}
            {busy && <div className="flex items-center gap-2 py-2 text-sm text-white/55"><span className="h-2 w-2 animate-pulse rounded-full bg-blue-300"/><span>Buscando opciones para ti…</span></div>}
            {error && <p role="alert" className="rounded-xl bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</p>}
            <div ref={endRef}/>
          </div>
        </div>

        <div className="relative z-10 shrink-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(23,23,23,.88)_28%,#171717_62%)] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-8">
          <form onSubmit={(event) => { event.preventDefault(); void sendMessage(input); }} className="flex min-h-[56px] items-center gap-2 rounded-full bg-[#292a2d] p-1.5 pl-5">
            <input ref={composerRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Pregunta a Nochi…" aria-label="Pregunta a Nochi" autoComplete="off" className="ask-nochi-input min-w-0 flex-1 appearance-none !rounded-none !border-0 !bg-transparent !shadow-none py-3 text-[15px] text-white outline-none ring-0 placeholder:text-white/40 focus:!border-0 focus:!bg-transparent focus:!shadow-none focus:outline-none focus:ring-0" />
            <button type="submit" disabled={!input.trim() || busy} aria-label="Enviar pregunta" className="flex h-11 min-w-12 shrink-0 items-center justify-center rounded-full bg-[#0a84ff] px-4 text-white transition-opacity disabled:opacity-35"><ArrowRight className="h-5 w-5"/></button>
          </form>
        </div>
      </motion.section>
    </motion.div>
  </AnimatePresence>;
}

export function SearchPage({ query, onQueryChange, onClose, onSelectBusiness }: SearchPageProps) {
  const [showAskNochi, setShowAskNochi] = useState(false);
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es');
    if (!normalized) return [];

    const words = normalized.split(/\s+/);
    return mockPlaces.filter((place) => {
      const searchable = [place.name, place.category, place.subtitle, place.location, place.address]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('es');
      return words.every((word) => searchable.includes(word));
    });
  }, [query]);

  const suggestions = useMemo(() => {
    const searches = readLocalList(SEARCH_HISTORY_KEY);
    const recentPlaces = readLocalList(RECENT_PLACES_KEY);
    const bookmarks = getBookmarkedPlaceIds();
    const score = (place: Place) => {
      const text = [place.name, place.category, place.subtitle, place.location, place.address].filter(Boolean).join(' ').toLocaleLowerCase('es');
      const searchScore = searches.reduce((total, term, index) => total + (text.includes(term.toLocaleLowerCase('es')) ? 8 - Math.min(index, 6) : 0), 0);
      const recentIndex = recentPlaces.indexOf(place.id);
      return (bookmarks.includes(place.id) ? 12 : 0) + (recentIndex >= 0 ? 6 - Math.min(recentIndex, 5) : 0) + searchScore + Math.min(place.reviewCount || 0, 100) / 100 + (place.rating || 0) / 10;
    };
    return [...mockPlaces].filter((place) => place.images?.[0]).sort((a, b) => score(b) - score(a)).slice(0, 10);
  }, []);

  const visiblePlaces = query.trim() ? results : suggestions;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      cornerKit.applyAll('[data-search-squircle]', { radius: 24, smoothing: 1 });
      cornerKit.applyAll('[data-search-image]', { radius: 19, smoothing: 1 });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [visiblePlaces]);

  return (
    <main className="fixed inset-0 z-[45] overflow-y-auto bg-[#171717] pb-32 text-white">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-[#171717]/95 px-4 pb-4 pt-5 backdrop-blur-xl">
        <button onClick={onClose} aria-label="Volver" className="flex h-11 w-10 shrink-0 items-center justify-center text-white/80">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl bg-[#292929] px-4">
          <button type="button" onClick={() => setShowAskNochi(true)} aria-label="Preguntar a Nochi con inteligencia artificial" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10"><SearchSparkleIcon /></button>
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar lugares y negocios"
            aria-label="Buscar lugares y negocios"
            className="search-input-fix min-w-0 flex-1 appearance-none !bg-transparent text-[16px] text-white !shadow-none outline-none placeholder:text-white/40 focus:!bg-transparent focus:!shadow-none"
          />
        </div>
      </header>

      <section className="px-5 pt-2">
        <h1 className="mb-1 text-[25px] font-bold tracking-tight">
          {query.trim() ? `Resultados (${results.length})` : 'Sugeridos'}
        </h1>

        {!query.trim() && (
          <p className="mb-5 text-[15px] text-white/55">Negocios para ti, según lo que buscas y guardas.</p>
        )}

        {query.trim() && results.length === 0 && (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <Search className="mb-4 h-8 w-8 text-white/35" />
            <p className="text-base font-semibold">No encontramos lugares</p>
            <p className="mt-1 text-sm text-white/50">Prueba con otro nombre, categoría o zona.</p>
          </div>
        )}

        <div className="space-y-3">
          {!query.trim() && !visiblePlaces.length && <p className="text-sm text-white/50">Busca por nombre, categoría o zona.</p>}
          {visiblePlaces.map((place) => <BusinessCard key={place.id} place={place} onSelect={onSelectBusiness} />)}
        </div>
        <aside className="mb-6 mt-8" aria-label="Contenido patrocinado">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">Patrocinado</p>
          <a href="https://higgsfield.ai?fpr=puntonochis" target="_blank" rel="sponsored noopener noreferrer" aria-label="Visitar Higgsfield AI" data-search-squircle className="block overflow-hidden rounded-[24px] bg-[#292a2d] p-[5px] transition-transform active:scale-[0.99]">
            <img data-search-image src="https://www.joeyoungblood.com/wp-content/uploads/2026/01/higgsfield-logo-750x450.png" alt="Higgsfield AI" loading="lazy" className="aspect-[5/3] w-full rounded-[19px] object-cover" />
          </a>
        </aside>
      </section>
      {showAskNochi && <AskNochiSheet places={mockPlaces} onClose={() => setShowAskNochi(false)} onSelectPlace={(place) => { setShowAskNochi(false); onSelectBusiness(place); }} />}
    </main>
  );
}
