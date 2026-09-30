import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, CalendarDays, Camera, Clock3, FileText, LayoutTemplate, LoaderCircle, QrCode, Sparkles, Store, WandSparkles } from 'lucide-react';
import { CreatePostFlow } from './CreatePostFlow';
import { AccountAuthSheet, AccountRequiredPrompt } from './AccountSheets';
import { EventCreateSheet } from './NewsPage';
import type { EventSummary } from './NewsPage';
import { AdTemplateEditor, AdTemplatePreview, adTemplates } from './AdTemplateEditor';
import { MenuQrFlow, type SavedMenuProject } from './MenuQrFlow';

type Account = { id: string; name: string; picture: string | null };
type FeedPost = { id: string; postType: 'day' | 'business'; caption: string; createdAt: string; imageUrl: string; placeName?: string | null; authorName?: string | null; profileId?: string | null };
type Project = { id: string; title: string; subtitle: string; image: string; date: string; kind: 'event' | 'post' | 'menu'; };
type MenuProject = { id: string; businessName: string; posterUrl: string; createdAt: string };

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
  const [showMenuFlow, setShowMenuFlow] = useState(false);
  const [selectedAdTemplate, setSelectedAdTemplate] = useState<(typeof adTemplates)[number] | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [menus, setMenus] = useState<MenuProject[]>([]);
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
      fetch('/api/menus/mine', { cache: 'no-store', credentials: 'same-origin' }).then(async (response) => { const value = await response.json(); if (!response.ok) throw new Error(); return Array.isArray(value) ? value as MenuProject[] : []; }),
    ]).then(([postResult, eventResult, menuResult]) => {
      if (!active) return;
      setPosts(postResult.status === 'fulfilled' ? postResult.value : []);
      setEvents(eventResult.status === 'fulfilled' ? eventResult.value : []);
      setMenus(menuResult.status === 'fulfilled' ? menuResult.value : []);
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
    ...menus.map((menu) => ({ id: `menu-${menu.id}`, title: menu.businessName, subtitle: 'Menú digital · Código QR', image: menu.posterUrl, date: menu.createdAt, kind: 'menu' as const })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [posts, events, menus, account?.id]);

  if (!authChecked || !authenticated) return <main className="min-h-[calc(100dvh-88px)] bg-[#111214] px-5 pt-24 text-white"><div className="mx-auto max-w-lg rounded-[28px] bg-[#1b1c1f] p-6 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><WandSparkles className="h-6 w-6"/></span><h1 className="mt-4 text-xl font-bold">Crear en PuntoNochi</h1><p className="mt-2 text-sm text-white/55">{authChecked ? 'Inicia sesión para ver tus proyectos y crear contenido.' : 'Comprobando tu sesión…'}</p></div><AnimatePresence>{authChecked && !authenticated && showAuth && <AccountAuthSheet initialMode="login" onClose={() => setShowAuth(false)}/>}</AnimatePresence><AnimatePresence>{authChecked && !authenticated && !showAuth && <AccountRequiredPrompt onClose={() => setShowAuth(true)} message="Inicia sesión para acceder a Crear, guardar tus proyectos y publicar contenido."/>}</AnimatePresence></main>;

  return <main className="min-h-[calc(100dvh-88px)] bg-[#111214] px-4 pb-32 pt-8 text-white sm:px-6">
    <div className="mx-auto max-w-2xl">
      <header className="mb-6"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/40">PuntoNochi · Crear</p><h1 className="mt-2 text-3xl font-bold tracking-tight">¿Qué hacemos hoy?</h1><p className="mt-1 text-sm text-white/50">Crea algo para compartir con Nochistlán.</p></header>

      <section aria-label="Crear contenido" className="grid grid-cols-3 gap-x-2.5 gap-y-3 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-4">
        <button type="button" onClick={() => setShowPostFlow(true)} className="flex min-w-0 flex-col items-center gap-1.5 text-center"><span className="flex aspect-square w-full max-w-[88px] items-center justify-center rounded-[23px] bg-[#292a2d] transition-colors hover:bg-[#333438] active:scale-[.97] [corner-shape:squircle] [--corner-shape:squircle]"><span className="material-symbols-rounded text-[40px] font-bold text-white">add_a_photo</span></span><span className="block w-full text-[10px] font-semibold leading-tight text-white/75 sm:text-xs">Publicar foto</span></button>
        <button type="button" onClick={() => setShowPostFlow(true)} className="flex min-w-0 flex-col items-center gap-1.5 text-center"><span className="flex aspect-square w-full max-w-[88px] items-center justify-center rounded-[23px] bg-[#292a2d] transition-colors hover:bg-[#333438] active:scale-[.97] [corner-shape:squircle] [--corner-shape:squircle]"><span className="material-symbols-rounded text-[40px] font-bold text-white">add_reaction</span></span><span className="block w-full text-[10px] font-semibold leading-tight text-white/75 sm:text-xs">Un momento</span></button>
        <button type="button" onClick={() => setShowEventForm(true)} className="flex min-w-0 flex-col items-center gap-1.5 text-center"><span className="flex aspect-square w-full max-w-[88px] items-center justify-center rounded-[23px] bg-[#292a2d] transition-colors hover:bg-[#333438] active:scale-[.97] [corner-shape:squircle] [--corner-shape:squircle]"><span className="material-symbols-rounded text-[40px] font-bold text-white">event</span></span><span className="block w-full text-[10px] font-semibold leading-tight text-white/75 sm:text-xs">Crear evento</span></button>
        <div className="flex min-w-0 flex-col items-center gap-1.5 text-center opacity-55" aria-label="Crear tarjeta de negocio, próximamente"><span className="flex aspect-square w-full max-w-[88px] items-center justify-center rounded-[23px] bg-[#292a2d] [corner-shape:squircle] [--corner-shape:squircle]"><span className="material-symbols-rounded text-[40px] font-bold text-white">storefront</span></span><span className="block w-full text-[10px] font-semibold leading-tight text-white/75 sm:text-xs">Tarjeta negocio</span></div>
        <button type="button" onClick={() => setShowMenuFlow(true)} className="flex min-w-0 flex-col items-center gap-1.5 text-center"><span className="flex aspect-square w-full max-w-[88px] items-center justify-center rounded-[23px] bg-[#292a2d] transition-colors hover:bg-[#333438] active:scale-[.97] [corner-shape:squircle] [--corner-shape:squircle]"><span className="material-symbols-rounded text-[40px] font-bold text-white">qr_code_2</span></span><span className="block w-full text-[10px] font-semibold leading-tight text-white/75 sm:text-xs">Menú y QR</span></button>
        <div className="flex min-w-0 flex-col items-center gap-1.5 text-center opacity-55" aria-label="Crear publicación de texto, próximamente"><span className="flex aspect-square w-full max-w-[88px] items-center justify-center rounded-[23px] bg-[#292a2d] [corner-shape:squircle] [--corner-shape:squircle]"><span className="material-symbols-rounded text-[40px] font-bold text-white">post_add</span></span><span className="block w-full text-[10px] font-semibold leading-tight text-white/75 sm:text-xs">Post de texto</span></div>
      </section>

      <button type="button" onClick={() => setShowPostFlow(true)} className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-[30px] bg-white text-sm font-bold text-black transition-transform active:scale-[.99] [corner-shape:squircle] [--corner-shape:squircle]"><WandSparkles className="h-4 w-4"/>Crear con IA</button>

      <section className="mt-9"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><LayoutTemplate className="h-4 w-4 text-white/45"/><h2 className="text-base font-bold">Plantillas para anuncios</h2></div><span className="text-[10px] text-white/40">Editables</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{adTemplates.map((template) => <button key={template.id} type="button" onClick={() => setSelectedAdTemplate(template)} className="group overflow-hidden rounded-[20px] bg-[#1b1c1f] text-left transition-transform active:scale-[.98]"><span className="block aspect-[4/5] overflow-hidden"><AdTemplatePreview template={template} ratio={{ id: 'post', label: 'Publicación', width: 4, height: 5 }} title={template.headline} body={template.body} brand="TU NEGOCIO" background={template.background} accent={template.accent} imageUrl="" compact/></span><span className="flex items-center justify-between p-3"><span className="text-xs font-semibold">{template.name}</span><span className="text-[10px] text-white/40">Editar</span></span></button>)}</div></section>

      <section className="mt-8"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-base font-bold">Proyectos recientes</h2><p className="mt-1 text-[11px] text-white/40">Todo lo que has creado</p></div><Clock3 className="h-4 w-4 text-white/35"/></div>
        {loading ? <div className="flex justify-center rounded-[23px] bg-[#1b1c1f] py-8"><LoaderCircle className="h-5 w-5 animate-spin text-white/40"/></div> : projects.length ? <div className="space-y-2.5">{projects.map((project) => <article key={project.id} className="flex items-center gap-3 rounded-[22px] bg-[#1b1c1f] p-2.5"><div className="h-[66px] w-[66px] shrink-0 overflow-hidden rounded-[17px] bg-white/5">{project.image && <img src={project.image} alt="" loading="lazy" className="h-full w-full object-cover"/>}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{project.title}</p><p className="mt-1 truncate text-[11px] text-white/45">{project.subtitle}</p><p className="mt-1 text-[10px] text-white/35">{project.kind === 'event' ? 'Evento' : project.kind === 'menu' ? 'Menú QR' : 'Publicación'}{formatDate(project.date) ? ` · ${formatDate(project.date)}` : ''}</p></div>{project.kind === 'menu' ? <a href={`/menu/${project.id.slice(5)}`} target="_blank" rel="noreferrer" aria-label={`Abrir menú de ${project.title}`} className="mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70"><ArrowUpRight className="h-4 w-4"/></a> : <ArrowUpRight className="mr-2 h-4 w-4 shrink-0 text-white/30"/>}</article>)}</div> : <div className="rounded-[23px] bg-[#1b1c1f] px-4 py-7 text-center"><p className="text-sm font-semibold text-white/75">Aún no tienes proyectos</p><p className="mt-1 text-xs text-white/40">Tus publicaciones, eventos y menús aparecerán aquí.</p></div>}
      </section>
    </div>
    <AnimatePresence>{showPostFlow && <CreatePostFlow onClose={() => setShowPostFlow(false)} onPromoteBusiness={() => setShowPostFlow(false)}/>}</AnimatePresence>
    <AnimatePresence>{showEventForm && <EventCreateSheet onClose={() => setShowEventForm(false)} onCreated={(event) => { setEvents((current) => [event, ...current.filter((item) => item.id !== event.id)]); setShowEventForm(false); window.dispatchEvent(new CustomEvent('community-event-published')); }}/>}</AnimatePresence>
    <AnimatePresence>{showMenuFlow && <MenuQrFlow accountName={account?.name || ''} onClose={() => setShowMenuFlow(false)} onSaved={(menu) => { setMenus((current) => [{ id: menu.id, businessName: menu.title, posterUrl: menu.image, createdAt: menu.date }, ...current.filter((item) => item.id !== menu.id)]); window.dispatchEvent(new CustomEvent('menu-created')); }}/>}</AnimatePresence>
    <AnimatePresence>{selectedAdTemplate && <motion.div key="ad-template-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><AdTemplateEditor template={selectedAdTemplate} onClose={() => setSelectedAdTemplate(null)} onExported={(url, name) => { setProjects((current) => [{ id: `ad-${Date.now()}`, title: name, subtitle: 'Anuncio exportado', image: url, date: new Date().toISOString(), kind: 'post' }, ...current]); }}/></motion.div>}</AnimatePresence>
  </main>;
}
