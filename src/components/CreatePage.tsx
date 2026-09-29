import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, CalendarDays, Camera, Clock3, FileText, LayoutTemplate, LoaderCircle, QrCode, Sparkles, Store, WandSparkles } from 'lucide-react';
import { CreatePostFlow } from './CreatePostFlow';
import { AccountAuthSheet, AccountRequiredPrompt } from './AccountSheets';
import { EventCreateSheet } from './NewsPage';
import type { EventSummary } from './NewsPage';

type Account = { id: string; name: string; picture: string | null };
type FeedPost = { id: string; postType: 'day' | 'business'; caption: string; createdAt: string; imageUrl: string; placeName?: string | null; authorName?: string | null; profileId?: string | null };
type Project = { id: string; title: string; subtitle: string; image: string; date: string; kind: 'event' | 'post'; };

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(date);
}

export function CreatePage({ account }: { account: Account | null }) {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showPostFlow, setShowPostFlow] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void fetch('/api/account/session', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => response.ok ? response.json() : null)
      .then((session) => { if (active) { setAuthenticated(Boolean(session?.authenticated)); setAuthChecked(true); if (!session?.authenticated) setShowAuth(true); } })
      .catch(() => { if (active) { setAuthenticated(false); setAuthChecked(true); setShowAuth(true); } });
    return () => { active = false; };
  }, []);

  const loadProjects = () => {
    let active = true;
    setLoading(true);
    void Promise.allSettled([
      fetch('/api/community-posts/feed', { cache: 'no-store' }).then(async (response) => { const value = await response.json(); if (!response.ok) throw new Error(); return Array.isArray(value) ? value as FeedPost[] : []; }),
      fetch('/api/events', { cache: 'no-store' }).then(async (response) => { const value = await response.json(); if (!response.ok) throw new Error(); return Array.isArray(value) ? value as EventSummary[] : []; }),
    ]).then(([postResult, eventResult]) => {
      if (!active) return;
      setPosts(postResult.status === 'fulfilled' ? postResult.value : []);
      setEvents(eventResult.status === 'fulfilled' ? eventResult.value : []);
      setLoading(false);
    });
    return () => { active = false; };
  };

  useEffect(() => {
    const cleanup = loadProjects();
    window.addEventListener('community-post-published', loadProjects);
    window.addEventListener('community-event-published', loadProjects);
    return () => { cleanup?.(); window.removeEventListener('community-post-published', loadProjects); window.removeEventListener('community-event-published', loadProjects); };
  }, []);

  const projects = useMemo<Project[]>(() => [
    ...posts.filter((post) => post.profileId === account?.id).map((post) => ({ id: `post-${post.id}`, title: post.caption || post.placeName || 'Publicación', subtitle: post.placeName || 'Publicación de la comunidad', image: post.imageUrl, date: post.createdAt, kind: 'post' as const })),
    ...events.filter((event) => event.profileId === account?.id).map((event) => ({ id: `event-${event.id}`, title: event.title, subtitle: `Evento · ${event.location}`, image: event.imageUrl, date: event.createdAt || `${event.date}T12:00:00`, kind: 'event' as const })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [posts, events, account?.id]);

  if (!authChecked || !authenticated) return <main className="min-h-[calc(100dvh-88px)] bg-[#111214] px-5 pt-24 text-white"><div className="mx-auto max-w-lg rounded-[28px] bg-[#1b1c1f] p-6 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><WandSparkles className="h-6 w-6"/></span><h1 className="mt-4 text-xl font-bold">Crear en PuntoNochi</h1><p className="mt-2 text-sm text-white/55">{authChecked ? 'Inicia sesión para ver tus proyectos y crear contenido.' : 'Comprobando tu sesión…'}</p></div><AnimatePresence>{authChecked && !authenticated && showAuth && <AccountAuthSheet initialMode="login" onClose={() => setShowAuth(false)}/>}</AnimatePresence><AnimatePresence>{authChecked && !authenticated && !showAuth && <AccountRequiredPrompt onClose={() => setShowAuth(true)} message="Inicia sesión para acceder a Crear, guardar tus proyectos y publicar contenido."/>}</AnimatePresence></main>;

  return <main className="min-h-[calc(100dvh-88px)] bg-[#111214] px-4 pb-32 pt-8 text-white sm:px-6">
    <div className="mx-auto max-w-2xl">
      <header className="mb-6"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/40">PuntoNochi · Crear</p><h1 className="mt-2 text-3xl font-bold tracking-tight">¿Qué hacemos hoy?</h1><p className="mt-1 text-sm text-white/50">Crea algo para compartir con Nochistlán.</p></header>

      <section aria-label="Crear contenido" className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setShowPostFlow(true)} className="group flex min-h-[142px] flex-col items-start justify-between rounded-[25px] bg-[#292a2d] p-4 text-left transition-colors hover:bg-[#333438] active:scale-[.99]"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10"><Camera className="h-5 w-5"/></span><span><span className="block text-sm font-bold">Publicar foto</span><span className="mt-1 block text-[11px] text-white/45">De un negocio local</span></span></button>
        <button type="button" onClick={() => setShowPostFlow(true)} className="group flex min-h-[142px] flex-col items-start justify-between rounded-[25px] bg-[#292a2d] p-4 text-left transition-colors hover:bg-[#333438] active:scale-[.99]"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10"><Sparkles className="h-5 w-5"/></span><span><span className="block text-sm font-bold">Un momento</span><span className="mt-1 block text-[11px] text-white/45">Una foto de tu día</span></span></button>
        <button type="button" onClick={() => setShowEventForm(true)} className="group flex min-h-[142px] flex-col items-start justify-between rounded-[25px] bg-[#292a2d] p-4 text-left transition-colors hover:bg-[#333438] active:scale-[.99]"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10"><CalendarDays className="h-5 w-5"/></span><span><span className="block text-sm font-bold">Crear evento</span><span className="mt-1 block text-[11px] text-white/45">Invita a la comunidad</span></span></button>
        <div className="flex min-h-[142px] flex-col items-start justify-between rounded-[25px] bg-[#292a2d] p-4 opacity-60" aria-label="Crear tarjeta de negocio, próximamente"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10"><Store className="h-5 w-5"/></span><span><span className="block text-sm font-bold">Tarjeta de negocio</span><span className="mt-1 block text-[11px] text-white/45">Próximamente</span></span></div>
        <div className="flex min-h-[142px] flex-col items-start justify-between rounded-[25px] bg-[#292a2d] p-4 opacity-60" aria-label="Crear menú o código QR, próximamente"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10"><QrCode className="h-5 w-5"/></span><span><span className="block text-sm font-bold">Menú y código QR</span><span className="mt-1 block text-[11px] text-white/45">Próximamente</span></span></div>
        <div className="flex min-h-[142px] flex-col items-start justify-between rounded-[25px] bg-[#292a2d] p-4 opacity-60" aria-label="Crear publicación de texto, próximamente"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10"><FileText className="h-5 w-5"/></span><span><span className="block text-sm font-bold">Publicación de texto</span><span className="mt-1 block text-[11px] text-white/45">Próximamente</span></span></div>
      </section>

      <button type="button" onClick={() => setShowPostFlow(true)} className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black transition-transform active:scale-[.99]"><WandSparkles className="h-4 w-4"/>Crear con IA</button>

      <section className="mt-9"><div className="mb-3 flex items-center gap-2"><LayoutTemplate className="h-4 w-4 text-white/45"/><h2 className="text-base font-bold">Plantillas</h2></div><div className="rounded-[23px] border border-dashed border-white/10 px-4 py-5 text-center text-xs text-white/40">Las plantillas aparecerán aquí.</div></section>

      <section className="mt-8"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-base font-bold">Proyectos recientes</h2><p className="mt-1 text-[11px] text-white/40">Todo lo que has creado</p></div><Clock3 className="h-4 w-4 text-white/35"/></div>
        {loading ? <div className="flex justify-center rounded-[23px] bg-[#1b1c1f] py-8"><LoaderCircle className="h-5 w-5 animate-spin text-white/40"/></div> : projects.length ? <div className="space-y-2.5">{projects.map((project) => <article key={project.id} className="flex items-center gap-3 rounded-[22px] bg-[#1b1c1f] p-2.5"><div className="h-[66px] w-[66px] shrink-0 overflow-hidden rounded-[17px] bg-white/5">{project.image && <img src={project.image} alt="" loading="lazy" className="h-full w-full object-cover"/>}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{project.title}</p><p className="mt-1 truncate text-[11px] text-white/45">{project.subtitle}</p><p className="mt-1 text-[10px] text-white/35">{project.kind === 'event' ? 'Evento' : 'Publicación'}{formatDate(project.date) ? ` · ${formatDate(project.date)}` : ''}</p></div><ArrowUpRight className="mr-2 h-4 w-4 shrink-0 text-white/30"/></article>)}</div> : <div className="rounded-[23px] bg-[#1b1c1f] px-4 py-7 text-center"><p className="text-sm font-semibold text-white/75">Aún no tienes proyectos</p><p className="mt-1 text-xs text-white/40">Tus publicaciones y eventos aparecerán aquí.</p></div>}
      </section>
    </div>
    <AnimatePresence>{showPostFlow && <CreatePostFlow onClose={() => setShowPostFlow(false)} onPromoteBusiness={() => setShowPostFlow(false)}/>}</AnimatePresence>
    <AnimatePresence>{showEventForm && <EventCreateSheet onClose={() => setShowEventForm(false)} onCreated={(event) => { setEvents((current) => [event, ...current.filter((item) => item.id !== event.id)]); setShowEventForm(false); window.dispatchEvent(new CustomEvent('community-event-published')); }}/>}</AnimatePresence>
  </main>;
}
