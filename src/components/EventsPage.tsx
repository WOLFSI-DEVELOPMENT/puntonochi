import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CalendarDays, ChevronRight, ImagePlus, LoaderCircle, MapPin, Plus, Share2, Ticket, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { apiFetch } from '../api';
import { EventCreateSheet, type EventSummary } from './NewsPage';
import { AccountRequiredPrompt } from './AccountSheets';

const dateParts = (value: string) => {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return { day: '—', month: '—', weekday: '' };
  return {
    day: new Intl.DateTimeFormat('es-MX', { day: 'numeric', timeZone: 'UTC' }).format(date),
    month: new Intl.DateTimeFormat('es-MX', { month: 'short', timeZone: 'UTC' }).format(date).replace('.', '').toUpperCase(),
    weekday: new Intl.DateTimeFormat('es-MX', { weekday: 'long', timeZone: 'UTC' }).format(date),
  };
};

const eventDate = (event: EventSummary) => {
  const start = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${event.date}T12:00:00Z`));
  if (!event.endDate || event.endDate === event.date) return start;
  return `${start} – ${new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${event.endDate}T12:00:00Z`))}`;
};

export function EventsPage({ autoCreate = false, onAutoCreateHandled, embedded = false, onClose }: { autoCreate?: boolean; onAutoCreateHandled?: () => void; embedded?: boolean; onClose?: () => void }) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<EventSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  const autoCreateProcessed = useRef(false);
  const [albumOpen, setAlbumOpen] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch('/api/events');
      const result = await response.json().catch(() => []);
      if (!response.ok) throw new Error(result.error || 'No se pudieron cargar los eventos.');
      const list = Array.isArray(result) ? result as EventSummary[] : [];
      setEvents(list);
      return list;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los eventos.');
      return [];
    } finally { setLoading(false); }
  }, []);

  const loadEventDetail = useCallback(async (eventId: string) => {
    setDetailLoading(true);
    try {
      const response = await apiFetch(`/api/events/${encodeURIComponent(eventId)}`);
      const result = await response.json();
      if (response.ok) setSelected(result as EventSummary);
    } catch { /* Keep the card details already loaded while the connection recovers. */ }
    finally { setDetailLoading(false); }
  }, []);

  const openEvent = useCallback(async (event: EventSummary) => {
    setSelected(event);
    if (!embedded) window.history.pushState({}, '', `/eventos/${encodeURIComponent(event.id)}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (!event.gallery?.length) void loadEventDetail(event.id);
  }, [loadEventDetail]);

  const closeEvent = useCallback(() => {
    setSelected(null);
    setDetailLoading(false);
    if (!embedded) window.history.pushState({}, '', '/eventos');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    void loadEvents().then((list) => {
      const eventId = window.location.pathname.match(/^\/eventos\/([^/]+)\/?$/)?.[1];
      const match = eventId ? list.find((event) => event.id === decodeURIComponent(eventId)) : undefined;
      if (eventId) {
        if (match) setSelected(match);
        void loadEventDetail(decodeURIComponent(eventId));
      }
    });
    const onPopState = () => {
      const eventId = window.location.pathname.match(/^\/eventos\/([^/]+)\/?$/)?.[1];
      if (!eventId) { setSelected(null); setDetailLoading(false); return; }
      void loadEventDetail(decodeURIComponent(eventId));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  // Event routes are initialized once; opening an event uses the latest API result.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadEvents, loadEventDetail]);

  const requestCreate = async () => {
    try {
      const response = await fetch('/api/account/session', { cache: 'no-store', credentials: 'same-origin' });
      const session = await response.json().catch(() => ({}));
      if (!response.ok || !session.authenticated) { setShowAccountPrompt(true); return; }
      setShowCreate(true);
    } catch { setShowAccountPrompt(true); }
  };

  useEffect(() => {
    if (!autoCreate) { autoCreateProcessed.current = false; return; }
    if (autoCreateProcessed.current) return;
    autoCreateProcessed.current = true;
    onAutoCreateHandled?.();
    if (embedded) setShowCreate(true);
    else void requestCreate();
  }, [autoCreate, onAutoCreateHandled, embedded]);

  const shareEvent = async (event: EventSummary) => {
    const url = `${window.location.origin}/eventos/${encodeURIComponent(event.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: event.title, text: `${event.title} · ${eventDate(event)}`, url });
      else { await navigator.clipboard.writeText(url); window.alert('Enlace del evento copiado.'); }
    } catch (cause) { if (cause instanceof Error && cause.name !== 'AbortError') window.alert('No se pudo compartir el evento.'); }
  };

  const sortedEvents = useMemo(() => [...events].sort((a, b) => a.date.localeCompare(b.date)), [events]);
  const featured = sortedEvents.find((event) => event.date >= new Date().toISOString().slice(0, 10)) || sortedEvents[0];
  const otherEvents = sortedEvents.filter((event) => event.id !== featured?.id);

  return <main className={`fixed inset-0 z-[90] overflow-y-auto bg-[#343630] text-white ${embedded ? '' : ''}`}>
    <button type="button" aria-label="Cerrar eventos" onClick={() => onClose ? onClose() : window.location.assign('/explorar')} className="fixed left-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 backdrop-blur-xl"><X className="h-5 w-5"/></button>
    {selected ? <div className="relative mx-auto min-h-dvh max-w-[560px] px-2 pb-10 pt-16">
      {selected.imageUrl && <img src={selected.imageUrl} alt="" className="pointer-events-none fixed inset-0 h-full w-full scale-110 object-cover opacity-40 blur-3xl"/>}
      <div className="relative space-y-2">
        <button type="button" onClick={closeEvent} className="mb-3 flex items-center gap-2 px-3 text-sm"><ArrowLeft className="h-4 w-4"/>Eventos</button>
        <div className="relative min-h-[62dvh] overflow-hidden rounded-[28px]">{selected.imageUrl && <img src={selected.imageUrl} alt={selected.title} className="absolute inset-0 h-full w-full object-cover"/>}<div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent"/><div className="absolute inset-x-4 bottom-7 text-center"><h1 className="text-3xl font-bold">{selected.title}</h1><p className="mt-3 text-sm">{eventDate(selected)} {selected.time}</p><p className="mt-1 text-xs text-white/65">{selected.location}</p></div></div>
        <div className="rounded-[24px] bg-black/25 p-6 text-center backdrop-blur-xl"><p className="whitespace-pre-wrap text-sm leading-6">{selected.description}</p></div>
        <section className="overflow-hidden rounded-[24px] bg-black/25 p-3 backdrop-blur-xl"><div className="mb-3 flex items-center gap-2 px-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-white/65"/>Cómo llegar</div><iframe title={`Mapa de ${selected.location}`} src={`https://www.google.com/maps?q=${encodeURIComponent(`${selected.location}, Nochistlán de Mejía, Zacatecas`)}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-[260px] w-full rounded-[18px] border-0"/><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selected.location}, Nochistlán de Mejía, Zacatecas`)}`} target="_blank" rel="noreferrer" className="mt-2 flex h-10 items-center justify-center rounded-full bg-white/[.08] text-xs font-semibold">Abrir en Google Maps</a></section>
        <button type="button" onClick={() => setAlbumOpen(true)} className="w-full rounded-[24px] bg-black/25 p-6 text-center backdrop-blur-xl"><h2 className="text-sm font-semibold">Álbum compartido</h2><div className="my-5 flex justify-center -space-x-2">{(selected.gallery || []).slice(0,3).map((photo,index) => <img key={photo.id} src={photo.imageUrl} alt="" style={{ transform: `rotate(${(index-1)*8}deg)` }} className="h-28 w-24 rounded-xl object-cover"/>)}</div><span className="inline-flex rounded-full bg-white px-6 py-2 text-xs font-bold text-black">Ver fotos</span></button>
        <button type="button" onClick={() => void shareEvent(selected)} className="w-full rounded-[24px] bg-black/25 p-5 text-sm font-semibold backdrop-blur-xl">Compartir evento</button>
      </div>
    </div> : <div className="mx-auto flex min-h-dvh max-w-[960px] flex-col items-center justify-center pb-10 pt-20">
      <div className="flex w-full snap-x snap-mandatory gap-4 overflow-x-auto px-[12vw] pb-8 sm:justify-center sm:px-8">
        {loading ? [0,1].map(i => <div key={i} className="h-[48dvh] min-w-[230px] animate-pulse rounded-[26px] bg-white/5"/>) : sortedEvents.length ? sortedEvents.map(event => <button key={event.id} type="button" onClick={() => void openEvent(event)} className="relative h-[48dvh] min-h-[300px] max-h-[480px] w-[66vw] max-w-[290px] shrink-0 snap-center overflow-hidden rounded-[26px] bg-[#55584a]">{event.imageUrl && <img src={event.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover"/>}<div className="absolute inset-0 bg-gradient-to-t from-[#3c452b]/95 via-transparent to-transparent"/><div className="absolute inset-x-4 bottom-6 text-center"><h2 className="text-2xl font-bold leading-tight">{event.title}</h2><p className="mt-3 text-xs text-white/80">{eventDate(event)} {event.time}</p><p className="mt-1 text-[11px] text-white/60">{event.location}</p></div></button>) : <div className="flex h-[43dvh] min-h-[270px] w-full max-w-[280px] flex-col items-center justify-center rounded-[26px] bg-gradient-to-br from-[#69715b] via-[#4a5144] to-[#262e28]"><CalendarDays className="h-14 w-14 text-white/40"/><p className="mt-5 text-sm text-white/65">Tu próximo evento empieza aquí</p></div>}
      </div>
      <div className="max-w-[340px] px-5 text-center"><p className="text-sm font-semibold text-white/45">Te damos la bienvenida a</p><h1 className="mt-1 text-[38px] font-bold leading-tight tracking-tight">Punto Events</h1><p className="mt-4 text-sm leading-6 text-white/50">Crea invitaciones para tus mejores momentos. Descubre eventos y comparte un álbum con tu comunidad.</p><button type="button" onClick={() => setShowCreate(true)} className="mt-8 rounded-full bg-white px-8 py-3 text-sm font-bold text-black">Crear un evento</button></div>
    </div>}
    <AnimatePresence>{showCreate && <EventCreateSheet onClose={() => { setShowCreate(false); if (embedded) onClose?.(); }} onCreated={(event) => { setEvents((current) => [event, ...current]); setShowCreate(false); void openEvent(event); }}/>}</AnimatePresence>
    {albumOpen && selected && <div className="fixed inset-0 z-[110] overflow-y-auto bg-[#141414] px-2 pb-8 pt-20 text-white"><div className="fixed inset-x-0 top-0 flex h-16 items-center justify-between bg-[#141414]/90 px-4 backdrop-blur-xl"><button type="button" aria-label="Cerrar álbum" onClick={() => setAlbumOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><X className="h-5 w-5"/></button></div><div className="mx-auto max-w-3xl"><h2 className="px-2 text-2xl font-bold">{selected.title}</h2><p className="mb-6 mt-1 px-2 text-xs text-white/45">{selected.gallery?.length || 0} fotos</p><div className="grid grid-cols-3 gap-2">{selected.gallery?.map(photo => <img key={photo.id} src={photo.imageUrl} alt="Foto del evento" className="aspect-[.75] w-full rounded-[8px] object-cover"/>)}</div></div></div>}
    <AnimatePresence>{showAccountPrompt && <AccountRequiredPrompt onClose={() => setShowAccountPrompt(false)}/>}</AnimatePresence>
  </main>;
}
