import { lazy, Suspense, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share, Phone, Globe, ShoppingBag, MoreHorizontal, Navigation, BookOpen, Link, MapPin, Map as MapIcon, MessageCircle, Twitter, Facebook, QrCode, Star, Instagram } from 'lucide-react';
import { Place, Review } from '../types';
import { mockPlaces } from '../data';
import CornerKit from '@cornerkit/core';
import { CommunityActionsSheet } from './CommunityActionsSheet';
import { SheetDragHandle, useSheetDrag } from './SheetDragHandle';
import { VerifiedBusinessName } from './VerifiedBusinessName';

const BusinessLocationMap = lazy(() => import('./BusinessLocationMap').then((module) => ({ default: module.BusinessLocationMap })));
const BusinessMapOverlay = lazy(() => import('./BusinessLocationMap').then((module) => ({ default: module.BusinessMapOverlay })));

type GoogleReview = {
  rating: number;
  text: string;
  relativePublishTimeDescription: string;
  author: { name: string; uri: string; photoUri: string };
  googleMapsUri: string;
  flagContentUri: string;
};
type GooglePlaceDetails = { weekdayDescriptions: string[]; reviews: GoogleReview[]; googleMapsUri: string };

export function BusinessDetailSheet({ place, onClose, onSelectBusiness }: { place: Place, onClose: () => void, onSelectBusiness: (place: Place) => void }) {
  const [communityReviews, setCommunityReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [googleDetails, setGoogleDetails] = useState<GooglePlaceDetails | null>(null);
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [showMapOverlay, setShowMapOverlay] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [viewerState, setViewerState] = useState<{ index: number; direction: number } | null>(null);
  const [showWebsiteWarning, setShowWebsiteWarning] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showCommunityActions, setShowCommunityActions] = useState(false);
  const [communityReviewMode, setCommunityReviewMode] = useState<'menu' | 'reviews'>('menu');
  const [shareFeedback, setShareFeedback] = useState('');
  const businessUrl = `${window.location.origin}/place/${encodeURIComponent(place.id)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=176x176&margin=8&data=${encodeURIComponent(businessUrl)}`;
  const shareText = `Mira ${place.name} en PuntoNochi`;
  const detailDrag = useSheetDrag(onClose);
  const mapDrag = useSheetDrag(() => setShowMapSelector(false));
  const phoneDrag = useSheetDrag(() => setShowPhoneModal(false));
  const menuDrag = useSheetDrag(() => setShowMenuModal(false));
  const shareDrag = useSheetDrag(() => setShowShareModal(false));

  useEffect(() => {
    let active = true;
    setCommunityReviews([]);
    setReviewsLoading(true);
    setGoogleDetails(null);
    const id = encodeURIComponent(place.id);
    void fetch(`/api/places/${id}/reviews`).then(async (response) => {
      if (!response.ok) throw new Error('reviews');
      return response.json() as Promise<Review[]>;
    }).then((reviews) => { if (active) setCommunityReviews(Array.isArray(reviews) ? reviews : []); })
      .catch(() => undefined)
      .finally(() => { if (active) setReviewsLoading(false); });
    void fetch(`/api/places/${id}/google-details`).then(async (response) => {
      if (!response.ok) throw new Error('google details');
      return response.json() as Promise<GooglePlaceDetails>;
    }).then((details) => { if (active) setGoogleDetails(details); }).catch(() => undefined);
    return () => { active = false; };
  }, [place.id]);

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

  const todayName = new Intl.DateTimeFormat('es-MX', { weekday: 'long' }).format(new Date());
  const todaySchedule = place.weeklyHours?.[todayName.charAt(0).toLocaleUpperCase('es') + todayName.slice(1)];
  const closingTime = todaySchedule?.intervals?.at(-1)?.close;
  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    return new Date(2000, 0, 1, hour, minute).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
  };

  const fallbackSchedule = place.weeklyHours
    ? Object.entries(place.weeklyHours).sort(([a], [b]) => {
      const order = ['lunes', 'martes', 'miércoles', 'miercoles', 'jueves', 'viernes', 'sábado', 'sabado', 'domingo'];
      return order.indexOf(a.toLocaleLowerCase('es')) - order.indexOf(b.toLocaleLowerCase('es'));
    }).map(([day, schedule]) => `${day}: ${schedule.closed ? 'Cerrado' : schedule.intervals.map(({ open, close }) => `${formatTime(open)}–${formatTime(close)}`).join(', ') || 'Horario no disponible'}`)
    : [];
  const reviewSamples = communityReviews.length ? communityReviews : (googleDetails?.reviews || []);
  const reviewAverage = communityReviews.length
    ? communityReviews.reduce((sum, review) => sum + review.rating, 0) / communityReviews.length
    : place.rating || (reviewSamples.length ? reviewSamples.reduce((sum, review) => sum + review.rating, 0) / reviewSamples.length : 0);
  const reviewTotal = communityReviews.length + (place.reviewCount || 0);
  const ratingDistribution = [5, 4, 3, 2, 1].map((score) => ({ score, count: reviewSamples.filter((review) => review.rating === score).length }));
  const maxRatingCount = Math.max(1, ...ratingDistribution.map((item) => item.count));
  const suggestedBusinesses = mockPlaces
    .filter((business) => business.id !== place.id)
    .sort((a, b) => Number(b.category === place.category) - Number(a.category === place.category) || b.rating - a.rating)
    .slice(0, 8);

  const copyBusinessLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(businessUrl);
      } else {
        const input = document.createElement('textarea');
        input.value = businessUrl;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand('copy');
        input.remove();
        if (!copied) throw new Error('No se pudo copiar el enlace.');
      }
      setShareFeedback('Enlace copiado.');
    } catch {
      setShareFeedback('No se pudo copiar. Mantén pulsado el enlace para copiarlo.');
    }
  };

  const shareTo = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setShareFeedback('Se abrió la opción para compartir.');
  };


  useEffect(() => {
    const timer = setTimeout(() => {
      const ck = new CornerKit();
      ck.applyAll('.ck-apply', { radius: 23, smoothing: 1 });
      ck.applyAll('[data-detail-squircle]', { radius: 24, smoothing: 1 });
      ck.applyAll('[data-suggested-business]', { radius: 22, smoothing: 1 });
    }, 300);
    return () => clearTimeout(timer);
  }, [place, reviewsLoading, communityReviews.length]);
  const openViewer = (index: number) => setViewerState({ index, direction: 0 });
  const closeViewer = () => setViewerState(null);

  const paginate = (newDirection: number) => {
    if (!viewerState) return;
    let nextIndex = viewerState.index + newDirection;
    if (nextIndex < 0) nextIndex = place.images.length - 1;
    if (nextIndex >= place.images.length) nextIndex = 0;
    setViewerState({ index: nextIndex, direction: newDirection });
  };

  const carouselVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100vw' : '-100vw',
      opacity: 0,
      scale: 0.8,
      rotateY: direction > 0 ? 45 : -45,
      zIndex: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      rotateY: 0,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '100vw' : '-100vw',
      opacity: 0,
      scale: 0.8,
      rotateY: direction < 0 ? 45 : -45,
    })
  };

  const openMap = (app: 'google' | 'apple') => {
    const query = encodeURIComponent(place.address || place.name);
    if (app === 'google') {
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    } else {
      window.open(`http://maps.apple.com/?q=${query}`, '_blank');
    }
    setShowMapSelector(false);
  };

  const viewMap = () => {
    setShowMapOverlay(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 360, mass: 0.82 }}
        {...detailDrag}
        data-no-tab-swipe
        className="fixed inset-x-0 bottom-0 z-[61] h-[min(92dvh,900px)] max-h-[calc(100dvh-env(safe-area-inset-top))] overflow-hidden rounded-t-[32px] bg-[#171717] flex flex-col"
      >
        <SheetDragHandle controls={detailDrag.dragControls} tone="dark" className="absolute inset-x-0 top-0 z-20" />
        
        <div data-no-tab-swipe className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pb-8">
          {/* Hero Section */}
          <div className="relative w-full h-[240px]">
            <img 
              src={place.images[0]} 
              alt={place.name} 
              className="w-full h-full object-cover cursor-pointer" 
              onPointerDownCapture={(e) => e.stopPropagation()}
              onClick={() => openViewer(0)} 
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent via-[#171717]/70 to-[#171717]" />
            <div className="absolute top-4 right-4 flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }} className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-colors">
                <Share className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-colors">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
            
            {/* Logo */}
            <div className="absolute -bottom-10 left-5 w-20 h-20 rounded-full border-4 border-[#171717] bg-[#292a2d] overflow-hidden">
              <img src={place.logo} alt={place.name} className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="px-5 pt-12 pb-6">
            <h1 className="mb-1 text-[28px] font-bold leading-tight text-neutral-900"><VerifiedBusinessName name={place.name}/></h1>
            <p className="text-[15px] font-medium text-neutral-600">
              {place.category} • <span className="text-[#1a73e8] hover:underline cursor-pointer">{place.location}</span>
            </p>
            {place.subtitle && place.subtitle.toLocaleLowerCase('es') !== 'establishment' && <p className="mt-1 text-[13px] text-white/55">{place.subtitle}</p>}
            <div className="mt-1.5 flex items-center gap-1.5 text-[13px]" aria-label={`${place.rating > 0 ? `Calificación ${place.rating.toFixed(1)}, ` : ''}${place.reviewCount || 0} reseñas`}>
              <Star aria-hidden="true" className={`h-3.5 w-3.5 ${place.rating > 0 ? 'fill-amber-400 text-amber-400' : 'text-white/35'}`} />
              <span className="font-semibold text-white/85">{place.rating > 0 ? place.rating.toFixed(1) : 'Nuevo'}</span>
              <span className="text-white/45">· {place.reviewCount || 0} {(place.reviewCount || 0) === 1 ? 'reseña' : 'reseñas'}</span>
            </div>
            <p className="mt-1 text-[13px]" aria-label={place.isOpen ? 'Abierto ahora' : 'Cerrado ahora'}><span className={place.isOpen ? 'font-semibold text-emerald-400' : 'font-semibold text-white/60'}>{place.isOpen ? 'Abierto ahora' : 'Cerrado ahora'}</span>{place.isOpen && closingTime && <span className="text-white/55"> hasta las {formatTime(closingTime)}</span>}</p>

            {/* Action Buttons */}
            <div className="flex items-start gap-2 overflow-x-auto scrollbar-hide py-5 snap-x">
              <button type="button" onClick={() => setShowPhoneModal(true)} disabled={!place.phone && !place.alternatePhone} className="flex min-w-[62px] flex-1 snap-start flex-col items-center gap-2 text-white disabled:opacity-40" aria-label="Llamar al negocio">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#292a2d]"><Phone className="h-5 w-5" strokeWidth={1.8}/></span>
                <span className="whitespace-nowrap text-[11px] font-semibold">Llamar</span>
              </button>
              <button type="button" onClick={viewMap} className="flex min-w-[62px] flex-1 snap-start flex-col items-center gap-2 text-white" aria-label="Ver ubicación en el mapa">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#292a2d]"><MapIcon className="h-5 w-5" strokeWidth={1.8}/></span>
                <span className="whitespace-nowrap text-[11px] font-semibold">Ver mapa</span>
              </button>
              <button type="button" onClick={() => setShowMapSelector(true)} className="flex min-w-[62px] flex-1 snap-start flex-col items-center gap-2 text-white" aria-label="Ir al negocio">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#292a2d]"><Navigation className="h-5 w-5" strokeWidth={1.8}/></span>
                <span className="whitespace-nowrap text-[11px] font-semibold">Ir</span>
              </button>
              {(() => {
                const name = place.name.toLowerCase();
                const hasWebsite = Boolean(place.websiteUrl) || name.includes('aurrera') || name.includes('guadalajara') || name.includes('banorte') || name.includes('bbva') || name.includes('hotel nochistlán') || name.includes('hotel nochistlan');
                return <button type="button" onClick={() => setShowWebsiteWarning(true)} disabled={!hasWebsite} className="flex min-w-[62px] flex-1 snap-start flex-col items-center gap-2 text-white disabled:opacity-40" aria-label="Abrir sitio web del negocio">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#292a2d]"><Globe className="h-5 w-5" strokeWidth={1.8}/></span>
                  <span className="whitespace-nowrap text-[11px] font-semibold">Sitio</span>
                </button>;
              })()}
              {place.instagramUrl && <a href={place.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex min-w-[62px] flex-1 snap-start flex-col items-center gap-2 text-white" aria-label="Abrir Instagram del negocio">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#292a2d]"><Instagram className="h-5 w-5" strokeWidth={1.8}/></span>
                <span className="whitespace-nowrap text-[11px] font-semibold">Instagram</span>
              </a>}
              <button type="button" onClick={() => { setCommunityReviewMode('menu'); setShowCommunityActions(true); }} className="flex min-w-[62px] flex-1 snap-start flex-col items-center gap-2 text-white" aria-label="Más opciones">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#292a2d]"><MoreHorizontal className="h-5 w-5" strokeWidth={1.8}/></span>
                <span className="whitespace-nowrap text-[11px] font-semibold">Más</span>
              </button>
            </div>

            {/* Info list */}
            <div className="space-y-4 mb-6">
              <div data-detail-squircle className="rounded-[24px] bg-[#292a2d] px-4 py-3.5 text-white shadow-none">
                <span className="mb-2 block text-[11px] font-semibold text-white/50">Dirección</span>
                <div className="flex items-start gap-2.5">
                  <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-white/75" />
                  <span className="text-[15px] font-medium leading-snug">{place.address || place.location || 'Dirección no disponible'}</span>
                </div>
              </div>
              <section aria-labelledby="place-hours-title" className="pt-1 text-white">
                <h3 id="place-hours-title" className="mb-2 text-[17px] font-bold">Horario</h3>
                <div className="divide-y divide-white/[0.07]">
                  {(googleDetails?.weekdayDescriptions?.length ? googleDetails.weekdayDescriptions : fallbackSchedule.length ? fallbackSchedule : [place.hours || 'Horario no disponible'])
                    .map((entry, index) => {
                      const separator = entry.indexOf(':');
                      const day = separator >= 0 ? entry.slice(0, separator).trim() : (fallbackSchedule.length ? '' : 'Horario regular');
                      const time = separator >= 0 ? entry.slice(separator + 1).trim() : entry;
                      const isToday = day && day.toLocaleLowerCase('es').startsWith(todayName.slice(0, 3).toLocaleLowerCase('es'));
                      return <div key={`${entry}-${index}`} className="flex min-h-10 items-center justify-between gap-4 py-2 text-[14px]">
                        <span className={isToday ? 'font-semibold text-white' : 'text-white/65'}>{day || 'Horario regular'}{isToday ? ' · Hoy' : ''}</span>
                        <span className={`text-right ${/cerrado|closed/i.test(time) ? 'text-white/45' : 'text-white/85'}`}>{time}</span>
                      </div>;
                    })}
                </div>
                {googleDetails?.googleMapsUri && <a href={googleDetails.googleMapsUri} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-[12px] font-medium text-white/55 underline decoration-white/25 underline-offset-2" translate="no">Google Maps</a>}
                {!place.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').includes('hotel nochistlan') && <p className="mt-3 text-[12px] leading-relaxed text-white/45">Tip: Muchos negocios suelen cerrar cerca de las 3:00 p. m. y abrir de nuevo alrededor de las 4:00 p. m.; algunos no vuelven a abrir ese día. Confirma el horario antes de ir.</p>}
              </section>
              <section aria-labelledby="community-reviews-title" className="pt-1 text-white">
                <div className="mb-3 flex items-baseline justify-between gap-3"><h3 id="community-reviews-title" className="text-[18px] font-bold">Opiniones</h3><span className="text-[12px] text-white/45">{reviewTotal} reseñas</span></div>
                <div data-detail-squircle className="rounded-[24px] bg-[#202124] p-4">
                  {reviewsLoading ? <div className="flex gap-5 animate-pulse" role="status" aria-label="Cargando resumen de reseñas"><div className="w-[90px] shrink-0 space-y-2"><div className="h-10 w-16 rounded-lg bg-blue-400/20"/><div className="h-3 w-20 rounded-full bg-blue-400/15"/><div className="h-2 w-14 rounded-full bg-white/[0.07]"/></div><div className="flex-1 space-y-2 pt-1">{[0, 1, 2, 3, 4].map((item) => <div key={item} className="flex items-center gap-2"><div className="h-2 w-3 rounded-full bg-white/[0.08]"/><div className="h-2 flex-1 rounded-full bg-white/[0.08]"><div className="h-full w-2/3 rounded-full bg-blue-400/20"/></div></div>)}</div></div>
                    : <div className="flex gap-5">
                      <div className="w-[90px] shrink-0"><div className="text-[38px] font-semibold leading-none tracking-tight text-blue-300">{reviewAverage ? reviewAverage.toFixed(1) : '—'}</div><div className="mt-2 flex items-center gap-0.5 text-blue-300" aria-label={reviewAverage ? `${reviewAverage.toFixed(1)} de 5` : 'Sin calificaciones'}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-3 w-3 ${reviewAverage >= star - 0.5 ? 'fill-current' : 'text-white/20'}`}/>)}</div><p className="mt-1 text-[11px] text-white/45">{reviewTotal} reseñas</p></div>
                      <div className="flex-1 space-y-2 pt-1">{ratingDistribution.map(({ score, count }) => <div key={score} className="flex items-center gap-2 text-[11px] text-white/50"><span className="w-3 text-right">{score}</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-blue-400" style={{ width: `${Math.round(count / maxRatingCount * 100)}%` }}/></div></div>)}</div>
                    </div>}
                </div>
                <button type="button" data-detail-squircle onClick={() => { setCommunityReviewMode('reviews'); setShowCommunityActions(true); }} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-[16px] bg-[#1683f8] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0d74e8]"><MessageCircle className="h-4 w-4"/>Escribir reseña</button>
                {reviewsLoading ? <div className="mt-4 space-y-3 animate-pulse" role="status" aria-label="Cargando reseñas"><div className="h-3 w-1/3 rounded-full bg-white/10"/><div className="h-3 w-full rounded-full bg-white/[0.07]"/><div className="h-3 w-4/5 rounded-full bg-white/[0.07]"/></div>
                  : communityReviews.length ? <div className="mt-4 space-y-4">{communityReviews.map((review) => <article key={review.id} className="border-b border-white/[0.07] pb-4 last:border-0">
                    <div className="mb-1 flex items-center justify-between gap-3">{review.profileId ? <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-public-profile', { detail: review.profileId }))} className="flex min-w-0 items-center gap-2 text-left text-[14px] font-semibold"><span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-[11px]">{review.avatar ? <img src={review.avatar} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover"/> : review.author.slice(0, 1)}</span><span className="truncate">{review.author}</span></button> : <span className="text-[14px] font-semibold">{review.author}</span>}<span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-blue-300"><Star className="h-3 w-3 fill-current"/>{review.rating}</span></div>
                    <p className="text-[14px] leading-relaxed text-white/75">{review.text}</p>
                    {review.createdAt && <time className="mt-1 block text-[11px] text-white/40">{new Date(review.createdAt).toLocaleDateString('es-MX')}</time>}
                  </article>)}</div>
                  : <div data-detail-squircle className="mt-4 rounded-[24px] bg-[#202124] px-4 py-3.5"><p className="text-[13px] font-semibold text-white/70">Todavía no hay reseñas de la comunidad</p><div className="mt-3 space-y-2" aria-hidden="true"><div className="h-2.5 w-[82%] animate-pulse rounded-full bg-blue-300/10"/><div className="h-2.5 w-[60%] animate-pulse rounded-full bg-white/[0.06]"/></div><p className="mt-3 text-xs text-white/45">Sé la primera persona en contar cómo te fue.</p></div>}
              </section>
              {googleDetails?.reviews?.length ? <section aria-labelledby="google-reviews-title" className="pt-1 text-white">
                <div className="mb-3 flex items-baseline justify-between gap-3"><h3 id="google-reviews-title" className="text-[17px] font-bold">Reseñas de Google Maps</h3><a href={googleDetails.googleMapsUri} target="_blank" rel="noreferrer" className="text-[12px] text-white/55 underline underline-offset-2" translate="no">Google Maps</a></div>
                <div className="space-y-4">{googleDetails.reviews.map((review, index) => <article key={`${review.author.name}-${index}`} className="border-b border-white/[0.07] pb-4 last:border-0">
                  <div className="mb-1 flex items-center gap-2.5">{review.author.photoUri && <img src={review.author.photoUri} alt="" className="h-7 w-7 rounded-full object-cover"/>}<div className="min-w-0 flex-1"><a href={review.author.uri || review.googleMapsUri || googleDetails.googleMapsUri} target="_blank" rel="noreferrer" className="block truncate text-[13px] font-semibold">{review.author.name}</a>{review.relativePublishTimeDescription && <span className="text-[11px] text-white/45">{review.relativePublishTimeDescription}</span>}</div><span className="flex shrink-0 items-center gap-1 text-[12px] text-white/70"><Star className="h-3 w-3 fill-amber-400 text-amber-400"/>{review.rating}</span></div>
                  {review.text && <p className="text-[14px] leading-relaxed text-white/75">{review.text}</p>}
                  <a href={review.googleMapsUri || googleDetails.googleMapsUri} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] text-white/45 underline underline-offset-2">Ver reseña en Google Maps</a>
                </article>)}</div>
                <p className="mt-2 text-[11px] leading-relaxed text-white/40">Reseñas ordenadas por relevancia. Google no verifica todas las reseñas.</p>
              </section> : null}
              <div className="flex flex-col">
                <span className="text-[13px] text-neutral-500 font-semibold mb-1">Lo que debes saber</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(place.goodToKnow || []).map(tag => (
                    <span key={tag} className="bg-neutral-100 text-neutral-700 px-2 py-1 rounded-md text-[12px] font-semibold">
                      {tag}
                    </span>
                  ))}
                  {(!place.goodToKnow || place.goodToKnow.length === 0) && <span className="text-[14px] text-neutral-500">No hay información adicional.</span>}
                </div>
              </div>
            </div>
            
            <Suspense fallback={<section className="mb-6"><h3 className="mb-3 text-[18px] font-bold text-white">Mapa</h3><div className="h-[210px] animate-pulse rounded-[24px] bg-[#292a2d]"/></section>}>
              <BusinessLocationMap place={place} />
            </Suspense>

            {/* Photos */}
            {place.images.length > 0 && <section className="pb-4">
              <h3 className="mb-3 text-[18px] font-bold text-neutral-900">Fotos</h3>
              {place.images.length > 1 ? <div className="grid aspect-[4/3] grid-cols-2 grid-rows-2 gap-1.5 overflow-hidden rounded-[24px]" data-detail-squircle>
                {place.images.slice(0, 3).map((img, index) => (
                  <button
                    key={`${img}-${index}`}
                    type="button"
                    aria-label={`Abrir foto ${index + 1} de ${place.images.length}`}
                    className={`relative min-h-0 overflow-hidden bg-[#292a2d] active:opacity-80 ${index === 0 ? 'row-span-2' : ''} ${index === 1 && place.images.length === 2 ? 'row-span-2' : ''}`}
                    onPointerDownCapture={(event) => event.stopPropagation()}
                    onClick={() => openViewer(index)}
                  >
                    <img src={img} alt={`Foto ${index + 1} de ${place.name}`} loading="lazy" className="pointer-events-none h-full w-full object-cover" />
                    {index === 2 && place.images.length > 3 && <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-2xl font-bold text-white">+{place.images.length - 3}</span>}
                  </button>
                ))}
              </div> : <button type="button" data-detail-squircle aria-label="Abrir foto del negocio" className="h-[240px] w-[180px] overflow-hidden bg-[#292a2d] active:opacity-80" onPointerDownCapture={(event) => event.stopPropagation()} onClick={() => openViewer(0)}>
                <img src={place.images[0]} alt={`Foto de ${place.name}`} loading="lazy" className="h-full w-full object-cover" />
              </button>}
              {!!place.communityPosts?.length && <div className="mt-3 space-y-2">{place.communityPosts.slice(0, 6).map((post) => <article key={post.id} className="flex items-center gap-3 rounded-[18px] bg-[#202124] p-2.5">{post.profileId ? <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-public-profile', { detail: post.profileId }))} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">{post.authorPicture ? <img src={post.authorPicture} alt="" referrerPolicy="no-referrer" className="h-8 w-8 shrink-0 rounded-full object-cover"/> : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs">{(post.authorName || '?').slice(0, 1)}</span>}<span className="min-w-0"><span className="block truncate text-xs font-semibold">Foto de {post.authorName || 'la comunidad'}</span><span className="mt-0.5 block line-clamp-1 text-[11px] text-white/45">{post.caption || 'Ver perfil y publicaciones'}</span></span></button> : <span className="min-w-0 flex-1 truncate text-xs text-white/45">Foto compartida por la comunidad</span>}<button type="button" aria-label="Abrir foto compartida" onPointerDownCapture={(event) => event.stopPropagation()} onClick={() => { const imageIndex = place.images.findIndex((image) => image === post.imageUrl); if (imageIndex >= 0) openViewer(imageIndex); }} className="h-11 w-11 shrink-0 overflow-hidden rounded-xl"><img src={post.imageUrl} alt="" className="h-full w-full object-cover"/></button></article>)}</div>}
            </section>}

            {suggestedBusinesses.length > 0 && <section className="mt-2 pb-5" aria-labelledby="suggested-businesses-title">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h3 id="suggested-businesses-title" className="text-[18px] font-bold text-white">Negocios sugeridos</h3>
                  <p className="mt-0.5 text-xs text-white/55">Descubre más lugares para visitar</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-white/45">Desliza →</span>
              </div>
              <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onPointerDownCapture={(event) => event.stopPropagation()}>
                {suggestedBusinesses.map((business) => <button
                  key={business.id}
                  type="button"
                  data-suggested-business
                  aria-label={`Ver ${business.name}`}
                  onClick={() => onSelectBusiness(business)}
                  className="w-[166px] shrink-0 snap-start overflow-hidden rounded-[22px] bg-[#292a2d] text-left text-white active:scale-[0.98]"
                >
                  <div className="relative h-[112px] bg-neutral-200">
                    {business.images[0] ? <img src={business.images[0]} alt="" loading="lazy" className="h-full w-full object-cover"/> : <div className="h-full w-full bg-gradient-to-br from-orange-100 to-rose-100"/>}
                    <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">{business.category}</span>
                  </div>
                  <div className="p-3">
                    <span className="block truncate text-[13px] font-bold text-white">{business.name}</span>
                    <span className="mt-1 flex items-center gap-1 text-[11px] text-white/60"><Star className="h-3 w-3 fill-amber-400 text-amber-400"/>{business.rating.toFixed(1)}<span className="mx-0.5">·</span><span className="truncate">{business.location}</span></span>
                  </div>
                </button>)}
              </div>
            </section>}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {viewerState !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center cursor-pointer overflow-hidden perspective-[1200px]"
            onClick={closeViewer}
          >
            <button 
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors z-[85] active:scale-95"
              onClick={(e) => { e.stopPropagation(); closeViewer(); }}
            >
              <X className="w-6 h-6" />
            </button>

            <AnimatePresence initial={false} custom={viewerState.direction}>
              <motion.img
                key={viewerState.index}
                custom={viewerState.direction}
                variants={carouselVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                  rotateY: { type: "spring", stiffness: 300, damping: 30 },
                  scale: { type: "spring", stiffness: 300, damping: 30 }
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={1}
                onDragEnd={(e, { offset, velocity }) => {
                  if (offset.x < -50 || velocity.x < -500) {
                    paginate(1);
                  } else if (offset.x > 50 || velocity.x > 500) {
                    paginate(-1);
                  }
                }}
                src={place.images[viewerState.index]}
                alt="Fullscreen Viewer"
                className="absolute m-auto max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl cursor-grab active:cursor-grabbing will-change-transform"
                onClick={(e) => e.stopPropagation()}
              />
            </AnimatePresence>

            {place.images.length > 1 && (
              <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-2 z-[85]" onClick={e => e.stopPropagation()}>
                {place.images.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === viewerState.index ? 'bg-white scale-125' : 'bg-white/40'}`} 
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMapSelector && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[72] bg-black/40 backdrop-blur-[2px]"
              onClick={() => setShowMapSelector(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 360, mass: 0.82 }}
              {...mapDrag}
              className="fixed inset-x-0 bottom-0 z-[73] rounded-t-[24px] bg-[#202124] p-5 pb-8 text-white shadow-[0_-10px_40px_rgba(0,0,0,0.35)]"
            >
              <SheetDragHandle controls={mapDrag.dragControls} className="-mx-5 -mt-5 mb-2" />
              
              <div className="flex justify-between items-center mt-3 mb-6">
                <h3 className="font-bold text-lg text-white">Abrir en...</h3>
                <button 
                  onClick={() => setShowMapSelector(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-white/70 transition-colors hover:bg-white/[0.14]"
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-[24px] bg-[#2b2c30] p-4">
                <button 
                  onClick={() => openMap('apple')}
                  className="flex flex-col items-center justify-center gap-3 rounded-2xl p-4 text-white transition-colors hover:bg-white/[0.04] active:opacity-70"
                >
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/2/21/Apple_Maps_iOS_26_icon.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original" 
                    alt="Apple Maps" 
                    className="w-14 h-14 object-contain"
                  />
                  <span className="text-[15px] font-semibold text-white">Apple Maps</span>
                </button>

                <button 
                  onClick={() => openMap('google')}
                  className="flex flex-col items-center justify-center gap-3 rounded-2xl p-4 text-white transition-colors hover:bg-white/[0.04] active:opacity-70"
                >
                  <img 
                    src="https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a3/Google_Maps_icon_%282026%29.svg/1280px-Google_Maps_icon_%282026%29.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail"
                    alt="Google Maps" 
                    className="h-14 w-14 object-contain"
                  />
                  <span className="text-[15px] font-semibold text-white">Google Maps</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMapOverlay && <Suspense fallback={<div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-2xl"/>}><BusinessMapOverlay place={place} onClose={() => setShowMapOverlay(false)} /></Suspense>}
      </AnimatePresence>

      <AnimatePresence>
        {showWebsiteWarning && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-[2px]"
              onClick={() => setShowWebsiteWarning(false)}
            />
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 bottom-8 z-[71] bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 rounded-full border-4 border-neutral-100 bg-white overflow-hidden shadow-sm mb-4">
                <img src={place.logo} alt={place.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="font-bold text-xl text-neutral-900 mb-2">Sitio Externo</h3>
              <p className="text-neutral-500 text-[15px] leading-snug mb-6 px-2">
                Estás a punto de salir de la aplicación para visitar un sitio web de terceros (<span className="font-semibold text-neutral-700">{place.name}</span>). ¿Estás seguro de que deseas continuar?
              </p>
              
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowWebsiteWarning(false)}
                  className="flex-1 bg-neutral-100 text-neutral-700 font-bold py-3.5 rounded-xl hover:bg-neutral-200 active:opacity-80 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    setShowWebsiteWarning(false);
                    // Determine website URL
                    let url = place.websiteUrl || `https://www.google.com/search?q=${encodeURIComponent(place.name)}`;
                    if (!place.websiteUrl && place.name.toLowerCase().includes('aurrera')) {
                      url = 'https://www.bodegaaurrera.com.mx/';
                    } else if (!place.websiteUrl && place.name.toLowerCase().includes('guadalajara')) {
                      url = 'https://www.farmaciasguadalajara.com/';
                    } else if (!place.websiteUrl && place.name.toLowerCase().includes('banorte')) {
                      url = 'https://www.banorte.com/';
                    } else if (!place.websiteUrl && place.name.toLowerCase().includes('bbva')) {
                      url = 'https://www.bbva.mx/';
                    } else if (!place.websiteUrl && (place.name.toLowerCase().includes('hotel nochistlán') || place.name.toLowerCase().includes('hotel nochistlan'))) {
                      url = 'https://hotelnochistlan.com/';
                    }
                    window.open(url, '_blank');
                  }}
                  className="flex-1 bg-[#1a73e8] text-white font-bold py-3.5 rounded-xl hover:bg-[#1557b0] active:opacity-80 transition-colors"
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPhoneModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[72] bg-black/40 backdrop-blur-[2px]"
              onClick={() => setShowPhoneModal(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 360, mass: 0.82 }}
              {...phoneDrag}
              className="fixed inset-x-0 bottom-0 z-[73] bg-white rounded-t-[24px] overflow-hidden flex flex-col p-5 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
            >
              <SheetDragHandle controls={phoneDrag.dragControls} tone="dark" className="-mx-5 -mt-5 mb-2" />
              
              <div className="mt-6 mb-2 flex flex-col gap-3">
                {place.phone && <a href={`tel:${place.phone.replace(/[^\d+]/g, '')}`} className="w-full bg-[#f1f3f4] text-neutral-900 font-bold text-[16px] py-4 rounded-full flex items-center justify-center active:bg-[#e8eaed] transition-colors"><Phone className="w-5 h-5 mr-2" strokeWidth={2} /><span><span className="mr-2 text-[12px] font-medium text-neutral-500">Celular</span>{place.phone}</span></a>}
                {place.alternatePhone && <a href={`tel:${place.alternatePhone.replace(/[^\d+]/g, '')}`} className="w-full bg-[#f1f3f4] text-neutral-900 font-bold text-[16px] py-4 rounded-full flex items-center justify-center active:bg-[#e8eaed] transition-colors"><Phone className="w-5 h-5 mr-2" strokeWidth={2} /><span><span className="mr-2 text-[12px] font-medium text-neutral-500">Teléfono</span>{place.alternatePhone}</span></a>}
                <button 
                  onClick={() => setShowPhoneModal(false)}
                  className="w-full bg-transparent text-neutral-500 font-bold text-[16px] py-4 rounded-full flex items-center justify-center active:bg-neutral-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMenuModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[72] bg-black/40 backdrop-blur-[2px]"
              onClick={() => setShowMenuModal(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 360, mass: 0.82 }}
              {...menuDrag}
              className="fixed inset-x-0 bottom-0 z-[73] h-[85vh] bg-white rounded-t-[32px] overflow-hidden flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
            >
              <SheetDragHandle controls={menuDrag.dragControls} tone="dark" className="absolute inset-x-0 top-0 z-20" />
              
              <div className="flex items-center justify-between px-5 pt-8 pb-4 border-b border-black/5 shrink-0">
                <h2 className="text-xl font-bold text-neutral-900">Menú</h2>
                <button 
                  onClick={() => setShowMenuModal(false)}
                  className="w-8 h-8 bg-[#f1f3f4] rounded-full flex items-center justify-center hover:bg-[#e8eaed] transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-700" strokeWidth={2} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-6 bg-white">
                <div className="max-w-md mx-auto space-y-8 pb-10">
                  {menuData.map((section, idx) => (
                    <div key={idx}>
                      <h3 className="text-[20px] font-extrabold text-neutral-900 mb-4">{section.category}</h3>
                      <div className="space-y-4">
                        {section.items.map((item, i) => (
                          <div key={i} className="flex justify-between items-start border-b border-black/5 pb-4 last:border-0 last:pb-0">
                            <div className="pr-4">
                              <h4 className="text-[15px] font-bold text-neutral-800 leading-tight">{item.name}</h4>
                              {item.desc && <p className="text-[13px] text-neutral-500 mt-1 leading-snug">{item.desc}</p>}
                            </div>
                            <span className="text-[15px] font-bold text-[#1a73e8] whitespace-nowrap">{item.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showShareModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
              onClick={() => setShowShareModal(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 360, mass: 0.82 }}
              className="fixed inset-x-0 bottom-0 z-[81] bg-white rounded-t-3xl p-6 shadow-2xl flex flex-col pb-safe"
              {...shareDrag}
            >
              <SheetDragHandle controls={shareDrag.dragControls} tone="dark" className="-mt-5 mb-3" />
              <h3 className="font-bold text-xl text-neutral-900 mb-4 px-2 text-center">Compartir</h3>

              <div className="mb-6 flex flex-col items-center rounded-2xl bg-neutral-50 p-4">
                <img src={qrCodeUrl} alt={`Código QR para abrir ${place.name}`} className="h-36 w-36 rounded-lg bg-white p-2" />
                <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                  <QrCode className="h-4 w-4" /> Escanea para abrir {place.name}
                </div>
              </div>
              <button type="button" onClick={() => { void copyBusinessLink(); }} className="mb-5 flex min-w-0 items-center gap-2 rounded-full bg-neutral-100 px-4 py-3 text-left text-sm font-medium text-neutral-700">
                <Link className="h-4 w-4 shrink-0"/><span className="truncate">{businessUrl}</span>
              </button>
              
              <div className="flex justify-around mb-8 px-2">
                <button type="button" onClick={() => { void copyBusinessLink(); }} className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700 group-hover:bg-neutral-200 transition-colors">
                    <Link className="w-6 h-6" />
                  </div>
                  <span className="text-[12px] font-medium text-neutral-600">Copiar</span>
                </button>
                <button type="button" onClick={() => shareTo(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${businessUrl}`)}`)} className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366] group-hover:bg-[#25D366]/20 transition-colors">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <span className="text-[12px] font-medium text-neutral-600">WhatsApp</span>
                </button>
                <button type="button" onClick={() => shareTo(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(businessUrl)}`)} className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2] group-hover:bg-[#1877F2]/20 transition-colors">
                    <Facebook className="w-6 h-6" />
                  </div>
                  <span className="text-[12px] font-medium text-neutral-600">Facebook</span>
                </button>
                <button type="button" onClick={() => shareTo(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(businessUrl)}`)} className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-[#1DA1F2]/10 flex items-center justify-center text-[#1DA1F2] group-hover:bg-[#1DA1F2]/20 transition-colors">
                    <Twitter className="w-6 h-6" />
                  </div>
                  <span className="text-[12px] font-medium text-neutral-600">X / Twitter</span>
                </button>
              </div>
              {shareFeedback && <p role="status" className="-mt-4 mb-4 text-center text-sm font-medium text-emerald-700">{shareFeedback}</p>}

              <button 
                onClick={() => setShowShareModal(false)}
                className="w-full bg-neutral-100 text-neutral-900 font-bold py-4 rounded-xl hover:bg-neutral-200 transition-colors"
              >
                Cancelar
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCommunityActions && <CommunityActionsSheet place={place} initialMode={communityReviewMode} onReviewCreated={(review) => setCommunityReviews((current) => [review, ...current])} onClose={() => setShowCommunityActions(false)} />}
      </AnimatePresence>
    </>
  );
}

const menuData = [
  {
    category: "Mariscos",
    items: [
      { name: "Camarones empanizados", desc: "Arroz blanco, papas a la francesa y verdura", price: "$125.00" },
      { name: "Camarones a la mantequilla", desc: "Arroz blanco, papas a la francesa y verdura", price: "$125.00" },
      { name: "Camarones a la diabla", desc: "Arroz blanco, papas a la francesa y verdura", price: "$125.00" },
      { name: "Camarones al mojo de ajo", desc: "Arroz blanco, papas a la francesa y verdura", price: "$125.00" },
      { name: "Camarones rancheros", desc: "Arroz blanco, papas a la francesa y verdura", price: "$125.00" },
      { name: "Camarones al aguachile", price: "$125.00" },
      { name: "Camarones gratinados", desc: "Arroz blanco, papas a la francesa y verdura", price: "$125.00" },
      { name: "Filete empanizado", desc: "Arroz blanco, papas a la francesa y verdura", price: "$99.00" },
      { name: "Filete a la diabla", desc: "Arroz blanco, papas a la francesa y verdura", price: "$99.00" },
      { name: "Filete al mojo de ajo", desc: "Arroz blanco, papas a la francesa y verdura", price: "$99.00" },
      { name: "Filete a la plancha", desc: "Arroz blanco, papas a la francesa y verdura", price: "$99.00" },
      { name: "Mojarra dorada", desc: "Arroz blanco, papas a la francesa y verdura", price: "$80.00" },
      { name: "Tostada de camarón", price: "$25.00" },
      { name: "Tostada de ceviche", price: "$14.00" },
      { name: "Coctel de camarón", price: "$78 - $98" },
      { name: "Coctel de camarón c/pulpo", price: "$88 - $108" }
    ]
  },
  {
    category: "Caldos",
    items: [
      { name: "Sopa de mariscos", desc: "Jaiba, Camarón, Surimi, Pescado, Callo de almeja, Mejillón", price: "$125.00" },
      { name: "Caldo costa brava", desc: "Pescado y Camarón", price: "$125.00" },
      { name: "Caldo de camarón", price: "$125.00" }
    ]
  },
  {
    category: "Pollo",
    items: [
      { name: "Pollo entero", price: "$120.00" },
      { name: "Medio pollo", price: "$60.00" },
      { name: "Cuarto de pollo", price: "$30.00" },
      { name: "Milanesa", price: "$99.00" },
      { name: "Bistec de pollo a la plancha", price: "$99.00" },
      { name: "Fajitas de pollo", price: "$99.00" },
      { name: "Pollo a la valentina", price: "$75.00" },
      { name: "Nuggets de pollo", desc: "Papas a la francesa", price: "$65.00" },
      { name: "Caldo de pollo", price: "$40.00" },
      { name: "Flautas", price: "$40.00" }
    ]
  },
  {
    category: "Ensaladas",
    items: [
      { name: "Ensalada la palma con camaron", desc: "Jitomate, pepino, aguacate, queso panela, cebolla", price: "$130.00" },
      { name: "Ensalada la palma con pollo", desc: "Jitomate, pepino, aguacate, queso panela, cebolla", price: "$115.00" },
      { name: "Ensalada con pollo", desc: "Lechuga, cebolla, jitomate, pepino, pollo", price: "$105.00" },
      { name: "Ensalada con camaron", desc: "Lechuga, cebolla, jitomate, pepino, camaron", price: "$120.00" }
    ]
  },
  {
    category: "Carnes",
    items: [
      { name: "Fajitas de res", price: "$99.00" },
      { name: "Tampiqueña", desc: "Frijoles, arroz, enchiladas, guacamole y verdura", price: "$110.00" },
      { name: "Carne asada", desc: "Frijoles, arroz, verdura y cebolla", price: "$99.00" },
      { name: "Bistec picado", desc: "Frijoles y arroz", price: "$99.00" },
      { name: "Chuleta ahumada", desc: "Frijoles, arroz, papas a la francesa y verdura", price: "$99.00" },
      { name: "Milanesa de res", price: "$99.00" }
    ]
  },
  {
    category: "Antojitos",
    items: [
      { name: "Tacos dorados", price: "$35.00" },
      { name: "Enchiladas", desc: "Verdes, Rojas, de Queso o Pollo", price: "$40.00" },
      { name: "Hamburguesa de res con papas", price: "$45.00" },
      { name: "Hamburguesa de pollo con papas", price: "$45.00" },
      { name: "Tostada de jamon", price: "$14.00" },
      { name: "Tostada de lomo", price: "$14.00" }
    ]
  },
  {
    category: "Desayunos",
    items: [
      { name: "Omelette", price: "$45.00" },
      { name: "Chilaquiles", price: "$45.00" },
      { name: "Sincronizadas", price: "$40.00" },
      { name: "Huevos al gusto", desc: "Con jamon, tocino, a la mexicana, revueltos, estrellados, con chorizo, rancheros.", price: "$45.00" },
      { name: "Quesadillas", price: "$16.00" },
      { name: "Burritos", price: "$16.00" }
    ]
  },
  {
    category: "Especialidades",
    items: [
      { name: "Molcajete de arrachera y camaron", price: "$145.00" },
      { name: "Molcajete zacatecano", desc: "Res, pollo, camaron, nopales, chorizo, queso fresco, ensalada, arroz y frijoles", price: "$150.00" },
      { name: "Arrachera", price: "$130.00" },
      { name: "Fajitas mixtas", desc: "Camaron, res y pollo", price: "$120.00" },
      { name: "Camarones y filete empapelados", price: "$125.00" },
      { name: "Filete norteño", desc: "Arroz, frijoles, papas a la francesa, guacamole, verduras, rajas y queso", price: "$110.00" },
      { name: "Mole estilo las bodas de las ánimas", desc: "(Tradicional)", price: "$66.00" }
    ]
  }
];
