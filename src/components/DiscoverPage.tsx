import { useEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, Check, Clock3, Filter, Heart, House, Images, MapPin, Menu, MessageCircle, Plus, Search, Star, Store, UserRound, X } from 'lucide-react';
import { CreatePostFlow } from './CreatePostFlow';
import { ProfileSheet } from './ProfileSheet';
import { mockPlaces } from '../data';
import { getBookmarkedPlaceIds } from '../profileStorage';
import type { Place } from '../types';

type CommunityPost = {
  id: string;
  postType: 'day' | 'business';
  caption: string;
  createdAt: string;
  imageUrl: string;
  coverUrl?: string;
  placeName?: string | null;
  profileId?: string | null;
  authorName?: string | null;
  authorPicture?: string | null;
};
type CommunityEvent = {
  id: string;
  title: string;
  date: string;
  endDate: string | null;
  time: string | null;
  location: string;
  description: string;
  imageUrl: string;
  createdAt?: string;
  profileId?: string | null;
  authorName?: string | null;
  authorPicture?: string | null;
};
type FeedItem = { kind: 'post'; key: string; createdAt: string; post: CommunityPost } | { kind: 'event'; key: string; createdAt: string; event: CommunityEvent };
type AccountSummary = { id: string; name: string; picture: string | null };
type BusinessPreferenceProfile = { searches: string[]; categories: Record<string, number>; viewed: string[] };

function preferenceStorageKey(account: AccountSummary | null) { return `puntonochi-business-discovery-v1:${account?.id || 'guest'}`; }
function readBusinessPreferences(key: string): BusinessPreferenceProfile {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}') as Partial<BusinessPreferenceProfile>;
    return { searches: Array.isArray(value.searches) ? value.searches : [], categories: value.categories || {}, viewed: Array.isArray(value.viewed) ? value.viewed : [] };
  } catch { return { searches: [], categories: {}, viewed: [] }; }
}

function formatFeedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(date);
}

function formatEventDate(event: CommunityEvent) {
  const date = new Date(`${event.date}T12:00:00`);
  if (Number.isNaN(date.getTime())) return 'Evento';
  return new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
}

function AuthorAvatar({ picture, name, size = 'h-10 w-10' }: { picture?: string | null; name?: string | null; size?: string }) {
  return <span className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#30333a] text-sm font-bold text-white`}>
    {picture ? <img src={picture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <span>{(name || 'N').slice(0, 1).toLocaleUpperCase('es-MX')}</span>}
  </span>;
}

function StoriesRow({ posts, account, onCreate }: { posts: CommunityPost[]; account: AccountSummary | null; onCreate: () => void }) {
  const storyPosts = posts.filter((post) => post.postType === 'day');
  return <section aria-label="Momentos de la comunidad" className="mb-5">
    <div className="mb-2 flex items-center justify-between px-1"><h2 className="text-sm font-bold text-white">Momentos</h2><span className="text-[10px] text-white/40">De Nochistlán</span></div>
    <div className="flex gap-3 overflow-x-auto px-1 pb-1 scrollbar-hide">
      <button type="button" onClick={onCreate} className="flex w-[66px] shrink-0 flex-col items-center gap-1.5 text-center">
        <span className="relative flex h-[62px] w-[62px] items-center justify-center rounded-full border border-white/10 bg-[#24262a] p-1"><AuthorAvatar picture={account?.picture} name={account?.name} size="h-full w-full"/><span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-black ring-2 ring-[#111214]"><Plus className="h-3 w-3" strokeWidth={2.8}/></span></span>
        <span className="w-full truncate text-[10px] text-white/65">Tu momento</span>
      </button>
      {storyPosts.map((post) => <button type="button" key={post.id} onClick={() => document.getElementById(`community-post-${post.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="flex w-[66px] shrink-0 flex-col items-center gap-1.5 text-center">
        <span className="h-[62px] w-[62px] rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-500 p-[2px]"><span className="block h-full w-full rounded-full bg-[#111214] p-[2px]"><img src={post.imageUrl} alt="" loading="lazy" className="h-full w-full rounded-full object-cover"/></span></span>
        <span className="w-full truncate text-[10px] text-white/65">{post.authorName || 'Comunidad'}</span>
      </button>)}
    </div>
  </section>;
}

function CommunityPostCard({ post, onOpenProfile, onOpenImage }: { post: CommunityPost; onOpenProfile: (id: string) => void; onOpenImage: (url: string, alt: string) => void }) {
  const author = post.authorName || 'Comunidad de Nochistlán';
  return <article id={`community-post-${post.id}`} className="community-feed-card overflow-hidden rounded-[26px] bg-[#1a1b1e]">
    <div className="flex items-center gap-2.5 px-3.5 py-3">
      {post.profileId ? <button type="button" aria-label={`Ver el perfil de ${author}`} onClick={() => onOpenProfile(post.profileId!)}><AuthorAvatar picture={post.authorPicture} name={author} size="h-9 w-9"/></button> : <AuthorAvatar picture={post.authorPicture} name={author} size="h-9 w-9"/>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-white">{author}</p>
        <p className="mt-0.5 truncate text-[10px] text-white/45">{post.postType === 'business' && post.placeName ? post.placeName : 'En la comunidad'}{formatFeedDate(post.createdAt) ? ` · ${formatFeedDate(post.createdAt)}` : ''}</p>
      </div>
      <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[9px] font-medium text-white/55">{post.postType === 'day' ? 'Momento' : 'Publicación'}</span>
    </div>
    <button type="button" onClick={() => onOpenImage(post.imageUrl, post.caption || 'Publicación de la comunidad')} aria-label="Ampliar imagen de la publicación" className="block w-full cursor-zoom-in"><img src={post.imageUrl} alt={post.caption || 'Publicación de la comunidad'} loading="lazy" decoding="async" className="community-feed-image marketplace-squircle w-full object-cover" /></button>
    <div className="px-3.5 pb-3.5 pt-3">
      {post.caption && <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-white/90">{post.caption}</p>}
      <div className="mt-3 flex items-center gap-5 border-t border-white/[0.07] pt-3 text-white/55"><span className="inline-flex items-center gap-1.5"><Heart className="h-[17px] w-[17px]"/><span className="text-[10px]">Me gusta</span></span><span className="inline-flex items-center gap-1.5"><MessageCircle className="h-[17px] w-[17px]"/><span className="text-[10px]">Comentar</span></span></div>
    </div>
  </article>;
}

function CommunityEventCard({ event, onOpenProfile, onOpenEvent }: { event: CommunityEvent; onOpenProfile: (id: string) => void; onOpenEvent: (id: string) => void }) {
  const author = event.authorName || 'Comunidad de Nochistlán';
  return <article className="community-feed-card overflow-hidden rounded-[26px] bg-[#1a1b1e]">
    <div className="flex items-center gap-2.5 px-3.5 py-3">
      {event.profileId ? <button type="button" aria-label={`Ver el perfil de ${author}`} onClick={() => onOpenProfile(event.profileId!)}><AuthorAvatar picture={event.authorPicture} name={author} size="h-9 w-9"/></button> : <AuthorAvatar picture={event.authorPicture} name={author} size="h-9 w-9"/>}
      <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{author}</p><p className="mt-0.5 text-[10px] text-white/45">Evento de la comunidad</p></div>
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#292a2d] px-2.5 py-1.5 text-[10px] font-semibold text-white/75"><CalendarDays className="h-3.5 w-3.5 text-orange-300"/>{formatEventDate(event)}</span>
    </div>
      <button type="button" onClick={() => onOpenEvent(event.id)} aria-label={`Ver evento: ${event.title}`} className="community-event-image-wrap marketplace-squircle relative block w-full cursor-pointer text-left">
      <img src={event.imageUrl} alt="" loading="lazy" decoding="async" className="community-feed-image marketplace-squircle w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
    </button>
    <div className="px-3.5 pb-4 pt-3">
      <h3 className="text-base font-bold leading-snug text-white">{event.title}</h3>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/60"><Clock3 className="h-3.5 w-3.5 shrink-0 text-orange-300"/>{formatEventDate(event)}{event.time ? ` · ${event.time}` : ''}</p>
      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/60"><House className="h-3.5 w-3.5 shrink-0 text-white/40"/>{event.location}</p>
      {event.description && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-white/75">{event.description}</p>}
      <div className="mt-3 flex items-center gap-1.5 border-t border-white/[0.07] pt-3 text-[10px] font-semibold text-white/60"><CalendarDays className="h-4 w-4"/>Evento local</div>
    </div>
  </article>;
}

function BusinessDiscoveryCard({ place, onOpen }: { place: Place; onOpen: () => void }) {
  const image = place.images?.[0] || place.logo;
  return <button type="button" onClick={onOpen} className="group marketplace-squircle relative h-[210px] w-full overflow-hidden bg-[#202124] text-left" aria-label={`Ver ${place.name}`}>
    {image ? <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"/> : <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#30343b] to-[#1b1c1f]"><Store className="h-10 w-10 text-white/25"/></div>}
    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-black/5"/>
    <div className="absolute inset-x-0 bottom-0 p-3.5"><span className="rounded-full bg-black/45 px-2 py-1 text-[9px] font-semibold text-white/80 backdrop-blur">{place.category}</span><h3 className="mt-2 line-clamp-1 text-sm font-bold text-white">{place.name}</h3><p className="mt-1 flex items-center gap-1 text-[10px] text-white/65"><MapPin className="h-3 w-3 shrink-0"/><span className="truncate">{place.location}</span></p><p className="mt-1 flex items-center gap-1 text-[10px] text-white/70"><Star className="h-3 w-3 fill-amber-300 text-amber-300"/>{place.rating?.toFixed(1) || 'Nuevo'}<span className="text-white/45">· {place.isOpen ? 'Abierto' : 'Cerrado'}</span></p></div>
  </button>;
}

export function DiscoverPage({ onSelectBusiness, account }: {
  onSelectBusiness: (place: Place) => void;
  account: AccountSummary | null;
}) {
  const [showCreateFlow, setShowCreateFlow] = useState(false);
  const [showProfile, setShowProfile] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('accountAuth') || params.has('accountAuthError');
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedFilter, setFeedFilter] = useState<'all' | 'posts' | 'business' | 'events'>('all');
  const [feedLoading, setFeedLoading] = useState(true);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [openedImage, setOpenedImage] = useState<{ url: string; alt: string } | null>(null);
  const [businessQuery, setBusinessQuery] = useState('');
  const preferenceKey = preferenceStorageKey(account);
  const [preferenceProfile, setPreferenceProfile] = useState(() => readBusinessPreferences(preferenceStorageKey(account)));
  const openEvent = (id: string) => {
    window.history.pushState({}, '', `/eventos/${encodeURIComponent(id)}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'noticias' }));
  };
  useEffect(() => setPreferenceProfile(readBusinessPreferences(preferenceKey)), [preferenceKey]);
  const savePreferences = (update: (current: BusinessPreferenceProfile) => BusinessPreferenceProfile) => {
    setPreferenceProfile((current) => {
      const next = update(current);
      try { localStorage.setItem(preferenceKey, JSON.stringify(next)); } catch { /* Personalization remains available in this session. */ }
      return next;
    });
  };
  const matchingBusinesses = useMemo(() => {
    const normalize = (value: string) => value.toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const terms = businessQuery.trim() ? normalize(businessQuery).split(/\s+/).filter(Boolean) : [];
    const bookmarks = getBookmarkedPlaceIds();
    const scored = mockPlaces.map((place, index) => {
      const category = normalize(place.category);
      const searchable = normalize([place.name, place.category, place.subtitle, place.location, place.address, ...(place.goodToKnow || [])].filter(Boolean).join(' '));
      const queryScore = terms.reduce((score, term) => score + (searchable.includes(term) ? 16 : 0), 0);
      const categoryScore = preferenceProfile.categories[category] || 0;
      const learnedSearchScore = preferenceProfile.searches.reduce((score, term) => score + (searchable.includes(normalize(term)) ? 3 : 0), 0);
      const viewIndex = preferenceProfile.viewed.indexOf(place.id);
      const novelty = viewIndex < 0 ? 2 : -Math.max(0, 6 - viewIndex);
      const bookmarkScore = bookmarks.includes(place.id) ? 4 : 0;
      const quality = (place.rating || 0) * 0.4 + Math.min(place.reviewCount || 0, 25) * 0.08;
      return { place, index, score: queryScore + categoryScore + learnedSearchScore + novelty + bookmarkScore + quality, searchable };
    });
    const filtered = terms.length ? scored.filter(({ searchable }) => terms.every((term) => searchable.includes(term))) : scored;
    return filtered.sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 30).map(({ place }) => place);
  }, [businessQuery, preferenceProfile]);
  useEffect(() => {
    if (feedFilter !== 'business' || businessQuery.trim().length < 2) return;
    const query = businessQuery.trim();
    const timer = window.setTimeout(() => savePreferences((current) => ({ ...current, searches: [query, ...current.searches.filter((term) => term.toLocaleLowerCase('es-MX') !== query.toLocaleLowerCase('es-MX'))].slice(0, 20) })), 500);
    return () => window.clearTimeout(timer);
  }, [businessQuery, feedFilter, preferenceKey]);
  const lastScrollTop = useRef(0);

  useEffect(() => {
    let active = true;
    const loadCommunityFeed = async () => {
      const [postResult, eventResult] = await Promise.allSettled([
        fetch('/api/community-posts/feed', { cache: 'no-store' }).then(async (response) => {
          const value: unknown = await response.json();
          if (!response.ok) throw new Error('Community posts unavailable');
          return Array.isArray(value) ? value as CommunityPost[] : [];
        }),
        fetch('/api/events', { cache: 'no-store' }).then(async (response) => {
          const value: unknown = await response.json();
          if (!response.ok) throw new Error('Events unavailable');
          return Array.isArray(value) ? value as CommunityEvent[] : [];
        }),
      ]);
      if (!active) return;
      if (postResult.status === 'fulfilled') setPosts(postResult.value);
      if (eventResult.status === 'fulfilled') setEvents(eventResult.value);
      setFeedLoading(false);
    };
    const refreshFeed = () => { setFeedLoading(true); void loadCommunityFeed(); };
    window.addEventListener('community-post-published', refreshFeed);
    window.addEventListener('community-event-published', refreshFeed);
    window.addEventListener('storage', refreshFeed);
    void loadCommunityFeed();
    return () => {
      active = false;
      window.removeEventListener('community-post-published', refreshFeed);
      window.removeEventListener('community-event-published', refreshFeed);
      window.removeEventListener('storage', refreshFeed);
    };
  }, []);

  const dayPosts = useMemo(() => posts.filter((post) => post.postType === 'day'), [posts]);
  const feedItems = useMemo<FeedItem[]>(() => [
    ...posts.map((post) => ({ kind: 'post' as const, key: `post-${post.id}`, createdAt: post.createdAt, post })),
    ...events.map((event) => ({ kind: 'event' as const, key: `event-${event.id}`, createdAt: event.createdAt || `${event.date}T12:00:00`, event })),
  ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()), [posts, events]);
  const visibleFeedItems = useMemo(() => feedItems.filter((item) => {
    if (feedFilter === 'events') return item.kind === 'event';
    if (feedFilter === 'business') return item.kind === 'post' && item.post.postType === 'business';
    if (feedFilter === 'posts') return item.kind === 'post' && item.post.postType === 'day';
    return true;
  }), [feedFilter, feedItems]);

  const handleScroll = (event: UIEvent<HTMLElement>) => {
    const nextTop = event.currentTarget.scrollTop;
    if (nextTop > lastScrollTop.current + 2) setMenuOpen(false);
    lastScrollTop.current = nextTop;
  };

  const filterOptions = [
    { id: 'all', label: 'Todo', icon: <Filter className="h-4 w-4"/> },
    { id: 'posts', label: 'Publicaciones', icon: <Images className="h-4 w-4"/> },
    { id: 'business', label: 'Negocios', icon: <Store className="h-4 w-4"/> },
    { id: 'events', label: 'Eventos', icon: <CalendarDays className="h-4 w-4"/> },
  ] as const;

  return <motion.main onScroll={handleScroll} style={{ height: 'calc(100dvh - env(safe-area-inset-top, 0px))', scrollPaddingTop: 68 }} className="relative snap-y overflow-y-auto overscroll-y-contain bg-[#111214] px-4 pb-28 pt-2 text-white">
    <header className="explore-top-header sticky top-0 z-30 -mx-4 mb-3 flex h-[58px] items-center px-4">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[#111214]/75 backdrop-blur-xl" />
      <div className="explore-top-left relative z-10">
        <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} className="explore-round-control"><Menu className="h-5 w-5"/></button>
        <AnimatePresence>
          {menuOpen && <motion.nav aria-label="Filtrar contenido" initial={{ opacity: 0, y: -7, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: .98 }} transition={{ duration: .16 }} className="explore-menu absolute left-0 top-[50px] w-52 overflow-hidden rounded-[22px] p-1.5 shadow-2xl">
            {filterOptions.map((option) => <button key={option.id} type="button" onClick={() => { setFeedFilter(option.id); setMenuOpen(false); }} aria-pressed={feedFilter === option.id} className={`explore-menu-item ${feedFilter === option.id ? 'explore-filter-selected' : ''}`}>
              {option.icon}<span className="flex-1">{option.label}</span>{feedFilter === option.id && <Check className="h-4 w-4"/>}
            </button>)}
          </motion.nav>}
        </AnimatePresence>
      </div>
      <div className="explore-top-right relative z-10 ml-auto flex items-center gap-2">
        <button type="button" onClick={() => setShowCreateFlow(true)} aria-label="Crear publicación" title="Crear publicación" className="explore-round-control explore-top-create"><Plus className="h-5 w-5" strokeWidth={2.6}/></button>
        <button type="button" onClick={() => setShowProfile(true)} aria-label={account ? `Abrir perfil de ${account.name}` : 'Iniciar sesión o crear perfil'} className="explore-round-control explore-profile-button">
          {account?.picture ? <img src={account.picture} alt="" referrerPolicy="no-referrer" className="h-full w-full rounded-full object-cover"/> : account ? <span>{account.name.slice(0,1).toLocaleUpperCase('es-MX')}</span> : <UserRound className="h-5 w-5"/>}
        </button>
      </div>
    </header>

    <div className="mx-auto max-w-xl">
      {(feedFilter === 'all' || feedFilter === 'posts') && <StoriesRow posts={dayPosts} account={account} onCreate={() => setShowCreateFlow(true)} />}
      {feedFilter === 'business' && <section aria-label="Negocios recomendados" className="mb-1"><label className="flex h-11 items-center gap-2 rounded-full bg-[#202124] px-4 text-white/45"><Search className="h-4 w-4 shrink-0"/><input value={businessQuery} onChange={(event) => setBusinessQuery(event.target.value)} aria-label="Buscar negocios" placeholder="Busca negocios, categorías o servicios" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/40"/>{businessQuery && <button type="button" onClick={() => setBusinessQuery('')} aria-label="Limpiar búsqueda" className="text-xs text-white/50">Limpiar</button>}</label><p className="mt-2 px-1 text-[10px] text-white/40">Recomendaciones según tus búsquedas, favoritos y negocios visitados.</p></section>}
      {feedFilter === 'business' ? <section aria-label="Negocios recomendados" className="grid grid-cols-2 gap-2.5">{matchingBusinesses.length ? matchingBusinesses.map((place) => <BusinessDiscoveryCard key={place.id} place={place} onOpen={() => { const category = place.category.toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); savePreferences((current) => ({ ...current, viewed: [place.id, ...current.viewed.filter((id) => id !== place.id)].slice(0, 30), categories: { ...current.categories, [category]: (current.categories[category] || 0) + 1 } })); onSelectBusiness(place); }}/>) : <div className="col-span-2 rounded-[22px] bg-[#1a1b1e] px-5 py-8 text-center"><Store className="mx-auto h-6 w-6 text-white/35"/><p className="mt-3 text-sm font-semibold text-white/85">No encontramos negocios</p><p className="mt-1 text-xs text-white/45">Prueba con otro nombre, categoría o servicio.</p></div>}</section> : <section aria-label="Publicaciones y eventos de la comunidad" className="flex flex-col gap-4">
        {feedLoading && <div role="status" className="py-8 text-center text-xs text-white/45">Cargando lo que comparte la comunidad…</div>}
        {!feedLoading && !visibleFeedItems.length && <div className="rounded-[26px] bg-[#1a1b1e] px-5 py-8 text-center"><p className="text-sm font-semibold text-white/85">{feedItems.length ? 'No hay contenido en esta categoría' : 'Aquí aparecerá la comunidad'}</p><p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-white/45">{feedItems.length ? 'Prueba otra categoría para ver más contenido.' : 'Comparte un momento o publica un evento para empezar el feed.'}</p><button type="button" onClick={() => setShowCreateFlow(true)} className="mt-4 rounded-full bg-white px-4 py-2.5 text-xs font-bold text-black">Crear publicación</button></div>}
        {visibleFeedItems.map((item) => item.kind === 'post'
          ? <CommunityPostCard key={item.key} post={item.post} onOpenProfile={(id) => window.dispatchEvent(new CustomEvent('open-public-profile', { detail: id }))} onOpenImage={(url, alt) => setOpenedImage({ url, alt })}/>
          : <CommunityEventCard key={item.key} event={item.event} onOpenProfile={(id) => window.dispatchEvent(new CustomEvent('open-public-profile', { detail: id }))} onOpenEvent={openEvent}/>
        )}
      </section>}
    </div>

    <AnimatePresence>{openedImage && <motion.div role="dialog" aria-modal="true" aria-label={openedImage.alt} className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/95 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpenedImage(null)} onKeyDown={(event) => { if (event.key === 'Escape') setOpenedImage(null); }}><button type="button" aria-label="Cerrar imagen" className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+16px)] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white" onClick={() => setOpenedImage(null)}><X className="h-5 w-5"/></button><img src={openedImage.url} alt={openedImage.alt} className="max-h-full max-w-full cursor-default object-contain" onClick={(event) => event.stopPropagation()}/></motion.div>}</AnimatePresence>
    <AnimatePresence>{showCreateFlow && <CreatePostFlow onClose={() => setShowCreateFlow(false)} onPromoteBusiness={() => setShowCreateFlow(false)} />}</AnimatePresence>
    <AnimatePresence>{showProfile && <ProfileSheet onClose={() => setShowProfile(false)} onSelectBusiness={onSelectBusiness} />}</AnimatePresence>
  </motion.main>;
}
