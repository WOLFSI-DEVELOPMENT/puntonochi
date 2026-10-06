import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Bookmark, Image as ImageIcon, MapPin, MessageCircle, Plus, Search, Star, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Place } from '../types';
import CornerKit from '@cornerkit/core';
import { VerifiedBusinessName } from './VerifiedBusinessName';

const ASK_RECENTS_KEY = 'puntonochi-ask-nochi-recent-v1';
const AskNochiMap = lazy(() => import('./BusinessLocationMap').then((module) => ({ default: module.BusinessLocationMap })));
const cornerKit = new CornerKit();

const normalizeSearchText = (value: unknown) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

function BusinessCard({ place, onSelect }: { place: Place; onSelect: (place: Place) => void }) {
  return <button type="button" data-search-squircle onClick={() => onSelect(place)} className="flex h-[106px] w-full items-center gap-3 rounded-[24px] bg-[#292a2d] p-[5px] text-left text-white transition-colors hover:bg-[#303135] active:scale-[0.99]">
    <div data-search-image className="relative aspect-video w-[42%] max-w-[170px] shrink-0 overflow-hidden rounded-[19px] bg-[#35363a]">
      {place.images?.[0] ? <img src={place.images[0]} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-white/35"><MapPin className="h-7 w-7"/></div>}
    </div>
    <div className="flex min-w-0 flex-1 flex-col justify-center py-2 pr-3">
      <h2 className="line-clamp-2 text-[15px] font-bold leading-snug"><VerifiedBusinessName name={place.name}/></h2>
      <p className="mt-1 line-clamp-1 text-[12px] font-medium text-white/60">{place.category}{place.subtitle ? ` · ${place.subtitle}` : ''}</p>
      <p className="mt-1.5 flex min-w-0 items-center gap-1 text-[11px] text-white/45"><MapPin className="h-3 w-3 shrink-0"/><span className="truncate">{place.location || place.address || 'México'}</span></p>
      {place.rating > 0 && <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-white/70"><Star className="h-3 w-3 fill-amber-300 text-amber-300"/>{place.rating.toFixed(1)}<span className="font-normal text-white/40">· {place.reviewCount || 0} reseñas</span></p>}
    </div>
  </button>;
}

type SearchPageProps = {
  query: string;
  onClose: () => void;
  onSelectBusiness: (place: Place) => void;
  onOpenEvents: () => void;
  onOpenMarketplace: () => void;
  places: Place[];
  categoryScoped: boolean;
  categoryName?: string;
};

export function SearchSparkleIcon() {
  return <svg aria-hidden="true" viewBox="0 0 28 28" className="h-5 w-5 shrink-0 text-white/70" fill="currentColor">
    <path d="M17.171 6.829a3.16 3.16 0 0 1 .761 1.238l.498 1.53a.605.605 0 0 0 1.14 0l.498-1.53a3.15 3.15 0 0 1 1.998-1.996l1.53-.497a.605.605 0 0 0 0-1.14l-.03-.008l-1.531-.497a3.15 3.15 0 0 1-1.998-1.996L19.54.403a.604.604 0 0 0-1.14 0l-.498 1.53l-.013.038a3.15 3.15 0 0 1-1.955 1.958l-1.53.497a.605.605 0 0 0 0 1.14l1.53.497c.467.156.89.418 1.237.766m8.65 3.529l.918.298l.019.004a.362.362 0 0 1 0 .684l-.919.299a1.9 1.9 0 0 0-1.198 1.197l-.299.918a.363.363 0 0 1-.684 0l-.299-.918a1.89 1.89 0 0 0-1.198-1.202l-.919-.298a.362.362 0 0 1 0-.684l.919-.299a1.9 1.9 0 0 0 1.18-1.197l.299-.918a.363.363 0 0 1 .684 0l.298.918a1.89 1.89 0 0 0 1.199 1.197M11.5 3a8.5 8.5 0 0 1 2.738.45l-.149.05a1.57 1.57 0 0 0-.79.59a1.58 1.58 0 0 0-.29 1.086a6.5 6.5 0 1 0 4.933 5.449q.06.056.127.104a1.64 1.64 0 0 0 1.86 0l.034-.028q.037.395.037.799a8.46 8.46 0 0 1-1.824 5.262l6.531 6.53a1 1 0 0 1-1.414 1.415l-6.531-6.531A8.5 8.5 0 1 1 11.5 3" />
  </svg>;
}

type FullChatMessage = { id: string; role: 'user' | 'assistant'; content: string; places?: Place[] };

export function AskNochiPage({ onSelectBusiness }: { onSelectBusiness: (place: Place) => void }) {
  const [messages, setMessages] = useState<FullChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const askTabsRef = useRef<HTMLButtonElement>(null);
  const imagineTabRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const tabs = [askTabsRef.current, imagineTabRef.current].filter((tab): tab is HTMLButtonElement => Boolean(tab));
    const updateGlass = () => {
      for (const tab of tabs) {
        if (tab.getAttribute('aria-pressed') !== 'true') {
          tab.classList.remove('ask-nochi-glass-content');
          continue;
        }
        const { left, right, top, bottom } = tab.getBoundingClientRect();
        const samples: Element[] = [];
        for (const x of [left + 5, (left + right) / 2, right - 5]) {
          for (const y of [top + 4, (top + bottom) / 2, bottom - 4]) {
            const stack = document.elementsFromPoint(x, y);
            const beneath = stack.find((element) => element !== tab && !tab.contains(element) && !element.closest('.ask-nochi-glass-tab'));
            if (beneath) samples.push(beneath);
          }
        }
        const hasContentBehind = samples.some((element) => {
          const tag = element.tagName.toLowerCase();
          if (/^(img|picture|video|canvas|svg|iframe)$/.test(tag) || element.closest('img,picture,video,canvas,svg,iframe')) return true;
          const style = getComputedStyle(element);
          const color = style.color.match(/[\d.]+/g)?.map(Number);
          return Boolean(element.textContent?.trim()) && (!color || color[3] === undefined || color[3] > 0.08);
        });
        tab.classList.toggle('ask-nochi-glass-content', hasContentBehind);
      }
    };
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateGlass);
    };
    const scroller = document.querySelector<HTMLElement>('.ask-nochi-chat-scroll');
    schedule();
    scroller?.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = new MutationObserver(schedule);
    if (scroller) observer.observe(scroller, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelAnimationFrame(frame);
      scroller?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
    };
  }, [messages, busy]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  const send = async (raw = input) => {
    const text = raw.trim();
    if (!text || busy) return;
    const userMessage: FullChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages); setInput(''); setError(''); setBusy(true);
    try {
      const response = await fetch('/api/ask-nochi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: text, history: messages.map(({ role, content }) => ({ role, content })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'No se pudo completar la pregunta.');
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', content: String(data.answer || ''), places: Array.isArray(data.places) ? data.places : [] }]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo completar la pregunta.'); }
    finally { setBusy(false); composerRef.current?.focus(); }
  };

  return <main className="fixed inset-0 z-[40] overflow-hidden bg-[#1a1a1a] bg-[linear-gradient(to_top,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0.15)_10%,rgba(255,255,255,0.08)_22%,rgba(255,255,255,0.03)_35%,rgba(255,255,255,0.01)_50%,rgba(255,255,255,0)_65%)] text-white">
    <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-transparent px-4 pt-[max(16px,env(safe-area-inset-top))]">
      <button type="button" aria-label="Volver al inicio" onClick={() => window.dispatchEvent(new CustomEvent('askNochiBack'))} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#303030] text-white/85 transition-colors hover:bg-[#3a3a3a]"><span className="material-symbols-rounded">arrow_back</span></button>
      <button type="button" onClick={() => { setMessages([]); setError(''); setInput(''); composerRef.current?.focus(); }} aria-label="Nueva conversación" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#303030] text-white/85 transition-colors hover:bg-[#3a3a3a]"><span className="material-symbols-rounded">edit_square</span></button>
    </header>
    <button ref={askTabsRef} type="button" aria-label="Modo Preguntar" aria-pressed="true" className="ask-nochi-glass-tab ask-nochi-glass-tab-active absolute left-[calc(50%-100px)] top-[max(20px,calc(env(safe-area-inset-top)+20px))] z-10 flex h-9 items-center gap-1.5 px-3.5 text-[13px] font-semibold text-white">
      <MessageCircle className="h-3.5 w-3.5" strokeWidth={2}/><span>Preguntar</span>
    </button>
    <button ref={imagineTabRef} type="button" aria-label="Modo Imaginar, próximamente" aria-pressed="false" disabled title="Próximamente" className="ask-nochi-glass-tab absolute left-[calc(50%+4px)] top-[max(20px,calc(env(safe-area-inset-top)+20px))] z-10 flex h-9 cursor-not-allowed items-center gap-1.5 px-3.5 text-[13px] font-medium text-white/65"><ImageIcon className="h-3.5 w-3.5" strokeWidth={1.8}/><span>Imaginar</span></button>
    <div className="ask-nochi-chat-scroll absolute inset-x-0 bottom-[116px] top-0 overflow-y-auto px-4 pb-5 pt-[calc(68px+env(safe-area-inset-top))] sm:bottom-[132px]">
      <div className="mx-auto flex min-h-full max-w-2xl flex-col">
        {!messages.length ? <div className="flex flex-1 flex-col items-center justify-center pb-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-[#252525]"><SearchSparkleIcon /></div>
          <h2 className="text-[28px] font-semibold tracking-tight">¿Qué necesitas hoy?</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-white/55">Pregunta sobre negocios, eventos y anuncios de Nochistlán.</p>
          <div className="mt-7 flex max-w-lg flex-wrap justify-center gap-2">{['Recomiéndame dónde desayunar', '¿Qué eventos hay pronto?', 'Busca un servicio cerca del centro'].map((prompt) => <button key={prompt} type="button" onClick={() => void send(prompt)} className="rounded-full bg-[#333]/80 px-4 py-2.5 text-xs font-medium text-white/80 transition-colors hover:bg-[#444]">{prompt}</button>)}</div>
        </div> : <div className="space-y-7 pt-6">{messages.map((message) => message.role === 'user' ? <div key={message.id} className="ml-auto w-fit max-w-[88%] rounded-[28px] bg-[#343434] px-5 py-3.5 text-[15px] leading-6 text-white" data-search-squircle>{message.content}</div> : <article key={message.id} className="space-y-4 text-[15px] leading-7 text-white/90"><MarkdownAnswer content={message.content}/>{!!message.places?.length && <div className="space-y-3">{message.places.map((place) => <BusinessCard key={place.id} place={place} onSelect={onSelectBusiness}/>)}</div>}</article>)}</div>}
        {busy && <p className="mt-5 flex items-center gap-2 text-sm text-white/55"><span className="h-2 w-2 animate-pulse rounded-full bg-white/80"/>Pensando…</p>}
        {error && <p role="alert" className="mt-4 text-sm text-rose-200">{error}</p>}
        <div ref={endRef}/>
      </div>
    </div>
    <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(18px,env(safe-area-inset-bottom))] pt-5">
      <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="mx-auto flex min-h-[52px] max-w-2xl items-center gap-2 rounded-full bg-[#303030] p-[5px] shadow-[0_-18px_50px_rgba(255,255,255,.12),0_12px_40px_rgba(0,0,0,.18)]">
        <textarea ref={composerRef} rows={1} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Pregunta lo que quieras…" aria-label="Mensaje para Ask Nochi" className="max-h-28 min-h-9 flex-1 resize-none self-center rounded-full bg-transparent px-4 py-2 text-[14px] leading-5 text-white outline-none placeholder:text-white/40" />
        <button type="submit" disabled={!input.trim() || busy} aria-label="Enviar mensaje" className="relative isolate flex h-[42px] min-w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-[linear-gradient(180deg,#68bdff_0%,#1687ff_43%,#0861d7_100%)] px-6 text-white shadow-[inset_0_2px_2px_rgba(255,255,255,.55),inset_0_-3px_5px_rgba(0,43,130,.38),0_2px_5px_rgba(0,0,0,.28)] transition-[filter,transform] hover:brightness-110 active:translate-y-px active:brightness-95 disabled:cursor-not-allowed disabled:opacity-55 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-[url('data:image/svg+xml,%3Csvg_viewBox=%220_0_180_180%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter_id=%22n%22%3E%3CfeTurbulence_type=%22fractalNoise%22_baseFrequency=%22.88%22_numOctaves=%223%22_stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect_width=%22100%25%22_height=%22100%25%22_filter=%22url(%23n)%22_opacity=%22.22%22/%3E%3C/svg%3E')] before:bg-cover before:opacity-30"><ArrowRight className="h-6 w-6 drop-shadow-[0_1px_1px_rgba(0,0,0,.22)]" strokeWidth={2.7}/></button>
      </form>
    </div>
  </main>;
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

        <div className="relative z-10 shrink-0 bg-[linear-gradient(to_top,rgba(255,255,255,.07)_0%,rgba(255,255,255,.035)_12%,rgba(255,255,255,.012)_24%,transparent_42%)] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
          <form onSubmit={(event) => { event.preventDefault(); void sendMessage(input); }} className="flex min-h-[56px] items-center gap-2 rounded-full bg-[#292a2d] p-1.5 pl-5">
            <input ref={composerRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Pregunta a Nochi…" aria-label="Pregunta a Nochi" autoComplete="off" className="ask-nochi-input min-w-0 w-full flex-1 appearance-none !rounded-none !border-0 !bg-transparent !shadow-none py-3 text-[16px] text-white outline-none ring-0 placeholder:text-white/40 focus:!border-0 focus:!bg-transparent focus:!shadow-none focus:outline-none focus:ring-0" />
            <button type="submit" disabled={!input.trim() || busy} aria-label="Enviar pregunta" className="flex h-11 min-w-12 shrink-0 items-center justify-center rounded-full bg-[#0a84ff] px-4 text-white transition-opacity disabled:opacity-35"><ArrowRight className="h-5 w-5"/></button>
          </form>
        </div>
      </motion.section>
    </motion.div>
  </AnimatePresence>;
}

export function SearchPage({ query, onClose, onSelectBusiness, onOpenEvents, onOpenMarketplace, places, categoryScoped, categoryName }: SearchPageProps) {
  const [events, setEvents] = useState<{ id: string; title: string; date: string; time?: string | null; location: string; description: string; imageUrl?: string }[]>([]);
  const [listings, setListings] = useState<{ id: string; title: string; category: string; price: string; location: string; description: string; images?: { url: string }[] }[]>([]);
  const touchStartY = useRef<number | null>(null);
  const deferredQuery = useDeferredValue(query);
  const normalized = normalizeSearchText(deferredQuery);
  const words = useMemo(() => normalized.split(/\s+/).filter(Boolean), [normalized]);
  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      fetch('/api/events').then((response) => response.ok ? response.json() : []),
      fetch('/api/marketplace/listings').then((response) => response.ok ? response.json() : []),
    ]).then(([eventResult, listingResult]) => {
      if (!active) return;
      if (eventResult.status === 'fulfilled' && Array.isArray(eventResult.value)) setEvents(eventResult.value);
      if (listingResult.status === 'fulfilled' && Array.isArray(listingResult.value)) setListings(listingResult.value);
    });
    return () => { active = false; };
  }, []);
  const indexedPlaces = useMemo(() => places.map((place) => ({
    place,
    name: normalizeSearchText(place.name),
    category: normalizeSearchText(place.category),
    searchable: normalizeSearchText([place.name, place.category, place.subtitle, place.location, place.address].filter(Boolean).join(' ')),
  })), [places]);

  const results = useMemo(() => {
    if (!normalized) return [];
    return indexedPlaces.map(({ place, name, category, searchable }) => {
      if (!words.every((word) => searchable.includes(word))) return null;
      const score = (name === normalized ? 100 : name.startsWith(normalized) ? 60 : name.includes(normalized) ? 35 : 0)
        + (category === normalized ? 45 : category.includes(normalized) ? 25 : 0)
        + (words.filter((word) => name.includes(word)).length * 8)
        + (place.rating || 0)
        + Math.min(place.reviewCount || 0, 100) / 100;
      return { place, score };
    }).filter((match): match is { place: Place; score: number } => Boolean(match))
      .sort((a, b) => b.score - a.score)
      .map(({ place }) => place);
  }, [indexedPlaces, normalized, words]);

  const matchingEvents = useMemo(() => categoryScoped ? [] : events.filter((item) => words.length > 0 && words.every((word) => normalizeSearchText([item.title, item.location, item.description].join(' ')).includes(word))), [categoryScoped, events, words]);
  const matchingListings = useMemo(() => categoryScoped ? [] : listings.filter((item) => words.length > 0 && words.every((word) => normalizeSearchText([item.title, item.category, item.location, item.description].join(' ')).includes(word))), [categoryScoped, listings, words]);
  const totalResults = results.length + matchingEvents.length + matchingListings.length;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      cornerKit.applyAll('[data-search-squircle]', { radius: 24, smoothing: 1 });
      cornerKit.applyAll('[data-search-image]', { radius: 19, smoothing: 1 });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [results.length, matchingEvents.length, matchingListings.length]);

  return (
    <motion.main onTouchStart={(event) => { touchStartY.current = event.touches[0]?.clientY ?? null; }} onTouchEnd={(event) => { const endY = event.changedTouches[0]?.clientY; if (touchStartY.current !== null && endY !== undefined && endY - touchStartY.current > 90) onClose(); touchStartY.current = null; }} className="fixed inset-0 z-[45] overflow-y-auto bg-[#101114]/75 pb-28 pt-24 text-white backdrop-blur-2xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="mx-auto max-w-2xl px-4 pb-8">
        {normalized.length < 2 ? <div className="rounded-[24px] bg-white/[0.08] p-5 text-sm text-white/65">{categoryScoped && categoryName ? `Busca negocios de ${categoryName}.` : 'Busca negocios, eventos o anuncios en México.'}</div> : <>
          <h1 className="mb-4 text-xl font-bold">{categoryScoped && categoryName ? `${categoryName} · ${totalResults} resultados` : `Resultados (${totalResults})`}</h1>
          <div className="space-y-3">
            {results.map((place) => <BusinessCard key={`place-${place.id}`} place={place} onSelect={(item) => { onClose(); onSelectBusiness(item); }} />)}
            {matchingEvents.map((item) => <button type="button" key={`event-${item.id}`} onClick={() => { onClose(); onOpenEvents(); }} className="w-full overflow-hidden rounded-[24px] bg-[#292a2d] text-left"><div className="flex items-center gap-3 p-3">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-20 w-24 shrink-0 rounded-2xl object-cover"/> : <span className="flex h-20 w-24 shrink-0 items-center justify-center rounded-2xl bg-white/10"><span className="material-symbols-rounded text-3xl">event</span></span>}<span className="min-w-0"><span className="block font-bold">{item.title}</span><span className="mt-1 block text-xs text-white/60">{item.date}{item.time ? ` · ${item.time}` : ''}</span><span className="mt-1 block truncate text-xs text-white/45">{item.location}</span></span></div></button>)}
            {matchingListings.map((item) => <button type="button" key={`listing-${item.id}`} onClick={() => { onClose(); onOpenMarketplace(); }} className="w-full overflow-hidden rounded-[24px] bg-[#292a2d] text-left"><div className="flex items-center gap-3 p-3">{item.images?.[0]?.url ? <img src={item.images[0].url} alt="" className="h-20 w-24 shrink-0 rounded-2xl object-cover"/> : <span className="flex h-20 w-24 shrink-0 items-center justify-center rounded-2xl bg-white/10"><span className="material-symbols-rounded text-3xl">storefront</span></span>}<span className="min-w-0"><span className="block font-bold">{item.title}</span><span className="mt-1 block text-xs text-white/60">{item.category} · {item.price}</span><span className="mt-1 block truncate text-xs text-white/45">{item.location}</span></span></div></button>)}
            {totalResults === 0 && <div className="rounded-[24px] bg-white/[0.06] px-4 py-8 text-center text-sm text-white/60">No encontramos coincidencias. Prueba con otras palabras.</div>}
          </div>
        </>}
        <button type="button" onClick={onClose} className="mx-auto mt-5 block rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white/80">Cancelar búsqueda</button>
      </section>
    </motion.main>
  );
}
