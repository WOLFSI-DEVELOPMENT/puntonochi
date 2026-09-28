import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, ArrowRight, Bookmark, CalendarDays, Flame, Hourglass, LogOut, UserRound, X } from 'lucide-react';
import type { Place } from '../types';
import { mockPlaces } from '../data';
import { DAILY_USE_KEY, getBookmarkedPlaceIds, getNavDesign, getProfileActivity, profileDateKey, setBookmarkedPlaceIds, setNavDesign, type NavDesign, type ProfileActivity } from '../profileStorage';
import { SheetDragHandle, useSheetDrag } from './SheetDragHandle';
import CornerKit from '@cornerkit/core';
import { AccountAuthSheet } from './AccountSheets';

const profileCorners = new CornerKit();
type DailyUse = { totalDays: number; currentStreak: number };
type UserAccount = { id: string; name: string; email: string; picture: string | null };
type AccountContent = {
  reviews: { id: string; placeName: string; rating: number; text: string; createdAt: string }[];
  posts: { id: string; imageUrl: string; caption: string; createdAt: string; placeName?: string | null }[];
  events: { id: string; title: string; date: string; location: string; imageUrl: string }[];
};

function readDailyUse(): DailyUse {
  try {
    const value = JSON.parse(localStorage.getItem(DAILY_USE_KEY) || '{}') as Partial<DailyUse>;
    return { totalDays: Number(value.totalDays) || 0, currentStreak: Number(value.currentStreak) || 0 };
  } catch {
    return { totalDays: 0, currentStreak: 0 };
  }
}

function formatActiveTime(totalSeconds: number) {
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours} h ${minutes} min` : `${totalMinutes} min`;
}

function recentDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return { key: profileDateKey(date), label: new Intl.DateTimeFormat('es-MX', { weekday: 'narrow' }).format(date) };
  });
}

export function ProfileSheet({ onClose, onSelectBusiness }: { onClose: () => void; onSelectBusiness: (place: Place) => void }) {
  const [daily, setDaily] = useState(readDailyUse);
  const [activity, setActivity] = useState<ProfileActivity>(getProfileActivity);
  const [bookmarkIds, setBookmarkIds] = useState<string[]>(getBookmarkedPlaceIds);
  const [navDesign, setCurrentNavDesign] = useState<NavDesign>(getNavDesign);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [accountContent, setAccountContent] = useState<AccountContent | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [accountLoading, setAccountLoading] = useState(true);
  const [showAccountAuth, setShowAccountAuth] = useState(false);
  const [accountError, setAccountError] = useState(() => new URLSearchParams(window.location.search).get('accountAuthError') || '');
  const sheetDrag = useSheetDrag(onClose);
  const days = useMemo(recentDays, []);
  const recentSeconds = days.map(({ key }) => Number(activity.activeSecondsByDay[key] || 0));
  const totalSeconds = Object.values(activity.activeSecondsByDay).reduce<number>((total, value) => total + (Number(value) || 0), 0);
  const maxDailySeconds = Math.max(60, ...recentSeconds);
  const isIndexing = daily.totalDays <= 1 && totalSeconds < 120;
  const bookmarks = bookmarkIds.map((id) => mockPlaces.find((place) => place.id === id)).filter((place): place is Place => Boolean(place));

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previous = { rootOverflow: root.style.overflow, bodyOverflow: body.style.overflow, rootOverscroll: root.style.overscrollBehavior, bodyOverscroll: body.style.overscrollBehavior };
    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    root.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';
    return () => {
      root.style.overflow = previous.rootOverflow;
      body.style.overflow = previous.bodyOverflow;
      root.style.overscrollBehavior = previous.rootOverscroll;
      body.style.overscrollBehavior = previous.bodyOverscroll;
    };
  }, []);

  useEffect(() => {
    if (!account) { setAccountContent(null); return; }
    let active = true;
    setContentLoading(true);
    fetch('/api/account/content', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (response) => { const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'No se pudo cargar tu actividad.'); return data as AccountContent; })
      .then((data) => { if (active) setAccountContent(data); })
      .catch(() => { if (active) setAccountContent({ reviews: [], posts: [], events: [] }); })
      .finally(() => { if (active) setContentLoading(false); });
    return () => { active = false; };
  }, [account?.id]);

  useEffect(() => {
    let active = true;
    fetch('/api/account/session', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'No se pudo revisar tu cuenta.');
        return data as { account?: UserAccount | null };
      })
      .then((data) => { if (active) setAccount(data.account || null); })
      .catch(() => { if (active) setAccount(null); })
      .finally(() => { if (active) setAccountLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('accountAuth') && !url.searchParams.has('accountAuthError')) return;
    url.searchParams.delete('accountAuth');
    url.searchParams.delete('accountAuthError');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    const refresh = () => {
      setDaily(readDailyUse());
      setActivity(getProfileActivity());
      setBookmarkIds(getBookmarkedPlaceIds());
    };
    window.addEventListener('puntonochi-profile-updated', refresh);
    window.addEventListener('puntonochi-bookmarks-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('puntonochi-profile-updated', refresh);
      window.removeEventListener('puntonochi-bookmarks-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    profileCorners.applyAll('[data-profile-squircle]', { radius: 24, smoothing: 1 });
  }, [bookmarkIds, activity, isIndexing, navDesign]);

  const chooseNavDesign = (design: NavDesign) => {
    setCurrentNavDesign(design);
    setNavDesign(design);
  };

  const removeBookmark = (event: MouseEvent<HTMLButtonElement>, placeId: string) => {
    event.stopPropagation();
    const next = bookmarkIds.filter((id) => id !== placeId);
    setBookmarkedPlaceIds(next);
    setBookmarkIds(next);
  };

  return <>
    <motion.button aria-label="Cerrar perfil" onClick={onClose} className="fixed inset-0 z-[84] bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
    <motion.section {...sheetDrag} role="dialog" aria-modal="true" aria-label="Perfil" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 360, mass: 0.82 }} className="fixed inset-x-0 bottom-0 z-[85] mx-auto flex max-h-[92dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-[32px] bg-[#202124] text-white shadow-2xl">
      <div className="relative shrink-0 border-b border-white/[0.08] px-5 pb-4 pt-1"><SheetDragHandle controls={sheetDrag.dragControls}/><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">PUNTONOCHI · TU ESPACIO</p><h2 className="mt-1 text-2xl font-bold">Perfil</h2><button type="button" onClick={onClose} aria-label="Cerrar" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08]"><X className="h-5 w-5"/></button></div>
      <div className="min-h-0 flex-1 touch-pan-y space-y-4 overflow-y-auto overscroll-contain px-5 py-5 pb-[calc(env(safe-area-inset-bottom)+32px)]">
        <section data-profile-squircle className="rounded-[24px] bg-[#292a2d] p-4">
          <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold"><UserRound className="h-4 w-4 text-blue-300"/>Tu cuenta</div><span className="rounded-md bg-blue-500 px-2 py-1 text-[9px] font-extrabold tracking-wide text-white">BETA · PERFILES</span></div>
          {accountLoading ? <div className="flex items-center gap-3"><div className="h-12 w-12 animate-pulse rounded-full bg-white/10"/><div className="flex-1"><div className="h-3 w-2/5 animate-pulse rounded-full bg-white/10"/><div className="mt-2 h-3 w-3/5 animate-pulse rounded-full bg-white/[0.06]"/></div></div> : account ? <div className="flex items-center gap-3">
            {account.picture ? <img src={account.picture} alt="" referrerPolicy="no-referrer" className="h-12 w-12 shrink-0 rounded-full object-cover"/> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-200"><UserRound className="h-6 w-6"/></div>}
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{account.name}</p><p className="mt-0.5 truncate text-xs text-white/50">{account.email || 'Cuenta de Facebook'}</p></div>
            <button type="button" aria-label="Cerrar sesión" onClick={async () => { setAccountError(''); try { const response = await fetch('/api/account/logout', { method: 'POST', credentials: 'same-origin' }); if (!response.ok) throw new Error(); setAccount(null); } catch { setAccountError('No se pudo cerrar sesión. Intenta otra vez.'); } }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#202124] text-white/60"><LogOut className="h-4 w-4"/></button>
          </div> : <button type="button" onClick={() => { setAccountError(''); setShowAccountAuth(true); }} className="flex w-full items-center gap-3 rounded-[18px] bg-[#202124] p-3 text-left transition-colors hover:bg-[#24262a]"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white"><UserRound className="h-5 w-5"/></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">Crear una cuenta</span><span className="mt-0.5 block text-xs text-white/50">Guarda tu perfil en PuntoNochi</span></span><ArrowRight className="h-4 w-4 text-white/45"/></button>}
          {accountError && <p role="alert" className="mt-2 text-xs text-red-300">{accountError}</p>}
        </section>

        {account && <section className="space-y-3">
          <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Tu actividad pública</h3><button type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-public-profile', { detail: account.id }))} className="text-xs font-semibold text-blue-300">Ver perfil</button></div>
          <section data-profile-squircle className="rounded-[22px] bg-[#292a2d] p-4"><div className="mb-2 flex items-center justify-between"><h4 className="text-sm font-bold">Publicaciones creadas</h4><span className="text-xs text-white/40">{accountContent?.posts.length || 0}</span></div>{contentLoading ? <div className="h-14 animate-pulse rounded-2xl bg-white/[0.06]"/> : accountContent?.posts.length ? <div className="flex gap-2 overflow-x-auto">{accountContent.posts.slice(0, 8).map((post) => <button key={post.id} type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-public-profile', { detail: account.id }))} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[18px] bg-[#202124]"><img src={post.imageUrl} alt={post.caption} className="h-full w-full object-cover"/></button>)}</div> : <p className="text-xs text-white/45">Tus fotos compartidas aparecerán aquí.</p>}</section>
          <section data-profile-squircle className="rounded-[22px] bg-[#292a2d] p-4"><div className="mb-2 flex items-center justify-between"><h4 className="text-sm font-bold">Reseñas creadas</h4><span className="text-xs text-white/40">{accountContent?.reviews.length || 0}</span></div>{contentLoading ? <div className="h-14 animate-pulse rounded-2xl bg-white/[0.06]"/> : accountContent?.reviews.length ? <div className="space-y-2">{accountContent.reviews.slice(0, 3).map((review) => <div key={review.id} className="rounded-2xl bg-[#202124] p-3"><p className="text-xs font-semibold">{review.placeName} <span className="text-blue-300">· {review.rating}.0★</span></p><p className="mt-1 line-clamp-2 text-xs text-white/55">{review.text}</p></div>)}</div> : <p className="text-xs text-white/45">Tus opiniones de negocios aparecerán aquí.</p>}</section>
          <section data-profile-squircle className="rounded-[22px] bg-[#292a2d] p-4"><div className="mb-2 flex items-center justify-between"><h4 className="text-sm font-bold">Eventos creados</h4><span className="text-xs text-white/40">{accountContent?.events.length || 0}</span></div>{contentLoading ? <div className="h-14 animate-pulse rounded-2xl bg-white/[0.06]"/> : accountContent?.events.length ? <div className="space-y-2">{accountContent.events.slice(0, 3).map((event) => <div key={event.id} className="flex items-center gap-3 rounded-2xl bg-[#202124] p-2"><img src={event.imageUrl} alt="" className="h-12 w-12 rounded-xl object-cover"/><div className="min-w-0"><p className="truncate text-xs font-semibold">{event.title}</p><p className="mt-1 truncate text-[11px] text-white/45">{event.location}</p></div></div>)}</div> : <p className="text-xs text-white/45">Los eventos que publiques aparecerán aquí.</p>}</section>
        </section>}

        {isIndexing && <section data-profile-squircle className="rounded-[24px] bg-[#292a2d] p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-400/10 text-blue-200"><Activity className="h-5 w-5"/></span><div><h3 className="text-sm font-bold">Estamos conociendo tu actividad</h3><p className="mt-1 text-xs leading-relaxed text-white/55">Tu perfil se está preparando. Sigue usando PuntoNochi y pronto verás aquí tus estadísticas semanales.</p></div></div><div className="mt-4 grid grid-cols-3 gap-2">{[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-white/[0.05]"/>)} </div></section>}

        <section data-profile-squircle className="rounded-[24px] bg-[#292a2d] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Flame className="h-4 w-4 text-orange-300"/>Tu constancia</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-[#202124] p-3"><p className="text-xs text-white/45">Racha actual</p>{isIndexing ? <div className="mt-2 h-7 w-14 animate-pulse rounded-lg bg-white/10"/> : <p className="mt-1 text-xl font-bold tabular-nums">{daily.currentStreak} <span className="text-xs font-medium text-white/50">días</span></p>}</div>
            <div className="rounded-2xl bg-[#202124] p-3"><p className="text-xs text-white/45">Días usando la app</p>{isIndexing ? <div className="mt-2 h-7 w-14 animate-pulse rounded-lg bg-white/10"/> : <p className="mt-1 text-xl font-bold tabular-nums">{daily.totalDays} <span className="text-xs font-medium text-white/50">días</span></p>}</div>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-2xl bg-[#202124] p-3"><span className="flex items-center gap-2 text-xs text-white/45"><Hourglass className="h-4 w-4"/>Tiempo activo en este dispositivo</span>{isIndexing ? <span className="h-5 w-16 animate-pulse rounded-md bg-white/10"/> : <strong className="text-sm tabular-nums">{formatActiveTime(totalSeconds)}</strong>}</div>
        </section>

        <section data-profile-squircle className="rounded-[24px] bg-[#292a2d] p-4"><div className="mb-4 flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-blue-200"/>Actividad semanal</div><div className="flex h-28 items-end justify-between gap-2">{days.map((day, index) => { const seconds = recentSeconds[index]; const height = isIndexing ? 18 + (index % 3) * 5 : seconds ? Math.max(10, (seconds / maxDailySeconds) * 100) : 5; return <div key={day.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="flex h-full w-full items-end"><div className={`w-full rounded-t-lg ${isIndexing ? 'animate-pulse bg-white/10' : seconds ? 'bg-blue-400' : 'bg-white/[0.07]'}`} style={{ height: `${height}%` }} /></div><span className="text-[10px] font-semibold uppercase text-white/40">{day.label}</span></div>; })}</div><div className="mt-3 flex items-center justify-between text-[11px] text-white/40"><span>Minutos que usaste la app</span><span>{Math.round(recentSeconds.reduce((sum, value) => sum + value, 0) / 60)} min esta semana</span></div></section>

        <section data-profile-squircle className="rounded-[24px] bg-[#292a2d] p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold"><span className="material-symbols-rounded text-[18px] text-blue-200">dock_to_bottom</span>Diseño de navegación</div>
          <p className="mb-3 text-xs leading-relaxed text-white/50">Elige cómo quieres ver la barra inferior.</p>
          <div className="grid grid-cols-2 gap-2.5">
            {([
              { id: 'dynamic' as const, title: 'Dynamic', description: 'Brillo y movimiento', glass: false },
              { id: 'simple' as const, title: 'Simple', description: 'Cristal esmerilado', glass: true },
            ]).map((option) => <button key={option.id} type="button" aria-pressed={navDesign === option.id} onClick={() => chooseNavDesign(option.id)} className={`rounded-[20px] p-2.5 text-left transition-colors ${navDesign === option.id ? 'bg-blue-500/15 ring-1 ring-blue-300/70' : 'bg-[#202124] ring-1 ring-white/[0.06]'}`}>
              <span className="relative mb-2 flex h-[58px] items-center justify-center overflow-hidden rounded-[17px] bg-[#111214]">
                <span className={`flex h-[34px] w-[90%] items-center justify-around rounded-full ${option.glass ? 'bg-[#292a2d]/80 backdrop-blur-xl' : 'bg-white/[0.12] shadow-[0_4px_12px_rgba(0,0,0,0.45)]'}`}>
                  {['home', 'explore', 'smart_display', 'newspaper', 'search'].map((icon, index) => <span key={icon} className={`material-symbols-rounded flex h-[26px] w-[26px] items-center justify-center rounded-full text-[12px] ${index === 0 ? option.glass ? 'bg-[#414246] text-white' : 'bg-white/15 text-white' : 'text-white/55'}`}>{icon}</span>)}
                </span>
              </span>
              <span className="block text-[13px] font-bold">{option.title}</span>
              <span className="mt-0.5 block text-[10px] text-white/45">{option.description}</span>
            </button>)}
          </div>
        </section>

        <section className="pt-1"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-lg font-bold">Guardados</h3><p className="mt-1 text-xs text-white/45">Tus negocios favoritos</p></div><Bookmark className="h-5 w-5 text-blue-300"/></div>{bookmarks.length ? <div className="space-y-2">{bookmarks.map((place) => <div data-profile-squircle key={place.id} className="flex items-center gap-2 rounded-[22px] bg-[#292a2d] p-2.5"><button type="button" onClick={() => { onSelectBusiness(place); onClose(); }} className="flex min-w-0 flex-1 items-center gap-3 text-left"><img src={place.images[0]} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover"/><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{place.name}</span><span className="mt-1 block truncate text-xs text-white/45">{place.category} · {place.location}</span></span><ArrowRight className="mr-1 h-4 w-4 shrink-0 text-white/35"/></button><button type="button" onClick={(event) => removeBookmark(event, place.id)} aria-label={`Quitar ${place.name} de guardados`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white"><Bookmark className="h-4 w-4 fill-current"/></button></div>)}</div> : <div data-profile-squircle className="rounded-[22px] bg-[#292a2d] p-4 text-sm text-white/50">Aún no guardas negocios. Toca el marcador azul en una tarjeta para agregarla aquí.</div>}</section>
      </div>
    </motion.section>
    <AnimatePresence>{showAccountAuth && <AccountAuthSheet onClose={() => setShowAccountAuth(false)}/>}</AnimatePresence>
  </>;
}
