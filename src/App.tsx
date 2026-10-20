import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { categories, visits, mockPlaces, mergeRequestedCategories, replaceDirectoryData } from './data';
import { Bookmark, ChevronRight, Cloud, CloudLightning, CloudRain, CloudSnow, CloudSun, Flame, Instagram, Search, Settings2, MapPin, Star, Store, X, Timer, Hotel, Utensils, ShoppingCart, Pill, Landmark, Siren, Church, GraduationCap, Trees, Dessert, Wine, Salad } from 'lucide-react';
import { BottomNav } from './components/BottomNav';
const ColoniasPage = React.lazy(() => import('./components/ColoniasPage').then((module) => ({ default: module.ColoniasPage })));
const ExploreVideoWireframe = React.lazy(() => import('./components/ExploreVideoWireframe').then((module) => ({ default: module.ExploreVideoWireframe })));
const BusinessExplorePage = React.lazy(() => import('./components/BusinessExplorePage').then((module) => ({ default: module.BusinessExplorePage })));
const ReelCreatorPage = React.lazy(() => import('./components/ReelCreatorPage').then((module) => ({ default: module.ReelCreatorPage })));
const CategoryPage = React.lazy(() => import('./components/CategoryPage').then((module) => ({ default: module.CategoryPage })));
const AllCategoriesPage = React.lazy(() => import('./components/AllCategoriesPage').then((module) => ({ default: module.AllCategoriesPage })));
const DestacadosPage = React.lazy(() => import('./components/DestacadosPage').then((module) => ({ default: module.DestacadosPage })));
const ColoniaDetailPage = React.lazy(() => import('./components/ColoniaDetailPage').then((module) => ({ default: module.ColoniaDetailPage })));
const BusinessDetailSheet = React.lazy(() => import('./components/BusinessDetailSheet').then((module) => ({ default: module.BusinessDetailSheet })));
import { FlipText } from './components/FlipText';
import { VerifiedBusinessName } from './components/VerifiedBusinessName';
const HomeVideosSection = React.lazy(() => import('./components/HomeVideosSection').then((module) => ({ default: module.HomeVideosSection })));
const ArticleReaderPage = React.lazy(() => import('./components/ArticleReaderPage').then((module) => ({ default: module.ArticleReaderPage })));
const TourismArticleCarousel = React.lazy(() => import('./components/TourismArticleCarousel').then((module) => ({ default: module.TourismArticleCarousel })));
const HomeEventsSection = React.lazy(() => import('./components/HomeEventsSection').then((module) => ({ default: module.HomeEventsSection })));
import { articleCatalog } from './data/articles-index';
import { AutoLayoutRoot } from './layout/AutoLayout';
const NewsPage = React.lazy(() => import('./components/NewsPage').then((module) => ({ default: module.NewsPage })));
const EventsPage = React.lazy(() => import('./components/EventsPage').then((module) => ({ default: module.EventsPage })));
const SearchPage = React.lazy(() => import('./components/SearchPage').then((module) => ({ default: module.SearchPage })));
const AskNochiPage = React.lazy(() => import('./components/SearchPage').then((module) => ({ default: module.AskNochiPage })));
const BusinessPromotionSheet = React.lazy(() => import('./components/BusinessPromotionSheet').then((module) => ({ default: module.BusinessPromotionSheet })));
const BusinessSubmissionSheet = React.lazy(() => import('./components/BusinessSubmissionSheet').then((module) => ({ default: module.BusinessSubmissionSheet })));
const AdminPage = React.lazy(() => import('./components/AdminPage').then((module) => ({ default: module.AdminPage })));
const SmartOnboarding = React.lazy(() => import('./components/SmartOnboarding').then((module) => ({ default: module.SmartOnboarding })));
import { WelcomePage } from './components/WelcomePage';
import CornerKit from '@cornerkit/core';
import { Category, Place, Colonia } from './types';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { getBookmarkedPlaceIds, recordProfileActiveSeconds } from './profileStorage';
const PublicProfileSheet = React.lazy(() => import('./components/PublicProfileSheet').then((module) => ({ default: module.PublicProfileSheet })));
const SettingsSheet = React.lazy(() => import('./components/SettingsSheet').then((module) => ({ default: module.SettingsSheet })));
const BookmarksSheet = React.lazy(() => import('./components/BookmarksSheet').then((module) => ({ default: module.BookmarksSheet })));
const AccountAuthSheet = React.lazy(() => import('./components/AccountSheets').then((module) => ({ default: module.AccountAuthSheet })));

import { PublicMenuPage } from './components/PublicMenuPage';
import { HotelProfileClaimPage } from './components/HotelProfileClaimPage';
import { PuntoNochiComparisonPage } from './components/PuntoNochiComparisonPage';
import { LegalPage, type LegalDocument } from './components/LegalPage';
import { PageLoadingSkeleton } from './components/PageLoadingSkeleton';
import { Analytics, track } from '@vercel/analytics/react';
import { getTotalHypes, HYPES_UPDATED_EVENT } from './hypes';
import { getDailyDropChoices, getDailyDropQuestion } from './dailyDrop';
import { findBusinessByRouteSlug, getBusinessPath } from './businessLinks';
import { installAppLocalization } from './i18n';

const SEO_SITE_ORIGIN = 'https://puntonochi.vercel.app';
const HOME_SEARCH_PROMPTS = ['Busca un negocio…', '¿Se te antoja algo rico?', 'Encuentra servicios cerca', 'Explora lugares locales'];
const homeCategoryIcon = (name: string) => {
  const category = name.toLocaleLowerCase();
  if (/comida/.test(category)) return Salad;
  if (/turismo|tur[ií]st|iglesia|templo|parroquia/.test(category)) return Church;
  if (/escuel|colegio|educaci[oó]n|universidad/.test(category)) return GraduationCap;
  if (/parque|park|jard[ií]n|plaza|recre/.test(category)) return Trees;
  if (/reposter[ií]|pasteler[ií]|dulce|postre/.test(category)) return Dessert;
  if (/vino|vinater[ií]|licor|bodega/.test(category)) return Wine;
  if (/hotel|hosped|alojamiento|renta/.test(category)) return Hotel;
  if (/restaur|comida|caf[eé]|bar|panader/.test(category)) return Utensils;
  if (/super|mercado|tienda|abarrote/.test(category)) return ShoppingCart;
  if (/farm|medic|salud/.test(category)) return Pill;
  if (/banco|financ/.test(category)) return Landmark;
  if (/emerg|seguridad|polic[ií]|bombero/.test(category)) return Siren;
  return Store;
};
const WELCOME_SEEN_KEY = 'puntonochi-welcome-seen-v1';
type SignedInAccount = { id: string; name: string; email: string; picture: string | null; phone?: string };
type DeviceLocation = { latitude: number; longitude: number; accuracy: number; updatedAt: string };
function readDeviceLocation(): DeviceLocation | null {
  try {
    const value = JSON.parse(localStorage.getItem('puntonochi-device-location-v1') || 'null') as DeviceLocation | null;
    return value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude) ? value : null;
  } catch { return null; }
}
function distanceFromDevice(place: Place, location: DeviceLocation | null) {
  if (!location || typeof place.lat !== 'number' || typeof place.lng !== 'number') return null;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(place.lat - location.latitude);
  const longitudeDelta = radians(place.lng - location.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(location.latitude)) * Math.cos(radians(place.lat)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const RECENT_SEARCHES_KEY = 'puntonochi-recent-searches-v1';
const RECENT_PLACES_KEY = 'puntonochi-recent-places-v1';
const WEATHER_UNIT_KEY = 'puntonochi-weather-unit-v1';
const appCornerKit = new CornerKit();
const appCornerTargets: [string, { radius: number; smoothing: number }][] = [
  ['.ck-app-card', { radius: 26, smoothing: 1 }],
  ['.ck-app-card-inner', { radius: 21, smoothing: 1 }],
  ['.ck-home-category-card', { radius: 24, smoothing: 1 }],
  ['.ck-home-suggested-card', { radius: 30, smoothing: 1 }],
  ['.ck-home-favorite-card', { radius: 24, smoothing: 1 }],
  ['.ck-home-daily-drop-card', { radius: 24, smoothing: 1 }],
];

function readLocalList(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch { return []; }
}

function readWeatherUnit(): 'C' | 'F' {
  try { return localStorage.getItem(WEATHER_UNIT_KEY) === 'F' ? 'F' : 'C'; }
  catch { return 'C'; }
}

function formatWeatherTemperature(value: number | null | undefined, unit: 'C' | 'F') {
  if (value == null || !Number.isFinite(value)) return '--°';
  const converted = unit === 'F' ? (value * 9) / 5 + 32 : value;
  return `${Math.round(converted)}°${unit}`;
}

function weatherDescription(code: number | null | undefined) {
  if (code === 0) return 'Despejado';
  if (code === 1) return 'Mayormente despejado';
  if (code === 2) return 'Parcialmente nublado';
  if (code === 3) return 'Nublado';
  if (code === 45 || code === 48) return 'Neblina';
  if (code != null && code >= 95) return 'Tormenta';
  if (code != null && (code >= 71 && code <= 86)) return 'Nieve';
  if (code != null && ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))) return 'Lluvia';
  return 'Nublado';
}

function WeatherIcon({ code, className = '' }: { code?: number | null; className?: string }) {
  if (code === 0) return <CloudSun aria-hidden="true" className={className} />;
  if (code != null && code >= 95) return <CloudLightning aria-hidden="true" className={className} />;
  if (code != null && (code >= 51 && code <= 67 || code >= 80 && code <= 82)) return <CloudRain aria-hidden="true" className={className} />;
  if (code != null && code >= 71 && code <= 86) return <CloudSnow aria-hidden="true" className={className} />;
  if (code === 1 || code === 2) return <CloudSun aria-hidden="true" className={className} />;
  return <Cloud aria-hidden="true" className={className} />;
}

function compactWeatherDay(value: string, index: number) {
  if (index === 0) return 'Hoy';
  return new Intl.DateTimeFormat('es-MX', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`)).replace('.', '');
}

declare global {
  interface Window {
    initLiquidGlass: () => void;
  }
}

export default function App() {
  const reduceMotion = useReducedMotion();
  const [shortsNearView, setShortsNearView] = useState(false);
  const shortsSectionRef = useRef<HTMLDivElement>(null);
  useEffect(() => installAppLocalization(), []);
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    const refreshHypes = () => setSuggestionVersion((version) => version + 1);
    window.addEventListener(HYPES_UPDATED_EVENT, refreshHypes);
    window.addEventListener('storage', refreshHypes);
    return () => {
      window.removeEventListener(HYPES_UPDATED_EVENT, refreshHypes);
      window.removeEventListener('storage', refreshHypes);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.initLiquidGlass) {
        window.initLiquidGlass();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const getInitialState = () => {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    
    let initialTab = 'inicio';
    let initialCategory = null;
    let initialBusiness = null;
    let initialMenuId: string | null = null;
    let initShowAllCategories = false;
    let initShowColonias = false;
    let initShowAdmin = false;
    let initShowSearch = false;
    let initialLegalDocument: LegalDocument | null = null;
    const initShowWelcome = path === '/' || /^\/inicio\/?$/.test(path);

    if (parts.length > 0) {
      if (parts[0] === 'privacidad') {
        initialLegalDocument = 'privacidad';
      } else if (parts[0] === 'terminos') {
        initialLegalDocument = 'terminos';
      } else if (parts[0] === 'menu' && parts[1]) {
        initialMenuId = parts[1];
      } else if (parts[0] === 'admin') {
        initShowAdmin = true;
      } else if (parts[0] === 'buscar') {
        initShowSearch = true;
      } else if (parts[0] === 'puntoshorts') {
        initialTab = 'puntoshorts';
      } else if (parts[0] === 'turismo') {
        initialTab = 'turismo';
      } else if (parts[0] === 'categories') {
        initShowAllCategories = true;
      } else if (parts[0] === 'colonias') {
        initShowColonias = true;
      } else if (parts[0] === 'eventos') {
        initialTab = 'eventos';
      } else if (parts[0] === 'ask-nochi') {
        initialTab = 'ask-nochi';
      } else if (['videos', 'mercado', 'mapa'].includes(parts[0])) {
        initialTab = 'explorar';
      } else if (parts[0] === 'explorar' || parts[0] === 'guardados' || parts[0] === 'noticias') {
        initialTab = parts[0];
      } else if (parts[0] === 'articulos' && parts[1]) {
        initialTab = 'guias';
      } else if (parts[0] === 'negocio' && parts[1]) {
        initialBusiness = findBusinessByRouteSlug(parts[1], mockPlaces) || null;
      } else {
        // It might be a category name
        const cat = categories.find(c => c.name.toLowerCase() === parts[0].toLowerCase());
        if (cat) {
          initialCategory = cat;
          if (parts.length > 1) {
            const biz = mockPlaces.find(p => p.id === parts[1]);
            if (biz) initialBusiness = biz;
          }
        } else if (parts[0] === 'place' && parts.length > 1) {
          const biz = mockPlaces.find(p => p.id === parts[1]);
          if (biz) initialBusiness = biz;
        }
      }
    }
    
    return { initialTab, initialCategory, initialBusiness, initialMenuId, initShowAllCategories, initShowColonias, initShowAdmin, initShowSearch, initShowWelcome, initialLegalDocument };
  };

  const init = getInitialState();

  useEffect(() => {
    const back = () => setActiveTab('inicio');
    window.addEventListener('askNochiBack', back);
    return () => window.removeEventListener('askNochiBack', back);
  }, []);

  const [showColonias, setShowColonias] = useState(init.initShowColonias);
  const [showAllCategories, setShowAllCategories] = useState(init.initShowAllCategories);
  const [showAdminPage, setShowAdminPage] = useState(init.initShowAdmin);
  const [showDestacados, setShowDestacados] = useState(false);
  const [showBusinessPromotion, setShowBusinessPromotion] = useState(false);
  const [showBusinessSubmission, setShowBusinessSubmission] = useState(false);
  const [legalDocument, setLegalDocument] = useState<LegalDocument | null>(init.initialLegalDocument);
  const [selectedColonia, setSelectedColonia] = useState<Colonia | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(init.initialCategory);
  const [selectedBusiness, setSelectedBusiness] = useState<Place | null>(init.initialBusiness);
  const [publicMenuId] = useState<string | null>(init.initialMenuId);
  const [activeTab, setActiveTab] = useState(init.initialTab);
  const [tourismStarted, setTourismStarted] = useState(false);
  const [tourismArticleSlug, setTourismArticleSlug] = useState<string | null>(null);
  const [articleReturnTab, setArticleReturnTab] = useState('inicio');
  const [articleOriginRect, setArticleOriginRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  useEffect(() => { if (activeTab !== 'turismo' && activeTab !== 'guias') setTourismStarted(false); }, [activeTab]);
  const [openEventCreatorOnPage, setOpenEventCreatorOnPage] = useState(false);
  const [showReelCreator, setShowReelCreator] = useState(false);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setShortsNearView(true); return undefined; }
    const observers = [
      [shortsSectionRef.current, setShortsNearView],
    ] as const;
    const activeObservers = observers.flatMap(([element, reveal]) => {
      if (!element) return [];
      const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        reveal(true);
        observer.disconnect();
      }, { rootMargin: '450px 0px' });
      observer.observe(element);
      return [observer];
    });
    return () => activeObservers.forEach((observer) => observer.disconnect());
  }, [activeTab]);
  const [timerEndAt, setTimerEndAt] = useState<number | null>(null);
  const [timerPausedFor, setTimerPausedFor] = useState<number | null>(null);
  const [timerRemainingDisplay, setTimerRemainingDisplay] = useState(0);
  const timerAudioContext = useRef<AudioContext | null>(null);
  const [showSearch, setShowSearch] = useState(init.initShowSearch);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<Category | null>(null);
  const [dailyDropFlipped, setDailyDropFlipped] = useState(false);
  const [homeHighlightIndex, setHomeHighlightIndex] = useState(0);
  const [heroSearchPromptIndex, setHeroSearchPromptIndex] = useState(0);
  const [heroSearchTypedLength, setHeroSearchTypedLength] = useState(0);
  const [showSponsorSheet, setShowSponsorSheet] = useState(false);
  const [externalSiteToOpen, setExternalSiteToOpen] = useState<{ url: string; host: string } | null>(null);
  const [weatherSummary, setWeatherSummary] = useState<{ current: number | null; high: number | null; low: number | null; precipitationChance: number | null; weatherCode: number; days: { date: string; high: number | null; low: number | null; weatherCode: number }[] } | null>(null);
  const [weatherUnit, setWeatherUnit] = useState<'C' | 'F'>(readWeatherUnit);
  const timerActive = timerEndAt !== null || timerPausedFor !== null;
  const timerDisplay = `${String(Math.floor(Math.ceil(timerRemainingDisplay / 1000) / 60)).padStart(2, '0')}:${String(Math.ceil(timerRemainingDisplay / 1000) % 60).padStart(2, '0')}`;
  const startTimer = (duration: number) => {
    const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextConstructor && !timerAudioContext.current) timerAudioContext.current = new AudioContextConstructor();
    if (timerAudioContext.current?.state === 'suspended') void timerAudioContext.current.resume();
    setTimerPausedFor(null); setTimerEndAt(Date.now() + duration); setTimerRemainingDisplay(duration);
  };
  const stopTimer = () => { setTimerEndAt(null); setTimerPausedFor(null); setTimerRemainingDisplay(0); };
  const pauseTimer = () => { if (timerEndAt !== null) { const remaining = Math.max(0, timerEndAt - Date.now()); setTimerPausedFor(remaining); setTimerRemainingDisplay(remaining); setTimerEndAt(null); } };
  const resumeTimer = () => { if (timerPausedFor !== null) { setTimerEndAt(Date.now() + timerPausedFor); setTimerPausedFor(null); } };
  const completeTimer = () => {
    stopTimer();
    try {
      const navigatorWithVibrate = navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean };
      navigatorWithVibrate.vibrate?.([180, 100, 180, 100, 360]);
      const context = timerAudioContext.current;
      if (context) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(880, context.currentTime); oscillator.frequency.setValueAtTime(1174.66, context.currentTime + .16); oscillator.frequency.setValueAtTime(880, context.currentTime + .32);
        gain.gain.setValueAtTime(.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(.18, context.currentTime + .025); gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .62);
        oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .65);
      }
    } catch { /* Sound or vibration can be unavailable or blocked by the browser. */ }
  };
  useEffect(() => {
    if (timerEndAt === null) return undefined;
    const update = () => { const left = Math.max(0, timerEndAt - Date.now()); setTimerRemainingDisplay(left); if (left <= 0) completeTimer(); };
    update(); const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [timerEndAt]);
  const dailyDropQuestion = getDailyDropQuestion();
  const dailyDropChoices = getDailyDropChoices(dailyDropQuestion);
  useEffect(() => {
    const interval = window.setInterval(() => setHomeHighlightIndex((index) => (index + 1) % 3), 10_000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    let active = true;
    void fetch('/api/weather').then(async (response) => {
      if (!response.ok) throw new Error('Weather forecast unavailable');
      const data = await response.json();
      if (active && data.days?.[0]) {
        const now = Date.now();
        const currentHour = Array.isArray(data.hours) ? data.hours.reduce((closest: { temperature: number | null; dateTime: string; weatherCode: number } | null, hour: { temperature: number | null; dateTime: string; weatherCode: number }) => {
          if (hour.temperature == null) return closest;
          if (!closest || Math.abs(new Date(hour.dateTime).getTime() - now) < Math.abs(new Date(closest.dateTime).getTime() - now)) return hour;
          return closest;
        }, null) : null;
        setWeatherSummary({ ...data.days[0], current: currentHour?.temperature ?? null, weatherCode: currentHour?.weatherCode ?? data.days[0].weatherCode ?? 0, days: Array.isArray(data.days) ? data.days.slice(0, 7) : [] });
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  useEffect(() => setDailyDropFlipped(false), [homeHighlightIndex]);
  useEffect(() => {
    let promptIndex = 0;
    let typingTimer = 0;
    const typePrompt = (index: number) => {
      window.clearTimeout(typingTimer);
      setHeroSearchPromptIndex(index);
      setHeroSearchTypedLength(0);
      let length = 0;
      const typeNext = () => {
        length += 1;
        setHeroSearchTypedLength(length);
        if (length < HOME_SEARCH_PROMPTS[index].length) typingTimer = window.setTimeout(typeNext, 42);
      };
      typingTimer = window.setTimeout(typeNext, 90);
    };
    typePrompt(promptIndex);
    const interval = window.setInterval(() => {
      promptIndex = (promptIndex + 1) % HOME_SEARCH_PROMPTS.length;
      typePrompt(promptIndex);
    }, 3000);
    return () => { window.clearInterval(interval); window.clearTimeout(typingTimer); };
  }, []);
  const loading = false;
  const [showWelcome, setShowWelcome] = useState(() => {
    if (!init.initShowWelcome) return false;
    try { return localStorage.getItem(WELCOME_SEEN_KEY) !== 'true'; }
    catch { return true; }
  });
  const [welcomeTransitionDone, setWelcomeTransitionDone] = useState(true);
  const [publicProfileId, setPublicProfileId] = useState<string | null>(null);
  const [showBookmarksSheet, setShowBookmarksSheet] = useState(false);
  const [showAccountAuth, setShowAccountAuth] = useState(() => new URLSearchParams(window.location.search).has('accountAuthError'));
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [signedInAccount, setSignedInAccount] = useState<SignedInAccount | null>(null);
  const [directoryVersion, setDirectoryVersion] = useState(0);
  const [suggestionVersion, setSuggestionVersion] = useState(0);
  const [popularPlaces, setPopularPlaces] = useState<Place[]>([]);
  const [recentlyAddedPlaces, setRecentlyAddedPlaces] = useState<Place[]>([]);
  const [deviceLocation, setDeviceLocation] = useState<DeviceLocation | null>(() => readDeviceLocation());
  const tabSwipeStart = useRef<{ x: number; y: number } | null>(null);
  const previousPrimaryTab = useRef(activeTab);
  const [tabDirection, setTabDirection] = useState(1);
  const primaryTabs = ['inicio', 'explorar', 'noticias', 'eventos'] as const;

  useEffect(() => {
    const from = primaryTabs.indexOf(previousPrimaryTab.current as typeof primaryTabs[number]);
    const to = primaryTabs.indexOf(activeTab as typeof primaryTabs[number]);
    if (from >= 0 && to >= 0 && from !== to) setTabDirection(to > from ? 1 : -1);
    previousPrimaryTab.current = activeTab;
  }, [activeTab]);

  const onPageTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 1 || showSearch || showAdminPage || selectedBusiness || selectedCategory || showAllCategories || showColonias) { tabSwipeStart.current = null; return; }
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, select, [role="dialog"], [data-no-tab-swipe], .snap-x, .overflow-x-auto')) { tabSwipeStart.current = null; return; }
    const touch = event.touches[0]; tabSwipeStart.current = { x: touch.clientX, y: touch.clientY };
  };
  const onPageTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    const start = tabSwipeStart.current; tabSwipeStart.current = null;
    if (!start || event.changedTouches.length !== 1) return;
    const touch = event.changedTouches[0]; const dx = touch.clientX - start.x; const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.35) return;
    const index = primaryTabs.indexOf(activeTab as typeof primaryTabs[number]);
    if (index < 0) return;
    const nextIndex = dx < 0 ? index + 1 : index - 1;
    if (nextIndex >= 0 && nextIndex < primaryTabs.length) setActiveTab(primaryTabs[nextIndex]);
  };

  useEffect(() => {
    const handleTabNavigation = (event: Event) => {
      const tab = (event as CustomEvent<string>).detail;
      if (tab === 'noticias' || tab === 'inicio') setActiveTab(tab);
    };
    window.addEventListener('navigate-tab', handleTabNavigation);
    return () => window.removeEventListener('navigate-tab', handleTabNavigation);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([fetch('/api/categories', { cache: 'no-store' }), fetch('/api/places', { cache: 'no-store' })])
      .then(async ([categoriesResponse, placesResponse]) => {
        if (!categoriesResponse.ok || !placesResponse.ok) return null;
        const [categoriesPayload, placesPayload] = await Promise.all([categoriesResponse.json(), placesResponse.json()]);
        const nextCategories = categoriesPayload?.experimentalCatalog ? categoriesPayload.categories : categoriesPayload;
        const nextPlaces = placesPayload?.experimentalCatalog ? placesPayload.places : placesPayload;
        if (!Array.isArray(nextCategories) || !Array.isArray(nextPlaces)) return null;
        return {
          categories: categoriesPayload?.experimentalCatalog ? nextCategories as Category[] : mergeRequestedCategories(nextCategories as Category[]),
          places: nextPlaces as Place[],
        };
      })
      .then((directory) => {
        if (!active || !directory) return;
        replaceDirectoryData(directory.categories, directory.places);
        setDirectoryVersion((version) => version + 1);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [signedInAccount?.email]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeTab]);

  useEffect(() => {
    let active = true;
    const refreshAccount = () => fetch('/api/account/session', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (active) setSignedInAccount(data?.account || null); })
      .catch(() => { if (active) setSignedInAccount(null); });
    void refreshAccount();
    const onAccountChange = () => { void refreshAccount(); };
    window.addEventListener('account-profile-updated', onAccountChange);
    window.addEventListener('account-session-updated', onAccountChange);
    return () => { active = false; window.removeEventListener('account-profile-updated', onAccountChange); window.removeEventListener('account-session-updated', onAccountChange); };
  }, []);


  useEffect(() => {
    const openProfile = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (typeof id === 'string' && id) setPublicProfileId(id);
    };
    const openSettings = () => setShowProfileSettings(true);
    window.addEventListener('open-public-profile', openProfile);
    window.addEventListener('open-profile-settings', openSettings);
    return () => { window.removeEventListener('open-public-profile', openProfile); window.removeEventListener('open-profile-settings', openSettings); };
  }, []);

  const finishWelcome = () => {
    track('Welcome Continue', { destination: 'search' });
    try { localStorage.setItem(WELCOME_SEEN_KEY, 'true'); } catch { /* Welcome still closes if storage is unavailable. */ }
    setShowWelcome(false);
    setSearchQuery('');
    setShowSearch(true);
    setWelcomeTransitionDone(false);
    window.setTimeout(() => setWelcomeTransitionDone(true), 360);
  };

  useEffect(() => {
    let lastActivityCheck = Date.now();
    const accountForActiveTime = () => {
      const now = Date.now();
      if (document.visibilityState === 'visible' && document.hasFocus()) recordProfileActiveSeconds((now - lastActivityCheck) / 1000);
      lastActivityCheck = now;
    };
    window.addEventListener('focus', accountForActiveTime);
    document.addEventListener('visibilitychange', accountForActiveTime);
    const timer = window.setInterval(accountForActiveTime, 15_000);
    return () => {
      window.removeEventListener('focus', accountForActiveTime);
      document.removeEventListener('visibilitychange', accountForActiveTime);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/places/recent').then(async (response) => {
      if (!response.ok) return [];
      const data: unknown = await response.json();
      return Array.isArray(data) ? data as Place[] : [];
    }).then((places) => { if (active) setRecentlyAddedPlaces(places); }).catch(() => undefined);
    return () => { active = false; };
  }, [directoryVersion]);

  const [destacadosState, setDestacadosState] = useState({ index: 0, direction: 0 });

  const suggestedPlaces = useMemo(() => {
    const searches = readLocalList(RECENT_SEARCHES_KEY);
    const recentPlaces = readLocalList(RECENT_PLACES_KEY);
    const bookmarks = getBookmarkedPlaceIds();
    const score = (place: Place) => {
      const searchable = [place.name, place.category, place.subtitle, place.location, place.address].filter(Boolean).join(' ').toLocaleLowerCase('es');
      const searchScore = searches.reduce((total, term, index) => {
        const normalized = term.toLocaleLowerCase('es');
        return total + (normalized && searchable.includes(normalized) ? 8 - Math.min(index, 6) : 0);
      }, 0);
      const bookmarkScore = bookmarks.includes(place.id) ? 12 : 0;
      const viewedIndex = recentPlaces.indexOf(place.id);
      const viewedScore = viewedIndex >= 0 ? 6 - Math.min(viewedIndex, 5) : 0;
      const distance = distanceFromDevice(place, deviceLocation);
      const proximityScore = distance === null ? 0 : Math.max(-20, 30 - distance * 2);
      return searchScore + bookmarkScore + viewedScore + proximityScore + Math.min(place.reviewCount || 0, 100) / 100 + (place.rating || 0) / 10;
    };
    return [...mockPlaces]
      .filter((place) => place.images?.length)
      .sort((a, b) => {
        const distanceA = distanceFromDevice(a, deviceLocation);
        const distanceB = distanceFromDevice(b, deviceLocation);
        if (distanceA !== null && distanceB !== null && Math.abs(distanceA - distanceB) > 0.01) return distanceA - distanceB;
        if (distanceA !== null && distanceB === null) return -1;
        if (distanceB !== null && distanceA === null) return 1;
        return score(b) - score(a);
      })
      .slice(0, 8);
  }, [directoryVersion, suggestionVersion, deviceLocation]);

  const favoritePlaces = useMemo(() => {
    const ids = getBookmarkedPlaceIds();
    return ids.map((id) => mockPlaces.find((place) => place.id === id)).filter((place): place is Place => Boolean(place));
  }, [directoryVersion, suggestionVersion]);

  const recentlyViewedPlaces = useMemo(() => {
    return readLocalList(RECENT_PLACES_KEY)
      .map((id) => mockPlaces.find((place) => place.id === id))
      .filter((place): place is Place => Boolean(place))
      .slice(0, 8);
  }, [directoryVersion, suggestionVersion]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const term = searchQuery.trim().replace(/\s+/g, ' ');
      if (!showSearch || term.length < 2) return;
      track('Search Submitted');
      const recent = readLocalList(RECENT_SEARCHES_KEY).filter((item) => item.toLocaleLowerCase('es') !== term.toLocaleLowerCase('es'));
      try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([term, ...recent].slice(0, 12))); } catch { /* Suggestions still work without storage. */ }
      void fetch('/api/activity/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: term }) }).catch(() => undefined);
      setSuggestionVersion((version) => version + 1);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [searchQuery, showSearch]);

  useEffect(() => {
    const refreshSuggestions = () => setSuggestionVersion((version) => version + 1);
    window.addEventListener('puntonochi-bookmarks-updated', refreshSuggestions);
    return () => window.removeEventListener('puntonochi-bookmarks-updated', refreshSuggestions);
  }, []);

  useEffect(() => {
    if (!selectedBusiness) return;
    track('Business Detail Opened', { category: selectedBusiness.category || 'unknown' });
    const recent = readLocalList(RECENT_PLACES_KEY).filter((id) => id !== selectedBusiness.id);
    try { localStorage.setItem(RECENT_PLACES_KEY, JSON.stringify([selectedBusiness.id, ...recent].slice(0, 20))); } catch { /* Optional personalization. */ }
    void fetch('/api/activity/click', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placeId: selectedBusiness.id }) }).catch(() => undefined);
    setSuggestionVersion((version) => version + 1);
  }, [selectedBusiness]);

  useEffect(() => {
    let active = true;
    const loadPopular = () => fetch('/api/places/popular-week').then(async (response) => {
      if (!response.ok) return [];
      const data: unknown = await response.json();
      return Array.isArray(data) ? data as Place[] : [];
    }).then((places) => { if (active) setPopularPlaces(places); }).catch(() => undefined);
    void loadPopular();
    const timer = window.setInterval(() => { void loadPopular(); }, 5 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [directoryVersion]);

  useEffect(() => {
    if (activeTab === 'inicio') {
      const frame = window.requestAnimationFrame(() => {
        for (const [selector, config] of appCornerTargets) {
          document.querySelectorAll<HTMLElement>(selector).forEach((element) => appCornerKit.apply(element, config));
        }
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [activeTab, destacadosState.index, loading, suggestionVersion]);

  
  const destacadosPlaces = React.useMemo(() => {
    return [...mockPlaces]
      .filter((place) => place.images?.length)
      .sort((a, b) => getTotalHypes(b.id) - getTotalHypes(a.id) || (b.rating || 0) - (a.rating || 0));
  }, [directoryVersion, suggestionVersion]);

  const paginateDestacados = (newDirection: number) => {
    if (destacadosPlaces.length === 0) return;
    let nextIndex = destacadosState.index + newDirection;
    if (nextIndex < 0) nextIndex = destacadosPlaces.length - 1;
    if (nextIndex >= destacadosPlaces.length) nextIndex = 0;
    setDestacadosState({ index: nextIndex, direction: newDirection });
  };

  useEffect(() => {
    if (loading || activeTab !== 'inicio' || destacadosPlaces.length < 2) return;
    const timer = window.setInterval(() => paginateDestacados(1), 3000);
    return () => window.clearInterval(timer);
  }, [loading, activeTab, destacadosPlaces.length, destacadosState.index]);

  const carouselVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '110%' : '-110%',
      opacity: 0,
      scale: 0.88,
      rotateY: direction > 0 ? 18 : -18,
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
      x: direction < 0 ? '110%' : '-110%',
      opacity: 0,
      scale: 0.88,
      rotateY: direction < 0 ? 18 : -18,
    })
  };

  useEffect(() => {
    if (/^\/(?:reclamar\/hotelnochistlan|punto-nochi-vs-nochisgo)\/?$/.test(window.location.pathname)) return;
    let path = '/';
    if (legalDocument) {
      path = `/${legalDocument}`;
    } else if (publicMenuId) {
      path = `/menu/${encodeURIComponent(publicMenuId)}`;
    } else if (showAdminPage) {
      path = '/admin';
    } else if (showSearch) {
      path = '/buscar';
    } else if (selectedBusiness) {
      path = getBusinessPath(selectedBusiness, mockPlaces);
    } else if (selectedCategory) {
      path = `/${selectedCategory.name.toLowerCase()}`;
    } else if (showAllCategories) {
      path = `/categories`;
    } else if (showColonias) {
      path = `/colonias`;
    } else if (((activeTab === 'noticias' || activeTab === 'eventos') && /^\/eventos\/[^/]+\/?$/.test(window.location.pathname)) || (activeTab === 'guias' && /^\/articulos\/[^/]+\/?$/.test(window.location.pathname))) {
      path = window.location.pathname;
    } else if (activeTab !== 'inicio') {
      path = activeTab === 'guias' ? '/' : activeTab === 'puntoshorts' ? '/puntoshorts' : `/${activeTab}`;
    }
    
    if (window.location.pathname !== path) {
      if (/^\/place\/[^/]+\/?$/.test(window.location.pathname)) window.history.replaceState({}, '', path);
      else window.history.pushState({}, '', path);
    }
  }, [selectedBusiness, selectedCategory, showAllCategories, showColonias, activeTab, showSearch, showAdminPage, publicMenuId, legalDocument]);

  useEffect(() => {
    let title = 'PuntoNochi | Lugares, negocios y noticias de Nochistlán';
    let description = 'PuntoNochi es el directorio local de Nochistlán de Mejía, Zacatecas: descubre negocios, hoteles, restaurantes, eventos, videos y noticias de Nochistlán.';
    let noIndex = false;
    const routePath = window.location.pathname;
    const hotelClaimRoute = /^\/reclamar\/hotelnochistlan\/?$/.test(routePath);
    const comparisonRoute = /^\/punto-nochi-vs-nochisgo\/?$/.test(routePath);
    const articleSlug = activeTab === 'guias' ? window.location.pathname.match(/^\/articulos\/([^/]+)\/?$/)?.[1] : undefined;
    const routeArticle = articleSlug ? articleCatalog.find((article) => article.slug === decodeURIComponent(articleSlug)) : undefined;

    if (comparisonRoute) {
      title = 'PuntoNochi vs NochisGo | Directorio de Nochistlán';
      description = 'Compara PuntoNochi y NochisGo: descubre negocios, eventos, PuntoShorts, perfiles públicos y novedades de Nochistlán de Mejía, Zacatecas.';
    } else if (hotelClaimRoute) {
      title = 'Hotel Nochistlán | Perfil oficial en Nochistlán de Mejía, Zacatecas | PuntoNochi';
      description = 'Reclama y administra el perfil oficial de Hotel Nochistlán en PuntoNochi. Publica PuntoShorts, eventos y novedades de Nochistlán de Mejía, Zacatecas.';
    } else if (legalDocument === 'privacidad') {
      title = 'Política de privacidad | PuntoNochi';
      description = 'Consulta cómo PuntoNochi recopila, utiliza y protege información, incluidas las tecnologías publicitarias.';
    } else if (legalDocument === 'terminos') {
      title = 'Términos y condiciones | PuntoNochi';
      description = 'Consulta los términos para usar PuntoNochi y participar en su comunidad.';
    } else if (publicMenuId) {
      title = 'Menú digital | PuntoNochi';
      description = 'Consulta el menú digital de un negocio local en Nochistlán.';
    } else if (selectedBusiness) {
      title = `${selectedBusiness.name} | ${selectedBusiness.category} en Nochistlán | PuntoNochi`;
      description = selectedBusiness.description || `${selectedBusiness.name}: ${selectedBusiness.subtitle || selectedBusiness.category} en ${selectedBusiness.location || 'Nochistlán de Mejía, Zacatecas'}. Consulta horario, contacto, fotos y ubicación en PuntoNochi.`;
    } else if (showAdminPage) {
      title = 'Administración | PuntoNochi';
      description = 'Panel privado de administración de PuntoNochi.';
      noIndex = true;
    } else if (showSearch) {
      title = 'Buscar negocios en Nochistlán | PuntoNochi';
      description = 'Busca negocios, restaurantes, servicios y lugares en Nochistlán de Mejía, Zacatecas.';
      noIndex = true;
    } else if (selectedColonia) {
      title = `Negocios en ${selectedColonia.name}, Nochistlán | PuntoNochi`;
      description = `Encuentra negocios, lugares y servicios en ${selectedColonia.name}, Nochistlán de Mejía, Zacatecas.`;
    } else if (/^\/(?:guardados|ask-nochi|buscar|admin)(?:\/|$)/.test(routePath)) {
      title = routePath.startsWith('/ask-nochi') ? 'Pregunta a Nochi | PuntoNochi' : routePath.startsWith('/guardados') ? 'Mis negocios guardados | PuntoNochi' : 'PuntoNochi';
      description = 'Descubre negocios, lugares y servicios de Nochistlán en PuntoNochi.';
      noIndex = true;
    } else if (selectedCategory) {
      title = `${selectedCategory.name} en Nochistlán | PuntoNochi`;
      description = `Encuentra ${selectedCategory.name.toLowerCase()} en Nochistlán de Mejía, Zacatecas. Explora lugares, fotos y datos útiles en PuntoNochi.`;
    } else if (showAllCategories) {
      title = 'Categorías de negocios en Nochistlán | PuntoNochi';
      description = 'Explora restaurantes, cafeterías, hoteles, farmacias y más negocios de Nochistlán de Mejía.';
    } else if (showColonias) {
      title = 'Colonias y zonas de Nochistlán | PuntoNochi';
      description = 'Descubre lugares y negocios por colonia en Nochistlán de Mejía, Zacatecas.';
    } else if (activeTab === 'explorar') {
      title = 'Explora negocios en Nochistlán | PuntoNochi';
      description = 'Descubre negocios, lugares y servicios de Nochistlán en una galería visual.';
    } else if (activeTab === 'puntoshorts') {
      title = 'PuntoShorts | Videos cortos de Nochistlán | PuntoNochi';
      description = 'Mira PuntoShorts: videos, lugares y momentos de la comunidad de Nochistlán.';
    } else if (activeTab === 'guias') {
      title = routeArticle ? `${routeArticle.title} | PuntoNochi` : 'Artículo no encontrado | PuntoNochi';
      description = routeArticle?.summary || 'No encontramos este artículo de Nochistlán.';
    } else if (activeTab === 'eventos') {
      title = /^\/eventos\/[^/]+\/?$/.test(routePath) ? 'Evento en Nochistlán | PuntoNochi' : 'Eventos en Nochistlán | Punto Events | PuntoNochi';
      description = /^\/eventos\/[^/]+\/?$/.test(routePath) ? 'Consulta fecha, horario, ubicación, fotos y detalles de este evento en Nochistlán.' : 'Descubre eventos, actividades y planes para hacer en Nochistlán de Mejía, Zacatecas.';
    } else if (activeTab === 'noticias') {
      if (/^\/eventos\/[^/]+\/?$/.test(routePath)) {
        title = 'Evento en Nochistlán | PuntoNochi';
        description = 'Consulta fecha, horario, ubicación y detalles de este evento en Nochistlán de Mejía.';
      } else {
        title = 'Noticias y eventos de Nochistlán | PuntoNochi';
        description = 'Consulta noticias, eventos, actividades y videos informativos de Nochistlán y México.';
      }
    }

    document.title = title;
    document.documentElement.lang = 'es-MX';

    const setMeta = (attribute: 'name' | 'property', key: string, content: string) => {
      let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, key);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    setMeta('name', 'description', description);
    setMeta('name', 'robots', noIndex ? 'noindex,follow' : 'index,follow');
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', `${SEO_SITE_ORIGIN}${window.location.pathname}`);
    setMeta('property', 'og:site_name', 'PuntoNochi');
    setMeta('property', 'og:type', 'website');
    const businessImage = selectedBusiness?.images?.find(Boolean) || selectedBusiness?.logo;
    const businessImages = selectedBusiness?.images?.map((image) => {
      try { return new URL(image, SEO_SITE_ORIGIN).href; } catch { return null; }
    }).filter((image): image is string => Boolean(image)) || [];
    let socialImage = 'https://puntonochi.vercel.app/social-preview.gif';
    if (businessImage) {
      try { socialImage = new URL(businessImage, SEO_SITE_ORIGIN).href; } catch { /* Keep the site-wide preview if the image URL is malformed. */ }
    }
    setMeta('property', 'og:image', socialImage);
    setMeta('property', 'og:image:alt', selectedBusiness ? `Imagen de ${selectedBusiness.name} en Nochistlán` : 'Descubre negocios y lugares de Nochistlán con PuntoNochi');
    if (businessImage) {
      const imageType = /\.png(?:$|\?)/i.test(socialImage) ? 'image/png' : /\.webp(?:$|\?)/i.test(socialImage) ? 'image/webp' : /\.gif(?:$|\?)/i.test(socialImage) ? 'image/gif' : 'image/jpeg';
      setMeta('property', 'og:image:type', imageType);
      document.head.querySelector('meta[property="og:image:width"]')?.remove();
      document.head.querySelector('meta[property="og:image:height"]')?.remove();
    } else {
      setMeta('property', 'og:image:type', 'image/gif');
      setMeta('property', 'og:image:width', '800');
      setMeta('property', 'og:image:height', '420');
    }
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:image', socialImage);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${SEO_SITE_ORIGIN}${window.location.pathname}`;

    const pageUrl = `${SEO_SITE_ORIGIN}${window.location.pathname}`;
    const pageSchema: Record<string, unknown> = hotelClaimRoute ? {
      '@context': 'https://schema.org',
      '@type': 'Hotel',
      '@id': `${pageUrl}#hotel`,
      name: 'Hotel Nochistlán',
      description,
      url: pageUrl,
      image: `${SEO_SITE_ORIGIN}/hotel-nochistlan-avatar.jpg`,
      address: { '@type': 'PostalAddress', addressLocality: 'Nochistlán de Mejía', addressRegion: 'Zacatecas', addressCountry: 'MX' },
      areaServed: ['Nochistlán', 'Nochistlán de Mejía', 'Zacatecas'],
      brand: { '@type': 'Brand', name: 'Hotel Nochistlán' },
    } : routeArticle ? {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: routeArticle.title,
      description: routeArticle.summary,
      articleSection: routeArticle.category,
      mainEntityOfPage: pageUrl,
      publisher: { '@type': 'Organization', name: 'PuntoNochi', url: SEO_SITE_ORIGIN },
    } : selectedBusiness ? {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': `${pageUrl}#business`,
      name: selectedBusiness.name,
      description,
      url: pageUrl,
      image: businessImages.length ? businessImages : businessImage ? [socialImage] : undefined,
      telephone: selectedBusiness.phone || undefined,
      priceRange: selectedBusiness.cost ? '$'.repeat(Math.max(1, Math.min(4, selectedBusiness.cost))) : undefined,
      sameAs: [selectedBusiness.websiteUrl, selectedBusiness.instagramUrl, selectedBusiness.facebookUrl, selectedBusiness.tiktokUrl].filter(Boolean),
      aggregateRating: selectedBusiness.reviewCount > 0 ? {
        '@type': 'AggregateRating',
        ratingValue: selectedBusiness.rating,
        reviewCount: selectedBusiness.reviewCount,
      } : undefined,
      address: {
        '@type': 'PostalAddress',
        streetAddress: selectedBusiness.address || undefined,
        addressLocality: 'Nochistlán de Mejía',
        addressRegion: 'Zacatecas',
        addressCountry: 'MX',
      },
      geo: selectedBusiness.lat != null && selectedBusiness.lng != null ? {
        '@type': 'GeoCoordinates',
        latitude: selectedBusiness.lat,
        longitude: selectedBusiness.lng,
      } : undefined,
      hasMap: selectedBusiness.mapUrl || undefined,
      areaServed: 'Nochistlán de Mejía, Zacatecas, México',
    } : {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description,
      url: pageUrl,
      inLanguage: 'es-MX',
      isPartOf: { '@id': `${SEO_SITE_ORIGIN}/#website` },
      about: {
        '@type': 'City',
        name: 'Nochistlán de Mejía',
        containedInPlace: { '@type': 'AdministrativeArea', name: 'Zacatecas, México' },
      },
    };
    let schemaScript = document.getElementById('route-seo-schema') as HTMLScriptElement | null;
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.id = 'route-seo-schema';
      schemaScript.type = 'application/ld+json';
      document.head.appendChild(schemaScript);
    }
    schemaScript.textContent = JSON.stringify(pageSchema).replace(/</g, '\\u003c');
  }, [activeTab, selectedBusiness, selectedCategory, selectedColonia, showAllCategories, showColonias, showSearch, showAdminPage, publicMenuId, legalDocument]);

  useEffect(() => {
    const onSearchQuery = (event: Event) => setSearchQuery((event as CustomEvent<string>).detail);
    const onDirectoryChange = () => setDirectoryVersion((version) => version + 1);
    window.addEventListener('appSearchQuery', onSearchQuery);
    window.addEventListener('business-directory-updated', onDirectoryChange);
    return () => {
      window.removeEventListener('appSearchQuery', onSearchQuery);
      window.removeEventListener('business-directory-updated', onDirectoryChange);
    };
  }, []);

  useEffect(() => {
    const confirmExternalLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest('a[href], [data-external-url]') as HTMLElement | null;
      if (!link || (link instanceof HTMLAnchorElement && link.hasAttribute('download'))) return;
      let destination: URL;
      const href = link instanceof HTMLAnchorElement ? link.href : link.dataset.externalUrl;
      if (!href) return;
      try { destination = new URL(href, window.location.href); } catch { return; }
      if (!['http:', 'https:'].includes(destination.protocol) || destination.origin === window.location.origin) return;
      event.preventDefault();
      event.stopPropagation();
      setExternalSiteToOpen({ url: destination.href, host: destination.hostname.replace(/^www\./, '') });
    };
    document.addEventListener('click', confirmExternalLink, true);
    const requestExternalSite = (event: Event) => {
      const requestedUrl = (event as CustomEvent<string>).detail;
      if (typeof requestedUrl !== 'string') return;
      try {
        const destination = new URL(requestedUrl, window.location.href);
        if (['http:', 'https:'].includes(destination.protocol) && destination.origin !== window.location.origin) {
          setExternalSiteToOpen({ url: destination.href, host: destination.hostname.replace(/^www\./, '') });
        }
      } catch { /* Ignore malformed external destinations. */ }
    };
    window.addEventListener('request-external-site', requestExternalSite);
    return () => {
      document.removeEventListener('click', confirmExternalLink, true);
      window.removeEventListener('request-external-site', requestExternalSite);
    };
  }, []);

  const openArticleReader = (slug: string, origin?: DOMRect) => {
    setArticleReturnTab(activeTab);
    setTourismArticleSlug(slug);
    setArticleOriginRect(origin ? { left: origin.left, top: origin.top, width: origin.width, height: origin.height } : null);
    setShowBookmarksSheet(false);
    window.history.pushState({}, '', `/articulos/${encodeURIComponent(slug)}`);
    setActiveTab('guias');
  };

  const closeArticleReader = () => {
    if (articleReturnTab === 'turismo') setTourismStarted(true);
    setActiveTab(articleReturnTab);
  };

  const externalSiteConfirmation = <AnimatePresence>
    {externalSiteToOpen && <>
      <motion.button type="button" data-sheet-close aria-label="Cerrar confirmación" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExternalSiteToOpen(null)} className="fixed inset-0 z-[140] cursor-default bg-black/65 backdrop-blur-sm" />
      <motion.section data-desktop-sheet="popup" role="dialog" aria-modal="true" aria-labelledby="external-site-title" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 330 }} className="fixed inset-x-0 bottom-0 z-[141] mx-auto w-full max-w-lg rounded-t-[30px] bg-[#202124] px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-5 text-white shadow-2xl">
        <button type="button" onClick={() => setExternalSiteToOpen(null)} data-sheet-close aria-label="Cerrar hoja" className="absolute right-4 top-3 flex h-9 w-9 items-center justify-center rounded-full text-white/55 hover:bg-white/10 hover:text-white"><X className="h-5 w-5"/></button>
        <h2 id="external-site-title" className="pr-10 text-xl font-extrabold">Vas a salir de PuntoNochi</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/65">Se abrirá un sitio externo: <span className="font-semibold text-white/85">{externalSiteToOpen.host}</span>. ¿Quieres continuar?</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setExternalSiteToOpen(null)} className="min-h-12 rounded-full bg-white/[.1] px-4 text-sm font-semibold text-white transition hover:bg-white/[.16]">Cancelar</button>
          <button type="button" onClick={() => { const destination = externalSiteToOpen.url; setExternalSiteToOpen(null); window.open(destination, '_blank', 'noopener,noreferrer'); }} className="min-h-12 rounded-full bg-[#1683f8] px-4 text-sm font-bold text-white transition hover:bg-[#0d74e8]">Continuar</button>
        </div>
      </motion.section>
    </>}
  </AnimatePresence>;

  if (publicMenuId) return <><PublicMenuPage id={publicMenuId}/>{externalSiteConfirmation}</>;
  if (window.location.pathname === '/punto-nochi-vs-nochisgo' || window.location.pathname === '/punto-nochi-vs-nochisgo/') return <><PuntoNochiComparisonPage />{externalSiteConfirmation}</>;
  if (window.location.pathname === '/reclamar/hotelnochistlan') return <><HotelProfileClaimPage onRequireAccount={() => setShowAccountAuth(true)} onClose={() => { window.history.pushState({}, '', '/explorar'); setActiveTab('explorar'); }} />{showAccountAuth && <AccountAuthSheet onClose={() => setShowAccountAuth(false)}/>} {externalSiteConfirmation}</>;

  return (
    <AutoLayoutRoot id="app-root" className={`auto-layout-root relative min-h-screen bg-[#08090b] ${activeTab === 'explorar' || activeTab === 'inicio' || activeTab === 'turismo' ? 'pb-0' : 'pb-36'} font-sans text-neutral-900 selection:bg-blue-100`} style={{ fontFamily: "'Google Sans Flex', 'Google Sans', 'Plus Jakarta Sans', sans-serif" }}>
      {/* Dynamic Main Content based on activeTab */}
      <AnimatePresence mode="sync" initial={false}>
      {activeTab === 'inicio' && (
        <motion.main key="home-page" onTouchStart={onPageTouchStart} onTouchEnd={onPageTouchEnd} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: tabDirection * 28, scale: .99 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: tabDirection * -22, scale: .99 }} transition={reduceMotion ? { duration: .12 } : { type: 'spring', stiffness: 330, damping: 34, mass: .72 }} className={`${timerActive ? 'pt-14' : ''} touch-pan-y`}>
          {timerActive && <motion.div layout initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="fixed left-[5px] right-[5px] top-[max(5px,env(safe-area-inset-top))] z-40 mx-auto flex max-w-[520px] items-center gap-2 rounded-full border border-[#ff9f0a] bg-[#171719]/85 px-3 py-2 text-white shadow-lg backdrop-blur-xl"><Timer className="h-3.5 w-3.5 text-[#ff9f0a]"/><span className="text-[9px] font-semibold uppercase tracking-wider text-white/55">Temporizador</span><motion.span key={timerDisplay} initial={{ opacity: .6, y: 2 }} animate={{ opacity: 1, y: 0 }} className="ml-auto font-mono text-sm font-bold tabular-nums text-[#ffb347]">{timerDisplay}</motion.span></motion.div>}
          {/* Header Section */}
          <div className="sticky top-0 z-30 -mx-5 isolate px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2 lg:top-0 lg:pt-3">
            <div aria-hidden="true" className="pointer-events-none absolute -left-5 -right-5 -top-8 z-0 h-[108px] bg-gradient-to-b from-[#161719]/80 via-[#161719]/45 to-transparent backdrop-blur-[10px] [mask-image:linear-gradient(to_bottom,black_0%,black_42%,transparent_100%)]" />
            <div className="absolute left-[25px] top-[calc(max(1rem,env(safe-area-inset-top))+1px)] z-20 flex h-10 items-center gap-0.5 rounded-full bg-white/[.08] p-1 backdrop-blur-xl lg:top-[13px]">
              <button type="button" onClick={() => setShowBookmarksSheet(true)} aria-label="Abrir guardados" title="Guardados" className="flex h-8 w-10 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/[.08] active:scale-95"><Bookmark aria-hidden="true" className="h-[17px] w-[17px]" strokeWidth={2}/></button>
              <span aria-hidden="true" className="h-4 w-px shrink-0 bg-white/15" />
              <button type="button" onClick={() => setShowProfileSettings(true)} aria-label="Abrir ajustes" title="Ajustes" className="flex h-8 w-10 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/[.08] active:scale-95"><Settings2 aria-hidden="true" className="h-[17px] w-[17px]" strokeWidth={2}/></button>
            </div>
            <div className="absolute right-[25px] top-[calc(max(1rem,env(safe-area-inset-top))+1px)] z-20 flex items-center gap-2 lg:top-[13px]">
            <button type="button" onClick={() => setWeatherUnit((unit) => { const next = unit === 'C' ? 'F' : 'C'; try { localStorage.setItem(WEATHER_UNIT_KEY, next); } catch { /* Keep the unit for this session if storage is unavailable. */ } return next; })} aria-label={`Temperatura actual en grados ${weatherUnit === 'C' ? 'Celsius' : 'Fahrenheit'}. Toca para cambiar a grados ${weatherUnit === 'C' ? 'Fahrenheit' : 'Celsius'}`} title={`Cambiar a °${weatherUnit === 'C' ? 'F' : 'C'}`} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-white/[.08] px-2.5 text-white/85 backdrop-blur-xl transition-colors hover:bg-white/[.13] active:scale-95"><CloudSun aria-hidden="true" className="h-[17px] w-[17px] text-amber-200" strokeWidth={1.8}/><span className="min-w-[30px] text-[12px] font-semibold tabular-nums">{formatWeatherTemperature(weatherSummary?.current, weatherUnit)}</span></button>
            {signedInAccount && <button type="button" onClick={() => setPublicProfileId(signedInAccount.id)} aria-label="Abrir mi perfil público" title="Mi perfil" className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#292a2d] p-[2px] text-white shadow-sm ring-1 ring-white/15 transition-transform active:scale-95">
              {signedInAccount.picture ? <img src={signedInAccount.picture} alt="" referrerPolicy="no-referrer" className="h-full w-full rounded-full object-cover"/> : <span className="flex h-full w-full items-center justify-center rounded-full bg-blue-500 text-sm font-bold">{signedInAccount.name.slice(0, 1).toUpperCase()}</span>}
            </button>}
            </div>
            <div className="pointer-events-none relative z-20 flex h-10 items-center justify-center gap-2 pt-0.5 text-white" aria-label="PuntoNochi">
              <span aria-hidden="true" className="h-[9px] w-[9px] rounded-full bg-white" />
              <span className="text-[15px] font-bold tracking-[-0.035em]">PuntoNochi</span>
            </div>
          </div>
          <section className="relative mx-auto mb-8 w-full max-w-3xl px-5">
            <div className="mt-3 mb-4">
              <h1 className="mb-2 px-1 text-[clamp(34px,9vw,46px)] font-extrabold leading-[.96] tracking-[-.055em] text-white">Descubre Nochistlán</h1>
              <p className="mb-4 px-1 text-[15px] font-medium leading-snug text-white/60">Negocios, lugares, eventos y más, todo en un solo lugar.</p>
              <button type="button" onClick={() => { setSearchCategory(null); setSearchQuery(''); setShowSearch(true); }} aria-label="Abrir búsqueda" className="flex h-[50px] w-full items-center gap-3 rounded-full bg-[#38393c]/85 px-4 text-left text-white/55 backdrop-blur-[12px] backdrop-saturate-125 transition-colors hover:bg-[#404145]/90 active:bg-[#47484c]/90">
                <Search aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-white/60" />
                <span aria-hidden="true" className="min-w-0 truncate text-[13px]">{HOME_SEARCH_PROMPTS[heroSearchPromptIndex].slice(0, heroSearchTypedLength)}<span className="ml-px animate-pulse text-white/65">|</span></span>
              </button>
              <div aria-label="Explorar categorías" className="mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch', maskImage: 'linear-gradient(to right, transparent 0, #000 20px, #000 calc(100% - 20px), transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0, #000 20px, #000 calc(100% - 20px), transparent 100%)' }}>
                {categories.slice(0, 12).map((category) => {
                  const CategoryIcon = homeCategoryIcon(category.name);
                  return <button key={category.id} type="button" onClick={() => { setSearchCategory(category); setSearchQuery(category.name); setShowSearch(true); }} className="flex h-9 shrink-0 snap-start items-center gap-2 rounded-full bg-[#292a2d] px-3 text-[11px] font-semibold text-white/85 transition-colors hover:bg-[#303135] active:bg-[#35363a]">
                    <CategoryIcon aria-hidden="true" className="h-[17px] w-[17px] shrink-0 text-white/85" strokeWidth={1.9} />
                    <span>{category.name}</span>
                  </button>;
                })}
              </div>
            </div>
            <div className="mt-4">
              <motion.div role="group" aria-label="Pregunta del día, pronóstico y patrocinadores" className="ck-home-daily-drop-card relative min-h-[156px] overflow-hidden rounded-[24px] bg-[#292a2d] text-white">
                <div className={`absolute inset-0 flex transition-transform duration-500 ${reduceMotion ? 'transition-none' : '[transition-timing-function:cubic-bezier(.22,1,.36,1)]'}`} style={{ width: '300%', transform: `translateX(-${homeHighlightIndex * 33.333333}%)` }}>
                  <div className="h-full w-1/3 shrink-0">
                    {!dailyDropFlipped ? <button type="button" onClick={() => setDailyDropFlipped(true)} aria-label="Voltear para ver la respuesta del día" className="flex h-full w-full flex-col items-start justify-center px-6 py-5 text-left">
                      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">Pregunta del día</span>
                      <span className="mt-2 text-[18px] font-semibold leading-snug">{dailyDropQuestion}</span>
                      <span className="mt-3 text-[11px] font-medium text-white/40">Toca para ver la respuesta</span>
                    </button> : <button type="button" onClick={() => setDailyDropFlipped(false)} aria-label="Volver a la pregunta del día" className="flex h-full w-full flex-col items-start justify-center px-6 py-5 text-left">
                      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">Respuesta del día</span>
                      <span className="mt-2 text-sm font-semibold leading-snug">{dailyDropChoices.length ? 'Hoy se antoja:' : 'Nuestra recomendación de hoy:'}</span>
                      <span aria-live="polite" className="mt-2 text-base font-semibold leading-snug text-white">{dailyDropChoices.length ? dailyDropChoices.join(' · ') : 'Algo rico, recién preparado y de un negocio local.'}</span>
                      <span className="mt-3 text-[11px] font-medium text-white/40">Toca para volver</span>
                    </button>}
                  </div>
                  <div role="group" aria-label={`Pronóstico del tiempo para Nochistlán: ${weatherDescription(weatherSummary?.weatherCode)}`} className="relative flex h-full w-1/3 shrink-0 flex-col justify-between overflow-hidden px-4 py-3 sm:px-5" style={{ background: 'linear-gradient(135deg, #347bb4 0%, #285f98 52%, #214e80 100%)' }}>
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0"><p className="truncate text-xs font-semibold text-white/90">Nochistlán</p><p className="truncate text-[10px] text-white/65">Zacatecas</p></div>
                      <WeatherIcon code={weatherSummary?.weatherCode} className="h-5 w-5 shrink-0 text-white" />
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <p className="text-[34px] font-light leading-none tracking-tight tabular-nums">{formatWeatherTemperature(weatherSummary?.current, weatherUnit)}</p>
                      <div className="min-w-0 text-right"><p className="truncate text-[11px] font-medium text-white/90">{weatherDescription(weatherSummary?.weatherCode)}</p><p className="mt-0.5 whitespace-nowrap text-[10px] text-white/65">Máx. {formatWeatherTemperature(weatherSummary?.high, weatherUnit)} · Mín. {formatWeatherTemperature(weatherSummary?.low, weatherUnit)}</p></div>
                    </div>
                    <div aria-label="Pronóstico para toda la semana" className="grid grid-cols-7 gap-0.5 pt-2">
                      {(weatherSummary?.days || []).map((day, index) => <div key={day.date} className="flex min-w-0 flex-col items-center gap-1 text-[9px] leading-none text-white/80">
                        <span className="capitalize">{compactWeatherDay(day.date, index)}</span>
                        <WeatherIcon code={day.weatherCode} className="h-3.5 w-3.5 text-white" />
                        <span className="whitespace-nowrap font-semibold tabular-nums">{formatWeatherTemperature(day.high, weatherUnit)}<span className="ml-0.5 font-normal text-white/55">{day.low == null ? '' : Math.round(weatherUnit === 'F' ? (day.low * 9) / 5 + 32 : day.low)}°</span></span>
                      </div>)}
                    </div>
                  </div>
                  <div className="flex h-full w-1/3 shrink-0 flex-col items-start justify-center px-6 py-4">
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">Patrocinadores</span>
                    <span className="mt-2 text-lg font-semibold">Haz crecer tu negocio en Nochistlán</span>
                    <button type="button" onClick={() => setShowSponsorSheet(true)} className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-white px-5 text-xs font-bold text-[#202124] transition-transform active:scale-[.98]">Quiero ser patrocinador</button>
                  </div>
                </div>
              </motion.div>
              <div role="tablist" aria-label="Contenido destacado" className="mt-2 flex justify-center gap-1.5">
                {['Pregunta del día', 'Pronóstico', 'Patrocinadores'].map((label, index) => <button key={label} type="button" role="tab" aria-label={`Mostrar ${label.toLocaleLowerCase('es-MX')}`} aria-selected={homeHighlightIndex === index} onClick={() => setHomeHighlightIndex(index)} className={`h-1.5 rounded-full transition-all ${homeHighlightIndex === index ? 'w-5 bg-white/75' : 'w-1.5 bg-white/25'}`}/>) }
              </div>
            </div>
          </section>
          <div className="flex flex-col">
          <React.Suspense fallback={<div className="mx-5 mb-10 h-[190px] animate-pulse rounded-[24px] bg-white/[.04]"/>}><HomeEventsSection onViewAll={() => setActiveTab('eventos')} onOpenEvent={(id) => { window.history.pushState({}, '', `/eventos/${encodeURIComponent(id)}`); setActiveTab('eventos'); }} /></React.Suspense>
          {/* By Category Section */}
          <motion.section initial={reduceMotion ? false : { opacity: 0, y: 8 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: .08 }} transition={reduceMotion ? { duration: 0 } : { duration: .2, ease: 'easeOut' }} className="mb-10">
            <div 
              className="px-5 mb-4 cursor-pointer active:opacity-70 transition-opacity"
              onClick={() => !loading && setShowAllCategories(true)}
            >
              <h2 className="text-2xl font-bold flex items-center gap-1">
                Por Categoría <ChevronRight className="w-5 h-5 text-neutral-400 mt-1" strokeWidth={1.5} />
              </h2>
              <p className="text-[15px] text-neutral-500 font-medium mt-0.5">Encuentra lo que necesitas</p>
            </div>
            
            <div className="flex touch-pan-x snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-5 pb-4 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
              {loading ? (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="squircle-24 w-[140px] h-[160px] shrink-0 snap-start bg-neutral-200 animate-pulse relative overflow-hidden" />
                  ))}
                </>
              ) : (
                categories.map((cat) => {
                  const itemCount = mockPlaces.filter(p => p.category === cat.name).length;
                  return (
                    <div 
                      key={cat.id} 
                      onClick={() => setSelectedCategory(cat)}
                      className={`ck-home-category-card squircle-24 w-[140px] h-[160px] shrink-0 snap-start ${cat.gradient} p-4 flex flex-col justify-between shadow-[0_4px_12px_rgba(0,0,0,0.05)] text-white relative overflow-hidden cursor-pointer hover:opacity-90 active:scale-95 transition-all`}
                    >
                      <div className="h-[84px] w-full flex items-center justify-center mt-1 mb-1 drop-shadow-[0_8px_6px_rgba(0,0,0,0.2)]">
                        {cat.emoji && (cat.emoji.startsWith('http') || cat.emoji.startsWith('/')) ? (
                          <img src={cat.emoji} alt={cat.name} className="h-full max-w-full object-contain scale-110" />
                        ) : (
                          <span aria-hidden="true" className="text-[58px] leading-none drop-shadow-[0_8px_6px_rgba(0,0,0,0.2)]">
                            {cat.emoji || ({
                              'comida': '🍽️', 'restaurantes y antojos': '🍲', 'vinos y licores': '🍷',
                              'bebidas y depósitos': '🥤', 'mercado': '🧺', 'locales y puestos': '🛍️',
                              'farmacia': '💊', 'hogar': '🏠', 'oficios': '🛠️', 'mecánica': '🔧',
                              'educación': '🎓', 'servicios pro.': '💼', 'fiestas': '🎉', 'música y audio': '🎶',
                              'viajes y vehículos': '🚕', 'agricultura': '🌾', 'supermercados': '🍎',
                              'moda y regalos': '🛍️', 'belleza': '💅', 'salud esp.': '🩺',
                              'entretenimiento': '🎬', 'estilo de vida': '🧘', 'construcción': '🏗️',
                              'tecnología': '💻', 'hoteles y rentas': '🏨', 'ayuntamiento': '🏛️', 'eventos': '🎟️',
                              'restaurantes': '🍽️', 'cafeterías': '☕', 'hoteles': '🏨', 'farmacias': '💊',
                              'emergencias': '🚑', 'escuelas': '🏫', 'turismo': '🧭', 'parques': '🌳', 'repostería': '🧁',
                            } as Record<string, string>)[cat.name.trim().toLocaleLowerCase('es')] || '🏷️'}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-[17px] font-semibold tracking-[-0.4px] mb-[2px] leading-tight">{cat.name}</h3>
                        <p className="text-[13px] font-medium opacity-80 leading-none">{itemCount} {itemCount === 1 ? 'lugar' : 'lugares'}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.section>

          {/* Personalized suggestions */}
          <motion.section initial={reduceMotion ? false : { opacity: 0, y: 8 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: .08 }} transition={reduceMotion ? { duration: 0 } : { duration: .2, ease: 'easeOut' }} className="mb-10">
            <div className="px-5 mb-4">
              <h2 className="text-2xl font-bold">{deviceLocation ? 'Cerca de ti' : 'Sugeridos'}</h2>
              <p className="text-[15px] text-neutral-500 font-medium mt-0.5">{deviceLocation ? 'Negocios ordenados por distancia a tu ubicación' : 'Negocios para ti, según lo que buscas y guardas'}</p>
            </div>

            <div className="flex touch-pan-x gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-5 pb-2 scrollbar-hide snap-x snap-mandatory" style={{ WebkitOverflowScrolling: 'touch' }}>
              {loading ? [1, 2, 3].map((item) => <div key={item} className="h-[220px] w-[250px] shrink-0 animate-pulse rounded-[28px] bg-neutral-200 snap-start" />) : suggestedPlaces.map((place) => (
                <button type="button" key={place.id} onClick={() => { setSelectedCategory(null); setSelectedBusiness(place); }} className="ck-home-suggested-card relative h-[220px] w-[250px] shrink-0 snap-start overflow-hidden rounded-[28px] bg-neutral-200 text-left text-white shadow-sm active:scale-[0.98] transition-transform">
                  <img src={place.images[0]} alt={place.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                  <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
                    <span className="rounded-full bg-black/35 px-3 py-1 text-xs font-semibold backdrop-blur-sm">{place.category}</span>
                    {getBookmarkedPlaceIds().includes(place.id) && <Bookmark className="h-4 w-4 fill-white drop-shadow" />}
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="line-clamp-2 text-lg font-bold leading-tight"><VerifiedBusinessName name={place.name}/></h3>
                    <p className="mt-1 flex items-center gap-1 truncate text-xs text-white/80"><MapPin className="h-3 w-3 shrink-0"/>{distanceFromDevice(place, deviceLocation) !== null ? `${distanceFromDevice(place, deviceLocation)!.toFixed(1)} km de aquí` : place.location || place.address || 'Nochistlán'}</p>
                    {place.rating > 0 && <p className="mt-1 flex items-center gap-1 text-xs text-white/85"><Star className="h-3 w-3 fill-current text-yellow-300"/>{place.rating.toFixed(1)}{place.reviewCount ? ` · ${place.reviewCount} reseñas` : ''}</p>}
                  </div>
                </button>
              ))}
            </div>
          </motion.section>

          {/* Recently viewed businesses */}
          <motion.section initial={reduceMotion ? false : { opacity: 0, y: 8 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: .08 }} transition={reduceMotion ? { duration: 0 } : { duration: .2, ease: 'easeOut' }} className="mb-10">
            <div className="mb-4 px-5">
              <h2 className="text-2xl font-bold tracking-tight">Vistos recientemente</h2>
              <p className="mt-0.5 text-[15px] font-medium text-neutral-500">Vuelve rápido a los negocios que visitaste</p>
            </div>
            {recentlyViewedPlaces.length ? <div className="flex touch-pan-x snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-5 pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
              {recentlyViewedPlaces.map((place) => <button type="button" key={place.id} onClick={() => { setSelectedCategory(null); setSelectedBusiness(place); }} className="ck-home-suggested-card relative h-[220px] w-[250px] shrink-0 snap-start overflow-hidden rounded-[28px] bg-neutral-200 text-left text-white shadow-sm transition-transform active:scale-[0.98]">
                {place.images?.[0] ? <img src={place.images[0]} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center bg-[#303135]"><Store className="h-12 w-12 text-white/25"/></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                <span className="absolute left-4 top-4 rounded-full bg-black/35 px-3 py-1 text-xs font-semibold backdrop-blur-sm">{place.category}</span>
                <div className="absolute bottom-4 left-4 right-4"><h3 className="line-clamp-2 text-lg font-bold leading-tight"><VerifiedBusinessName name={place.name}/></h3><p className="mt-1 flex items-center gap-1 truncate text-xs text-white/80"><MapPin className="h-3 w-3 shrink-0"/>{place.location || place.address || 'Nochistlán'}</p>{place.rating > 0 && <p className="mt-1 flex items-center gap-1 text-xs text-white/85"><Star className="h-3 w-3 fill-current text-yellow-300"/>{place.rating.toFixed(1)}{place.reviewCount ? ` · ${place.reviewCount} reseñas` : ''}</p>}</div>
              </button>)}
            </div> : <p className="mx-5 rounded-[22px] bg-neutral-100 px-4 py-4 text-sm text-neutral-500">Los negocios que visites aparecerán aquí.</p>}
          </motion.section>

          {/* Popular this week */}
          {popularPlaces.length > 0 && <motion.section initial={reduceMotion ? false : { opacity: 0, y: 8 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: .08 }} transition={reduceMotion ? { duration: 0 } : { duration: .2, ease: 'easeOut' }} className="mb-10">
            <div className="mb-4 px-5">
              <h2 className="text-2xl font-bold tracking-tight">Popular esta semana</h2>
              <p className="mt-0.5 text-[15px] font-medium text-neutral-500">Lo que la comunidad está buscando y visitando</p>
            </div>
            <div className="flex touch-pan-x snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-5 pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
              {popularPlaces.map((place) => <button type="button" key={place.id} onClick={() => { setSelectedCategory(null); setSelectedBusiness(place); }} className="ck-home-suggested-card relative h-[220px] w-[250px] shrink-0 snap-start overflow-hidden rounded-[30px] bg-neutral-200 text-left text-white shadow-sm active:scale-[0.98] transition-transform">
                <img src={place.images[0]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-[#7773e8] px-2.5 py-1 text-[11px] font-bold text-white shadow-[0_4px_12px_rgba(38,33,120,.25)]"><Flame className="h-3.5 w-3.5 fill-white"/>En tendencia</span>
                <div className="absolute bottom-4 left-4 right-4"><h3 className="line-clamp-2 text-lg font-bold leading-tight"><VerifiedBusinessName name={place.name}/></h3><p className="mt-1 truncate text-xs text-white/80">{place.category} · {place.location || place.address || 'Nochistlán'}</p>{place.rating > 0 && <p className="mt-1 flex items-center gap-1 text-xs text-white/85"><Star className="h-3 w-3 fill-current text-yellow-300"/>{place.rating.toFixed(1)}{place.reviewCount ? ` · ${place.reviewCount} reseñas` : ''}</p>}</div>
              </button>)}
            </div>
          </motion.section>}

          <div ref={shortsSectionRef} className="min-h-[220px]">{shortsNearView && <React.Suspense fallback={<div className="h-[180px] animate-pulse rounded-[24px] bg-white/[.04]"/>}><HomeVideosSection onViewAll={() => setActiveTab('puntoshorts')} onSelectShort={(shortId) => { window.history.pushState({}, '', `/puntoshorts?short=${encodeURIComponent(shortId)}`); setActiveTab('puntoshorts'); }} /></React.Suspense>}</div>

          <motion.section initial={reduceMotion ? false : { opacity: 0, y: 8 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: .08 }} transition={reduceMotion ? { duration: 0 } : { duration: .2, ease: 'easeOut' }} className="mb-10">
            <div className="mb-4 px-5">
              <h2 className="text-2xl font-bold tracking-tight">Nuevo en Nochistlán</h2>
              <p className="mt-0.5 text-[15px] font-medium text-neutral-500">Negocios agregados recientemente</p>
            </div>
            {recentlyAddedPlaces.length ? <div className="flex touch-pan-x snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-5 pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
              {recentlyAddedPlaces.map((place) => <button type="button" key={place.id} onClick={() => { setSelectedCategory(null); setSelectedBusiness(place); }} className="ck-home-suggested-card relative h-[220px] w-[250px] shrink-0 snap-start overflow-hidden rounded-[28px] bg-neutral-200 text-left text-white shadow-sm active:scale-[0.98] transition-transform">
                {place.images?.[0] ? <img src={place.images[0]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center bg-[#303135]"><Store className="h-12 w-12 text-white/25"/></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                <span className="absolute left-4 top-4 bg-[#1a73e8] px-2.5 py-1 text-[11px] font-bold text-white">NUEVO</span>
                <div className="absolute bottom-4 left-4 right-4"><h3 className="line-clamp-2 text-lg font-bold leading-tight"><VerifiedBusinessName name={place.name}/></h3><p className="mt-1 truncate text-xs text-white/80">{place.category} · {place.location || place.address || 'Nochistlán'}</p>{place.createdAt && <time className="mt-1 block text-[11px] text-white/65">Agregado el {new Date(place.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</time>}</div>
              </button>)}
            </div> : <p className="mx-5 rounded-[22px] bg-neutral-100 px-4 py-4 text-sm text-neutral-500">Los negocios nuevos que agreguemos aparecerán aquí.</p>}
          </motion.section>

          {/* All saved businesses */}
          <motion.section initial={reduceMotion ? false : { opacity: 0, y: 8 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: .08 }} transition={reduceMotion ? { duration: 0 } : { duration: .2, ease: 'easeOut' }} className="mb-10">
            <div className="mb-4 px-5">
              <h2 className="flex items-center gap-2 text-2xl font-bold"><Bookmark className="h-5 w-5 fill-[#1a73e8] text-[#1a73e8]"/>Favoritos</h2>
              <p className="mt-0.5 text-[15px] font-medium text-neutral-500">Tus negocios guardados</p>
            </div>
            {favoritePlaces.length ? <div className="flex touch-pan-x gap-3 overflow-x-auto overscroll-x-contain scroll-smooth px-5 pb-2 scrollbar-hide snap-x snap-mandatory" style={{ WebkitOverflowScrolling: 'touch' }}>
              {favoritePlaces.map((place) => <button type="button" key={place.id} onClick={() => { setSelectedCategory(null); setSelectedBusiness(place); }} className="ck-home-favorite-card relative h-[150px] w-[190px] shrink-0 snap-start overflow-hidden rounded-[24px] bg-neutral-200 text-left text-white shadow-sm active:scale-[0.98] transition-transform">
                {place.images?.[0] && <img src={place.images[0]} alt={place.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover"/>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent"/>
                <Bookmark className="absolute right-3 top-3 h-4 w-4 fill-white drop-shadow"/>
                <div className="absolute bottom-3 left-3 right-3"><h3 className="line-clamp-2 text-sm font-bold leading-tight"><VerifiedBusinessName name={place.name}/></h3><p className="mt-1 truncate text-[11px] text-white/75">{place.category} · {place.location || 'Nochistlán'}</p></div>
              </button>)}
            </div> : <div className="mx-5 rounded-[22px] bg-neutral-100 px-4 py-5 text-sm text-neutral-500">Aún no tienes favoritos. Guarda un negocio con el marcador para encontrarlo aquí.</div>}
          </motion.section>

          {/* All Visits Section */}
          <motion.section initial={reduceMotion ? false : { opacity: 0, y: 8 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: .08 }} transition={reduceMotion ? { duration: 0 } : { duration: .2, ease: 'easeOut' }} className="px-5">
            <div 
              className="mb-4 cursor-pointer active:opacity-70 transition-opacity"
              onClick={() => setShowDestacados(true)}
            >
              <h2 className="text-2xl font-bold flex items-center gap-1">
                Lugares Destacados <ChevronRight className="w-5 h-5 text-neutral-400 mt-1" strokeWidth={1.5} />
              </h2>
              <p className="text-[15px] text-neutral-500 font-medium mt-0.5">Recomendaciones para ti</p>
            </div>

            <div className="relative h-[240px] w-full flex items-center justify-center overflow-hidden" style={{ perspective: 1000 }}>
              {!loading && destacadosPlaces.length > 0 ? (
                <AnimatePresence initial={false} custom={destacadosState.direction}>
                  <motion.div
                    key={destacadosState.index}
                    custom={destacadosState.direction}
                    variants={carouselVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={1}
                    onDragEnd={(e, { offset, velocity }) => {
                      const swipe = Math.abs(offset.x) * velocity.x;
                      if (swipe < -10000 || offset.x < -50) {
                        paginateDestacados(1);
                      } else if (swipe > 10000 || offset.x > 50) {
                        paginateDestacados(-1);
                      }
                    }}
                    onClick={() => {
                      const place = destacadosPlaces[destacadosState.index];
                      setSelectedCategory(null);
                      setSelectedBusiness(place);
                    }}
                    className="ck-app-card rounded-[26px] absolute w-[85%] h-full bg-white cursor-pointer p-[5px]"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        const place = destacadosPlaces[destacadosState.index];
                        setSelectedCategory(null);
                        setSelectedBusiness(place);
                      }
                    }}
                  >
                    <div className="ck-app-card-inner rounded-[21px] relative w-full h-full overflow-hidden">
                      <img 
                        src={destacadosPlaces[destacadosState.index].images[0]} 
                        alt={destacadosPlaces[destacadosState.index].name} 
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                      <div className="absolute bottom-4 left-4 right-4 text-white pointer-events-none">
                        <p className="text-[11px] font-bold uppercase tracking-wider mb-1 opacity-80">{destacadosPlaces[destacadosState.index].category}</p>
                        <h3 className="font-bold text-xl leading-tight mb-1">{destacadosPlaces[destacadosState.index].name}</h3>
                        <p className="text-[13px] text-white/80 line-clamp-1">{destacadosPlaces[destacadosState.index].subtitle || destacadosPlaces[destacadosState.index].location}</p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              ) : loading ? (
                <div className="ck-app-card rounded-[26px] w-[85%] h-full bg-neutral-200 animate-pulse p-[5px]">
                  <div className="ck-app-card-inner h-full w-full rounded-[21px] bg-neutral-300/70 animate-pulse" />
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex flex-col gap-2 px-5" aria-hidden="true">
              {loading ? (
                <>
                  <div className="h-3 w-24 rounded-full bg-neutral-200 animate-pulse" />
                  <div className="h-4 w-2/3 rounded-full bg-neutral-200 animate-pulse" />
                  <div className="h-3 w-1/2 rounded-full bg-neutral-200 animate-pulse" />
                </>
              ) : destacadosPlaces.length > 1 ? (
                <motion.div
                  key={`next-${(destacadosState.index + 1) % destacadosPlaces.length}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3"
                >
                  <div className="h-12 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-200">
                    <img src={destacadosPlaces[(destacadosState.index + 1) % destacadosPlaces.length].images[0]} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Próximamente</p>
                    <p className="truncate text-sm font-semibold text-neutral-700">{destacadosPlaces[(destacadosState.index + 1) % destacadosPlaces.length].name}</p>
                  </div>
                </motion.div>
              ) : null}
            </div>
          </motion.section>

          <motion.section initial={reduceMotion ? false : { opacity: 0, y: 8 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: .08 }} transition={reduceMotion ? { duration: 0 } : { duration: .2, ease: 'easeOut' }} className="mb-10 mt-10 px-5">
            <div className="mb-4">
              <h2 className="text-2xl font-bold tracking-tight">Agrega tu negocio</h2>
              <p className="mt-1 text-[15px] font-medium text-neutral-500">Comparte tu negocio con la comunidad de Nochistlán.</p>
            </div>
            <button type="button" onClick={() => setShowBusinessSubmission(true)} style={{ backgroundColor: '#ffffff', color: '#111111' }} className="w-full rounded-full !bg-white px-6 py-3.5 text-sm font-bold !text-black transition-transform active:scale-[0.99]">Agrega tu negocio</button>
          </motion.section>
          </div>
          <footer aria-label="Información y navegación de PuntoNochi" className="home-footer relative left-1/2 mt-12 min-h-[250px] w-screen -translate-x-1/2 overflow-hidden rounded-t-[48px] bg-white px-6 pb-[calc(env(safe-area-inset-bottom,0px)+92px)] pt-9 text-[#202124]">
            <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-12 h-20 w-[min(84%,520px)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(96,115,255,.18),rgba(194,104,223,.12)_45%,rgba(255,170,92,.08)_68%,transparent_100%)] blur-2xl" />
            <div className="relative z-10 mx-auto flex w-full max-w-md items-center justify-center gap-5">
              <img src="https://crisats.site/nochistlangobmx/wp-content/uploads/2017/02/ESCUDO_bco-1.png" alt="Escudo de Nochistlán" loading="lazy" decoding="async" className="h-[62px] min-w-0 flex-1 object-contain brightness-0" />
              <img src="https://www.isto.international/wp-content/uploads/2020/01/TURISMO_vertical_TURISMO_vertical1.png" alt="Turismo" loading="lazy" decoding="async" className="h-[62px] min-w-0 flex-1 object-contain" />
              <img src="https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9e/PueblosM%C3%A1gicos.svg/1280px-PueblosM%C3%A1gicos.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail" alt="Pueblos Mágicos" loading="lazy" decoding="async" className="h-[62px] min-w-0 flex-1 object-contain" />
            </div>
            <nav aria-label="Enlaces del pie de página" className="relative z-10 mx-auto mt-8 flex max-w-md flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-[#202124]/10 pt-5 text-[13px] font-semibold text-[#202124]/70">
              <button type="button" onClick={() => setActiveTab('inicio')} className="transition-colors hover:text-[#202124]">Inicio</button>
              <button type="button" onClick={() => setActiveTab('explorar')} className="transition-colors hover:text-[#202124]">Explorar</button>
              <button type="button" onClick={() => setActiveTab('noticias')} className="transition-colors hover:text-[#202124]">Noticias</button>
              <a href="/privacidad" onClick={(event) => { event.preventDefault(); setLegalDocument('privacidad'); }} className="transition-colors hover:text-[#202124]">Privacidad</a>
              <a href="/terminos" onClick={(event) => { event.preventDefault(); setLegalDocument('terminos'); }} className="transition-colors hover:text-[#202124]">Términos</a>
            </nav>
            <p className="relative z-10 mt-6 text-center text-[11px] text-[#202124]/45">© {new Date().getFullYear()} PuntoNochi · Nochistlán, Zacatecas</p>
          </footer>
        </motion.main>
      )}

        {activeTab === 'explorar' && <motion.div key="explore-page" onTouchStart={onPageTouchStart} onTouchEnd={onPageTouchEnd} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: tabDirection * 28, scale: .99 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: tabDirection * -22, scale: .99 }} transition={reduceMotion ? { duration: .12 } : { type: 'spring', stiffness: 330, damping: 34, mass: .72 }}><React.Suspense fallback={null}><BusinessExplorePage places={mockPlaces} directoryVersion={directoryVersion} onSelectBusiness={(business) => setSelectedBusiness(business)} onOpenSearch={(query) => { setSearchQuery(query || ''); setShowSearch(true); }}/></React.Suspense></motion.div>}
        {activeTab === 'turismo' && <motion.main key="turismo-page" aria-label="Turismo" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.005 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={reduceMotion ? { duration: .12 } : { duration: .28, ease: 'easeOut' }} className={`relative ${tourismStarted ? 'h-dvh' : 'tourism-landing-fullbleed'} w-full overflow-hidden bg-black`}>
          {tourismStarted ? <React.Suspense fallback={<div className="min-h-dvh bg-black"/>}><TourismArticleCarousel initialArticleSlug={tourismArticleSlug} onBack={() => setTourismStarted(false)} onOpenArticle={openArticleReader}/></React.Suspense> : <>
          <img src="https://res.cloudinary.com/dwthgcx5j/image/upload/v1792360806/Golden_Hour_Colonial_Plaza_aqcowh.png" alt="" aria-hidden="true" className="absolute inset-0 h-full min-h-dvh w-full object-contain object-center"/>
          <div aria-hidden="true" className="tourism-progressive-blur"/>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[360px] bg-gradient-to-t from-black/80 via-black/30 to-transparent"/>
          <div className="absolute inset-x-0 bottom-[calc(92px+env(safe-area-inset-bottom,0px))] z-10 mx-auto flex w-full max-w-md flex-col items-center px-6 text-center text-white">
            <h1 className="text-[clamp(34px,9vw,46px)] font-bold leading-[.98] tracking-[-.045em]">Bienvenido a Nochistlán</h1>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/80">Descubre la historia, naturaleza y cultura de nuestro pueblo mágico.</p>
            <button type="button" onClick={() => setTourismStarted(true)} className="mt-6 flex h-12 w-full max-w-[280px] items-center justify-center rounded-full border-0 bg-white/[.18] px-6 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(0,0,0,.2)] outline-none backdrop-blur-xl transition-colors hover:bg-white/[.24] active:scale-[.98]">Comenzar</button>
            <p className="mt-4 text-[10px] font-medium tracking-wide text-white/65">Turismo local · Nochistlán, Zacatecas</p>
          </div>
          </>}
        </motion.main>}
        {activeTab === 'puntoshorts' && (
          <React.Suspense key="puntoshorts-page" fallback={null}>
            <ExploreVideoWireframe onClose={() => setActiveTab('inicio')} onRequireAccount={() => setShowAccountAuth(true)} onCreateShort={async () => { const response = await fetch('/api/account/session', { cache: 'no-store', credentials: 'same-origin' }); const session = await response.json().catch(() => ({})); if (session.authenticated) setShowReelCreator(true); else setShowAccountAuth(true); }} onCreateEvent={async () => { const response = await fetch('/api/account/session', { cache: 'no-store', credentials: 'same-origin' }); const session = await response.json().catch(() => ({})); if (session.authenticated) { setOpenEventCreatorOnPage(true); setActiveTab('eventos'); } else setShowAccountAuth(true); }} onOpenEvent={(id) => { window.history.pushState({}, '', `/eventos/${encodeURIComponent(id)}`); setActiveTab('eventos'); }} onOpenBusiness={(business) => {
              setActiveTab('inicio');
              setSelectedBusiness(business);
            }}/>
          </React.Suspense>
        )}
        {showReelCreator && <React.Suspense fallback={<div className="fixed inset-0 z-[110] bg-black"/>}><ReelCreatorPage onClose={() => setShowReelCreator(false)} /></React.Suspense>}
        {activeTab === 'noticias' && (
          <motion.div key="news-page" onTouchStart={onPageTouchStart} onTouchEnd={onPageTouchEnd} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: tabDirection * 28, scale: .99 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: tabDirection * -22, scale: .99 }} transition={reduceMotion ? { duration: .12 } : { type: 'spring', stiffness: 330, damping: 34, mass: .72 }}><React.Suspense fallback={<PageLoadingSkeleton page="news"/>}><NewsPage key="noticias" onOpenEvents={() => setActiveTab('eventos')} /></React.Suspense></motion.div>
        )}
        {activeTab === 'eventos' && (
          <motion.div key="events-page" onTouchStart={onPageTouchStart} onTouchEnd={onPageTouchEnd} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: tabDirection * 28, scale: .99 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: tabDirection * -22, scale: .99 }} transition={reduceMotion ? { duration: .12 } : { type: 'spring', stiffness: 330, damping: 34, mass: .72 }}><React.Suspense fallback={<PageLoadingSkeleton page="news"/>}><EventsPage key="events" autoCreate={openEventCreatorOnPage} onAutoCreateHandled={() => setOpenEventCreatorOnPage(false)} /></React.Suspense></motion.div>
        )}
        {activeTab === 'guias' && <motion.div key="article-reader" initial={articleOriginRect ? { left: articleOriginRect.left, top: articleOriginRect.top, width: articleOriginRect.width, height: articleOriginRect.height, borderRadius: 34, opacity: .85 } : { left: 0, top: '100dvh', width: '100vw', height: '100dvh', borderRadius: 0, opacity: 0 }} animate={{ left: 0, top: 0, width: '100vw', height: '100dvh', borderRadius: 0, opacity: 1 }} exit={articleOriginRect ? { left: articleOriginRect.left, top: articleOriginRect.top, width: articleOriginRect.width, height: articleOriginRect.height, borderRadius: 34, opacity: .8 } : { left: 0, top: '100dvh', opacity: 0 }} transition={reduceMotion ? { duration: .01 } : { type: 'spring', stiffness: 300, damping: 32, mass: .8 }} style={{ transformOrigin: 'top left' }} className="article-reader-scroll fixed z-[100] overflow-x-hidden overflow-y-auto bg-black text-white"><React.Suspense fallback={null}><ArticleReaderPage onClose={closeArticleReader} /></React.Suspense></motion.div>}
      </AnimatePresence>

      <AnimatePresence>{activeTab === 'explorar' && openEventCreatorOnPage && <React.Suspense fallback={null}><EventsPage embedded autoCreate onClose={() => setOpenEventCreatorOnPage(false)} /></React.Suspense>}</AnimatePresence>
      <AnimatePresence>
        {showSponsorSheet && <>
          <motion.button type="button" aria-label="Cerrar información para patrocinadores" onClick={() => setShowSponsorSheet(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[130] bg-black/65 backdrop-blur-sm"/>
          <motion.section data-desktop-sheet="popup" role="dialog" aria-modal="true" aria-labelledby="sponsor-sheet-title" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 34, stiffness: 280, mass: .9 }} className="fixed inset-x-0 bottom-0 z-[131] mx-auto w-full max-w-[560px] rounded-t-[30px] bg-[#202124] px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 text-white shadow-2xl">
            <div aria-hidden="true" className="mx-auto h-1.5 w-12 rounded-full bg-white/25"/>
            <button type="button" onClick={() => setShowSponsorSheet(false)} aria-label="Cerrar" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08]"><X className="h-4 w-4"/></button>
            <div className="px-1 pb-1 pt-5"><span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-gradient-to-br from-[#ffb347] via-[#ee2a7b] to-[#6228d7]"><Instagram aria-hidden="true" className="h-6 w-6"/></span><h2 id="sponsor-sheet-title" className="mt-4 pr-10 text-xl font-bold">¿Quieres ser patrocinador?</h2><p className="mt-2 text-sm leading-relaxed text-white/60">Mándanos un mensaje por Instagram y cuéntanos sobre tu negocio. Te compartimos las opciones para aparecer en PuntoNochi.</p><a href="https://www.instagram.com/puntonochistlan/" target="_blank" rel="noopener noreferrer" className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-[#202124] transition-transform active:scale-[.99]"><Instagram aria-hidden="true" className="h-4 w-4"/>Escribir a @puntonochistlan</a></div>
          </motion.section>
        </>}
      </AnimatePresence>
      <AnimatePresence>{legalDocument && <LegalPage document={legalDocument} onClose={() => { setLegalDocument(null); window.history.replaceState({}, '', '/'); }}/>}</AnimatePresence>

      {/* Bottom Navigation & Search */}
      {activeTab !== 'ask-nochi' && activeTab !== 'guias' && !showAdminPage && !legalDocument && (
        <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} onOpenSearch={() => { setSearchCategory(null); setSearchQuery(''); setShowSearch(true); }} onCloseSearch={() => { setSearchQuery(''); setShowSearch(false); }} onOpenProfile={() => { if (signedInAccount) setPublicProfileId(signedInAccount.id); else setShowAccountAuth(true); }} onSelectBusiness={(place) => setSelectedBusiness(place)} profilePicture={signedInAccount?.picture} profileName={signedInAccount?.name} profileEmail={signedInAccount?.email} timerEndAt={timerEndAt} onStartTimer={startTimer} onPauseTimer={pauseTimer} onResumeTimer={resumeTimer} onStopTimer={stopTimer} onTimerComplete={completeTimer} searchQuery={searchQuery} searchOpen={showSearch} />
      )}

      {/* Pages & Overlays */}
      <AnimatePresence>
        {activeTab === 'ask-nochi' && <React.Suspense fallback={null}><AskNochiPage key="ask-nochi" onSelectBusiness={(place) => { setActiveTab('inicio'); setSelectedBusiness(place); }} /></React.Suspense>}
        {showAdminPage && <React.Suspense fallback={null}><AdminPage key="admin-page" onClose={() => setShowAdminPage(false)} /></React.Suspense>}
        {showBusinessPromotion && <React.Suspense fallback={null}><BusinessPromotionSheet key="business-promotion" onClose={() => setShowBusinessPromotion(false)} /></React.Suspense>}
        {showBusinessSubmission && <React.Suspense fallback={null}><BusinessSubmissionSheet key="business-submission" onClose={() => setShowBusinessSubmission(false)} /></React.Suspense>}
        {showSearch && (
          <React.Suspense fallback={<div className="fixed inset-x-0 bottom-0 z-[45] mx-auto h-[min(86dvh,760px)] max-w-2xl rounded-t-[30px] bg-[#202124]"/>}>
          <SearchPage
            key="search-page"
            query={searchQuery}
            onSearchTerm={(term) => setSearchQuery(term)}
            onClose={() => { setSearchCategory(null); setSearchQuery(''); setShowSearch(false); }}
            onOpenEvents={() => setActiveTab('eventos')}
            onOpenShort={(shortId) => { window.history.pushState({}, '', `/puntoshorts?short=${encodeURIComponent(shortId)}`); setActiveTab('puntoshorts'); }}
            onOpenProfile={(profileId) => setPublicProfileId(profileId)}
            places={searchCategory ? mockPlaces.filter((place) => place.category === searchCategory.name) : selectedCategory ? mockPlaces.filter((place) => place.category === selectedCategory.name) : mockPlaces}
            categoryScoped={Boolean(searchCategory || selectedCategory)}
            categoryName={searchCategory?.name || selectedCategory?.name}
            onSelectBusiness={(place) => {
              setSelectedCategory(null);
              setSearchCategory(null);
              setSelectedBusiness(place);
              setSearchQuery('');
              setShowSearch(false);
            }}
          />
          </React.Suspense>
        )}
        {showAllCategories && (
          <React.Suspense fallback={null}>
          <AllCategoriesPage 
            key="all-categories"
            onClose={() => setShowAllCategories(false)}
            onSelectCategory={(cat) => setSelectedCategory(cat)}
          />
          </React.Suspense>
        )}
        {showColonias && (
          <React.Suspense fallback={null}>
          <ColoniasPage 
            key="colonias" 
            onClose={() => setShowColonias(false)} 
            onSelectColonia={(colonia) => setSelectedColonia(colonia)}
          />
          </React.Suspense>
        )}
        {selectedColonia && (
          <React.Suspense fallback={null}>
          <ColoniaDetailPage
            key="colonia-detail"
            colonia={selectedColonia}
            onClose={() => setSelectedColonia(null)}
            onSelectBusiness={(place) => {
              setSelectedBusiness(place);
            }}
          />
          </React.Suspense>
        )}
        {showDestacados && (
          <React.Suspense fallback={null}>
          <DestacadosPage 
            key="destacados" 
            onClose={() => setShowDestacados(false)} 
            onSelectBusiness={(place) => {
              setSelectedBusiness(place);
            }} 
          />
          </React.Suspense>
        )}
        {selectedCategory && (
          <React.Suspense fallback={null}>
          <CategoryPage 
            key="category-page"
            category={selectedCategory} 
            onClose={() => setSelectedCategory(null)} 
            onSelectBusiness={(place) => setSelectedBusiness(place)} 
          />
          </React.Suspense>
        )}
        {selectedBusiness && (
          <React.Suspense fallback={null}>
          <BusinessDetailSheet 
            key="business-sheet"
            place={selectedBusiness} 
            onClose={() => setSelectedBusiness(null)} 
            onSelectBusiness={(place) => setSelectedBusiness(place)}
          />
          </React.Suspense>
        )}

        <React.Suspense fallback={null}><SmartOnboarding enabled={!loading && !showWelcome && welcomeTransitionDone && !showAdminPage} onLocation={setDeviceLocation} /></React.Suspense>
        {showWelcome && !showAdminPage && <WelcomePage onContinue={finishWelcome} />}
        {publicProfileId && <React.Suspense fallback={null}><PublicProfileSheet profileId={publicProfileId} onClose={() => setPublicProfileId(null)} onCreateShort={() => { setPublicProfileId(null); setShowReelCreator(true); }} /></React.Suspense>}
        {showAccountAuth && <React.Suspense fallback={null}><AccountAuthSheet onClose={() => setShowAccountAuth(false)}/></React.Suspense>}
      </AnimatePresence>
      <AnimatePresence>{showBookmarksSheet && <React.Suspense fallback={null}><BookmarksSheet key="bookmarks-sheet" onClose={() => setShowBookmarksSheet(false)} onSelectBusiness={(place) => setSelectedBusiness(place)} onOpenArticle={(slug) => openArticleReader(slug)} /></React.Suspense>}</AnimatePresence>
      <AnimatePresence>{showProfileSettings && <React.Suspense fallback={null}><SettingsSheet key="settings-sheet" account={signedInAccount} onClose={() => setShowProfileSettings(false)} onRequireAuth={() => { setShowProfileSettings(false); setShowAccountAuth(true); }} /></React.Suspense>}</AnimatePresence>
      {externalSiteConfirmation}
      <Analytics />
    </AutoLayoutRoot>
  );
}

