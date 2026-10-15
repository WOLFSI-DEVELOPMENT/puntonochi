import { useEffect, useState } from 'react';
import { CalendarDays, MapPin } from 'lucide-react';
import { apiFetch } from '../api';
import type { EventSummary } from './NewsPage';

const eventDay = (date: string) => {
  const value = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(value.getTime()) ? '—' : new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(value);
};

export function HomeEventsSection({ onViewAll, onOpenEvent }: { onViewAll: () => void; onOpenEvent: (id: string) => void }) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await apiFetch('/api/events');
        const result = await response.json().catch(() => []);
        if (active && response.ok && Array.isArray(result)) setEvents(result as EventSummary[]);
      } catch { /* The rest of Home stays available if events cannot load. */ }
      finally { if (active) setLoading(false); }
    };
    void load();
    const refresh = () => { void load(); };
    window.addEventListener('puntonochi:events-updated', refresh);
    return () => { active = false; window.removeEventListener('puntonochi:events-updated', refresh); };
  }, []);

  if (!loading && events.length === 0) return null;
  return <section className="mb-10">
    <div className="mb-4 flex items-end justify-between gap-3 px-5">
      <div><h2 className="text-2xl font-bold tracking-tight">Próximos eventos</h2><p className="mt-0.5 text-[15px] font-medium text-neutral-500">Planes y actividades de la comunidad</p></div>
      <button type="button" onClick={onViewAll} className="shrink-0 text-sm font-semibold text-[#1a73e8]">Ver todos</button>
    </div>
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 scrollbar-hide">
      {loading ? [0, 1].map((item) => <div key={item} className="h-[190px] w-[250px] shrink-0 animate-pulse rounded-[24px] bg-neutral-200"/>) : events.slice(0, 8).map((event) => <button key={event.id} type="button" onClick={() => onOpenEvent(event.id)} className="group relative h-[190px] w-[250px] shrink-0 snap-start overflow-hidden rounded-[24px] bg-[#25383e] text-left text-white">
        {event.imageUrl && <img src={event.imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"/>}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent"/>
        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-xl"><CalendarDays className="h-3 w-3"/>{eventDay(event.date)}{event.time ? ` · ${event.time}` : ''}</span>
        <span className="absolute inset-x-4 bottom-4"><span className="block line-clamp-2 text-lg font-bold leading-tight">{event.title}</span><span className="mt-1.5 flex items-center gap-1 truncate text-xs text-white/75"><MapPin className="h-3 w-3 shrink-0"/>{event.location}</span></span>
      </button>)}
    </div>
  </section>;
}
