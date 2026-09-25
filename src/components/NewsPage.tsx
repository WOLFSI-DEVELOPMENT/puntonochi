import { ArrowLeft, CalendarDays, Clock3, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, ExternalLink, ImagePlus, LoaderCircle, MapPin, Newspaper, Play, Plus, Share2, Sun, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import CornerKit, { type SquircleConfig } from '@cornerkit/core';
import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { YouTubeVideoOverlay } from './YouTubeVideoOverlay';
import { apiFetch } from '../api';
import { SheetDragHandle, useSheetDrag } from './SheetDragHandle';

const cornerKit = new CornerKit();
const newsCardCorners: SquircleConfig = { radius: 24, smoothing: 1 };

type Article = { title: string; description: string; content: string; url: string; image: string; publishedAt: string; source: string };
type WeatherDay = { date: string; weatherCode: number; high: number | null; low: number | null; precipitationChance: number | null };
type NewsVideo = { id: string; title: string; channel: string; publishedAt: string; thumbnail: string; isShort: boolean };
type PublicEvent = { id: string; title: string; date: string; endDate: string | null; time: string | null; location: string; description: string; imageUrl: string; createdAt?: string };

function eventDateLabel(event: PublicEvent) {
  const start = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${event.date}T12:00:00Z`));
  if (!event.endDate || event.endDate === event.date) return start;
  const end = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${event.endDate}T12:00:00Z`));
  return `${start} – ${end}`;
}

async function compressEventImage(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Elige un archivo de imagen válido.');
  if (file.size > 10 * 1024 * 1024) throw new Error('La imagen original debe pesar 10 MB o menos.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo procesar la imagen.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((image) => image ? resolve(image) : reject(new Error('No se pudo procesar la portada.')), 'image/webp', 0.84));
  if (blob.size > 5 * 1024 * 1024) throw new Error('La portada debe pesar 5 MB o menos después de optimizarla.');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(blob);
  });
  return { dataUrl, fileName: file.name };
}

function weatherIcon(code: number): LucideIcon {
  if (code === 0) return Sun;
  if (code <= 3) return CloudSun;
  if (code === 45 || code === 48) return CloudFog;
  if (code <= 57) return CloudDrizzle;
  if (code <= 67 || (code >= 80 && code <= 82)) return CloudRain;
  if (code <= 77 || code === 85 || code === 86) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

function dayName(value: string) {
  return new Intl.DateTimeFormat('es-MX', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`)).replace('.', '');
}

function dateLabel(value: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value));
}

function WeatherSkeleton() {
  return <section aria-label="Cargando pronóstico" role="status" className="rounded-[26px] bg-[#202124] p-4"><div className="mb-4 h-4 w-44 animate-pulse rounded-full bg-[#3b3d40]" /><div className="flex gap-2 overflow-hidden">{Array.from({ length: 7 }, (_, index) => <div key={index} className="h-24 min-w-16 flex-1 animate-pulse rounded-[18px] bg-[#303134]" />)}</div></section>;
}

function EventCreateSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (event: PublicEvent) => void }) {
  const sheetDrag = useSheetDrag(onClose);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [cover, setCover] = useState<{ dataUrl: string; fileName: string } | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  const selectCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setError('');
      setCover(await compressEventImage(file));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo procesar la portada.');
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cover) { setError('Agrega una imagen de portada para tu evento.'); return; }
    if (endDate && endDate < date) { setError('La fecha final debe ser igual o posterior a la fecha de inicio.'); return; }
    const comma = cover.dataUrl.indexOf(',');
    if (comma < 0) { setError('La imagen seleccionada no es válida.'); return; }
    setSaving(true);
    setError('');
    try {
      const response = await apiFetch('/api/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date, endDate: endDate || null, time: time || null, location, description, fileName: cover.fileName, mimeType: cover.dataUrl.slice(5, cover.dataUrl.indexOf(';')), base64: cover.dataUrl.slice(comma + 1) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'No se pudo publicar el evento.');
      onCreated(result as PublicEvent);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo publicar el evento.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65" onClick={onClose}>
    <motion.section {...sheetDrag} role="dialog" aria-modal="true" aria-labelledby="create-event-title" onClick={(event) => event.stopPropagation()} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 360, mass: 0.82 }} className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[30px] bg-[#202124] text-white shadow-2xl">
      <div className="relative shrink-0 border-b border-white/[0.08] px-5 pb-4 pt-1"><SheetDragHandle controls={sheetDrag.dragControls}/><div className="flex items-center justify-between"><div><p className="text-[11px] font-semibold tracking-[0.16em] text-white/45">PUNTONOCHI · COMUNIDAD</p><h2 id="create-event-title" className="mt-1 text-xl font-bold">Publica un evento</h2></div><button type="button" aria-label="Cerrar" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white/80"><X className="h-5 w-5"/></button></div></div>
      <form onSubmit={submit} className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 [touch-action:pan-y]">
        <label className="block"><span className="mb-2 block text-sm font-semibold">Nombre del evento</span><input required maxLength={140} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Feria de Nochistlán" className="w-full rounded-2xl bg-[#303134] px-4 py-3.5 text-sm outline-none placeholder:text-white/35 focus:ring-2 focus:ring-white/20"/></label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-sm font-semibold">Fecha</span><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-2xl bg-[#303134] px-4 py-3.5 text-sm [color-scheme:dark] outline-none focus:ring-2 focus:ring-white/20"/></label><label className="block"><span className="mb-2 block text-sm font-semibold">Fecha final <span className="font-normal text-white/40">(opcional)</span></span><input type="date" min={date || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} className="w-full rounded-2xl bg-[#303134] px-4 py-3.5 text-sm [color-scheme:dark] outline-none focus:ring-2 focus:ring-white/20"/></label></div>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Hora <span className="font-normal text-white/40">(opcional)</span></span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="w-full rounded-2xl bg-[#303134] px-4 py-3.5 text-sm [color-scheme:dark] outline-none focus:ring-2 focus:ring-white/20"/></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Dirección o lugar</span><input required maxLength={240} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Plaza principal, Nochistlán" className="w-full rounded-2xl bg-[#303134] px-4 py-3.5 text-sm outline-none placeholder:text-white/35 focus:ring-2 focus:ring-white/20"/></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Descripción</span><textarea required maxLength={4000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Cuéntale a la comunidad de qué trata..." className="w-full resize-y rounded-2xl bg-[#303134] px-4 py-3.5 text-sm outline-none placeholder:text-white/35 focus:ring-2 focus:ring-white/20"/></label>
        <div><span className="mb-2 block text-sm font-semibold">Imagen de portada</span><label className="flex min-h-32 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-[#303134] text-center">{cover ? <img src={cover.dataUrl} alt="Vista previa de portada" className="h-44 w-full object-cover"/> : <span className="flex flex-col items-center gap-2 p-5 text-sm text-white/55"><ImagePlus className="h-7 w-7"/>Toca para elegir una imagen<span className="text-xs text-white/35">JPG, PNG o WebP · se optimiza al subir</span></span>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectCover} className="sr-only"/></label></div>
        {error && <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2.5 text-sm text-red-200">{error}</p>}
        <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-bold text-black disabled:opacity-50">{saving ? <><LoaderCircle className="h-4 w-4 animate-spin"/>Publicando...</> : 'Publicar evento'}</button>
        <p className="pb-2 text-center text-xs text-white/40">El evento quedará visible para toda la comunidad.</p>
      </form>
      </motion.section>
  </div>;
}

export function NewsPage() {
  const [weather, setWeather] = useState<WeatherDay[]>([]);
  const [weatherError, setWeatherError] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [videos, setVideos] = useState<NewsVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [videosError, setVideosError] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<NewsVideo | null>(null);
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null);
  const [eventDetailLoading, setEventDetailLoading] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const reduceMotion = useReducedMotion();

  const loadWeather = () => {
    setWeatherError('');
    void fetch('/api/weather')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo cargar el pronóstico.');
        setWeather(result.days || []);
      })
      .catch((error) => setWeatherError(error instanceof Error ? error.message : 'No se pudo cargar el pronóstico.'));
  };

  const loadNews = () => {
    setNewsLoading(true);
    setNewsError('');
    void fetch('/api/gnews')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudieron cargar las noticias.');
        setArticles(result.articles || []);
      })
      .catch((error) => setNewsError(error instanceof Error ? error.message : 'No se pudieron cargar las noticias.'))
      .finally(() => setNewsLoading(false));
  };

  const loadVideos = () => {
    setVideosLoading(true);
    setVideosError('');
    void fetch('/api/youtube-news')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudieron cargar los videos.');
        setVideos(result.videos || []);
      })
      .catch((error) => setVideosError(error instanceof Error ? error.message : 'No se pudieron cargar los videos.'))
      .finally(() => setVideosLoading(false));
  };

  const loadEvents = () => {
    setEventsLoading(true);
    setEventsError('');
    void apiFetch('/api/events')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudieron cargar los eventos.');
        setEvents(Array.isArray(result) ? result : []);
      })
      .catch((error) => setEventsError(error instanceof Error ? error.message : 'No se pudieron cargar los eventos.'))
      .finally(() => setEventsLoading(false));
  };

  const loadEvent = async (id: string) => {
    setSelectedEvent(null);
    setEventDetailLoading(true);
    try {
      const response = await apiFetch(`/api/events/${encodeURIComponent(id)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo cargar el evento.');
      setSelectedEvent(result as PublicEvent);
    } catch {
      setSelectedEvent(null);
    } finally {
      setEventDetailLoading(false);
    }
  };

  const openEvent = (event: PublicEvent) => {
    setSelectedEvent(event);
    window.history.pushState({}, '', `/eventos/${encodeURIComponent(event.id)}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const closeEvent = () => {
    setSelectedEvent(null);
    setEventDetailLoading(false);
    window.history.pushState({}, '', '/noticias');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    loadWeather();
    loadNews();
    loadVideos();
    loadEvents();
    const eventPath = window.location.pathname.match(/^\/eventos\/([^/]+)\/?$/);
    if (eventPath) void loadEvent(decodeURIComponent(eventPath[1]));
    const onPopState = () => {
      const match = window.location.pathname.match(/^\/eventos\/([^/]+)\/?$/);
      if (match) void loadEvent(decodeURIComponent(match[1]));
      else { setSelectedEvent(null); setEventDetailLoading(false); }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    cornerKit.applyAll('[data-news-squircle]', newsCardCorners);
  }, [articles, newsLoading, newsError, selectedArticle, weather, weatherError, videos, videosLoading, videosError, events, eventsLoading, selectedEvent]);

  const shareEvent = async (event: PublicEvent) => {
    const url = `${window.location.origin}/eventos/${encodeURIComponent(event.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: event.title, text: `${event.title} · ${eventDateLabel(event)}`, url });
      else { await navigator.clipboard.writeText(url); window.alert('Enlace del evento copiado.'); }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') window.alert('No se pudo compartir el evento.');
    }
  };

  if (eventDetailLoading) return <main className="min-h-screen bg-[#111111] px-5 pb-36 pt-6 text-white"><div className="mx-auto max-w-3xl"><button type="button" onClick={closeEvent} className="mb-5 flex items-center gap-2 rounded-full bg-[#292929] px-4 py-2.5 text-sm font-semibold"><ArrowLeft className="h-4 w-4"/>Volver a eventos</button><div className="aspect-[16/10] animate-pulse rounded-[26px] bg-[#202124]"/><div className="mt-5 h-7 w-3/4 animate-pulse rounded-full bg-[#202124]"/></div></main>;

  if (selectedEvent) return <main className="min-h-screen bg-[#111111] px-5 pb-36 pt-6 text-white"><div className="mx-auto max-w-3xl"><div className="mb-5 flex items-center justify-between gap-3"><button type="button" onClick={closeEvent} className="flex items-center gap-2 rounded-full bg-[#292929] px-4 py-2.5 text-sm font-semibold"><ArrowLeft className="h-4 w-4"/>Eventos</button><button type="button" onClick={() => void shareEvent(selectedEvent)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#292929]" aria-label="Compartir evento"><Share2 className="h-4 w-4"/></button></div><img data-news-squircle src={selectedEvent.imageUrl} alt={`Portada de ${selectedEvent.title}`} className="mb-6 aspect-[16/10] w-full rounded-[26px] bg-[#202124] object-cover"/><p className="text-sm font-medium capitalize text-white/50">{eventDateLabel(selectedEvent)}</p><h1 className="mt-2 text-3xl font-bold leading-tight">{selectedEvent.title}</h1><div className="mt-5 space-y-3"><div className="flex items-start gap-3 rounded-2xl bg-[#202124] p-4"><CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-white/60"/><span className="text-sm">{eventDateLabel(selectedEvent)}</span></div>{selectedEvent.time && <div className="flex items-start gap-3 rounded-2xl bg-[#202124] p-4"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-white/60"/><span className="text-sm">{selectedEvent.time}</span></div>}<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.location)}`} target="_blank" rel="noreferrer" className="flex items-start gap-3 rounded-2xl bg-[#202124] p-4"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-white/60"/><span className="min-w-0 flex-1 text-sm">{selectedEvent.location}</span><ExternalLink className="h-4 w-4 shrink-0 text-white/40"/></a></div><p className="mt-6 whitespace-pre-wrap text-base leading-7 text-white/75">{selectedEvent.description}</p><button type="button" onClick={() => void shareEvent(selectedEvent)} className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-bold text-black"><Share2 className="h-4 w-4"/>Compartir evento</button></div></main>;

  if (selectedArticle) {
    return (
      <main className="min-h-screen bg-[#111111] px-5 pb-36 pt-6 text-white">
        <div className="mx-auto max-w-3xl">
          <button type="button" onClick={() => setSelectedArticle(null)} className="mb-5 flex items-center gap-2 rounded-full bg-[#292929] px-4 py-2.5 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />Volver a noticias</button>
          {selectedArticle.image && <img data-news-squircle src={selectedArticle.image} alt="" className="mb-6 aspect-[16/10] w-full rounded-[26px] object-cover" />}
          <p className="text-sm font-medium text-white/50">{selectedArticle.source} · {dateLabel(selectedArticle.publishedAt)}</p>
          <h1 className="mt-3 text-2xl font-bold leading-tight sm:text-4xl">{selectedArticle.title}</h1>
          <p className="mt-5 text-base leading-7 text-white/75">{selectedArticle.description || selectedArticle.content}</p>
          <a href={selectedArticle.url} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black">Leer artículo completo <ExternalLink className="h-4 w-4" /></a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#111111] px-5 pb-36 pt-8 text-white">
      <div className="mx-auto max-w-3xl">
        {weather.length ? (
          <section data-news-squircle aria-label="Pronóstico semanal de Nochistlán" className="rounded-[26px] bg-[#202124] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h2 className="text-sm font-semibold">Pronóstico semanal</h2><p className="mt-1 text-xs text-white/50">Nochistlán, Zacatecas</p></div>
              <span className="text-xs text-white/45">7 días</span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {weather.map((day) => {
                const Icon = weatherIcon(day.weatherCode);
                return <div data-news-squircle key={day.date} className="flex min-w-[62px] flex-1 flex-col items-center gap-2 rounded-[18px] bg-[#292a2d] px-2 py-3 text-center">
                  <span className="text-[11px] font-semibold capitalize text-white/60">{dayName(day.date)}</span>
                  <Icon className="h-5 w-5 text-white/80" strokeWidth={1.8} />
                  <span className="whitespace-nowrap text-xs font-semibold">{day.high === null ? '—' : `${Math.round(day.high)}°`} <span className="font-normal text-white/45">{day.low === null ? '—' : `${Math.round(day.low)}°`}</span></span>
                  {day.precipitationChance !== null && <span className="text-[10px] text-sky-200/70">{day.precipitationChance}% lluvia</span>}
                </div>;
              })}
            </div>
          </section>
        ) : weatherError ? (
          <section className="rounded-[26px] bg-[#202124] p-4"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Pronóstico semanal</h2><p role="alert" className="mt-1 text-xs text-white/50">{weatherError}</p></div><button type="button" onClick={loadWeather} className="text-xs font-semibold text-white/75">Reintentar</button></div></section>
        ) : <WeatherSkeleton />}

        <section aria-label="Videos de noticias de hoy" className="mt-6 overflow-hidden">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div><h2 className="text-lg font-semibold">Noticias en video</h2><p className="mt-1 text-xs text-white/45">Últimos videos de hoy · México</p></div>
            <span className="text-xs text-white/40">YouTube</span>
          </div>
          {videosLoading ? (
            <div className="flex gap-3 overflow-hidden" role="status" aria-label="Cargando videos">
              {[0, 1, 2].map((item) => <div key={item} className="h-56 w-[78vw] max-w-[270px] shrink-0 animate-pulse rounded-[24px] bg-[#202124]" />)}
            </div>
          ) : videosError ? (
            <div className="rounded-[24px] bg-[#202124] p-4"><p role="alert" className="text-sm text-white/65">{videosError}</p><button type="button" onClick={loadVideos} className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">Reintentar</button></div>
          ) : videos.length ? (
            <div className="relative overflow-hidden" style={{ perspective: 1100 }}>
              <motion.div
                className="flex w-max py-1"
                animate={reduceMotion ? undefined : { x: ['0%', '-50%'] }}
                transition={reduceMotion ? undefined : { duration: Math.max(38, videos.length * 5), ease: 'linear', repeat: Infinity }}
              >
                {[0, 1].map((copy) => (
                  <div aria-hidden={copy === 1} key={`set-${copy}`} className="flex shrink-0 gap-3 pr-3">
                    {videos.map((video, index) => (
                      <motion.button
                        data-news-squircle
                        key={`${video.id}-${copy}-${index}`}
                        type="button"
                        onClick={() => setSelectedVideo(video)}
                        aria-label={`${video.title} · ${video.channel}`}
                        className="group w-[78vw] max-w-[270px] shrink-0 overflow-hidden rounded-[24px] bg-[#202124] p-2.5 text-left"
                        style={{ transformStyle: 'preserve-3d' }}
                        whileHover={{ rotateY: -5, scale: 1.025, z: 18 }}
                        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
                      >
                        <div data-news-squircle className="relative aspect-video overflow-hidden rounded-[18px] bg-[#303134]">
                          {video.thumbnail && <img src={video.thumbnail} alt="" loading={index < 4 ? 'eager' : 'lazy'} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                          <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/35"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/65 text-white"><Play aria-hidden="true" className="ml-0.5 h-5 w-5 fill-current" /></span></span>
                        </div>
                        <p className="mt-2 truncate text-[11px] font-medium text-white/45">{video.channel} · {dateLabel(video.publishedAt)}</p>
                        <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">{video.title}</h3>
                      </motion.button>
                    ))}
                  </div>
                ))}
              </motion.div>
            </div>
          ) : (
            <div className="rounded-[24px] bg-[#202124] p-4 text-sm text-white/55">No hay videos publicados hoy por estos medios.</div>
          )}
        </section>

        <section aria-label="Eventos de la comunidad" className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Eventos</h2><p className="mt-1 text-xs text-white/45">Qué hacer en Nochistlán</p></div><button type="button" onClick={() => setShowCreateEvent(true)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2.5 text-sm font-bold text-black"><Plus className="h-4 w-4"/>Crear</button></div>
          {eventsLoading ? <div role="status" aria-label="Cargando eventos" className="space-y-3">{[0, 1].map((item) => <div key={item} className="h-48 animate-pulse rounded-[24px] bg-[#202124]" />)}</div> : eventsError ? <div className="rounded-[24px] bg-[#202124] p-4"><p role="alert" className="text-sm text-white/65">{eventsError}</p><button type="button" onClick={loadEvents} className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">Reintentar</button></div> : events.length ? <div className="space-y-3">{events.map((event) => <button data-news-squircle key={event.id} type="button" onClick={() => openEvent(event)} className="group relative block w-full overflow-hidden rounded-[24px] bg-[#202124] text-left"><img src={event.imageUrl} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"/><div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"/><div className="absolute inset-x-0 bottom-0 p-4"><p className="flex items-center gap-1.5 text-xs font-semibold capitalize text-white/70"><CalendarDays className="h-3.5 w-3.5"/>{eventDateLabel(event)}{event.time ? ` · ${event.time}` : ''}</p><h3 className="mt-1 line-clamp-2 text-lg font-bold leading-snug">{event.title}</h3><p className="mt-1 flex items-center gap-1 truncate text-xs text-white/65"><MapPin className="h-3.5 w-3.5 shrink-0"/>{event.location}</p></div></button>)}</div> : <div className="rounded-[24px] bg-[#202124] p-5"><p className="text-sm text-white/60">Todavía no hay eventos publicados.</p><button type="button" onClick={() => setShowCreateEvent(true)} className="mt-3 text-sm font-semibold text-white">Sé la primera persona en agregar uno</button></div>}
        </section>

        <h1 className="mb-2 mt-7 text-2xl font-bold tracking-tight">Noticias</h1>
        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">México hoy</h2><p className="mt-1 text-xs text-white/45">Noticias en español · GNews</p></div></div>
          {newsLoading ? (
            <div role="status" aria-label="Cargando noticias" className="space-y-3">{[0, 1, 2].map((item) => <div key={item} className="flex animate-pulse gap-3 rounded-[24px] bg-[#202124] p-3"><div className="h-24 w-28 shrink-0 rounded-[18px] bg-[#303134]" /><div className="flex flex-1 flex-col justify-center gap-3"><div className="h-3 w-20 rounded-full bg-[#3b3d40]" /><div className="h-4 w-full rounded-full bg-[#3b3d40]" /><div className="h-3 w-3/5 rounded-full bg-[#303134]" /></div></div>)}</div>
          ) : newsError ? (
            <div className="rounded-[24px] bg-[#202124] p-5"><p role="alert" className="text-sm text-white/70">{newsError}</p><button type="button" onClick={loadNews} className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">Reintentar</button></div>
          ) : articles.length ? (
            <div className="space-y-3">
              {articles.map((article, index) => <button data-news-squircle key={`${article.url}-${index}`} type="button" onClick={() => { setSelectedArticle(article); window.scrollTo({ top: 0, behavior: 'instant' }); }} className="flex w-full gap-3 rounded-[24px] bg-[#202124] p-3 text-left transition-colors hover:bg-[#292a2d]">
                {article.image ? <img data-news-squircle src={article.image} alt="" loading={index < 3 ? 'eager' : 'lazy'} className="h-24 w-28 shrink-0 rounded-[18px] object-cover sm:h-28 sm:w-36" /> : <div data-news-squircle className="flex h-24 w-28 shrink-0 items-center justify-center rounded-[18px] bg-[#303134] text-white/35"><Newspaper className="h-7 w-7" /></div>}
                <span className="flex min-w-0 flex-1 flex-col justify-center">
                  <span className="mb-1 truncate text-xs font-medium text-white/45">{article.source} · {dateLabel(article.publishedAt)}</span>
                  <span className="line-clamp-3 text-sm font-semibold leading-snug">{article.title}</span>
                  <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/55">{article.description}</span>
                </span>
              </button>)}
            </div>
          ) : <p className="rounded-[24px] bg-[#202124] p-5 text-sm text-white/60">No hay noticias disponibles ahora.</p>}
          {newsLoading && <LoaderCircle className="mx-auto mt-5 h-5 w-5 animate-spin text-white/50" />}
        </section>
      </div>
      <YouTubeVideoOverlay
        video={selectedVideo ? {
          id: selectedVideo.id,
          title: selectedVideo.title,
          creator: selectedVideo.channel,
          isShort: selectedVideo.isShort,
          thumbnail: selectedVideo.thumbnail,
        } : null}
        onClose={() => setSelectedVideo(null)}
      />
      {showCreateEvent && <EventCreateSheet onClose={() => setShowCreateEvent(false)} onCreated={(event) => { setEvents((current) => [event, ...current.filter((item) => item.id !== event.id)]); setShowCreateEvent(false); openEvent(event); }} />}
    </main>
  );
}
