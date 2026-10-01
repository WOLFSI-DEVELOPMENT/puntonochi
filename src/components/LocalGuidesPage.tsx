import { useEffect, useState, type ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, ImagePlus, LoaderCircle, MapPin, Plus, Search, Sparkles, X } from 'lucide-react';
import CornerKit from '@cornerkit/core';
import { apiFetch } from '../api';
import { AccountRequiredPrompt } from './AccountSheets';
import { SheetDragHandle, useSheetDrag } from './SheetDragHandle';

type Guide = { id: string; title: string; summary: string; content: string; placeName: string; placeAddress: string; googlePlaceId?: string; authorName: string; authorPicture?: string; createdAt: string; imageUrl: string };
type PlaceSuggestion = { id: string; name: string; description: string; address: string };
const corners = new CornerKit();

function formatMarkdownLocally(text: string) {
  return text.trim().split(/\n\s*\n/).filter(Boolean).map((paragraph) => {
    const clean = paragraph.trim();
    if (/^#{1,3}\s/.test(clean) || clean.split('\n').every((line) => /^[-*]\s/.test(line))) return clean;
    const firstLine = clean.split('\n')[0];
    if (/^[^.!?\n]{4,60}:$/.test(firstLine)) return `### ${firstLine.replace(/:$/, '')}\n\n${clean.split('\n').slice(1).join('\n')}`.trim();
    return clean;
  }).join('\n\n');
}

function GuideMarkdown({ content }: { content: string }) {
  return <div className="space-y-4 text-sm leading-7 text-neutral-700">{content.split(/\n\s*\n/).filter(Boolean).map((block, index) => {
    const text = block.trim();
    const heading = text.match(/^#{1,3}\s+(.+)$/);
    if (heading) return <h3 key={index} className="pt-2 text-lg font-bold leading-snug text-neutral-900">{heading[1]}</h3>;
    const lines = text.split('\n');
    if (lines.every((line) => /^[-*]\s+/.test(line))) return <ul key={index} className="space-y-2 pl-5">{lines.map((line, lineIndex) => <li key={lineIndex} className="list-disc marker:text-blue-500">{line.replace(/^[-*]\s+/, '')}</li>)}</ul>;
    return <p key={index}>{lines.map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br/>}{line.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) => part.startsWith('**') && part.endsWith('**') ? <strong key={partIndex}>{part.slice(2, -2)}</strong> : part)}</span>)}</p>;
  })}</div>;
}

function GuideComposer({ onClose, onPublished }: { onClose: () => void; onPublished: (guide: Guide) => void }) {
  const drag = useSheetDrag(onClose);
  const [step, setStep] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [placeAddress, setPlaceAddress] = useState('');
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [suggestionsBusy, setSuggestionsBusy] = useState(false);
  const [summary, setSummary] = useState('');
  const [draft, setDraft] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [formatNote, setFormatNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const labels = ['Portada', 'Lugar', 'Resumen', 'Guía', 'Vista previa'];

  useEffect(() => { corners.apply('[data-guide-sheet]', { radius: 32, smoothing: 1 }); }, [step, showAuth]);
  useEffect(() => {
    if (placeName.trim().length < 2 || (googlePlaceId && placeAddress) || placeName === suggestions.find((item) => item.name === placeName)?.name) { setSuggestions([]); return; }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSuggestionsBusy(true);
      try {
        const response = await apiFetch(`/api/places/suggest?q=${encodeURIComponent(placeName.trim())}`);
        const result = await response.json().catch(() => []);
        if (!cancelled) setSuggestions(Array.isArray(result) ? result.slice(0, 5) : []);
      } catch { if (!cancelled) setSuggestions([]); }
      finally { if (!cancelled) setSuggestionsBusy(false); }
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [placeName, googlePlaceId, placeAddress]);

  const chooseImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Elige una imagen válida.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('La imagen debe pesar 5 MB o menos.'); return; }
    setError('');
    setImageFile(file);
    setImagePreview((current) => { if (current.startsWith('blob:')) URL.revokeObjectURL(current); return URL.createObjectURL(file); });
  };

  const continueFlow = async () => {
    setError('');
    if (step === 0 && !imageFile) return setError('Agrega una imagen para la portada de tu guía.');
    if (step === 1 && !placeName.trim()) return setError('Escribe el nombre del lugar. No necesitas agregar una dirección.');
    if (step === 2 && !summary.trim()) return setError('Escribe un resumen corto para tu guía.');
    if (step === 3) {
      if (draft.trim().length < 30) return setError('Agrega un poco más de contenido para que la guía sea útil.');
      setBusy(true); setFormatNote('');
      try {
        const response = await apiFetch('/api/guides/format', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ title: `Guía de ${placeName.trim()}`, summary: summary.trim(), content: draft.trim() }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || typeof result.content !== 'string') throw new Error(result.error || 'No se pudo usar la IA.');
        setMarkdown(result.content);
      } catch {
        setMarkdown(formatMarkdownLocally(draft));
        setFormatNote('La IA no está disponible ahora; conservamos tu texto y aplicamos un formato básico para que puedas publicarlo.');
      } finally { setBusy(false); setStep(4); }
      return;
    }
    setStep((current) => Math.min(4, current + 1));
  };

  const publish = async () => {
    if (!imageFile || busy) return;
    setBusy(true); setError('');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        reader.readAsDataURL(imageFile);
      });
      const response = await apiFetch('/api/guides', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: `Guía de ${placeName.trim()}`, summary: summary.trim(), content: markdown || formatMarkdownLocally(draft), placeName: placeName.trim(), placeAddress, googlePlaceId, fileName: imageFile.name, mimeType: imageFile.type, base64 }) });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) { setShowAuth(true); return; }
      if (!response.ok || !result.id) throw new Error(result.error || 'No se pudo publicar la guía.');
      onPublished(result as Guide);
    } catch (publishError) { setError(publishError instanceof Error ? publishError.message : 'No se pudo publicar la guía.'); }
    finally { setBusy(false); }
  };

  return <>
    <motion.button type="button" aria-label="Cerrar creación de guía" onClick={onClose} className="fixed inset-0 z-[90] bg-black/65 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}/>
    <motion.section {...drag} data-guide-sheet role="dialog" aria-modal="true" aria-label="Crear una guía local" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 360 }} className="fixed inset-x-3 bottom-3 z-[91] mx-auto flex max-h-[90dvh] w-auto max-w-lg flex-col overflow-hidden rounded-[30px] bg-[#202124] text-white shadow-2xl sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2">
      <SheetDragHandle controls={drag.dragControls} className="absolute inset-x-0 top-0 z-10"/>
      <header className="relative flex shrink-0 items-center gap-3 border-b border-white/[0.07] px-5 pb-4 pt-7"><button type="button" onClick={() => step === 0 ? onClose() : setStep((current) => current - 1)} aria-label={step ? 'Paso anterior' : 'Cerrar'} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.07]">{step ? <ArrowLeft className="h-5 w-5"/> : <X className="h-5 w-5"/>}</button><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/40">Guías locales · Paso {step + 1} de 5</p><h2 className="mt-1 truncate text-xl font-bold">{['Elige una portada', '¿Qué lugar visitaste?', 'Resume tu guía', 'Cuéntanos todo', 'Así se verá'][step]}</h2></div></header>
      <div className="flex shrink-0 gap-1 px-5 pt-4">{labels.map((label, index) => <span key={label} className={`h-1 flex-1 rounded-full ${index <= step ? 'bg-blue-400' : 'bg-white/10'}`}/>)}</div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
        {step === 0 && <div><p className="mb-4 text-sm leading-relaxed text-white/55">Escoge cualquier foto para presentar tu guía. Conservaremos su proporción original.</p><input id="guide-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseImage} className="sr-only"/><label htmlFor="guide-image" className="flex min-h-52 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[26px] bg-[#292a2d] text-center [corner-shape:squircle]">{imagePreview ? <img src={imagePreview} alt="Vista previa de portada" className="max-h-[42dvh] w-full object-contain"/> : <><span className="mb-3 flex h-14 w-14 items-center justify-center rounded-[20px] bg-blue-400/15 text-blue-200"><ImagePlus className="h-7 w-7"/></span><span className="text-sm font-bold">Sube una imagen</span><span className="mt-1 text-xs text-white/40">JPG, PNG, WebP o GIF · hasta 5 MB</span></>}</label>{imagePreview && <button type="button" onClick={() => { setImagePreview((current) => { if (current.startsWith('blob:')) URL.revokeObjectURL(current); return ''; }); setImageFile(null); }} className="mt-3 text-xs font-semibold text-white/55">Cambiar imagen</button>}</div>}
        {step === 1 && <div><p className="mb-4 text-sm leading-relaxed text-white/55">Busca el negocio o lugar. También puedes escribir solo el nombre y continuar sin dirección.</p><label className="mb-2 block text-xs font-semibold text-white/55">Nombre del lugar<input value={placeName} onChange={(event) => { setPlaceName(event.target.value); setGooglePlaceId(''); setPlaceAddress(''); }} placeholder="Ej. Mercado Municipal" className="mt-2 h-12 w-full rounded-2xl bg-[#2b2c30] px-4 text-sm text-white outline-none placeholder:text-white/35 focus:ring-1 focus:ring-blue-400/40"/></label>{suggestionsBusy && <p className="flex items-center gap-2 py-2 text-xs text-white/45"><LoaderCircle className="h-3.5 w-3.5 animate-spin"/>Buscando lugares…</p>}{!!suggestions.length && <div className="mt-2 overflow-hidden rounded-2xl bg-[#292a2d]">{suggestions.map((item) => <button key={item.id || item.description} type="button" onClick={() => { setPlaceName(item.name); setPlaceAddress(item.address || item.description); setGooglePlaceId(item.id); setSuggestions([]); }} className="flex w-full items-start gap-3 border-b border-white/[0.06] px-3 py-3 text-left last:border-0"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-300"/><span className="min-w-0"><span className="block truncate text-sm font-semibold">{item.name}</span><span className="mt-0.5 block text-xs text-white/45">{item.address || item.description}</span></span></button>)}</div>}{placeAddress && <p className="mt-3 flex items-center gap-2 text-xs text-white/50"><Check className="h-4 w-4 text-blue-300"/>{placeAddress}</p>}<button type="button" onClick={() => { setGooglePlaceId(''); setPlaceAddress(''); setSuggestions([]); }} className="mt-3 flex items-center gap-2 text-xs font-semibold text-blue-300"><Search className="h-3.5 w-3.5"/>Usar solo el nombre, sin dirección</button></div>}
        {step === 2 && <div><p className="mb-4 text-sm leading-relaxed text-white/55">Dale a otras personas una idea rápida de lo que encontrarán en la guía.</p><label className="block text-xs font-semibold text-white/55">Resumen corto<textarea value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={240} rows={4} placeholder="Una ruta tranquila para descubrir…" className="mt-2 w-full resize-none rounded-[22px] bg-[#2b2c30] p-4 text-sm leading-relaxed text-white outline-none placeholder:text-white/35 focus:ring-1 focus:ring-blue-400/40"/></label><p className="mt-2 text-right text-[10px] text-white/35">{summary.length}/240</p></div>}
        {step === 3 && <div><p className="mb-4 text-sm leading-relaxed text-white/55">Escribe tus recomendaciones, el orden para visitar los lugares y cualquier consejo útil. La IA corregirá el texto y lo ordenará en Markdown.</p><label className="block text-xs font-semibold text-white/55">Tu guía<textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={12} placeholder={'Empieza por…\n\nDespués puedes…\n\nConsejo:…'} className="mt-2 min-h-64 w-full resize-y rounded-[22px] bg-[#2b2c30] p-4 text-sm leading-relaxed text-white outline-none placeholder:text-white/35 focus:ring-1 focus:ring-blue-400/40"/></label></div>}
        {step === 4 && <article><div className="mb-4 overflow-hidden rounded-[24px] bg-[#2b2c30] [corner-shape:squircle]">{imagePreview && <img src={imagePreview} alt="Portada de la guía" className="max-h-[38dvh] w-full object-contain"/>}<div className="p-4"><p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-blue-300"><MapPin className="h-3.5 w-3.5"/>{placeName}</p>{placeAddress && <p className="mt-1 text-xs text-white/45">{placeAddress}</p>}<h3 className="mt-3 text-xl font-bold">Guía de {placeName}</h3><p className="mt-2 text-sm leading-relaxed text-white/65">{summary}</p></div></div>{formatNote && <p className="mb-4 rounded-2xl bg-amber-300/10 p-3 text-xs leading-relaxed text-amber-100">{formatNote}</p>}<div className="rounded-[22px] bg-white p-4 [corner-shape:squircle]"><GuideMarkdown content={markdown || formatMarkdownLocally(draft)}/></div></article>}
        {error && <p role="alert" className="mt-4 rounded-2xl bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
      </div>
      <footer className="shrink-0 border-t border-white/[0.06] bg-[#202124] px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-3">{step < 4 ? <button type="button" disabled={busy} onClick={() => void continueFlow()} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-[#161719] disabled:opacity-60">{busy ? <><LoaderCircle className="h-4 w-4 animate-spin"/>Preparando con IA…</> : <>Continuar <ArrowRight className="h-4 w-4"/></>}</button> : <button type="button" disabled={busy} onClick={() => void publish()} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-blue-500 text-sm font-bold text-white disabled:opacity-60">{busy ? <><LoaderCircle className="h-4 w-4 animate-spin"/>Publicando…</> : <>Publicar guía <ArrowRight className="h-4 w-4"/></>}</button>}</footer>
    </motion.section>
    <AnimatePresence>{showAuth && <AccountRequiredPrompt onClose={() => setShowAuth(false)} message="Inicia sesión para publicar tu guía y compartirla con la comunidad."/>}</AnimatePresence>
  </>;
}

export function HomeGuidesSection({ onViewAll, onCreateGuide }: { onViewAll: () => void; onCreateGuide: () => void }) {
  const [guides, setGuides] = useState<Guide[]>([]);
  useEffect(() => {
    let active = true;
    const load = () => void apiFetch('/api/guides').then((response) => response.ok ? response.json() : []).then((items) => { if (active && Array.isArray(items)) setGuides(items); }).catch(() => undefined);
    load();
    const published = (event: Event) => { const guide = (event as CustomEvent<Guide>).detail; if (guide?.id) setGuides((current) => [guide, ...current.filter((item) => item.id !== guide.id)]); };
    window.addEventListener('community-guide-published', published);
    return () => { active = false; window.removeEventListener('community-guide-published', published); };
  }, []);
  return <section className="mb-10" aria-label="Guías locales">
    <div className="mb-4 flex items-end justify-between gap-3 px-5"><div><h2 className="text-2xl font-bold tracking-tight">Guías de la comunidad</h2><p className="mt-0.5 text-[15px] font-medium text-neutral-500">Ideas locales, compartidas por quienes conocen Nochistlán</p></div><button type="button" onClick={onViewAll} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-neutral-500">Ver todas <ChevronRight className="h-4 w-4"/></button></div>
    <button type="button" onClick={onCreateGuide} className="mx-5 mb-4 flex w-[calc(100%-2.5rem)] items-center gap-3 rounded-[24px] bg-[#202124] p-3.5 text-left text-white [corner-shape:squircle]"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-blue-400/15 text-blue-200"><Plus className="h-5 w-5"/></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">Crea una guía local</span><span className="mt-0.5 block text-xs text-white/50">Comparte tus lugares y consejos favoritos</span></span><ArrowRight className="h-4 w-4 text-white/45"/></button>
    {guides.length ? <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{guides.slice(0, 8).map((guide) => <button type="button" key={guide.id} onClick={onViewAll} className="relative h-[210px] w-[250px] shrink-0 snap-start overflow-hidden rounded-[28px] bg-neutral-200 text-left text-white [corner-shape:squircle]"><img src={guide.imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover"/><span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"/><span className="absolute bottom-4 left-4 right-4"><span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-blue-200"><BookOpen className="h-3.5 w-3.5"/>{guide.placeName}</span><span className="mt-1 block line-clamp-2 text-lg font-bold">{guide.title}</span><span className="mt-1 block line-clamp-2 text-xs text-white/70">{guide.summary}</span></span></button>)}</div> : <div className="mx-5 rounded-[24px] bg-neutral-100 px-4 py-5 text-center [corner-shape:squircle]"><Sparkles className="mx-auto h-5 w-5 text-blue-500"/><p className="mt-2 text-sm font-semibold text-neutral-700">Aún no hay guías locales</p><p className="mt-1 text-xs text-neutral-500">Sé la primera persona en compartir una con la comunidad.</p></div>}
  </section>;
}

export function LocalGuidesPage({ onCreateGuide }: { onCreateGuide: () => void }) {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [selected, setSelected] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    apiFetch('/api/guides').then((response) => response.ok ? response.json() : []).then((items) => { if (active && Array.isArray(items)) setGuides(items); }).catch(() => undefined).finally(() => { if (active) setLoading(false); });
    const published = (event: Event) => { const guide = (event as CustomEvent<Guide>).detail; if (guide?.id) setGuides((current) => [guide, ...current.filter((item) => item.id !== guide.id)]); };
    window.addEventListener('community-guide-published', published);
    return () => { active = false; window.removeEventListener('community-guide-published', published); };
  }, []);
  if (selected) return <main className="min-h-screen bg-[#f8f9fa] px-5 pb-36 pt-8"><button type="button" onClick={() => setSelected(null)} className="mb-5 flex items-center gap-2 text-sm font-semibold text-neutral-600"><ArrowLeft className="h-4 w-4"/>Todas las guías</button><article className="mx-auto max-w-2xl overflow-hidden rounded-[30px] bg-white shadow-sm [corner-shape:squircle]"><img src={selected.imageUrl} alt={selected.title} className="max-h-[62dvh] w-full bg-neutral-100 object-contain"/><div className="p-5 sm:p-8"><p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600"><MapPin className="h-4 w-4"/>{selected.placeName}</p>{selected.placeAddress && <p className="mt-1 text-xs text-neutral-500">{selected.placeAddress}</p>}<h1 className="mt-3 text-3xl font-extrabold tracking-tight">{selected.title}</h1><p className="mt-3 text-base leading-relaxed text-neutral-600">{selected.summary}</p><div className="mt-5 flex items-center gap-2 border-b border-neutral-100 pb-5 text-xs text-neutral-500">{selected.authorPicture ? <img src={selected.authorPicture} alt="" className="h-8 w-8 rounded-full object-cover"/> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">{selected.authorName?.slice(0, 1) || 'N'}</span>}<span>Guía de <b className="text-neutral-800">{selected.authorName || 'Comunidad local'}</b></span><span>·</span><span>{new Date(selected.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div><div className="pt-4"><GuideMarkdown content={selected.content}/></div></div></article></main>;
  return <main className="min-h-screen bg-[#f8f9fa] px-5 pb-36 pt-8"><header className="mx-auto mb-7 max-w-5xl"><p className="text-xs font-bold uppercase tracking-[.17em] text-blue-600">PuntoNochi · Comunidad</p><div className="mt-2 flex items-end justify-between gap-4"><div><h1 className="text-4xl font-extrabold tracking-tight">Guías locales</h1><p className="mt-2 max-w-lg text-sm leading-relaxed text-neutral-500">Consejos y recorridos compartidos por personas que conocen Nochistlán.</p></div><button type="button" onClick={onCreateGuide} className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-[#17181a] px-4 text-sm font-bold text-white"><Plus className="h-4 w-4"/>Crear guía</button></div></header>{loading ? <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0,1,2].map((item) => <div key={item} className="h-64 animate-pulse rounded-[28px] bg-neutral-200 [corner-shape:squircle]"/>)}</div> : guides.length ? <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">{guides.map((guide) => <button type="button" key={guide.id} onClick={() => setSelected(guide)} className="overflow-hidden rounded-[28px] bg-white text-left shadow-sm transition-transform active:scale-[.99] [corner-shape:squircle]"><div className="relative aspect-[4/3] bg-neutral-200"><img src={guide.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover"/><span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"><MapPin className="h-3.5 w-3.5"/>{guide.placeName}</span></div><div className="p-4"><h2 className="text-lg font-bold leading-snug">{guide.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-500">{guide.summary}</p><p className="mt-4 flex items-center gap-2 text-xs font-semibold text-neutral-500"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700">{guide.authorName?.slice(0, 1) || 'N'}</span>{guide.authorName || 'Comunidad local'}<ChevronRight className="ml-auto h-4 w-4"/></p></div></button>)}</div> : <div className="mx-auto max-w-lg rounded-[28px] bg-white px-6 py-12 text-center [corner-shape:squircle]"><BookOpen className="mx-auto h-9 w-9 text-blue-500"/><h2 className="mt-4 text-xl font-bold">Todavía no hay guías</h2><p className="mt-2 text-sm leading-relaxed text-neutral-500">Comparte tus lugares favoritos y ayuda a otras personas a descubrir Nochistlán.</p><button type="button" onClick={onCreateGuide} className="mt-5 rounded-full bg-[#17181a] px-5 py-3 text-sm font-bold text-white">Crear la primera guía</button></div>}</main>;
}

export function GuideComposerOverlay({ onClose }: { onClose: () => void }) {
  const published = (guide: Guide) => { window.dispatchEvent(new CustomEvent('community-guide-published', { detail: guide })); onClose(); };
  return <AnimatePresence><GuideComposer onClose={onClose} onPublished={published}/></AnimatePresence>;
}
