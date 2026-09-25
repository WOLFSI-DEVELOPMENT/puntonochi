import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { motion } from 'motion/react';
import { Activity, ArrowRight, Bookmark, CalendarDays, Flame, Hourglass, X } from 'lucide-react';
import type { Place } from '../types';
import { mockPlaces } from '../data';
import { DAILY_USE_KEY, getBookmarkedPlaceIds, getProfileActivity, profileDateKey, setBookmarkedPlaceIds, type ProfileActivity } from '../profileStorage';
import { SheetDragHandle, useSheetDrag } from './SheetDragHandle';
import CornerKit from '@cornerkit/core';

const profileCorners = new CornerKit();
type DailyUse = { totalDays: number; currentStreak: number };

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
  }, [bookmarkIds, activity, isIndexing]);

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

        <section className="pt-1"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-lg font-bold">Guardados</h3><p className="mt-1 text-xs text-white/45">Tus negocios favoritos</p></div><Bookmark className="h-5 w-5 text-blue-300"/></div>{bookmarks.length ? <div className="space-y-2">{bookmarks.map((place) => <div data-profile-squircle key={place.id} className="flex items-center gap-2 rounded-[22px] bg-[#292a2d] p-2.5"><button type="button" onClick={() => { onSelectBusiness(place); onClose(); }} className="flex min-w-0 flex-1 items-center gap-3 text-left"><img src={place.images[0]} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover"/><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{place.name}</span><span className="mt-1 block truncate text-xs text-white/45">{place.category} · {place.location}</span></span><ArrowRight className="mr-1 h-4 w-4 shrink-0 text-white/35"/></button><button type="button" onClick={(event) => removeBookmark(event, place.id)} aria-label={`Quitar ${place.name} de guardados`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white"><Bookmark className="h-4 w-4 fill-current"/></button></div>)}</div> : <div data-profile-squircle className="rounded-[22px] bg-[#292a2d] p-4 text-sm text-white/50">Aún no guardas negocios. Toca el marcador azul en una tarjeta para agregarla aquí.</div>}</section>
      </div>
    </motion.section>
  </>;
}
