import { AnimatePresence, motion } from 'motion/react';
import { Building2, CalendarDays, Check, ChevronLeft, ChevronRight, Copy, Film, ImagePlus, MessageCircle, Plus, Send, Share2, SmilePlus, ThumbsUp, Volume2, VolumeX, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent, type TouchEvent, type WheelEvent } from 'react';
import CornerKit from '@cornerkit/core';
import { mockPlaces } from '../data';
import { Place } from '../types';
import { apiFetch } from '../api';
import type { EventSummary } from './NewsPage';

const FEED_VIDEOS = [
  { id: 'puntonochi-short-1', url: 'https://res.cloudinary.com/dwthgcx5j/video/upload/v1790910290/Untitled_video_4_edhg8f.mp4' },
  { id: 'puntonochi-short-2', url: 'https://res.cloudinary.com/dwthgcx5j/video/upload/v1790279115/Earth_zoomed_from_space_20260924134241_jkhbtw.mp4' },
  { id: 'puntonochi-short-3', url: 'https://res.cloudinary.com/dwthgcx5j/video/upload/v1790871656/Expo_Eventos_2026_qekh1y.mp4' },
  { id: 'ayuntamiento-short-1', url: 'https://res.cloudinary.com/dwthgcx5j/video/upload/v1792028431/Video-37742_mqjpu6.mp4' },
  { id: 'ayuntamiento-short-2', url: 'https://res.cloudinary.com/dwthgcx5j/video/upload/v1792028583/Video-38656_sc5f2h.mp4' },
  { id: 'ayuntamiento-short-3', url: 'https://res.cloudinary.com/dwthgcx5j/video/upload/v1792028784/Video-75824_tev9f7.mp4' },
  { id: 'hotel-nochistlan-short-1', url: 'https://res.cloudinary.com/dwthgcx5j/video/upload/v1792029646/Video-44459_hxywo3.mp4' },
];
const COMMENT_EMOJIS = ['😍', '😂', '🥰', '✨', '❤️', '🔥', '😮', '🙌', '👏', '😊', '😢', '😎', '🎉', '🤔', '💯', '👀', '🤩', '🙏', '💙', '🌮'];
type Reaction = 'like' | 'dislike' | null;
type ShortStats = { likes: number; dislikes: number; commentCount: number; myReaction: Reaction };
type ShortComment = { id: string; body: string; createdAt: string; authorId: string; authorName: string; authorPicture: string | null };
const emptyStats: ShortStats = { likes: 0, dislikes: 0, commentCount: 0, myReaction: null };
const PUNTONOCHI_AVATAR = 'https://res.cloudinary.com/dwthgcx5j/image/upload/v1790522679/ChatGPT_Image_Sep_25_2026_01_13_43_PM_jsff7g.png';
const PUNTONOCHI_DESCRIPTION = 'Lugares, eventos y novedades de Nochistlán.';
const AYUNTAMIENTO_AVATAR = '/ayuntamiento-avatar.jpg';
const AYUNTAMIENTO_DESCRIPTION = 'Cuenta oficial del Ayuntamiento de Nochistlán de Mejía, Zacatecas.';
const HOTEL_AVATAR = '/hotel-nochistlan-avatar.jpg';
const HOTEL_DESCRIPTION = 'Hotel Nochistlán · Hospedaje en Nochistlán de Mejía, Zacatecas.';
const isAyuntamientoVideoId = (id: string) => id === 'puntonochi-short-3' || id.startsWith('ayuntamiento-short-');
const isHotelVideoId = (id: string) => id.startsWith('hotel-nochistlan-short-');
const getVideoProfileId = (id: string) => isHotelVideoId(id) ? 'hotel' : isAyuntamientoVideoId(id) ? 'ayuntamiento' : 'puntonochi';
const VIDEO_CAPTIONS = [
  'Descubre un nuevo rincón de Nochistlán ✨ #Nochistlán #Zacatecas',
  'Paisajes que nos recuerdan lo increíble que es nuestro planeta 🌎',
  'Así se viven los eventos que reúnen a nuestra comunidad 🎉',
  'Ayuntamiento de Nochistlán · Información y actividades para nuestra comunidad.',
  'Ayuntamiento de Nochistlán · Información y actividades para nuestra comunidad.',
  'Ayuntamiento de Nochistlán · Información y actividades para nuestra comunidad.',
  'Conoce Hotel Nochistlán y descubre una opción para hospedarte en el centro.',
];
type CreateAction = 'reel' | 'event' | 'image';
const CREATE_ACTIONS: Array<{ id: CreateAction; label: string; icon: typeof Film }> = [
  { id: 'reel', label: 'Crear short', icon: Film },
  { id: 'event', label: 'Crear evento', icon: CalendarDays },
  { id: 'image', label: 'Publicar imagen', icon: ImagePlus },
];
const CREATE_ACTION_CONTENT: Record<CreateAction, { title: string; description: string }> = {
  reel: { title: 'Crear reels llegará pronto', description: 'Estamos preparando la creación de PuntoShorts para que puedas grabar y compartir momentos de Nochistlán. Mientras tanto, disfruta los videos de @puntonochi.' },
  event: { title: 'Crear eventos llegará pronto', description: 'Pronto podrás compartir eventos para que la comunidad descubra qué hacer en Nochistlán.' },
  image: { title: 'Publicar imágenes llegará pronto', description: 'Pronto podrás compartir imágenes y momentos con la comunidad de PuntoNochi.' },
};
const feedCardMotion = {
  enter: (direction: number) => ({ y: `${direction * 100}%`, opacity: .82 }),
  center: { y: '0%', opacity: 1 },
  exit: (direction: number) => ({ y: `${direction * -100}%`, opacity: .82 }),
};

function Action({ icon: Icon, label, count, onClick, pressed, disabled }: { icon: typeof ThumbsUp; label: string; count?: string; onClick?: () => void; pressed?: boolean; disabled?: boolean }) {
  return <button type="button" aria-label={label} aria-pressed={pressed} onClick={onClick} disabled={disabled} className={`flex min-w-12 flex-col items-center gap-1 text-white drop-shadow-md disabled:opacity-55 ${pressed ? 'text-[#ff6b78]' : ''}`}>
    <span className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-90 md:h-12 md:w-12 md:bg-black/30 md:backdrop-blur-md"><Icon className="h-5 w-5" strokeWidth={1.8} fill={pressed ? 'currentColor' : 'none'}/></span>
    {count !== undefined && <span className="text-[11px] font-semibold">{count}</span>}
  </button>;
}

function ProfileAction({ onClick, avatar = PUNTONOCHI_AVATAR, handle = '@puntonochi' }: { onClick: () => void; avatar?: string; handle?: string }) {
  return <button type="button" onClick={onClick} aria-label={`Ver perfil de ${handle}`} className="flex flex-col items-center gap-1.5 text-white drop-shadow-md">
    <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-[2.5px] border-[#fe2c55] bg-[#17181b] shadow-[0_0_14px_rgba(254,44,85,.32)]">{avatar ? <img src={avatar} alt="" className="h-full w-full object-cover"/> : <span aria-hidden="true" className="text-xl">🏛️</span>}</span>
  </button>;
}

export function ExploreVideoWireframe({ onClose, onOpenBusiness, onRequireAccount, onCreateShort, onCreateEvent, onOpenEvent }: { onClose: () => void; onOpenBusiness: (place: Place) => void; onRequireAccount?: () => void; onCreateShort?: () => void; onCreateEvent?: () => void; onOpenEvent?: (id: string) => void }) {
  const frameRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const businessCardRef = useRef<HTMLDivElement>(null);
  const promoCardRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const eventPhotoTouchStartX = useRef<number | null>(null);
  const wheelLocked = useRef(false);
  const wheelTimer = useRef<number | null>(null);
  const edgeBounceTimer = useRef<number | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressActive = useRef(false);
  const [videoIndex, setVideoIndex] = useState(() => {
    const sharedShortId = new URLSearchParams(window.location.search).get('short');
    const sharedIndex = sharedShortId ? FEED_VIDEOS.findIndex((video) => video.id === sharedShortId) : -1;
    return sharedIndex >= 0 ? sharedIndex : 0;
  });
  const [videoUrls, setVideoUrls] = useState(FEED_VIDEOS.map((video) => ({ id: video.id, url: video.url })));
  const [feedEvents, setFeedEvents] = useState<EventSummary[]>([]);
  const [eventPhotoIndex, setEventPhotoIndex] = useState(0);
  const [videoStats, setVideoStats] = useState<Record<string, ShortStats>>({});
  const [reactionBusy, setReactionBusy] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [comments, setComments] = useState<ShortComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsSending, setCommentsSending] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentError, setCommentError] = useState('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(1);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [creatorNoticeOpen, setCreatorNoticeOpen] = useState(false);
  const [createAction, setCreateAction] = useState<CreateAction>('reel');
  const [edgeBounce, setEdgeBounce] = useState(0);
  const [muted, setMuted] = useState(true);
  const [videoPaused, setVideoPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsActive, setControlsActive] = useState(false);
  const [featuredBusiness] = useState<Place | null>(() => mockPlaces.length ? mockPlaces[Math.floor(Math.random() * mockPlaces.length)] : null);
  const videoProgress = duration > 0 ? Math.min(100, currentTime / duration * 100) : 0;
  const isEventSlide = videoIndex >= videoUrls.length;
  const currentEvent = isEventSlide ? feedEvents[videoIndex - videoUrls.length] : undefined;
  const eventImages = currentEvent?.gallery?.length ? currentEvent.gallery : currentEvent?.imageUrl ? [{ id: 'cover', imageUrl: currentEvent.imageUrl }] : [];
  const activeEventImage = eventImages[eventPhotoIndex] || eventImages[0];
  const currentVideo = videoUrls[videoIndex] || FEED_VIDEOS[videoIndex] || videoUrls[0] || FEED_VIDEOS[0];
  const isAyuntamientoVideo = isAyuntamientoVideoId(currentVideo.id);
  const isHotelVideo = isHotelVideoId(currentVideo.id);
  const hotelBusiness = mockPlaces.find((place) => place.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').includes('hotel nochistlan')) || null;
  const activeProfile = isHotelVideo
    ? { kind: 'hotel', name: 'Hotel Nochistlán', handle: '@hotelnochistlan', description: HOTEL_DESCRIPTION, avatar: HOTEL_AVATAR, location: 'Nochistlán de Mejía, Zacatecas', business: hotelBusiness }
    : isAyuntamientoVideo
      ? { kind: 'ayuntamiento', name: 'Ayuntamiento Nochistlán', handle: '@ayuntamiento.nochistlan', description: AYUNTAMIENTO_DESCRIPTION, avatar: AYUNTAMIENTO_AVATAR, location: 'Nochistlán de Mejía, Zacatecas', business: null }
      : { kind: 'puntonochi', name: 'PuntoNochi', handle: '@puntonochi', description: PUNTONOCHI_DESCRIPTION, avatar: PUNTONOCHI_AVATAR, location: 'Nochistlán, Zacatecas', business: null };
  const currentStats = videoStats[currentVideo.id] || emptyStats;
  const shareUrl = `${window.location.origin}/puntoshorts?short=${encodeURIComponent(currentVideo.id)}`;
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
  const formatCount = (count: number) => new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 }).format(count);
  useEffect(() => {
    if (!creatorNoticeOpen && !createMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (creatorNoticeOpen) setCreatorNoticeOpen(false);
        else setCreateMenuOpen(false);
        const playback = videoRef.current?.play();
        if (playback) void playback.catch(() => undefined);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [creatorNoticeOpen, createMenuOpen]);
  const keepVideoPlaying = (video: HTMLVideoElement) => {
    const playback = video.play();
    if (playback) void playback.catch(() => undefined);
  };

  const refreshShorts = useCallback(async () => {
    try {
      const response = await fetch('/api/shorts', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) return;
      const rows = await response.json() as Array<{ id: string; videoUrl: string; likes: number; dislikes: number; commentCount: number; myReaction: Reaction }>;
      if (!Array.isArray(rows) || !rows.length) return;
      setVideoUrls(rows.map((row) => ({ id: row.id, url: row.videoUrl })));
      setVideoStats(Object.fromEntries(rows.map((row) => [row.id, { likes: Number(row.likes) || 0, dislikes: Number(row.dislikes) || 0, commentCount: Number(row.commentCount) || 0, myReaction: row.myReaction || null }])));
    } catch { /* Keep the bundled feed available if the database is temporarily unavailable. */ }
  }, []);

  useEffect(() => { void refreshShorts(); }, [refreshShorts]);

  const refreshEvents = useCallback(async () => {
    try {
      const response = await apiFetch('/api/events');
      const rows = await response.json().catch(() => []);
      if (response.ok && Array.isArray(rows)) setFeedEvents(rows as EventSummary[]);
    } catch { /* Keep the video feed active when the events API is unavailable. */ }
  }, []);
  useEffect(() => {
    void refreshEvents();
    window.addEventListener('puntonochi:events-updated', refreshEvents);
    return () => window.removeEventListener('puntonochi:events-updated', refreshEvents);
  }, [refreshEvents]);
  useEffect(() => { setEventPhotoIndex(0); }, [videoIndex]);

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    setCommentError('');
    try {
      const response = await fetch(`/api/shorts/${encodeURIComponent(currentVideo.id)}/comments`, { credentials: 'same-origin', cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'No se pudieron cargar los comentarios.');
      setComments(Array.isArray(result) ? result as ShortComment[] : []);
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : 'No se pudieron cargar los comentarios.');
    } finally { setCommentsLoading(false); }
  }, [currentVideo.id]);

  useEffect(() => { if (commentsOpen) void loadComments(); }, [commentsOpen, loadComments]);

  const toggleReaction = async (reaction: Exclude<Reaction, null>) => {
    if (reactionBusy) return;
    setReactionBusy(true);
    try {
      const response = await fetch(`/api/shorts/${encodeURIComponent(currentVideo.id)}/reactions`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reaction }) });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) { onRequireAccount?.(); return; }
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar tu reacción.');
      setVideoStats((current) => ({ ...current, [currentVideo.id]: { ...(current[currentVideo.id] || emptyStats), likes: Number(result.likes) || 0, dislikes: Number(result.dislikes) || 0, myReaction: result.myReaction || null } }));
      setCommentError('');
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : 'No se pudo guardar tu reacción.');
    } finally { setReactionBusy(false); }
  };

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = commentDraft.trim();
    if (!body || commentsSending) return;
    setCommentsSending(true);
    setCommentError('');
    try {
      const response = await fetch(`/api/shorts/${encodeURIComponent(currentVideo.id)}/comments`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) { onRequireAccount?.(); return; }
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar tu comentario.');
      setComments((current) => [result as ShortComment, ...current]);
      setCommentDraft('');
      setEmojiPickerOpen(false);
      setVideoStats((current) => ({ ...current, [currentVideo.id]: { ...(current[currentVideo.id] || emptyStats), commentCount: (current[currentVideo.id] || emptyStats).commentCount + 1 } }));
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : 'No se pudo guardar tu comentario.');
    } finally { setCommentsSending(false); }
  };

  const openComments = () => {
    videoRef.current?.pause();
    setCommentError('');
    setEmojiPickerOpen(false);
    setCommentsOpen(true);
  };
  const closeComments = () => {
    setCommentsOpen(false);
    setEmojiPickerOpen(false);
    const playback = videoRef.current?.play();
    if (playback) void playback.catch(() => undefined);
  };
  const openProfile = () => {
    videoRef.current?.pause();
    setProfileOpen(true);
  };
  const closeProfile = () => {
    setProfileOpen(false);
    const playback = videoRef.current?.play();
    if (playback) void playback.catch(() => undefined);
  };

  const openShare = () => {
    videoRef.current?.pause();
    setShareStatus('');
    setShareOpen(true);
  };
  const closeShare = () => {
    setShareOpen(false);
    setShareStatus('');
    const playback = videoRef.current?.play();
    if (playback) void playback.catch(() => undefined);
  };
  const copyShareLink = async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(shareUrl);
      else {
        const input = document.createElement('textarea');
        input.value = shareUrl;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand('copy');
        input.remove();
        if (!copied) throw new Error('No se pudo copiar el enlace.');
      }
      setShareStatus('Enlace copiado');
    } catch {
      setShareStatus('No se pudo copiar. Mantén presionado el enlace para copiarlo.');
    }
  };
  const shareNatively = async () => {
    if (!navigator.share) {
      await copyShareLink();
      return;
    }
    try {
      await navigator.share({ title: `${activeProfile.name} en PuntoShorts`, text: VIDEO_CAPTIONS[videoIndex] || 'Mira este video de Nochistlán.', url: shareUrl });
      closeShare();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setShareStatus('No se pudo abrir el menú para compartir.');
    }
  };

  const stepVideo = useCallback((direction: 1 | -1) => {
    const nextIndex = videoIndex + direction;
    if (nextIndex < 0 || nextIndex >= videoUrls.length + feedEvents.length) {
      setEdgeBounce(direction);
      if (edgeBounceTimer.current !== null) window.clearTimeout(edgeBounceTimer.current);
      edgeBounceTimer.current = window.setTimeout(() => { setEdgeBounce(0); edgeBounceTimer.current = null; }, 150);
      return;
    }
    setSwipeDirection(direction);
    setVideoIndex(nextIndex);
  }, [videoIndex, videoUrls.length, feedEvents.length]);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setVideoPaused(false);
    const cornerKit = new CornerKit();
    let animationFrame = 0;
    const applyCorners = () => {
      if (frameRef.current) cornerKit.apply(frameRef.current, { radius: 28, smoothing: 1 });
      if (businessCardRef.current) cornerKit.apply(businessCardRef.current, { radius: 18, smoothing: 1 });
      if (promoCardRef.current) cornerKit.apply(promoCardRef.current, { radius: 18, smoothing: 1 });
    };
    const scheduleCorners = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(applyCorners);
    };
    const observer = new ResizeObserver(scheduleCorners);
    if (frameRef.current) observer.observe(frameRef.current);
    if (businessCardRef.current) observer.observe(businessCardRef.current);
    if (promoCardRef.current) observer.observe(promoCardRef.current);
    scheduleCorners();
    window.addEventListener('resize', scheduleCorners);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
      window.removeEventListener('resize', scheduleCorners);
    };
  }, [videoIndex]);
  useEffect(() => {
    if (!createMenuOpen || !createMenuRef.current) return;
    const cornerKit = new CornerKit();
    let frame = 0;
    const applyCorners = () => {
      if (createMenuRef.current) cornerKit.apply(createMenuRef.current, { radius: 18, smoothing: 1 });
    };
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(applyCorners);
    });
    observer.observe(createMenuRef.current);
    frame = window.requestAnimationFrame(applyCorners);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [createMenuOpen]);
  useEffect(() => () => {
    if (wheelTimer.current !== null) window.clearTimeout(wheelTimer.current);
    if (edgeBounceTimer.current !== null) window.clearTimeout(edgeBounceTimer.current);
    if (longPressTimer.current !== null) window.clearTimeout(longPressTimer.current);
    if (videoRef.current) videoRef.current.playbackRate = 1;
  }, []);

  const startLongPressSpeed = () => {
    if (longPressTimer.current !== null) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      if (videoRef.current) videoRef.current.playbackRate = 2;
      longPressActive.current = true;
      longPressTimer.current = null;
    }, 360);
  };
  const stopLongPressSpeed = () => {
    if (longPressTimer.current !== null) { window.clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (longPressActive.current && videoRef.current) videoRef.current.playbackRate = 1;
    longPressActive.current = false;
  };

  const onWheel = (event: WheelEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('[data-video-controls]')) return;
    if (Math.abs(event.deltaY) < 28 || wheelLocked.current) return;
    wheelLocked.current = true;
    stepVideo(event.deltaY > 0 ? 1 : -1);
    wheelTimer.current = window.setTimeout(() => { wheelLocked.current = false; wheelTimer.current = null; }, 700);
  };
  const onTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const endY = event.changedTouches[0]?.clientY;
    if (touchStartY.current === null || endY === undefined) return;
    const delta = touchStartY.current - endY;
    if (Math.abs(delta) > 48) stepVideo(delta > 0 ? 1 : -1);
    touchStartY.current = null;
  };

  return <motion.main initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'tween', duration: .46, ease: [0.22, 1, 0.36, 1] }} className="fixed inset-0 z-[80] overflow-hidden bg-[#08090b] text-white [will-change:transform]">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block">
      <div className="absolute left-1/2 top-1/2 h-[min(82vh,920px)] w-[min(80vw,1100px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(111,76,167,.3)_0%,rgba(46,91,136,.2)_40%,rgba(8,9,11,0)_72%)] blur-[100px]"/>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_5%,rgba(8,9,11,.28)_76%)]"/>
    </div>

    <button type="button" onClick={onClose} aria-label="Cerrar PuntoShorts" className="absolute left-4 top-[max(14px,env(safe-area-inset-top))] z-30 flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition-transform active:scale-90 md:left-6 md:top-6"><X className="h-5 w-5"/></button>
    <div aria-label="PuntoShorts" className="pointer-events-none absolute inset-x-0 top-[max(22px,env(safe-area-inset-top))] z-30 text-center text-[14px] font-semibold tracking-tight text-white">PuntoShorts</div>
    <button type="button" onClick={() => setCreateMenuOpen((open) => !open)} aria-label="Crear" aria-expanded={createMenuOpen} aria-haspopup="menu" className="absolute right-4 top-[max(14px,env(safe-area-inset-top))] z-40 flex h-11 w-11 items-center justify-center text-white transition-transform active:scale-90 md:right-6 md:top-6"><Plus className="h-6 w-6" strokeWidth={2}/></button>
    <AnimatePresence>{createMenuOpen && <>
      <motion.button type="button" aria-label="Cerrar menú de creación" onClick={() => setCreateMenuOpen(false)} className="fixed inset-0 z-30 cursor-default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}/>
      <motion.div ref={createMenuRef} role="menu" aria-label="Opciones de creación" initial={{ opacity: 0, y: -8, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: .97 }} transition={{ duration: .16 }} className="absolute right-4 top-[max(62px,calc(env(safe-area-inset-top)+58px))] z-40 w-max max-w-[calc(100vw-32px)] overflow-hidden rounded-[18px] bg-[#202124]/95 p-1 text-white shadow-[0_16px_48px_rgba(0,0,0,.45)] backdrop-blur-xl [corner-shape:squircle] md:right-6 md:top-[76px]">
        {CREATE_ACTIONS.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="menuitem" onClick={() => { setCreateMenuOpen(false); if (id === 'reel' && onCreateShort) { videoRef.current?.pause(); onCreateShort(); return; } if (id === 'event' && onCreateEvent) { videoRef.current?.pause(); onCreateEvent(); return; } setCreateAction(id); setCreatorNoticeOpen(true); videoRef.current?.pause(); }} className="flex h-10 w-full items-center gap-2 rounded-[13px] px-2 text-left text-sm font-medium transition-colors hover:bg-white/[.08] active:bg-white/[.12] [corner-shape:squircle]"><Icon className="h-4 w-4 shrink-0 text-white/75"/>{label}</button>)}
      </motion.div>
    </>}</AnimatePresence>

    <AnimatePresence initial={false} custom={swipeDirection} mode="sync">
    <motion.div key={videoIndex} custom={swipeDirection} variants={feedCardMotion} initial="enter" animate={edgeBounce ? { y: edgeBounce > 0 ? -16 : 16 } : 'center'} exit="exit" transition={edgeBounce ? { type: 'spring', stiffness: 460, damping: 17, mass: .48 } : { type: 'spring', stiffness: 190, damping: 29, mass: .86 }} className="absolute inset-0 flex items-center justify-center md:gap-4 md:px-12">
      <section ref={frameRef} onWheel={onWheel} onTouchStart={(event) => { const target = event.target as HTMLElement; if (target.closest('[data-video-controls]')) { touchStartY.current = null; return; } touchStartY.current = event.touches[0]?.clientY ?? null; if (!target.closest('button, a')) startLongPressSpeed(); }} onTouchMove={(event) => { const y = event.touches[0]?.clientY; if (touchStartY.current !== null && y !== undefined && Math.abs(touchStartY.current - y) > 12) { if (longPressTimer.current !== null) { window.clearTimeout(longPressTimer.current); longPressTimer.current = null; } if (longPressActive.current) stopLongPressSpeed(); } }} onTouchEnd={(event) => { stopLongPressSpeed(); onTouchEnd(event); }} onTouchCancel={stopLongPressSpeed} onContextMenu={(event) => event.preventDefault()} aria-label="Feed de videos y eventos. Desliza verticalmente para cambiar de publicación." className="group relative h-[calc(100%-10px)] w-[calc(100%-10px)] touch-pan-x overflow-hidden rounded-[28px] bg-[#141519] [corner-shape:squircle] md:h-[min(86dvh,820px)] md:w-auto md:aspect-[9/16] md:rounded-[30px] md:shadow-[0_30px_120px_rgba(0,0,0,.55)]">
        {isEventSlide && currentEvent ? <div className="absolute inset-0 bg-[#17282c]" onTouchStart={(event) => { eventPhotoTouchStartX.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => { const startX = eventPhotoTouchStartX.current; eventPhotoTouchStartX.current = null; const endX = event.changedTouches[0]?.clientX; if (startX === null || endX === undefined || Math.abs(endX - startX) < 32 || eventImages.length < 2) return; setEventPhotoIndex((index) => (index + (endX < startX ? 1 : eventImages.length - 1)) % eventImages.length); }}>
          {activeEventImage && <img src={activeEventImage.imageUrl} alt={`Foto ${eventPhotoIndex + 1} de ${currentEvent.title}`} className="absolute inset-0 h-full w-full object-cover"/>}
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/5 to-black/85"/>
          <div className="absolute left-5 top-5 rounded-full bg-black/35 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] backdrop-blur-xl">Punto Events</div>
          {eventImages.length > 1 && <><button type="button" aria-label="Foto anterior del evento" onClick={() => setEventPhotoIndex((index) => (index + eventImages.length - 1) % eventImages.length)} className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-xl"><ChevronLeft className="h-5 w-5"/></button><button type="button" aria-label="Foto siguiente del evento" onClick={() => setEventPhotoIndex((index) => (index + 1) % eventImages.length)} className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-xl"><ChevronRight className="h-5 w-5"/></button><div className="absolute inset-x-0 top-6 z-10 flex justify-center gap-1.5">{eventImages.map((photo, index) => <span key={photo.id} className={`h-1 rounded-full ${index === eventPhotoIndex ? 'w-5 bg-white' : 'w-2 bg-white/50'}`}/>)}</div></>}
          <div className="absolute inset-x-5 bottom-8 z-10 md:bottom-10">
            <p className="text-xs font-semibold text-white/75">{new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${currentEvent.date}T12:00:00Z`))}{currentEvent.time ? ` · ${currentEvent.time}` : ''}</p>
            <h2 className="mt-2 text-3xl font-bold leading-tight">{currentEvent.title}</h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-white/80"><MapPin className="h-4 w-4 shrink-0"/>{currentEvent.location}</p>
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/80">{currentEvent.description}</p>
            <button type="button" onClick={() => onOpenEvent?.(currentEvent.id)} className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-white text-sm font-bold text-[#15191b]">Ver evento</button>
          </div>
        </div> : <>
        <video ref={videoRef} src={currentVideo.url} autoPlay muted={muted} playsInline preload="auto" aria-label={videoPaused ? 'Video pausado. Toca para reproducir' : 'Video reproduciéndose. Toca para pausar'} onClick={(event) => { if ((event.target as HTMLElement).closest('[data-video-controls]')) return; const video = event.currentTarget; if (video.paused) { const playback = video.play(); if (playback) void playback.catch(() => undefined); setVideoPaused(false); } else { video.pause(); setVideoPaused(true); } }} onPlay={() => setVideoPaused(false)} onPause={() => setVideoPaused(true)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onLoadedMetadata={(event) => { setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0); keepVideoPlaying(event.currentTarget); }} onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} onEnded={(event) => { event.currentTarget.currentTime = 0; keepVideoPlaying(event.currentTarget); }} className="absolute inset-0 h-full w-full cursor-pointer object-cover"/>
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/45 to-transparent md:hidden"/>
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/75 via-black/20 to-transparent"/>

        <div className="absolute bottom-[max(62px,calc(env(safe-area-inset-bottom)+46px))] left-5 right-[76px] z-10 md:bottom-5 md:left-6 md:right-6">
          <button type="button" onClick={openProfile} aria-label={`Abrir perfil de ${activeProfile.name}`} className="mb-2 flex items-center gap-2 text-left">{activeProfile.avatar ? <img src={activeProfile.avatar} alt="" className="h-7 w-7 rounded-full object-cover"/> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-sm">🏛️</span>}<span className="min-w-0"><span className="block text-[11px] font-bold leading-tight">{activeProfile.name} <span className="font-medium text-white/65">{activeProfile.handle}</span></span><span className="mt-0.5 block truncate text-[9px] text-white/65">{activeProfile.description}</span></span></button>
          <p className="line-clamp-2 text-[13px] leading-5 text-white/90">{VIDEO_CAPTIONS[videoIndex]}</p>
        </div>

        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 z-[5] h-[48%] w-[68px] bg-gradient-to-t from-black/[.08] via-black/[.025] to-transparent backdrop-blur-[.5px] [mask-image:linear-gradient(to_top,rgba(0,0,0,.72)_0%,rgba(0,0,0,.3)_40%,transparent_100%)] md:hidden"/>
        {videoIndex === 1 && featuredBusiness && <motion.div ref={businessCardRef} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .24, ease: 'easeOut' }} className="absolute bottom-[max(110px,calc(env(safe-area-inset-bottom)+76px))] left-4 z-10 flex max-w-[min(270px,calc(100%-92px))] items-center gap-2.5 rounded-[18px] border border-white/15 bg-black/25 p-2.5 text-white shadow-[0_8px_24px_rgba(0,0,0,.18)] backdrop-blur-xl [corner-shape:squircle] md:bottom-[104px] md:left-5">
          {(featuredBusiness.images[0] || featuredBusiness.logo) ? <img src={featuredBusiness.images[0] || featuredBusiness.logo} alt={`Imagen de ${featuredBusiness.name}`} className="h-9 w-9 shrink-0 rounded-[12px] object-cover [corner-shape:squircle]"/> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-xs font-bold text-white/85 [corner-shape:squircle]">{featuredBusiness.name.slice(0, 1)}</span>}
          <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold">{featuredBusiness.name}</span><span className="mt-0.5 block truncate text-[9px] text-white/55">{featuredBusiness.category} · {featuredBusiness.location}</span></span>
          <button type="button" onClick={() => onOpenBusiness(featuredBusiness)} className="shrink-0 rounded-full bg-white px-2.5 py-1.5 text-[9px] font-bold text-black">Ver negocio</button>
        </motion.div>}
        <div className="absolute bottom-[max(72px,calc(env(safe-area-inset-bottom)+60px))] right-3 z-20 flex flex-col items-center gap-2.5 md:hidden">
          <ProfileAction onClick={openProfile} avatar={activeProfile.avatar} handle={activeProfile.handle}/>
          <Action icon={ThumbsUp} label="Me gusta" count={formatCount(currentStats.likes)} onClick={() => void toggleReaction('like')} pressed={currentStats.myReaction === 'like'} disabled={reactionBusy}/>
          <Action icon={MessageCircle} label="Comentarios" count={formatCount(currentStats.commentCount)} onClick={openComments}/>
          <Action icon={Share2} label="Compartir" onClick={openShare}/>
        </div>
        <div data-video-controls onMouseEnter={() => setControlsActive(true)} onMouseLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) setControlsActive(false); }} onFocusCapture={() => setControlsActive(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setControlsActive(false); }} className={`absolute inset-x-0 bottom-0 z-20 flex items-end gap-2 bg-gradient-to-t from-black/55 via-black/20 to-transparent px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-10 transition-opacity duration-200 [@media(hover:none)]:opacity-100 ${controlsActive ? 'opacity-100' : 'opacity-0'}`}>
          <div className="min-w-0 flex-1">
            <input type="range" min={0} max={duration || 1} step={0.1} value={Math.min(currentTime, duration || 0)} onChange={(event) => { const nextTime = Number(event.currentTarget.value); setCurrentTime(nextTime); if (videoRef.current) videoRef.current.currentTime = nextTime; }} aria-label="Posición del video" className="block h-1 w-full cursor-pointer appearance-none rounded-full accent-white" style={{ background: `linear-gradient(to right, white ${videoProgress}%, rgba(255,255,255,.36) ${videoProgress}%)` }}/>
            <div className="mt-1 flex items-center justify-between text-[10px] font-medium tabular-nums text-white"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
          </div>
          <button type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? 'Activar sonido' : 'Silenciar video'} aria-pressed={!muted} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 active:scale-90">{muted ? <VolumeX className="h-[18px] w-[18px]"/> : <Volume2 className="h-[18px] w-[18px]"/>}</button>
        </div>
        </>}
      </section>

      {!isEventSlide && <aside className="hidden w-[76px] shrink-0 flex-col items-center gap-5 md:flex">
        <ProfileAction onClick={openProfile} avatar={activeProfile.avatar} handle={activeProfile.handle}/>
        <Action icon={ThumbsUp} label="Me gusta" count={formatCount(currentStats.likes)} onClick={() => void toggleReaction('like')} pressed={currentStats.myReaction === 'like'} disabled={reactionBusy}/>
        <Action icon={MessageCircle} label="Comentarios" count={formatCount(currentStats.commentCount)} onClick={openComments}/>
        <Action icon={Share2} label="Compartir" onClick={openShare}/>
      </aside>}
    </motion.div>
    </AnimatePresence>
    <AnimatePresence>{profileOpen && <motion.main role="dialog" aria-modal="true" aria-labelledby="puntonochi-profile-name" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: .2 }} className="fixed inset-0 z-[100] overflow-y-auto bg-[#101113] text-white">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between bg-[#101113]/90 px-4 backdrop-blur-xl"><button type="button" onClick={closeProfile} aria-label="Volver a PuntoShorts" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[.07]"><X className="h-5 w-5"/></button><span className="text-sm font-semibold">Perfil</span><span className="w-10"/></header>
      <div className="mx-auto max-w-3xl px-5 pb-[max(30px,env(safe-area-inset-bottom))] pt-4">
        <section className="flex items-start gap-4">{activeProfile.avatar ? <img src={activeProfile.avatar} alt={`Foto de perfil de ${activeProfile.name}`} className="h-[76px] w-[76px] shrink-0 rounded-full object-cover ring-2 ring-[#fe2c55]"/> : <span aria-label="Emblema del Ayuntamiento" className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full bg-white/[.08] text-4xl ring-2 ring-[#fe2c55]">🏛️</span>}<div className="min-w-0 flex-1 pt-1"><h1 id="puntonochi-profile-name" className="text-xl font-bold">{activeProfile.name}</h1><p className="mt-0.5 text-xs text-white/55">{activeProfile.handle}</p><p className="mt-2 text-xs leading-relaxed text-white/70">{activeProfile.description}</p></div></section>
        {activeProfile.business && <button type="button" onClick={() => onOpenBusiness(activeProfile.business!)} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-[#202124] transition-transform active:scale-[.98]"><Building2 className="h-4 w-4"/>Ver hotel</button>}
        <div className="mt-5 flex items-center gap-5 py-2 text-xs"><span><b>{videoUrls.filter((video) => getVideoProfileId(video.id) === activeProfile.kind).length}</b> videos</span><span className="text-white/45">{activeProfile.location}</span></div>
        <h2 className="mb-3 mt-5 text-sm font-semibold">Videos de {activeProfile.name}</h2>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3">{videoUrls.map((video, feedIndex) => ({ video, feedIndex })).filter(({ video }) => getVideoProfileId(video.id) === activeProfile.kind).map(({ video, feedIndex }, index) => <button key={video.id} type="button" onClick={() => { setVideoIndex(feedIndex); closeProfile(); }} aria-label={`Ver video ${index + 1} de ${activeProfile.name}`} className="group relative aspect-[9/16] overflow-hidden rounded-[12px] bg-[#222428] text-left [corner-shape:squircle]">
          <video src={video.url} muted playsInline autoPlay loop preload="metadata" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"/>
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-8"><span className="line-clamp-2 block text-[9px] font-medium leading-snug text-white sm:text-[11px]">{VIDEO_CAPTIONS[feedIndex] || `${activeProfile.name} · Nochistlán`}</span><span className="mt-1 flex items-center gap-1 text-[9px] font-semibold text-white/85"><ThumbsUp className="h-3 w-3"/>{formatCount(videoStats[video.id]?.likes || 0)}</span></span>
        </button>)}</div>
      </div>
    </motion.main>}</AnimatePresence>
    <AnimatePresence>{shareOpen && <>
      <motion.button type="button" aria-label="Cerrar compartir" onClick={closeShare} className="fixed inset-0 z-[90] bg-black/65 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}/>
      <motion.section role="dialog" aria-modal="true" aria-labelledby="short-share-title" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 34, stiffness: 300, mass: .85 }} className="fixed inset-x-[5px] bottom-[5px] z-[91] mx-auto flex max-w-[620px] flex-col overflow-hidden rounded-[28px] bg-[#202124] px-5 pb-[max(22px,env(safe-area-inset-bottom))] pt-3 text-white shadow-[0_24px_90px_rgba(0,0,0,.55)] [corner-shape:squircle]">
        <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-white/20"/>
        <div className="flex items-center justify-between"><div><h2 id="short-share-title" className="text-base font-bold">Compartir video</h2><p className="mt-1 text-xs text-white/50">Envía este video de {activeProfile.name}</p></div><button type="button" onClick={closeShare} aria-label="Cerrar compartir" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[.08] text-white/75"><X className="h-4 w-4"/></button></div>
        <div className="mt-5 flex min-w-0 items-center gap-2 rounded-2xl bg-[#292a2d] px-3 py-3"><span className="min-w-0 flex-1 truncate text-xs text-white/65">{shareUrl}</span><button type="button" onClick={() => void copyShareLink()} aria-label="Copiar enlace" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[.08] text-white transition-colors hover:bg-white/[.14]"><Copy className="h-4 w-4"/></button></div>
        {shareStatus && <p role="status" className={`mt-2 px-1 text-xs ${shareStatus.startsWith('No se pudo') ? 'text-red-300' : 'text-emerald-300'}`}>{shareStatus}</p>}
        <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => void shareNatively()} className="flex h-12 items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-[#202124] transition-transform active:scale-[.98]"><Share2 className="h-4 w-4"/>Compartir…</button><a href={`https://wa.me/?text=${encodeURIComponent(`${VIDEO_CAPTIONS[videoIndex] || 'Mira este video de Nochistlán.'} ${shareUrl}`)}`} target="_blank" rel="noopener noreferrer" onClick={closeShare} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#25D366] text-sm font-semibold text-[#102117] transition-transform active:scale-[.98]"><img src="/whatsapp-logo.png" alt="" aria-hidden="true" className="h-5 w-5 object-contain"/>WhatsApp</a></div>
      </motion.section>
    </>}</AnimatePresence>
    <AnimatePresence>{commentsOpen && <>
      <motion.button type="button" aria-label="Cerrar comentarios" onClick={closeComments} className="fixed inset-0 z-[90] bg-black/65 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}/>
      <motion.section role="dialog" aria-modal="true" aria-labelledby="short-comments-title" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 34, stiffness: 300, mass: .85 }} className="fixed inset-x-[5px] bottom-[5px] z-[91] mx-auto flex h-[min(76dvh,690px)] max-w-[620px] flex-col overflow-hidden rounded-[28px] bg-[#202124] text-white shadow-[0_24px_90px_rgba(0,0,0,.55)] [corner-shape:squircle]">
        <div className="shrink-0 px-5 pb-3 pt-3"><div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-white/20"/><div className="flex items-center justify-between"><div><h2 id="short-comments-title" className="text-base font-bold">Comentarios</h2><p className="mt-0.5 text-[11px] text-white/45">{formatCount(currentStats.commentCount)} en este video</p></div><button type="button" onClick={closeComments} aria-label="Cerrar comentarios" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[.08] text-white/75"><X className="h-4 w-4"/></button></div></div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3">
          {commentsLoading ? <div role="status" className="flex h-32 items-center justify-center text-xs text-white/45">Cargando comentarios…</div> : comments.length ? <div className="space-y-5 py-2">{comments.map((comment) => <article key={comment.id} className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[.09] text-xs font-bold text-white/80">{comment.authorPicture ? <img src={comment.authorPicture} alt="" className="h-full w-full object-cover"/> : comment.authorName?.slice(0, 1).toLocaleUpperCase('es-MX')}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-xs font-semibold text-white/85">{comment.authorName}</span><time className="shrink-0 text-[10px] text-white/35">{new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(comment.createdAt))}</time></div><p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/75">{comment.body}</p></div></article>)}</div> : <div className="flex h-full min-h-32 flex-col items-center justify-center text-center"><MessageCircle className="h-7 w-7 text-white/25"/><p className="mt-3 text-sm font-semibold text-white/70">Todavía no hay comentarios</p><p className="mt-1 text-xs text-white/40">Sé la primera persona en comentar.</p></div>}
          {commentError && <p role="alert" className="mt-3 rounded-2xl bg-red-500/10 px-3 py-2 text-xs text-red-200">{commentError}</p>}
        </div>
        <div className="shrink-0 border-t border-white/[.06] px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">
          {emojiPickerOpen && <div className="mb-3 rounded-[20px] bg-[#292a2d] p-2.5 [corner-shape:squircle]"><p className="mb-2 px-1 text-[10px] font-semibold text-white/45">Añade un emoji</p><div className="grid max-h-[82px] grid-flow-col grid-rows-2 auto-cols-[38px] gap-1.5 overflow-x-auto overscroll-x-contain pb-1">{COMMENT_EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={() => setCommentDraft((current) => `${current}${emoji}`.slice(0, 500))} aria-label={`Añadir ${emoji}`} className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition-colors hover:bg-white/[.08] active:scale-90">{emoji}</button>)}</div></div>}
          <form onSubmit={(event) => void submitComment(event)} className="flex min-h-12 items-center gap-2 rounded-full bg-[#292a2d] px-2 py-1.5 [corner-shape:squircle]"><button type="button" onClick={() => setEmojiPickerOpen((open) => !open)} aria-label={emojiPickerOpen ? 'Cerrar emojis' : 'Añadir emoji'} aria-expanded={emojiPickerOpen} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${emojiPickerOpen ? 'bg-white/[.12] text-white' : 'text-white/55 hover:bg-white/[.08]'}`}><SmilePlus className="h-[18px] w-[18px]"/></button><input value={commentDraft} onChange={(event) => setCommentDraft(event.target.value.slice(0, 500))} maxLength={500} aria-label="Escribe un comentario" placeholder="Añade un comentario…" className="short-comment-input min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/35"/><button type="submit" disabled={!commentDraft.trim() || commentsSending} aria-label="Enviar comentario" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#202124] transition-transform active:scale-90 disabled:bg-white/[.1] disabled:text-white/30"><Send className="h-4 w-4"/></button></form>
          <p className="mt-2 px-2 text-[10px] text-white/35">Inicia sesión para publicar comentarios.</p>
        </div>
      </motion.section>
    </>}</AnimatePresence>
    <AnimatePresence>{creatorNoticeOpen && <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 px-5 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) { setCreatorNoticeOpen(false); const playback = videoRef.current?.play(); if (playback) void playback.catch(() => undefined); } }}>
      <motion.section role="dialog" aria-modal="true" aria-labelledby="reels-coming-title" aria-describedby="reels-coming-description" initial={{ opacity: 0, y: 14, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .98 }} transition={{ duration: .2 }} className="relative w-full max-w-[360px] rounded-[28px] bg-[#202124] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,.45)] [corner-shape:squircle]">
        <button type="button" onClick={() => { setCreatorNoticeOpen(false); const playback = videoRef.current?.play(); if (playback) void playback.catch(() => undefined); }} aria-label="Cerrar aviso" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/[.08] text-white/70 transition-colors hover:bg-white/[.14]"><X className="h-4 w-4"/></button>
        <span className="flex h-12 w-12 items-center justify-center rounded-[17px] bg-white/[.08] text-white [corner-shape:squircle]">{(() => { const Icon = CREATE_ACTIONS.find((action) => action.id === createAction)?.icon || Film; return <Icon className="h-5 w-5"/>; })()}</span>
        <h2 id="reels-coming-title" className="mt-5 pr-7 text-lg font-bold tracking-tight">{CREATE_ACTION_CONTENT[createAction].title}</h2>
        <p id="reels-coming-description" className="mt-2 text-sm leading-relaxed text-white/60">{CREATE_ACTION_CONTENT[createAction].description}</p>
        <button type="button" onClick={() => { setCreatorNoticeOpen(false); const playback = videoRef.current?.play(); if (playback) void playback.catch(() => undefined); }} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-[#202124] transition-transform active:scale-[.98]"><Check className="h-4 w-4"/>Entendido</button>
      </motion.section>
    </motion.div>}</AnimatePresence>
  </motion.main>;
}
