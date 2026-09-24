import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, MapPin, Plus } from 'lucide-react';
import { motion, useScroll, useMotionValueEvent } from 'motion/react';
import { mockPlaces } from '../data';
import { Place } from '../types';
import { CreatePostFlow } from './CreatePostFlow';
import { BusinessPromotionSheet } from './BusinessPromotionSheet';
import { AnimatePresence } from 'motion/react';

// Categories for discover feed
const discoverFilters = [
  "Todos",
  "Restaurantes",
  "Cafeterías",
  "Hoteles",
  "Farmacias",
  "Supermercados"
];

const heights = ['h-[220px]', 'h-[160px]', 'h-[260px]', 'h-[200px]', 'h-[180px]', 'h-[240px]'];
const FEED_COLUMNS = 2;
const ITEMS_PER_PROMOTION = 5 * FEED_COLUMNS;

function FeedAd() {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current || !adRef.current) return;
    pushed.current = true;
    try {
      const adsWindow = window as Window & { adsbygoogle?: unknown[] };
      adsWindow.adsbygoogle = adsWindow.adsbygoogle || [];
      adsWindow.adsbygoogle.push({});
    } catch (error) {
      console.error('AdSense feed unit could not be initialized.', error);
    }
  }, []);

  return (
    <div className="my-3 w-full px-1" aria-label="Publicidad">
      <ins
        ref={adRef}
        className="adsbygoogle block w-full"
        style={{ display: 'block' }}
        data-ad-format="fluid"
        data-ad-layout-key="-6t+ed+2i-1n-4w"
        data-ad-client="ca-pub-7029279570287128"
        data-ad-slot="7895105729"
      />
    </div>
  );
}

export function DiscoverPage({ onSelectBusiness }: { onSelectBusiness: (place: Place) => void }) {
  const [activeFilter, setActiveFilter] = useState(discoverFilters[0]);
  const { scrollY } = useScroll();
  const [showHeader, setShowHeader] = useState(true);
  const [showBusinessPromotion, setShowBusinessPromotion] = useState(false);
  const [showCreateFlow, setShowCreateFlow] = useState(false);
  const [feedVersion, setFeedVersion] = useState(0);

  useEffect(() => {
    const refreshPublishedPost = (event: Event) => {
      const detail = (event as CustomEvent<{ placeId?: string; imageUrl?: string }>).detail;
      if (detail?.placeId && detail.imageUrl) {
        const place = mockPlaces.find((candidate) => candidate.id === detail.placeId);
        if (place && !place.images.includes(detail.imageUrl)) place.images = [...place.images, detail.imageUrl];
      }
      setFeedVersion((version) => version + 1);
    };
    window.addEventListener('community-post-published', refreshPublishedPost);
    return () => window.removeEventListener('community-post-published', refreshPublishedPost);
  }, []);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() || 0;
    if (latest > previous && latest > 60) {
      setShowHeader(false); // scrolling down
    } else if (latest < previous - 5 || latest < 60) {
      setShowHeader(true); // scrolling up
    }
  });

  const discoverItems = useMemo(() => {
    let places = mockPlaces;
    if (activeFilter !== "Todos") {
      places = mockPlaces.filter(p => p.category.toLowerCase().includes(activeFilter.toLowerCase()) || activeFilter.toLowerCase().includes(p.category.toLowerCase()));
    }
    
    // Extract all images from the filtered places
    return places.flatMap(place => 
      place.images.map((img, idx) => ({
        id: `${place.id}-${idx}`,
        image: img,
        height: heights[(place.id.charCodeAt(0) + idx) % heights.length],
        place: place
      }))
    );
  }, [activeFilter, feedVersion]);

  const feedSections = useMemo(() => {
    const sections = [];
    for (let index = 0; index < discoverItems.length; index += ITEMS_PER_PROMOTION) {
      sections.push(discoverItems.slice(index, index + ITEMS_PER_PROMOTION));
    }
    return sections;
  }, [discoverItems]);

  const openPromotion = () => setShowBusinessPromotion(true);

  const renderPromotion = (key: string) => (
    <div key={key} className="px-1 my-1 w-full">
      <div onClick={openPromotion} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openPromotion(); }} className="w-full aspect-[16/9] relative rounded-sm overflow-hidden flex flex-col justify-end p-5 bg-neutral-900 shadow-sm cursor-pointer">
        <img
          src="https://res.cloudinary.com/dwthgcx5j/image/upload/v1787947703/Mist_and_light_leakage_background_202608281406_x9nknp.jpg"
          alt="Promotional background"
          className="absolute inset-0 w-full h-full object-cover opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col items-start text-white">
          <h3 className="text-xl font-bold mb-1.5 leading-tight">Promociona tu negocio aquí</h3>
          <p className="text-[13px] font-medium text-white/90 mb-3 max-w-[280px]">Llega a los locales que exploran los mejores lugares de la ciudad.</p>
          <button onClick={(event) => { event.stopPropagation(); openPromotion(); }} style={{ backgroundColor: '#ffffff', color: '#171717' }} className="!bg-white !text-neutral-900 px-5 py-2 rounded-full text-[13px] font-bold active:scale-95 transition-transform">
            Promociona tu negocio
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-white pb-36 scroll-smooth"
    >
      <motion.div 
        initial={{ y: 0, opacity: 1 }}
        animate={{ y: showHeader ? 0 : -120, opacity: showHeader ? 1 : 0 }}
        transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
        className="pt-4 px-4 pb-4 sticky top-0 bg-gradient-to-b from-[#121212] via-[#121212]/95 to-transparent z-20 w-full overflow-hidden"
      >
        {/* Filters share a row with Crear. On narrow screens only the tags scroll. */}
        <div className="flex w-full min-w-0 items-center gap-2">
          <div className="flex w-0 min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {discoverFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${
                  activeFilter === filter 
                    ? 'bg-black/40 backdrop-blur-md text-white border border-white/10 shadow-sm' 
                    : 'bg-transparent text-neutral-400 hover:text-white'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowCreateFlow(true)} aria-label="Crear" style={{ backgroundColor: '#ffffff', color: '#111111', position: 'relative', zIndex: 30, pointerEvents: 'auto' }} className="!relative !z-30 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full !bg-white px-3 py-2 text-sm font-semibold !text-black shadow-sm">
            <Plus aria-hidden="true" className="h-5 w-5 shrink-0 text-black" strokeWidth={2.5} />
            <span>Crear</span>
          </button>
        </div>
      </motion.div>

      <div className="mt-2 mb-8 px-1">
        {feedSections.map((section, sectionIndex) => (
          <div key={`feed-section-${sectionIndex}`}>
            <div className="columns-2 md:columns-3 gap-1 space-y-1">
              {section.map((item) => (
                <a
                  key={item.id}
                  href={`/place/${encodeURIComponent(item.place.id)}`}
                  aria-label={`${item.place.name}, ${item.place.category} en Nochistlán`}
                  className={`block w-full relative break-inside-avoid ${item.height} cursor-pointer active:opacity-80 transition-opacity`}
                  onClick={(event) => { event.preventDefault(); onSelectBusiness(item.place); }}
                >
                  <img src={item.image} alt={`${item.place.name}, ${item.place.category} en Nochistlán`} className="absolute inset-0 w-full h-full object-cover rounded-sm pointer-events-none" />
                </a>
              ))}
            </div>
            {sectionIndex < feedSections.length - 1 && <>
              {renderPromotion(`promotion-${sectionIndex}`)}
              <FeedAd />
            </>}
          </div>
        ))}
      </div>
    
      
      <AnimatePresence>{showBusinessPromotion && <BusinessPromotionSheet onClose={() => setShowBusinessPromotion(false)} />}</AnimatePresence>
      <AnimatePresence>{showCreateFlow && <CreatePostFlow onClose={() => setShowCreateFlow(false)} />}</AnimatePresence>
</motion.div>
  );
}
