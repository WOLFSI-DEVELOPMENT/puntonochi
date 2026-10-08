import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { categories, visits, mockPlaces } from './data';
import { Bookmark, ChevronRight, Flame, Sparkles, MapPin, Star, Store } from 'lucide-react';
import { BottomNav } from './components/BottomNav';
import { ColoniasPage } from './components/ColoniasPage';
const DiscoverPage = React.lazy(() => import('./components/DiscoverPage').then((module) => ({ default: module.DiscoverPage })));
import { CategoryPage } from './components/CategoryPage';
import { AllCategoriesPage } from './components/AllCategoriesPage';
import { DestacadosPage } from './components/DestacadosPage';
import { ColoniaDetailPage } from './components/ColoniaDetailPage';
import { BusinessDetailSheet } from './components/BusinessDetailSheet';
import { HomeVideosSection } from './components/HomeVideosSection';
import { FlipText } from './components/FlipText';
import { VerifiedBusinessName } from './components/VerifiedBusinessName';
import { HomeArticlesSection } from './components/HomeArticlesSection';
import { articleCatalog } from './data/articles-index';
import { AutoLayoutRoot } from './layout/AutoLayout';
const VideosPage = React.lazy(() => import('./components/VideosPage').then((module) => ({ default: module.VideosPage })));
const NewsPage = React.lazy(() => import('./components/NewsPage').then((module) => ({ default: module.NewsPage })));
const ArticlesPage = React.lazy(() => import('./components/ArticlesPage').then((module) => ({ default: module.ArticlesPage })));
const CreatePage = React.lazy(() => import('./components/CreatePage').then((module) => ({ default: module.CreatePage })));
import { SearchPage, AskNochiPage } from './components/SearchPage';
import { BusinessPromotionSheet } from './components/BusinessPromotionSheet';
import { BusinessSubmissionSheet } from './components/BusinessSubmissionSheet';
import { AdminPage } from './components/AdminPage';
import { InstallAppPrompt } from './components/InstallAppPrompt';
import { SmartOnboarding, readDeviceLocation, type DeviceLocation } from './components/SmartOnboarding';
import { WelcomePage } from './components/WelcomePage';
import CornerKit from '@cornerkit/core';
import { Category, Place, Colonia } from './types';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { DAILY_USE_KEY, getBookmarkedPlaceIds, recordProfileActiveSeconds } from './profileStorage';
import { PublicProfileSheet } from './components/PublicProfileSheet';
import { ProfileSheet } from './components/ProfileSheet';
import { getStreakMilestone, StreakBadgeCelebration, StreakPage } from './components/StreakPage';
import { PublicMenuPage } from './components/PublicMenuPage';
import { PageLoadingSkeleton } from './components/PageLoadingSkeleton';
import { Analytics } from '@vercel/analytics/react';
import { getTotalHypes, HYPES_UPDATED_EVENT } from './hypes';
import { getDailyDropChoices, getDailyDropQuestion } from './dailyDrop';

const SEO_SITE_ORIGIN = 'https://puntonochi.vercel.app';
const WELCOME_SEEN_KEY = 'puntonochi-welcome-seen-v1';
type DailyUse = { lastOpened: string; totalDays: number; currentStreak: number };
type SignedInAccount = { id: string; name: string; email: string; picture: string | null };
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

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function previousLocalDateKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day - 1);
  return localDateKey(date);
}

function recordDailyUse(): DailyUse {
  const today = localDateKey();
  try {
    const saved = JSON.parse(localStorage.getItem(DAILY_USE_KEY) || 'null') as DailyUse | null;
    if (saved?.lastOpened === today) return saved;
    const currentStreak = saved?.lastOpened === previousLocalDateKey(today) ? saved.currentStreak + 1 : 1;
    const dailyUse = { lastOpened: today, totalDays: (saved?.totalDays || 0) + 1, currentStreak };
    localStorage.setItem(DAILY_USE_KEY, JSON.stringify(dailyUse));
    return dailyUse;
  } catch {
    return { lastOpened: today, totalDays: 1, currentStreak: 1 };
  }
}

declare global {
  interface Window {
    initLiquidGlass: () => void;
  }
}

export default function App() {
  const reduceMotion = useReducedMotion();
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
    const initShowWelcome = path === '/' || /^\/inicio\/?$/.test(path);

    if (parts.length > 0) {
      if (parts[0] === 'menu' && parts[1]) {
        initialMenuId = parts[1];
      } else if (parts[0] === 'admin') {
        initShowAdmin = true;
      } else if (parts[0] === 'categories') {
        initShowAllCategories = true;
      } else if (parts[0] === 'colonias') {
        initShowColonias = true;
      } else if (parts[0] === 'eventos') {
        initialTab = 'noticias';
      } else if (parts[0] === 'ask-nochi') {
        initialTab = 'ask-nochi';
      } else if (parts[0] === 'explorar' || parts[0] === 'guardados' || parts[0] === 'videos' || parts[0] === 'mercado' || parts[0] === 'noticias' || parts[0] === 'mapa' || parts[0] === 'crear' || parts[0] === 'guias' || parts[0] === 'articulos') {
        initialTab = parts[0] === 'mapa' || parts[0] === 'mercado' ? 'videos' : parts[0] === 'articulos' ? 'guias' : parts[0];
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
    
    return { initialTab, initialCategory, initialBusiness, initialMenuId, initShowAllCategories, initShowColonias, initShowAdmin, initShowWelcome };
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
  const [selectedColonia, setSelectedColonia] = useState<Colonia | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(init.initialCategory);
  const [selectedBusiness, setSelectedBusiness] = useState<Place | null>(init.initialBusiness);
  const [publicMenuId] = useState<string | null>(init.initialMenuId);
  const [activeTab, setActiveTab] = useState(init.initialTab);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dailyDropFlipped, setDailyDropFlipped] = useState(false);
  const dailyDropQuestion = getDailyDropQuestion();
  const dailyDropChoices = getDailyDropChoices(dailyDropQuestion);
  const loading = false;
  const [showWelcome, setShowWelcome] = useState(() => {
    if (!init.initShowWelcome) return false;
    try { return localStorage.getItem(WELCOME_SEEN_KEY) !== 'true'; }
    catch { return true; }
  });
  const [welcomeTransitionDone, setWelcomeTransitionDone] = useState(true);
  const [publicProfileId, setPublicProfileId] = useState<string | null>(null);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showStreakPage, setShowStreakPage] = useState(false);
  const [streakBadgeCelebration, setStreakBadgeCelebration] = useState<{ days: number; name: string } | null>(null);
  const [marketplaceDetailOpen, setMarketplaceDetailOpen] = useState(false);
  const [signedInAccount, setSignedInAccount] = useState<SignedInAccount | null>(null);
  const [directoryVersion, setDirectoryVersion] = useState(0);
  const [suggestionVersion, setSuggestionVersion] = useState(0);
  const [popularPlaces, setPopularPlaces] = useState<Place[]>([]);
  const [recentlyAddedPlaces, setRecentlyAddedPlaces] = useState<Place[]>([]);
  const [deviceLocation, setDeviceLocation] = useState<DeviceLocation | null>(() => readDeviceLocation());
  const [dailyUse, setDailyUse] = useState<DailyUse>(() => recordDailyUse());
  const streakDateRef = useRef(dailyUse.lastOpened);

  useEffect(() => {
    if (loading || showWelcome || !welcomeTransitionDone) return;
    const earnedBadge = getStreakMilestone(dailyUse.currentStreak);
    if (!earnedBadge) return;
    const today = localDateKey();
    const seenKey = `puntonochi-streak-badge-shown-${earnedBadge.days}`;
    try {
      if (localStorage.getItem(seenKey) === today) return;
      localStorage.setItem(seenKey, today);
    } catch { /* Avoid repeating the celebration during this app session. */ }
    setStreakBadgeCelebration({ days: earnedBadge.days, name: earnedBadge.name });
  }, [dailyUse.currentStreak, loading, showWelcome, welcomeTransitionDone]);
  const tabSwipeStart = useRef<{ x: number; y: number } | null>(null);
  const previousPrimaryTab = useRef(activeTab);
  const [tabDirection, setTabDirection] = useState(1);
  const primaryTabs = ['inicio', 'explorar', 'videos', 'noticias', 'crear'] as const;

  useEffect(() => {
    const from = primaryTabs.indexOf(previousPrimaryTab.current as typeof primaryTabs[number]);
    const to = primaryTabs.indexOf(activeTab as typeof primaryTabs[number]);
    if (from >= 0 && to >= 0 && from !== to) setTabDirection(to > from ? 1 : -1);
    previousPrimaryTab.current = activeTab;
  }, [activeTab]);

  const onPageTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 1 || showSearch || showAdminPage || showStreakPage || selectedBusiness || selectedCategory || showAllCategories || showColonias) { tabSwipeStart.current = null; return; }
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
      if (tab === 'noticias' || tab === 'inicio' || tab === 'guias') setActiveTab(tab);
    };
    window.addEventListener('navigate-tab', handleTabNavigation);
    return () => window.removeEventListener('navigate-tab', handleTabNavigation);
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeTab]);

  useEffect(() => {
    const handleMarketplaceDetailVisibility = (event: Event) => {
      setMarketplaceDetailOpen(Boolean((event as CustomEvent<boolean>).detail));
    };
    window.addEventListener('marketplace-detail-visibility', handleMarketplaceDetailVisibility);
    return () => window.removeEventListener('marketplace-detail-visibility', handleMarketplaceDetailVisibility);
  }, []);

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
    try { localStorage.setItem(WELCOME_SEEN_KEY, 'true'); } catch { /* Welcome still closes if storage is unavailable. */ }
    setShowWelcome(false);
    setWelcomeTransitionDone(false);
    window.setTimeout(() => setWelcomeTransitionDone(true), 360);
  };

  useEffect(() => {
    let lastActivityCheck = Date.now();
    const refreshDailyUse = () => {
      const today = localDateKey();
      if (streakDateRef.current === today) return;
      streakDateRef.current = today;
      setDailyUse(recordDailyUse());
    };
    const accountForActiveTime = () => {
      const now = Date.now();
      if (document.visibilityState === 'visible' && document.hasFocus()) recordProfileActiveSeconds((now - lastActivityCheck) / 1000);
      lastActivityCheck = now;
      refreshDailyUse();
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
  }, []);

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
    let path = '/';
    if (publicMenuId) {
      path = `/menu/${encodeURIComponent(publicMenuId)}`;
    } else if (showAdminPage) {
      path = '/admin';
    } else if (showSearch) {
      path = '/buscar';
    } else if (selectedBusiness) {
      // If a business is selected, ideally we show /category/business-name
      // But if category isn't selected (e.g. from Discover page), fallback to /place/
      if (selectedCategory) {
        path = `/${selectedCategory.name.toLowerCase()}/${selectedBusiness.id}`;
      } else {
        path = `/place/${selectedBusiness.id}`;
      }
    } else if (selectedCategory) {
      path = `/${selectedCategory.name.toLowerCase()}`;
    } else if (showAllCategories) {
      path = `/categories`;
    } else if (showColonias) {
      path = `/colonias`;
    } else if ((activeTab === 'noticias' && /^\/eventos\/[^/]+\/?$/.test(window.location.pathname)) || (activeTab === 'guias' && /^\/articulos\/[^/]+\/?$/.test(window.location.pathname))) {
      path = window.location.pathname;
    } else if (activeTab !== 'inicio') {
      path = activeTab === 'videos' ? '/mercado' : activeTab === 'guias' ? '/articulos' : `/${activeTab}`;
    }
    
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
  }, [selectedBusiness, selectedCategory, showAllCategories, showColonias, activeTab, showSearch, showAdminPage, publicMenuId]);

  useEffect(() => {
    let title = 'PuntoNochi | Lugares, negocios y noticias de Nochistlán';
    let description = 'Descubre restaurantes, cafeterías, hoteles, servicios, videos y noticias de Nochistlán de Mejía, Zacatecas.';
    let noIndex = false;
    const articleSlug = activeTab === 'guias' ? window.location.pathname.match(/^\/articulos\/([^/]+)\/?$/)?.[1] : undefined;
    const routeArticle = articleSlug ? articleCatalog.find((article) => article.slug === decodeURIComponent(articleSlug)) : undefined;

    if (publicMenuId) {
      title = 'Menú digital | PuntoNochi';
      description = 'Consulta el menú digital de un negocio local en Nochistlán.';
    } else if (selectedBusiness) {
      title = `${selectedBusiness.name} | ${selectedBusiness.category} en Nochistlán | PuntoNochi`;
      description = `${selectedBusiness.name}: ${selectedBusiness.category} en ${selectedBusiness.location || 'Nochistlán de Mejía, Zacatecas'}. Consulta fotos, ubicación y datos del negocio en PuntoNochi.`;
    } else if (showAdminPage) {
      title = 'Administración | PuntoNochi';
      description = 'Panel privado de administración de PuntoNochi.';
      noIndex = true;
    } else if (showSearch) {
      title = 'Buscar negocios en Nochistlán | PuntoNochi';
      description = 'Busca negocios, restaurantes, servicios y lugares en Nochistlán de Mejía, Zacatecas.';
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
      title = 'Explorar negocios y lugares en Nochistlán | PuntoNochi';
      description = 'Explora fotos, negocios y lugares recomendados en Nochistlán de Mejía, Zacatecas.';
    } else if (activeTab === 'videos') {
      title = 'Videos de Nochistlán | PuntoNochi';
      description = 'Mira videos cortos y largos sobre lugares y novedades de Nochistlán.';
    } else if (activeTab === 'guias') {
      title = routeArticle ? `${routeArticle.title} | Artículos de Nochistlán | PuntoNochi` : 'Artículos de Nochistlán | PuntoNochi';
      description = routeArticle?.summary || 'Historias, cultura y lugares para conocer mejor Nochistlán de Mejía.';
    } else if (activeTab === 'noticias') {
      title = 'Noticias de México y Nochistlán | PuntoNochi';
      description = 'Consulta noticias y videos informativos de México y Nochistlán en PuntoNochi.';
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
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);

    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = `${SEO_SITE_ORIGIN}${window.location.pathname}`;

    const pageUrl = `${SEO_SITE_ORIGIN}${window.location.pathname}`;
    const pageSchema: Record<string, unknown> = routeArticle ? {
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
      image: selectedBusiness.images.map((image) => new URL(image, SEO_SITE_ORIGIN).href),
      telephone: selectedBusiness.phone || undefined,
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
  }, [activeTab, selectedBusiness, selectedCategory, showAllCategories, showColonias, showSearch, showAdminPage, publicMenuId]);

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

  if (publicMenuId) return <PublicMenuPage id={publicMenuId}/>;

  return (
    <AutoLayoutRoot id="app-root" className={`auto-layout-root relative min-h-screen bg-[#f8f9fa] ${activeTab === 'explorar' || activeTab === 'inicio' ? 'pb-0' : 'pb-36'} font-sans text-neutral-900 selection:bg-blue-100`} style={{ fontFamily: "'Google Sans Flex', 'Google Sans', 'Plus Jakarta Sans', sans-serif" }}>
      {/* Dynamic Main Content based on activeTab */}
      <AnimatePresence mode="wait" initial={false}>
      {activeTab === 'inicio' && (
        <motion.main key="home-page" onTouchStart={onPageTouchStart} onTouchEnd={onPageTouchEnd} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: tabDirection * 28, scale: .99 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: tabDirection * -22, scale: .99 }} transition={reduceMotion ? { duration: .12 } : { type: 'spring', stiffness: 330, damping: 34, mass: .72 }} className="pt-8">
          {/* Header Section */}
          <section className="relative px-5 mb-8">
            <div className="absolute right-5 top-[-4px] flex items-center gap-2">
            <button type="button" onClick={() => setShowStreakPage(true)} aria-label={`${dailyUse.totalDays} días usando PuntoNochi. Racha actual de ${dailyUse.currentStreak} días. Ver actividad`} title={`${dailyUse.totalDays} días usando PuntoNochi · racha de ${dailyUse.currentStreak} días`} className="flex min-h-9 items-center gap-1.5 rounded-full bg-[#292a2d] px-2.5 py-1 text-left text-white shadow-sm transition-transform active:scale-95">
              <Flame aria-hidden="true" className="h-4 w-4 shrink-0 fill-orange-400 text-orange-400" />
              <span className="leading-tight"><span className="block text-xs font-bold tabular-nums">{dailyUse.totalDays} días</span><span className="block text-[8px] font-medium text-white/55">racha {dailyUse.currentStreak}</span></span>
            </button>
            {signedInAccount && <button type="button" onClick={() => setPublicProfileId(signedInAccount.id)} aria-label="Abrir mi perfil público" title="Mi perfil" className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#292a2d] p-[2px] text-white shadow-sm ring-1 ring-white/15 transition-transform active:scale-95">
              {signedInAccount.picture ? <img src={signedInAccount.picture} alt="" referrerPolicy="no-referrer" className="h-full w-full rounded-full object-cover"/> : <span className="flex h-full w-full items-center justify-center rounded-full bg-blue-500 text-sm font-bold">{signedInAccount.name.slice(0, 1).toUpperCase()}</span>}
            </button>}
            </div>
            <div className="relative mt-2 max-w-[560px]">
              <h1 className="text-[clamp(42px,11vw,64px)] font-extrabold leading-[.91] tracking-[-.055em] text-white">
                <FlipText>Descubre</FlipText><br/>
                <FlipText className="text-[#d8e7ff]">Nochistlán</FlipText>
              </h1>
            </div>
            <p className="mt-2 max-w-[430px] pl-1 text-[17px] font-medium leading-[1.22] tracking-[-.02em] text-[#d8e7ff] sm:text-[19px]">Negocios, lugares, eventos y más...<br/>todo en un solo lugar.</p>
            <div className="mt-4 [perspective:1200px]">
              <motion.div role="group" aria-label="Pregunta del día" className="ck-home-daily-drop-card relative min-h-[156px] rounded-[24px] bg-[#292a2d] text-white">
                <AnimatePresence mode="wait" initial={false}>
                  {!dailyDropFlipped ? <motion.button key="daily-drop-question" type="button" onClick={() => setDailyDropFlipped(true)} aria-label="Voltear para ver la respuesta del día" initial={{ opacity: 0, scaleX: 0.94 }} animate={{ opacity: 1, scaleX: 1 }} exit={{ opacity: 0, scaleX: 0.94 }} transition={reduceMotion ? { duration: 0.01 } : { duration: 0.18, ease: 'easeInOut' }} className="absolute inset-0 flex w-full flex-col items-start justify-center rounded-[24px] px-6 py-5 text-left">
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">Pregunta del día</span>
                    <span className="mt-2 text-[18px] font-semibold leading-snug">{dailyDropQuestion}</span>
                    <span className="mt-3 text-[11px] font-medium text-white/40">Toca para ver la respuesta</span>
                  </motion.button> : <motion.button key="daily-drop-answer" type="button" onClick={() => setDailyDropFlipped(false)} aria-label="Volver a la pregunta del día" initial={{ opacity: 0, scaleX: 0.94 }} animate={{ opacity: 1, scaleX: 1 }} exit={{ opacity: 0, scaleX: 0.94 }} transition={reduceMotion ? { duration: 0.01 } : { duration: 0.18, ease: 'easeInOut' }} className="absolute inset-0 flex w-full flex-col items-start justify-center rounded-[24px] px-6 py-5 text-left">
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">Respuesta del día</span>
                    <span className="mt-2 text-sm font-semibold leading-snug">{dailyDropChoices.length ? 'Hoy se antoja:' : 'Nuestra recomendación de hoy:'}</span>
                    <span aria-live="polite" className="mt-2 text-base font-semibold leading-snug text-white">{dailyDropChoices.length ? dailyDropChoices.join(' · ') : 'Algo rico, recién preparado y de un negocio local.'}</span>
                    <span className="mt-3 text-[11px] font-medium text-white/40">Toca para volver</span>
                  </motion.button>}
                </AnimatePresence>
              </motion.div>
            </div>
          </section>
          <>
          {/* Personalized suggestions */}
          <section className="mb-10">
            <div className="px-5 mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#1a73e8]"/>{deviceLocation ? 'Cerca de ti' : 'Sugeridos'}</h2>
              <p className="text-[15px] text-neutral-500 font-medium mt-0.5">{deviceLocation ? 'Negocios ordenados por distancia a tu ubicación' : 'Negocios para ti, según lo que buscas y guardas'}</p>
            </div>

            <div className="flex gap-4 overflow-x-auto px-5 pb-2 scrollbar-hide snap-x snap-mandatory">
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
          </section>

          {/* By Category Section */}
          <section className="mb-10">
            <div 
              className="px-5 mb-4 cursor-pointer active:opacity-70 transition-opacity"
              onClick={() => !loading && setShowAllCategories(true)}
            >
              <h2 className="text-2xl font-bold flex items-center gap-1">
                Por Categoría <ChevronRight className="w-5 h-5 text-neutral-400 mt-1" strokeWidth={1.5} />
              </h2>
              <p className="text-[15px] text-neutral-500 font-medium mt-0.5">Encuentra lo que necesitas</p>
            </div>
            
            <div className="flex overflow-x-auto gap-4 px-5 pb-4 scrollbar-hide snap-x">
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
          </section>

          {/* Recently viewed businesses */}
          <section className="mb-10">
            <div className="mb-4 px-5">
              <h2 className="text-2xl font-bold tracking-tight">Vistos recientemente</h2>
              <p className="mt-0.5 text-[15px] font-medium text-neutral-500">Vuelve rápido a los negocios que visitaste</p>
            </div>
            {recentlyViewedPlaces.length ? <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 scrollbar-hide">
              {recentlyViewedPlaces.map((place) => <button type="button" key={place.id} onClick={() => { setSelectedCategory(null); setSelectedBusiness(place); }} className="ck-home-suggested-card relative h-[220px] w-[250px] shrink-0 snap-start overflow-hidden rounded-[28px] bg-neutral-200 text-left text-white shadow-sm transition-transform active:scale-[0.98]">
                {place.images?.[0] ? <img src={place.images[0]} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center bg-[#303135]"><Store className="h-12 w-12 text-white/25"/></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                <span className="absolute left-4 top-4 rounded-full bg-black/35 px-3 py-1 text-xs font-semibold backdrop-blur-sm">{place.category}</span>
                <div className="absolute bottom-4 left-4 right-4"><h3 className="line-clamp-2 text-lg font-bold leading-tight"><VerifiedBusinessName name={place.name}/></h3><p className="mt-1 flex items-center gap-1 truncate text-xs text-white/80"><MapPin className="h-3 w-3 shrink-0"/>{place.location || place.address || 'Nochistlán'}</p>{place.rating > 0 && <p className="mt-1 flex items-center gap-1 text-xs text-white/85"><Star className="h-3 w-3 fill-current text-yellow-300"/>{place.rating.toFixed(1)}{place.reviewCount ? ` · ${place.reviewCount} reseñas` : ''}</p>}</div>
              </button>)}
            </div> : <p className="mx-5 rounded-[22px] bg-neutral-100 px-4 py-4 text-sm text-neutral-500">Los negocios que visites aparecerán aquí.</p>}
          </section>

          {/* Popular this week */}
          {popularPlaces.length > 0 && <section className="mb-10">
            <div className="mb-4 px-5">
              <h2 className="text-2xl font-bold tracking-tight">Popular esta semana</h2>
              <p className="mt-0.5 text-[15px] font-medium text-neutral-500">Lo que la comunidad está buscando y visitando</p>
            </div>
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 scrollbar-hide">
              {popularPlaces.map((place) => <button type="button" key={place.id} onClick={() => { setSelectedCategory(null); setSelectedBusiness(place); }} className="ck-home-suggested-card relative h-[220px] w-[250px] shrink-0 snap-start overflow-hidden rounded-[30px] bg-neutral-200 text-left text-white shadow-sm active:scale-[0.98] transition-transform">
                <img src={place.images[0]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-[#7773e8] px-2.5 py-1 text-[11px] font-bold text-white shadow-[0_4px_12px_rgba(38,33,120,.25)]"><Flame className="h-3.5 w-3.5 fill-white"/>En tendencia</span>
                <div className="absolute bottom-4 left-4 right-4"><h3 className="line-clamp-2 text-lg font-bold leading-tight"><VerifiedBusinessName name={place.name}/></h3><p className="mt-1 truncate text-xs text-white/80">{place.category} · {place.location || place.address || 'Nochistlán'}</p>{place.rating > 0 && <p className="mt-1 flex items-center gap-1 text-xs text-white/85"><Star className="h-3 w-3 fill-current text-yellow-300"/>{place.rating.toFixed(1)}{place.reviewCount ? ` · ${place.reviewCount} reseñas` : ''}</p>}</div>
              </button>)}
            </div>
          </section>}

          <HomeArticlesSection onViewAll={() => setActiveTab('guias')} onOpenArticle={(slug) => { window.history.pushState({}, '', `/articulos/${encodeURIComponent(slug)}`); setActiveTab('guias'); }} />
          <HomeVideosSection onViewAll={() => setActiveTab('noticias')} />

          <section className="mb-10">
            <div className="mb-4 px-5">
              <h2 className="text-2xl font-bold tracking-tight">Nuevo en Nochistlán</h2>
              <p className="mt-0.5 text-[15px] font-medium text-neutral-500">Negocios agregados recientemente</p>
            </div>
            {recentlyAddedPlaces.length ? <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 scrollbar-hide">
              {recentlyAddedPlaces.map((place) => <button type="button" key={place.id} onClick={() => { setSelectedCategory(null); setSelectedBusiness(place); }} className="ck-home-suggested-card relative h-[220px] w-[250px] shrink-0 snap-start overflow-hidden rounded-[28px] bg-neutral-200 text-left text-white shadow-sm active:scale-[0.98] transition-transform">
                {place.images?.[0] ? <img src={place.images[0]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center bg-[#303135]"><Store className="h-12 w-12 text-white/25"/></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                <span className="absolute left-4 top-4 bg-[#1a73e8] px-2.5 py-1 text-[11px] font-bold text-white">NUEVO</span>
                <div className="absolute bottom-4 left-4 right-4"><h3 className="line-clamp-2 text-lg font-bold leading-tight"><VerifiedBusinessName name={place.name}/></h3><p className="mt-1 truncate text-xs text-white/80">{place.category} · {place.location || place.address || 'Nochistlán'}</p>{place.createdAt && <time className="mt-1 block text-[11px] text-white/65">Agregado el {new Date(place.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</time>}</div>
              </button>)}
            </div> : <p className="mx-5 rounded-[22px] bg-neutral-100 px-4 py-4 text-sm text-neutral-500">Los negocios nuevos que agreguemos aparecerán aquí.</p>}
          </section>

          {/* All saved businesses */}
          <section className="mb-10">
            <div className="mb-4 px-5">
              <h2 className="flex items-center gap-2 text-2xl font-bold"><Bookmark className="h-5 w-5 fill-[#1a73e8] text-[#1a73e8]"/>Favoritos</h2>
              <p className="mt-0.5 text-[15px] font-medium text-neutral-500">Tus negocios guardados</p>
            </div>
            {favoritePlaces.length ? <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-hide snap-x snap-mandatory">
              {favoritePlaces.map((place) => <button type="button" key={place.id} onClick={() => { setSelectedCategory(null); setSelectedBusiness(place); }} className="ck-home-favorite-card relative h-[150px] w-[190px] shrink-0 snap-start overflow-hidden rounded-[24px] bg-neutral-200 text-left text-white shadow-sm active:scale-[0.98] transition-transform">
                {place.images?.[0] && <img src={place.images[0]} alt={place.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover"/>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent"/>
                <Bookmark className="absolute right-3 top-3 h-4 w-4 fill-white drop-shadow"/>
                <div className="absolute bottom-3 left-3 right-3"><h3 className="line-clamp-2 text-sm font-bold leading-tight"><VerifiedBusinessName name={place.name}/></h3><p className="mt-1 truncate text-[11px] text-white/75">{place.category} · {place.location || 'Nochistlán'}</p></div>
              </button>)}
            </div> : <div className="mx-5 rounded-[22px] bg-neutral-100 px-4 py-5 text-sm text-neutral-500">Aún no tienes favoritos. Guarda un negocio con el marcador para encontrarlo aquí.</div>}
          </section>

          {/* All Visits Section */}
          <section className="px-5">
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
          </section>

          <section className="mb-10 mt-10 px-5">
            <div className="mb-4">
              <h2 className="text-2xl font-bold tracking-tight">Agrega tu negocio</h2>
              <p className="mt-1 text-[15px] font-medium text-neutral-500">Comparte tu negocio con la comunidad de Nochistlán.</p>
            </div>
            <button type="button" onClick={() => setShowBusinessSubmission(true)} style={{ backgroundColor: '#ffffff', color: '#111111' }} className="w-full rounded-full !bg-white px-6 py-3.5 text-sm font-bold !text-black transition-transform active:scale-[0.99]">Agrega tu negocio</button>
          </section>
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
              <button type="button" onClick={() => setActiveTab('guias')} className="transition-colors hover:text-[#202124]">Artículos</button>
              <button type="button" onClick={() => setActiveTab('noticias')} className="transition-colors hover:text-[#202124]">Noticias</button>
            </nav>
            <p className="relative z-10 mt-6 text-center text-[11px] text-[#202124]/45">© {new Date().getFullYear()} PuntoNochi · Nochistlán, Zacatecas</p>
          </footer>
          </>
        </motion.main>
      )}

        {activeTab === 'explorar' && (
          <motion.div key="explore-page" onTouchStart={onPageTouchStart} onTouchEnd={onPageTouchEnd} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: tabDirection * 28, scale: .99 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: tabDirection * -22, scale: .99 }} transition={reduceMotion ? { duration: .12 } : { type: 'spring', stiffness: 330, damping: 34, mass: .72 }}>
          <React.Suspense fallback={<PageLoadingSkeleton page="explore"/>}>
            <DiscoverPage 
              key="discover" 
              onSelectBusiness={(place) => setSelectedBusiness(place)} 
              onPromoteBusiness={() => setShowBusinessPromotion(true)}
              onOpenOwnProfile={signedInAccount ? () => setPublicProfileId(signedInAccount.id) : undefined}
              account={signedInAccount}
            />
          </React.Suspense>
          </motion.div>
        )}
        {activeTab === 'videos' && (
          <motion.div key="videos-page" onTouchStart={onPageTouchStart} onTouchEnd={onPageTouchEnd} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: tabDirection * 28, scale: .99 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: tabDirection * -22, scale: .99 }} transition={reduceMotion ? { duration: .12 } : { type: 'spring', stiffness: 330, damping: 34, mass: .72 }}><React.Suspense fallback={<PageLoadingSkeleton page="market"/>}><VideosPage key="videos" onSelectBusiness={(place) => setSelectedBusiness(place)} /></React.Suspense></motion.div>
        )}
        {activeTab === 'crear' && (
          <motion.div key="create-page" onTouchStart={onPageTouchStart} onTouchEnd={onPageTouchEnd} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: tabDirection * 28, scale: .99 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: tabDirection * -22, scale: .99 }} transition={reduceMotion ? { duration: .12 } : { type: 'spring', stiffness: 330, damping: 34, mass: .72 }}><React.Suspense fallback={<PageLoadingSkeleton page="create"/>}><CreatePage account={signedInAccount}/></React.Suspense></motion.div>
        )}
        {activeTab === 'noticias' && (
          <motion.div key="news-page" onTouchStart={onPageTouchStart} onTouchEnd={onPageTouchEnd} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: tabDirection * 28, scale: .99 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: tabDirection * -22, scale: .99 }} transition={reduceMotion ? { duration: .12 } : { type: 'spring', stiffness: 330, damping: 34, mass: .72 }}><React.Suspense fallback={<PageLoadingSkeleton page="news"/>}><NewsPage key="noticias" /></React.Suspense></motion.div>
        )}
        {activeTab === 'guias' && <motion.div key="articles-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .18 }}><React.Suspense fallback={<div className="min-h-screen bg-[#111214]"/>}><ArticlesPage /></React.Suspense></motion.div>}
      </AnimatePresence>

      <AnimatePresence>
        {showStreakPage && <StreakPage key="streak-page" totalDays={dailyUse.totalDays} currentStreak={dailyUse.currentStreak} onClose={() => setShowStreakPage(false)} />}
      </AnimatePresence>
      <AnimatePresence>{streakBadgeCelebration && <StreakBadgeCelebration key={`streak-badge-${streakBadgeCelebration.days}`} days={streakBadgeCelebration.days} name={streakBadgeCelebration.name} onDone={() => setStreakBadgeCelebration(null)}/>}</AnimatePresence>

      {/* Bottom Navigation & Search */}
      {activeTab !== 'ask-nochi' && !showAdminPage && !showStreakPage && !(activeTab === 'videos' && marketplaceDetailOpen) && (
        <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} onOpenSearch={() => { setSearchQuery(''); setShowSearch(true); }} onCloseSearch={() => setShowSearch(false)} onOpenProfile={() => { if (signedInAccount) setPublicProfileId(signedInAccount.id); else setShowProfileSheet(true); }} profilePicture={signedInAccount?.picture} profileName={signedInAccount?.name} />
      )}

      {/* Pages & Overlays */}
      <AnimatePresence>
        {activeTab === 'ask-nochi' && <AskNochiPage key="ask-nochi" onSelectBusiness={(place) => { setActiveTab('inicio'); setSelectedBusiness(place); }} />}
        {showAdminPage && <AdminPage key="admin-page" onClose={() => setShowAdminPage(false)} />}
        {showBusinessPromotion && <BusinessPromotionSheet key="business-promotion" onClose={() => setShowBusinessPromotion(false)} />}
        {showBusinessSubmission && <BusinessSubmissionSheet key="business-submission" onClose={() => setShowBusinessSubmission(false)} />}
        {showSearch && (
          <SearchPage
            key="search-page"
            query={searchQuery}
            onClose={() => setShowSearch(false)}
            onOpenEvents={() => setActiveTab('noticias')}
            onOpenMarketplace={() => setActiveTab('videos')}
            places={selectedCategory ? mockPlaces.filter((place) => place.category === selectedCategory.name) : mockPlaces}
            categoryScoped={Boolean(selectedCategory)}
            categoryName={selectedCategory?.name}
            onSelectBusiness={(place) => {
              setSelectedCategory(null);
              setSelectedBusiness(place);
              setShowSearch(false);
            }}
          />
        )}
        {showAllCategories && (
          <AllCategoriesPage 
            key="all-categories"
            onClose={() => setShowAllCategories(false)}
            onSelectCategory={(cat) => setSelectedCategory(cat)}
          />
        )}
        {showColonias && (
          <ColoniasPage 
            key="colonias" 
            onClose={() => setShowColonias(false)} 
            onSelectColonia={(colonia) => setSelectedColonia(colonia)}
          />
        )}
        {selectedColonia && (
          <ColoniaDetailPage
            key="colonia-detail"
            colonia={selectedColonia}
            onClose={() => setSelectedColonia(null)}
            onSelectBusiness={(place) => {
              setSelectedBusiness(place);
            }}
          />
        )}
        {showDestacados && (
          <DestacadosPage 
            key="destacados" 
            onClose={() => setShowDestacados(false)} 
            onSelectBusiness={(place) => {
              setSelectedBusiness(place);
            }} 
          />
        )}
        {selectedCategory && (
          <CategoryPage 
            key="category-page"
            category={selectedCategory} 
            onClose={() => setSelectedCategory(null)} 
            onSelectBusiness={(place) => setSelectedBusiness(place)} 
          />
        )}
        {selectedBusiness && (
          <BusinessDetailSheet 
            key="business-sheet"
            place={selectedBusiness} 
            onClose={() => setSelectedBusiness(null)} 
            onSelectBusiness={(place) => setSelectedBusiness(place)}
          />
        )}

        <InstallAppPrompt enabled={!loading} />
        <SmartOnboarding enabled={!loading && !showWelcome && welcomeTransitionDone && !showAdminPage} onLocation={setDeviceLocation} />
        {showWelcome && !showAdminPage && <WelcomePage onContinue={finishWelcome} />}
        {publicProfileId && <PublicProfileSheet profileId={publicProfileId} onClose={() => setPublicProfileId(null)} />}
        {showProfileSheet && <ProfileSheet onClose={() => setShowProfileSheet(false)} onSelectBusiness={(place) => setSelectedBusiness(place)} />}
        {showProfileSettings && <ProfileSheet settingsOnly onClose={() => setShowProfileSettings(false)} onSelectBusiness={(place) => setSelectedBusiness(place)} />}
      </AnimatePresence>
      <Analytics />
    </AutoLayoutRoot>
  );
}

