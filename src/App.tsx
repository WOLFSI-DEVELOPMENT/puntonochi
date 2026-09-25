import React, { useState, useEffect, useMemo, useRef } from 'react';
import { categories, colonias, visits, mockPlaces } from './data';
import { ChevronRight, Search, Mic, MoreHorizontal, Flame } from 'lucide-react';
import { BottomNav } from './components/BottomNav';
import { ColoniasPage } from './components/ColoniasPage';
import { DiscoverPage } from './components/DiscoverPage';
import { CategoryPage } from './components/CategoryPage';
import { AllCategoriesPage } from './components/AllCategoriesPage';
import { DestacadosPage } from './components/DestacadosPage';
import { ColoniaDetailPage } from './components/ColoniaDetailPage';
import { BusinessDetailSheet } from './components/BusinessDetailSheet';
import { VideosPage } from './components/VideosPage';
import { NewsPage } from './components/NewsPage';
import { SearchPage } from './components/SearchPage';
import { BusinessPromotionSheet } from './components/BusinessPromotionSheet';
import { BusinessSubmissionSheet } from './components/BusinessSubmissionSheet';
import { AdminPage } from './components/AdminPage';
import { SplashScreen } from './components/SplashScreen';
import { InstallAppPrompt } from './components/InstallAppPrompt';
import { NotificationOptInBanner } from './components/NotificationOptInBanner';
import CornerKit from '@cornerkit/core';
import { Category, Place, Colonia } from './types';
import { AnimatePresence, motion } from 'motion/react';
import { DAILY_USE_KEY, recordProfileActiveSeconds } from './profileStorage';

const SEO_SITE_ORIGIN = 'https://puntonochi.vercel.app';
type DailyUse = { lastOpened: string; totalDays: number; currentStreak: number };

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
  useEffect(() => {
    document.documentElement.classList.add('dark');
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
    let initShowAllCategories = false;
    let initShowColonias = false;
    let initShowAdmin = false;

    if (parts.length > 0) {
      if (parts[0] === 'admin') {
        initShowAdmin = true;
      } else if (parts[0] === 'categories') {
        initShowAllCategories = true;
      } else if (parts[0] === 'colonias') {
        initShowColonias = true;
      } else if (parts[0] === 'eventos') {
        initialTab = 'noticias';
      } else if (parts[0] === 'explorar' || parts[0] === 'guardados' || parts[0] === 'videos' || parts[0] === 'noticias' || parts[0] === 'mapa') {
        initialTab = parts[0] === 'mapa' ? 'videos' : parts[0];
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
    
    return { initialTab, initialCategory, initialBusiness, initShowAllCategories, initShowColonias, initShowAdmin };
  };

  const init = getInitialState();

  const [showColonias, setShowColonias] = useState(init.initShowColonias);
  const [showAllCategories, setShowAllCategories] = useState(init.initShowAllCategories);
  const [showAdminPage, setShowAdminPage] = useState(init.initShowAdmin);
  const [showDestacados, setShowDestacados] = useState(false);
  const [showBusinessPromotion, setShowBusinessPromotion] = useState(false);
  const [showBusinessSubmission, setShowBusinessSubmission] = useState(false);
  const [selectedColonia, setSelectedColonia] = useState<Colonia | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(init.initialCategory);
  const [selectedBusiness, setSelectedBusiness] = useState<Place | null>(init.initialBusiness);
  const [activeTab, setActiveTab] = useState(init.initialTab);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [directoryVersion, setDirectoryVersion] = useState(0);
  const [dailyUse, setDailyUse] = useState<DailyUse>(() => recordDailyUse());
  const streakDateRef = useRef(dailyUse.lastOpened);

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

  const [destacadosState, setDestacadosState] = useState({ index: 0, direction: 0 });

  useEffect(() => {
    if (activeTab === 'inicio') {
      const timer = setTimeout(() => {
        const ck = new CornerKit();
        ck.applyAll('.ck-app-card', { radius: 26, smoothing: 1 });
        ck.applyAll('.ck-app-card-inner', { radius: 21, smoothing: 1 });
        ck.applyAll('.ck-home-category-card', { radius: 24, smoothing: 1 });
        ck.applyAll('.ck-home-colonia-featured', { radius: 60, smoothing: 1 });
        ck.applyAll('.ck-home-colonia-card', { radius: 32, smoothing: 1 });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab, destacadosState.index, loading]);

  
  const destacadosPlaces = React.useMemo(() => {
    const seen = new Set();
    const results = [];
    for (const place of mockPlaces) {
      if (place.images && place.images.length > 0 && !seen.has(place.category)) {
        seen.add(place.category);
        results.push(place);
      }
    }
    return results;
  }, [mockPlaces, directoryVersion]);

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
    if (showAdminPage) {
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
    } else if (activeTab === 'noticias' && /^\/eventos\/[^/]+\/?$/.test(window.location.pathname)) {
      path = window.location.pathname;
    } else if (activeTab !== 'inicio') {
      path = `/${activeTab}`;
    }
    
    window.history.pushState({}, '', path);
  }, [selectedBusiness, selectedCategory, showAllCategories, showColonias, activeTab, showSearch, showAdminPage]);

  useEffect(() => {
    let title = 'PuntoNochi | Lugares, negocios y noticias de Nochistlán';
    let description = 'Descubre restaurantes, cafeterías, hoteles, servicios, videos y noticias de Nochistlán de Mejía, Zacatecas.';
    let noIndex = false;

    if (selectedBusiness) {
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
    const pageSchema: Record<string, unknown> = selectedBusiness ? {
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
  }, [activeTab, selectedBusiness, selectedCategory, showAllCategories, showColonias, showSearch, showAdminPage]);

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

  return (
    <div id="app-root" className="relative min-h-screen bg-[#f8f9fa] pb-36 font-sans text-neutral-900 selection:bg-blue-100" style={{ fontFamily: "'Google Sans Flex', 'Google Sans', 'Plus Jakarta Sans', sans-serif" }}>
      {/* Dynamic Main Content based on activeTab */}
      {activeTab === 'inicio' && (
        <main className="pt-16">
          {/* Header Section */}
          <section className="relative px-5 mb-8">
            <div aria-label={`${dailyUse.totalDays} días usando PuntoNochi. Racha actual de ${dailyUse.currentStreak} días.`} title={`${dailyUse.totalDays} días usando PuntoNochi · racha de ${dailyUse.currentStreak} días`} className="absolute right-5 top-[-4px] flex min-h-9 items-center gap-1.5 rounded-full bg-[#292a2d] px-2.5 py-1 text-white shadow-sm">
              <Flame aria-hidden="true" className="h-4 w-4 shrink-0 fill-orange-400 text-orange-400" />
              <span className="leading-tight"><span className="block text-xs font-bold tabular-nums">{dailyUse.totalDays} días</span><span className="block text-[8px] font-medium text-white/55">racha {dailyUse.currentStreak}</span></span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900">
              Descubre<br/>
              <span className="text-[#1a73e8]">Nochistlán</span>
            </h1>
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

          {/* By City (Colonia) Section */}
          <section className="mb-10">
            <div 
              className="px-5 mb-4 flex justify-between items-center cursor-pointer active:opacity-70 transition-opacity"
              onClick={() => !loading && setShowColonias(true)}
            >
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-1">
                  Por Colonias <ChevronRight className="w-5 h-5 text-neutral-400 mt-1" strokeWidth={1.5} />
                </h2>
                <p className="text-[15px] text-neutral-500 font-medium mt-0.5">Explora la ciudad por zonas</p>
              </div>
            </div>
            
            <div className="px-5 flex gap-4 h-[280px]">
              {loading ? (
                <>
                  <div className="w-[60%] h-full squircle-60 bg-neutral-200 animate-pulse" />
                  <div className="w-[40%] flex flex-col gap-4 h-full">
                    <div className="flex-1 squircle-32 bg-neutral-200 animate-pulse" />
                    <div className="flex-1 squircle-32 bg-neutral-200 animate-pulse" />
                  </div>
                </>
              ) : (
                <>
                  {/* Main large card */}
                  <div className="ck-home-colonia-featured w-[60%] h-full squircle-60 relative overflow-hidden shadow-sm">
                    <img src={colonias[0]?.image} alt={colonias[0]?.name} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute bottom-5 left-5 right-5 text-white">
                      <h3 className="font-bold text-xl leading-tight">{colonias[0]?.name}</h3>
                      <p className="text-white/80 text-[13px] font-medium">Descubrir</p>
                    </div>
                  </div>
                  
                  {/* Stacked right cards */}
                  <div className="w-[40%] flex flex-col gap-4 h-full">
                    {colonias.slice(1, 3).map((colonia) => (
                      <div key={colonia.id} className="ck-home-colonia-card flex-1 squircle-32 relative overflow-hidden shadow-sm">
                        <img src={colonia.image} alt={colonia.name} className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4 text-white">
                          <h3 className="font-bold text-base leading-tight">{colonia.name}</h3>
                          <p className="text-white/80 text-[11px] font-medium">Descubrir</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
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
        </main>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'explorar' && (
          <DiscoverPage 
            key="discover" 
            onSelectBusiness={(place) => setSelectedBusiness(place)} 
          />
        )}
        {activeTab === 'videos' && (
          <VideosPage key="videos" />
        )}
        {activeTab === 'noticias' && (
          <NewsPage key="noticias" />
        )}
      </AnimatePresence>

      {/* Bottom Navigation & Search */}
      {!showSearch && !showAdminPage && (
        <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} onOpenSearch={() => setShowSearch(true)} />
      )}

      {/* Pages & Overlays */}
      <AnimatePresence>
        {showAdminPage && <AdminPage key="admin-page" onClose={() => setShowAdminPage(false)} />}
        {showBusinessPromotion && <BusinessPromotionSheet key="business-promotion" onClose={() => setShowBusinessPromotion(false)} />}
        {showBusinessSubmission && <BusinessSubmissionSheet key="business-submission" onClose={() => setShowBusinessSubmission(false)} />}
        {showSearch && (
          <SearchPage
            key="search-page"
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onClose={() => setShowSearch(false)}
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
          />
        )}

        {/* PuntoNochi Animated Brand Splash Screen */}
        {loading && !showAdminPage && (
          <SplashScreen key="splash-screen" onFinish={() => setLoading(false)} />
        )}
        <InstallAppPrompt enabled={!loading} />
        <NotificationOptInBanner />
      </AnimatePresence>
    </div>
  );
}
