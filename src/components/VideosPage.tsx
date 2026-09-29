import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { ArrowLeft, Bike, BriefcaseBusiness, ChevronRight, Clock3, Heart, House, MapPin, MessageCircle, Phone, Plus, Search, Share2, ShieldCheck, Store, Utensils, UserRound, X } from 'lucide-react';
import { AccountAuthSheet } from './AccountSheets';
import { ProfileSheet } from './ProfileSheet';
import { PublicProfileSheet } from './PublicProfileSheet';
import { MarketplaceListingFlow } from './MarketplaceListingFlow';
import type { Place } from '../types';

const marketplaceImage = 'https://res.cloudinary.com/dwthgcx5j/image/upload/v1790610321/ChatGPT_Image_Sep_28_2026_09_42_34_AM_dsqm0g.png';

const categories = [
  { label: 'Artículos', emoji: '🛍️', note: 'Compra y vende cosas' },
  { label: 'Empleos', emoji: '💼', note: 'Oportunidades locales' },
  { label: 'Casas', emoji: '🏡', note: 'Hogares en Nochistlán' },
  { label: 'Rentas', emoji: '🔑', note: 'Encuentra tu espacio' },
  { label: 'Comida', emoji: '🍒', note: 'Menús y antojos' },
  { label: 'Servicios', emoji: '🛠️', note: 'Ayuda de la comunidad' },
  { label: 'Negocios', emoji: '🏪', note: 'Tiendas y restaurantes' },
  { label: 'Otros', emoji: '✨', note: 'Más cosas cerca de ti' },
];

function normalizeMarketplaceText(value: string) {
  return value.toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

type Listing = { id: string; category: string; title: string; price: string; location: string; description: string; details: Record<string, string>; createdAt: string; profileId: string; authorName: string; authorPicture: string | null; images: { id: string; url: string; sortOrder: number }[] };
type MarketplaceAccount = { id: string; name: string; picture: string | null };

export function VideosPage({ onSelectBusiness }: { onSelectBusiness?: (place: Place) => void } = {}) {
  const [selectedPublishedListing, setSelectedPublishedListing] = useState<Listing | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<(typeof categories)[number] | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [account, setAccount] = useState<MarketplaceAccount | null>(null);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [showAccountAuth, setShowAccountAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [publicProfileId, setPublicProfileId] = useState('');
  const [feedLoadError, setFeedLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const normalizedQuery = normalizeMarketplaceText(searchQuery.trim());
  const matchesSearch = (value: string) => !normalizedQuery || normalizeMarketplaceText(value).includes(normalizedQuery);
  const loadListings = () => fetch('/api/marketplace/listings', { cache: 'no-store', credentials: 'same-origin' }).then(async (response) => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'No se pudieron cargar los anuncios.');
    setListings(Array.isArray(body) ? body : []);
    setFeedLoadError('');
  }).catch((error: unknown) => setFeedLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los anuncios.'));
  useEffect(() => { void loadListings(); }, []);
  useEffect(() => {
    let active = true;
    fetch('/api/account/session', { cache: 'no-store', credentials: 'same-origin' }).then((response) => response.ok ? response.json() : null).then((result) => { if (active) setAccount(result?.account || null); }).catch(() => { if (active) setAccount(null); });
    const refresh = () => fetch('/api/account/session', { cache: 'no-store', credentials: 'same-origin' }).then((response) => response.ok ? response.json() : null).then((result) => { if (active) setAccount(result?.account || null); }).catch(() => { if (active) setAccount(null); });
    window.addEventListener('account-session-updated', refresh);
    window.addEventListener('account-profile-updated', refresh);
    return () => { active = false; window.removeEventListener('account-session-updated', refresh); window.removeEventListener('account-profile-updated', refresh); };
  }, []);
  useEffect(() => { window.addEventListener('marketplace-listing-published', loadListings); return () => window.removeEventListener('marketplace-listing-published', loadListings); }, []);
  const marketplaceListings = normalizedQuery ? listings.filter((listing) => matchesSearch(`${listing.title} ${listing.price} ${listing.location} ${listing.category} ${listing.description} ${Object.values(listing.details || {}).join(' ')}`)) : listings;
  const combinedListingCount = marketplaceListings.length;
  const matchingCategories = normalizedQuery ? categories.filter((category) => matchesSearch(`${category.label} ${category.note}`)) : categories;
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('marketplace-detail-visibility', { detail: Boolean(selectedPublishedListing) }));
    return () => window.dispatchEvent(new CustomEvent('marketplace-detail-visibility', { detail: false }));
  }, [selectedPublishedListing]);

  useEffect(() => {
    if (selectedPublishedListing) window.scrollTo(0, 0);
  }, [selectedPublishedListing]);
  useEffect(() => {
    if (selectedCategory || showAllCategories) window.scrollTo(0, 0);
  }, [selectedCategory, showAllCategories]);

  if (selectedPublishedListing) {
    return <MarketplacePublishedItemDetails item={selectedPublishedListing} onBack={() => setSelectedPublishedListing(null)} onOpenProfile={setPublicProfileId} />;
  }
  if (selectedCategory) {
    return <MarketplaceCategoryPage category={selectedCategory} listings={listings} onBack={() => setSelectedCategory(null)} onSelectListing={setSelectedListing} onSelectPublishedListing={setSelectedPublishedListing} />;
  }
  if (showAllCategories) {
    return <MarketplaceCategoriesPage listings={listings} onBack={() => setShowAllCategories(false)} onSelectCategory={(category) => { setSelectedCategory(category); setShowAllCategories(false); }} />;
  }

  const openOwnProfile = () => account ? setPublicProfileId(account.id) : setShowAccountAuth(true);
  const selectProfileBusiness = (place: Place) => { setShowProfile(false); onSelectBusiness?.(place); };

  return (
    <main className="marketplace-page min-h-screen pb-36">
      <section className="marketplace-hero relative h-[239px] w-full overflow-hidden bg-[#121212] sm:h-[285px]">
        <img src={marketplaceImage} alt="Ilustración para el mercado local de Nochistlán" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute left-4 top-[calc(env(safe-area-inset-top,0px)+14px)] z-[2] flex items-center gap-2">
          <button type="button" onClick={() => account ? setShowCreateListing(true) : setShowAccountAuth(true)} aria-label="Crear anuncio" title="Crear anuncio" className="marketplace-create-trigger"><Plus className="h-4 w-4" strokeWidth={2.7}/></button>
        </div>
        <div className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+14px)] z-[2] flex items-center gap-2">
          {account ? <button type="button" onClick={openOwnProfile} aria-label="Abrir mi perfil" className="marketplace-account-trigger">{account.picture ? <img src={account.picture} alt="" referrerPolicy="no-referrer"/> : <span>{account.name.slice(0,1).toLocaleUpperCase('es-MX')}</span>}</button> : <button type="button" onClick={() => setShowAccountAuth(true)} className="marketplace-signup-trigger">Registrarse</button>}
        </div>
      </section>

      <label className="marketplace-squircle relative z-[1] mx-auto -mt-5 flex h-12 w-[calc(100%-40px)] max-w-xl items-center gap-2.5 bg-white px-3.5 text-xs text-neutral-400 shadow-[0_5px_18px_rgba(22,28,45,0.10)]">
        <Search aria-hidden="true" className="h-4 w-4 text-neutral-500" />
        <input type="search" aria-label="Buscar en el mercado" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Busca artículos, casas, comida..." className="marketplace-search-input min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-neutral-400" />
        {searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label="Limpiar búsqueda" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400"><X className="h-4 w-4"/></button>}
      </label>

      <div className="mx-auto max-w-xl px-4">
        {(!normalizedQuery || matchingCategories.length > 0) && <section aria-labelledby="categories-title" className="mt-6">
          <div className="mb-2.5 flex items-center justify-between px-1"><h2 id="categories-title" className="text-sm font-bold">{normalizedQuery ? 'Categorías' : 'Explora categorías'}</h2>{!normalizedQuery && <button type="button" onClick={() => setShowAllCategories(true)} className="text-[10px] font-medium text-neutral-400">Ver todas <ChevronRight aria-hidden="true" className="inline h-3 w-3" /></button>}</div>
          <div className="grid grid-cols-2 gap-2.5">
            {matchingCategories.map((category) => <button type="button" onClick={() => setSelectedCategory(category)} key={category.label} className={`marketplace-category marketplace-squircle marketplace-category-${categories.indexOf(category) + 1}`}>
              <span aria-hidden="true" className="marketplace-category-emoji">{category.emoji}</span>
              <span className="marketplace-category-label">{category.label}</span>
              <span className="marketplace-category-note">{category.note}</span>
            </button>)}
          </div>
        </section>}

        {(!normalizedQuery || combinedListingCount > 0 || feedLoadError) && <section aria-labelledby="listings-title" className="mt-6">
          <div className="mb-2.5 flex items-end justify-between px-1"><div><h2 id="listings-title" className="text-sm font-bold">{normalizedQuery ? 'Anuncios encontrados' : 'Anuncios cerca de ti'}</h2><p className="mt-0.5 text-[10px] text-neutral-500">{normalizedQuery ? `${combinedListingCount} resultados` : 'Publicaciones de la comunidad'}</p></div>{!normalizedQuery && <button type="button" onClick={() => setShowAllCategories(true)} className="text-[10px] font-semibold text-neutral-400">Ver todo <ChevronRight aria-hidden="true" className="inline h-3 w-3" /></button>}</div>
          {feedLoadError && <p role="status" className="mb-3 rounded-[16px] bg-[#202124] px-3 py-2 text-[11px] text-white/55">{feedLoadError}</p>}
          {marketplaceListings.length ? <div className="grid grid-cols-2 gap-2.5">
            {marketplaceListings.map((listing) => <MarketplacePublishedListingCard key={listing.id} listing={listing} onOpenListing={() => setSelectedPublishedListing(listing)} onOpenProfile={setPublicProfileId} />)}
          </div> : !feedLoadError && <div className="rounded-[18px] bg-[#202124] px-4 py-8 text-center"><Store className="mx-auto h-6 w-6 text-white/35"/><h3 className="mt-3 text-sm font-semibold text-white">Todavía no hay anuncios</h3><p className="mt-1 text-xs text-white/45">Sé la primera persona en publicar en el Mercado.</p></div>}
        </section>}

        {normalizedQuery && !matchingCategories.length && !marketplaceListings.length && <div className="mt-6 rounded-[18px] bg-[#202124] px-5 py-8 text-center"><Search className="mx-auto h-6 w-6 text-white/35"/><h2 className="mt-3 text-sm font-bold text-white">No encontramos resultados</h2><p className="mt-1 text-xs text-white/45">Prueba con otro nombre o categoría.</p></div>}

      </div>
    <AnimatePresence>{showCreateListing && <MarketplaceListingFlow onClose={() => setShowCreateListing(false)}/>}</AnimatePresence>
    <AnimatePresence>{showAccountAuth && <AccountAuthSheet initialMode="signup" onClose={() => setShowAccountAuth(false)}/>}</AnimatePresence>
    <AnimatePresence>{showProfile && <ProfileSheet onClose={() => setShowProfile(false)} onSelectBusiness={selectProfileBusiness}/>}</AnimatePresence>
    <AnimatePresence>{publicProfileId && <PublicProfileSheet profileId={publicProfileId} onClose={() => setPublicProfileId('')}/>}</AnimatePresence>
    </main>
  );
}

type MarketplaceListing = (typeof sampleListings)[number];
type MarketplaceCategory = (typeof categories)[number];

function MarketplaceListingCard({ listing, onClick }: { listing: MarketplaceListing; onClick: () => void }) {
  const Icon = listing.icon;
  return <button type="button" onClick={onClick} className="marketplace-listing marketplace-squircle overflow-hidden bg-white text-left shadow-[0_2px_10px_rgba(22,28,45,0.055)]">
    <div className={`relative flex aspect-[1.72/1] items-center justify-center overflow-hidden ${listing.art}`}>
      <div aria-hidden="true" className="absolute -right-5 -top-7 h-28 w-28 rounded-full bg-white/35" />
      <div aria-hidden="true" className="absolute -bottom-12 -left-5 h-28 w-28 rounded-full bg-black/[0.035]" />
      <Icon aria-hidden="true" strokeWidth={1.35} className="relative h-14 w-14 drop-shadow-sm" />
      <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[9px] font-semibold text-neutral-600">{listing.category}</span>
      <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-neutral-600"><Heart aria-hidden="true" className="h-3.5 w-3.5" /></span>
    </div>
    <div className="p-3">
      <p className="text-[11px] font-semibold leading-snug text-neutral-800">{listing.title}</p>
      <p className="mt-1 text-sm font-extrabold text-[#202c3a]">{listing.price}</p>
      <div className="mt-2 flex items-center justify-between gap-1 text-[9px] text-neutral-400"><span className="flex min-w-0 items-center gap-1 truncate"><MapPin aria-hidden="true" className="h-3 w-3 shrink-0" />{listing.detail}</span><span className="shrink-0">{listing.stamp}</span></div>
    </div>
  </button>;
}

function MarketplacePublishedListingCard({ listing, onOpenListing, onOpenProfile }: { listing: Listing; onOpenListing: () => void; onOpenProfile: (profileId: string) => void }) {
  return <article className="marketplace-listing marketplace-squircle overflow-hidden bg-[#202124] text-left">
    <button type="button" onClick={onOpenListing} className="block w-full text-left">
      <div className="relative aspect-[1.25/1] bg-[#292a2d]">
        {listing.images[0]?.url ? <img src={listing.images[0].url} alt={listing.title} loading="lazy" className="h-full w-full object-cover"/> : <Store className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-white/25"/>}
        <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[9px] font-semibold text-white">{listing.category}</span>
        {listing.images.length > 1 && <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-1 text-[9px] text-white">{listing.images.length} fotos</span>}
      </div>
      <div className="p-3 pb-0"><h3 className="line-clamp-2 text-[11px] font-semibold leading-snug text-white">{listing.title}</h3><p className="mt-1 text-sm font-extrabold text-white">{listing.price}</p><p className="mt-2 flex items-center gap-1 truncate text-[9px] text-white/45"><MapPin className="h-3 w-3 shrink-0"/>{listing.location}</p></div>
    </button>
    <div className="px-3 pb-3"><button type="button" onClick={() => onOpenProfile(listing.profileId)} className="mt-2 flex min-w-0 items-center gap-1.5 text-[9px] text-white/55"><span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-[#36373a]">{listing.authorPicture ? <img src={listing.authorPicture} alt="" className="h-full w-full object-cover"/> : <UserRound className="h-3 w-3"/>}</span><span className="truncate">{listing.authorName || 'Vendedor local'}</span></button></div>
  </article>;
}

function categoryListings(category: MarketplaceCategory) {
  switch (category.label) {
    case 'Artículos': return sampleListings.filter((listing) => listing.category === 'Artículos');
    case 'Empleos': return sampleListings.filter((listing) => listing.category === 'Empleo');
    case 'Casas': return sampleListings.filter((listing) => listing.title.toLocaleLowerCase('es-MX').includes('casa'));
    case 'Rentas': return sampleListings.filter((listing) => listing.category === 'Renta');
    default: return [];
  }
}

function MarketplacePageHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return <header className="marketplace-browse-header flex w-full items-center gap-2.5 pb-3 pt-[calc(env(safe-area-inset-top,0px)+10px)]">
    <button type="button" onClick={onBack} aria-label="Volver al mercado" className="marketplace-browse-back"><ArrowLeft className="h-[18px] w-[18px]"/></button>
    <div className="min-w-0"><p className="text-[10px] font-medium text-white/45">Mercado local</p><h1 className="mt-0.5 truncate text-lg font-bold text-white">{title}</h1><p className="mt-0.5 truncate text-[11px] text-white/50">{subtitle}</p></div>
  </header>;
}

function MarketplaceCategoriesPage({ listings, onBack, onSelectCategory }: { listings: Listing[]; onBack: () => void; onSelectCategory: (category: MarketplaceCategory) => void }) {
  return <main className="marketplace-page marketplace-browse-page min-h-screen px-4 pb-36">
    <div className="mx-auto w-full max-w-2xl">
      <MarketplacePageHeader title="Todas las categorías" subtitle="Encuentra algo para ti, cerca de casa." onBack={onBack}/>
      <label className="marketplace-squircle mb-5 flex h-11 items-center gap-2 bg-[#202124] px-4 text-xs text-white/45"><Search className="h-4 w-4"/><span className="sr-only">Buscar categorías</span><input placeholder="Explora artículos, servicios, comida..." className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/45"/></label>
      <section aria-label="Todas las categorías" className="grid grid-cols-2 gap-2.5">
        {categories.map((category, index) => {
          const count = categoryListings(category).length + listings.filter((listing) => listing.category === category.label).length;
          return <button type="button" key={category.label} onClick={() => onSelectCategory(category)} className={`marketplace-category marketplace-squircle marketplace-category-${index + 1}`}>
            <span aria-hidden="true" className="marketplace-category-emoji">{category.emoji}</span>
            <span className="marketplace-category-label">{category.label}</span>
            <span className="marketplace-category-note">{category.note}</span>
            <span className="mt-auto pt-3 text-[10px] text-white/45">{count ? `${count} anuncio${count === 1 ? '' : 's'}` : 'Explorar categoría'} <ChevronRight className="inline h-3 w-3"/></span>
          </button>;
        })}
      </section>
    </div>
  </main>;
}

function MarketplaceCategoryPage({ category, listings: publishedListings, onBack, onSelectListing, onSelectPublishedListing }: { category: MarketplaceCategory; listings: Listing[]; onBack: () => void; onSelectListing: (listing: MarketplaceListing) => void; onSelectPublishedListing: (listing: Listing) => void }) {
  const listings = categoryListings(category);
  const userListings = publishedListings.filter((listing) => listing.category === category.label);
  const totalListings = listings.length + userListings.length;
  return <main className="marketplace-page marketplace-browse-page min-h-screen px-4 pb-36">
    <div className="mx-auto w-full max-w-2xl">
      <MarketplacePageHeader title={category.label} subtitle={category.note} onBack={onBack}/>
      <section className="marketplace-category-intro marketplace-squircle mb-5 flex items-center gap-4 p-4">
        <span className="marketplace-category-emoji" aria-hidden="true">{category.emoji}</span>
        <div><p className="text-sm font-bold text-white">{category.label} en Nochistlán</p><p className="mt-1 text-[11px] text-white/50">Descubre opciones cerca de ti</p></div>
      </section>
      <div className="mb-4 flex items-end justify-between"><div><h2 className="text-sm font-bold text-white">Anuncios</h2><p className="mt-1 text-[10px] text-white/45">{totalListings ? `${totalListings} disponibles` : 'Nuevas publicaciones aparecerán aquí'}</p></div><span className="rounded-full bg-[#202124] px-3 py-2 text-[10px] text-white/65">Más recientes <ChevronRight className="ml-1 inline h-3 w-3"/></span></div>
      {totalListings ? <div className="grid grid-cols-2 gap-2.5">{listings.map((listing) => <MarketplaceListingCard key={listing.title} listing={listing} onClick={() => onSelectListing(listing)}/>)}{userListings.map((listing) => <MarketplacePublishedListingCard key={listing.id} listing={listing} onOpenListing={() => onSelectPublishedListing(listing)} onOpenProfile={() => undefined}/>)}</div> : <div className="marketplace-category-empty marketplace-squircle px-5 py-9 text-center"><span className="text-4xl" aria-hidden="true">{category.emoji}</span><h2 className="mt-3 text-sm font-bold text-white">Todavía no hay anuncios</h2><p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-white/50">Sé de las primeras personas en publicar en {category.label.toLocaleLowerCase('es-MX')}.</p><button type="button" className="mt-4 rounded-full bg-white px-4 py-2.5 text-xs font-bold text-black">Publicar anuncio</button></div>}
    </div>
  </main>;
}

function MarketplaceItemDetails({ item, onBack }: { item: (typeof sampleListings)[number]; onBack: () => void }) {
  const ItemIcon = item.icon;
  return (
    <main className="marketplace-page marketplace-detail min-h-screen pb-40">
      <section className={`marketplace-detail-art relative flex h-[300px] items-center justify-center overflow-hidden sm:h-[360px] ${item.art}`}>
        <div aria-hidden="true" className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-white/30" />
        <div aria-hidden="true" className="absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-black/[0.045]" />
        <ItemIcon aria-hidden="true" strokeWidth={1.15} className="relative h-36 w-36 drop-shadow-md sm:h-44 sm:w-44" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+14px)] sm:px-6">
          <button type="button" onClick={onBack} aria-label="Volver al mercado" className="marketplace-detail-icon-button"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex gap-2">
            <button type="button" aria-label="Compartir anuncio" className="marketplace-detail-icon-button"><Share2 className="h-4 w-4" /></button>
            <button type="button" aria-label="Guardar anuncio" className="marketplace-detail-icon-button"><Heart className="h-4 w-4" /></button>
          </div>
        </div>
        <span className="marketplace-detail-count absolute bottom-[27px] right-4 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white">1 de 4</span>
      </section>

      <div className="marketplace-detail-content mx-auto max-w-xl px-4">
        <div className="marketplace-detail-panel -mt-4 relative z-[1] p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="marketplace-detail-category">{item.category}</span>
            <span className="flex items-center gap-1 text-[10px] text-neutral-400"><Clock3 className="h-3 w-3" />{item.stamp}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{item.title}</h1>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-white">{item.price}</p>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-400"><MapPin className="h-4 w-4" />{item.detail}</p>
        </div>

        <section className="marketplace-detail-section mt-5">
          <h2>Descripción</h2>
          <p>{item.description}</p>
        </section>

        <section className="marketplace-seller-card marketplace-detail-panel mt-4 flex items-center gap-3 p-4">
          <div className="marketplace-seller-avatar">N</div>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">Vendedor local</p><p className="mt-1 text-[10px] text-neutral-400">En PuntoNochi desde 2026</p></div>
          <ChevronRight className="h-4 w-4 text-neutral-500" />
        </section>

        <section className="marketplace-detail-section mt-5">
          <h2>Detalles del anuncio</h2>
          <div className="marketplace-detail-facts mt-3"><span>Condición</span><strong>Buen estado</strong><span>Entrega</span><strong>A convenir en persona</strong></div>
        </section>

        <section className="marketplace-safety-note marketplace-detail-panel mt-4 flex items-start gap-3 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#a7c5a9]" />
          <div><h2 className="text-xs font-semibold text-white">Compra con tranquilidad</h2><p className="mt-1 text-[10px] leading-relaxed text-neutral-400">Conoce el producto en persona y acuerda el pago directamente con quien lo anuncia.</p></div>
        </section>
      </div>

      <div className="marketplace-detail-actions mx-auto flex max-w-xl gap-2 px-4">
        <button type="button" className="marketplace-detail-contact flex-1"><MessageCircle className="h-4 w-4" />Enviar mensaje</button>
        <button type="button" aria-label="Llamar al vendedor" className="marketplace-detail-call"><Phone className="h-4 w-4" /></button>
      </div>
    </main>
  );
}

function MarketplacePublishedItemDetails({ item, onBack, onOpenProfile }: { item: Listing; onBack: () => void; onOpenProfile: (profileId: string) => void }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  return <main className="marketplace-page marketplace-detail min-h-screen pb-40">
    <section className="marketplace-detail-art relative h-[300px] overflow-hidden bg-[#202124] sm:h-[360px]">
      {item.images.length ? <img src={item.images[photoIndex]?.url} alt={item.title} className="h-full w-full object-cover"/> : <Store className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-white/25"/>}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+14px)] sm:px-6"><button type="button" onClick={onBack} aria-label="Volver al mercado" className="marketplace-detail-icon-button"><ArrowLeft className="h-5 w-5"/></button><div className="flex gap-2"><button type="button" aria-label="Compartir anuncio" onClick={() => { if (navigator.share) void navigator.share({ title: item.title, url: window.location.href }).catch(() => undefined); else void navigator.clipboard?.writeText(window.location.href); }} className="marketplace-detail-icon-button"><Share2 className="h-4 w-4"/></button><button type="button" aria-label="Guardar anuncio" className="marketplace-detail-icon-button"><Heart className="h-4 w-4"/></button></div></div>
      {item.images.length > 1 && <><button type="button" aria-label="Foto anterior" onClick={() => setPhotoIndex((index) => (index + item.images.length - 1) % item.images.length)} className="marketplace-detail-icon-button absolute left-4 top-1/2 -translate-y-1/2"><ArrowLeft className="h-4 w-4"/></button><button type="button" aria-label="Foto siguiente" onClick={() => setPhotoIndex((index) => (index + 1) % item.images.length)} className="marketplace-detail-icon-button absolute right-4 top-1/2 -translate-y-1/2"><ArrowLeft className="h-4 w-4 rotate-180"/></button><span className="marketplace-detail-count absolute bottom-[27px] right-4 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white">{photoIndex + 1} de {item.images.length}</span></>}
    </section>
    <div className="marketplace-detail-content mx-auto max-w-xl px-4">
      <div className="marketplace-detail-panel relative z-[1] -mt-4 p-4 sm:p-5"><div className="mb-3 flex items-center justify-between gap-3"><span className="marketplace-detail-category">{item.category}</span><span className="flex items-center gap-1 text-[10px] text-neutral-400"><Clock3 className="h-3 w-3"/>{new Date(item.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span></div><h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{item.title}</h1><p className="mt-2 text-2xl font-extrabold tracking-tight text-white">{item.price}</p><p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-400"><MapPin className="h-4 w-4"/>{item.location}</p></div>
      <section className="marketplace-detail-section mt-5"><h2>Descripción</h2><p>{item.description}</p></section>
      <button type="button" onClick={() => onOpenProfile(item.profileId)} className="marketplace-seller-card marketplace-detail-panel mt-4 flex w-full items-center gap-3 p-4 text-left"><span className="marketplace-seller-avatar overflow-hidden">{item.authorPicture ? <img src={item.authorPicture} alt="" className="h-full w-full object-cover"/> : item.authorName.slice(0, 1).toLocaleUpperCase('es-MX')}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-white">{item.authorName || 'Vendedor local'}</span><span className="mt-1 block text-[10px] text-neutral-400">Ver perfil público</span></span><ChevronRight className="h-4 w-4 text-neutral-500"/></button>
      <section className="marketplace-detail-section mt-5"><h2>Detalles del anuncio</h2><div className="marketplace-detail-facts mt-3">{Object.entries(item.details || {}).filter(([, value]) => value).map(([key, value]) => <><span key={`${key}-label`}>{key}</span><strong key={`${key}-value`}>{value}</strong></>)}<span>Entrega</span><strong>A convenir en persona</strong></div></section>
      <section className="marketplace-safety-note marketplace-detail-panel mt-4 flex items-start gap-3 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#a7c5a9]"/><div><h2 className="text-xs font-semibold text-white">Compra con tranquilidad</h2><p className="mt-1 text-[10px] leading-relaxed text-neutral-400">Conoce el producto en persona y acuerda el pago directamente con quien lo anuncia.</p></div></section>
    </div>
    <div className="marketplace-detail-actions mx-auto flex max-w-xl gap-2 px-4"><button type="button" onClick={() => onOpenProfile(item.profileId)} className="marketplace-detail-contact flex-1"><MessageCircle className="h-4 w-4"/>Ver perfil del vendedor</button><button type="button" aria-label="Llamar al vendedor" className="marketplace-detail-call"><Phone className="h-4 w-4"/></button></div>
  </main>;
}
