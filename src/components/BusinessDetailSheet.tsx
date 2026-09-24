import { useState, useEffect } from 'react';
import { motion, PanInfo, AnimatePresence } from 'motion/react';
import { X, Share, Phone, Globe, ShoppingBag, MoreHorizontal, Navigation, BookOpen, Link, MessageCircle, Twitter, Facebook, QrCode } from 'lucide-react';
import { Place } from '../types';
import CornerKit from '@cornerkit/core';

export function BusinessDetailSheet({ place, onClose }: { place: Place, onClose: () => void }) {
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [viewerState, setViewerState] = useState<{ index: number; direction: number } | null>(null);
  const [showWebsiteWarning, setShowWebsiteWarning] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const businessUrl = `${window.location.origin}/place/${encodeURIComponent(place.id)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=176x176&margin=8&data=${encodeURIComponent(businessUrl)}`;


  useEffect(() => {
    const timer = setTimeout(() => {
      const ck = new CornerKit();
      ck.applyAll('.ck-apply', { radius: 23, smoothing: 1 });
    }, 300);
    return () => clearTimeout(timer);
  }, [place]);
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

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100) {
      onClose();
    }
  };

  const handleMapSelectorDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 50) {
      setShowMapSelector(false);
    }
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
        transition={{ type: "spring", damping: 28, stiffness: 250 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        className="fixed inset-x-0 bottom-0 z-[61] h-[92vh] bg-white rounded-t-[32px] overflow-hidden flex flex-col"
      >
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-black/20 rounded-full z-20" />
        
        <div className="flex-1 overflow-y-auto pb-8">
          {/* Hero Section */}
          <div className="relative w-full h-[240px]">
            <img 
              src={place.images[0]} 
              alt={place.name} 
              className="w-full h-full object-cover cursor-pointer" 
              onPointerDownCapture={(e) => e.stopPropagation()}
              onClick={() => openViewer(0)} 
            />
            <div className="absolute top-4 right-4 flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }} className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-colors">
                <Share className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-colors">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
            
            {/* Logo */}
            <div className="absolute -bottom-10 left-5 w-20 h-20 rounded-full border-4 border-white bg-white overflow-hidden shadow-sm">
              <img src={place.logo} alt={place.name} className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="px-5 pt-12 pb-6">
            <h1 className="text-[28px] font-bold text-neutral-900 leading-tight mb-1">{place.name}</h1>
            <p className="text-[15px] font-medium text-neutral-600">
              {place.category} • <span className="text-[#1a73e8] hover:underline cursor-pointer">{place.location}</span>
            </p>

            {/* Action Buttons */}
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide py-5 snap-x">
              <button 
                onClick={() => setShowMapSelector(true)}
                className="ck-apply shrink-0 flex flex-col items-center justify-center gap-1 bg-[#1a73e8] text-white py-2 px-5 min-w-[76px] snap-start hover:bg-[#1557b0] transition-colors"
              >
                <Navigation className="w-[22px] h-[22px]" strokeWidth={2} />
                <span className="text-[11px] font-bold leading-none">Ir</span>
              </button>
              <button 
                onClick={() => setShowPhoneModal(true)}
                disabled={!place.phone}
                className={`ck-apply shrink-0 flex flex-col items-center justify-center gap-1 py-2 px-5 min-w-[76px] snap-start transition-colors ${
                  place.phone ? 'bg-[#f1f3f4] text-[#1a73e8] hover:bg-[#e8eaed]' : 'bg-[#f5f5f5] text-[#b0b0b0]'
                }`}
              >
                <Phone className="w-[22px] h-[22px]" strokeWidth={2} />
                <span className="text-[11px] font-bold leading-none">Llamar</span>
              </button>
              <button 
                onClick={() => {
                  const name = place.name.toLowerCase();
                  if (name.includes('aurrera') || name.includes('guadalajara') || name.includes('banorte') || name.includes('bbva') || name.includes('hotel nochistlán') || name.includes('hotel nochistlan')) {
                    setShowWebsiteWarning(true);
                  }
                }}
                disabled={!(place.name.toLowerCase().includes('aurrera') || place.name.toLowerCase().includes('guadalajara') || place.name.toLowerCase().includes('banorte') || place.name.toLowerCase().includes('bbva') || place.name.toLowerCase().includes('hotel nochistlán') || place.name.toLowerCase().includes('hotel nochistlan'))}
                className={`ck-apply shrink-0 flex flex-col items-center justify-center gap-1 bg-[#f1f3f4] py-2 px-5 min-w-[76px] snap-start transition-colors ${
                  (place.name.toLowerCase().includes('aurrera') || place.name.toLowerCase().includes('guadalajara') || place.name.toLowerCase().includes('banorte') || place.name.toLowerCase().includes('bbva') || place.name.toLowerCase().includes('hotel nochistlán') || place.name.toLowerCase().includes('hotel nochistlan'))
                    ? 'text-[#1a73e8] hover:bg-[#e8eaed] active:opacity-70' 
                    : 'text-neutral-400 opacity-60 cursor-not-allowed'
                }`}
              >
                <Globe className="w-[22px] h-[22px]" strokeWidth={2} />
                <span className="text-[11px] font-bold leading-none">Sitio</span>
              </button>

              <button className="ck-apply shrink-0 flex flex-col items-center justify-center gap-1 bg-[#f1f3f4] text-[#1a73e8] py-2 px-5 min-w-[76px] snap-start hover:bg-[#e8eaed] transition-colors">
                <MoreHorizontal className="w-[22px] h-[22px]" strokeWidth={2} />
                <span className="text-[11px] font-bold leading-none">Más</span>
              </button>
            </div>

            {/* Stats Row */}
            <div className="flex border-t border-b border-black/5 py-3 mb-6">
              <div className="flex-1 flex flex-col items-center border-r border-black/5">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5">Horario</span>
                <span className="text-[13px] font-bold text-[#34a853]">{place.isOpen ? 'Abierto' : 'Cerrado'}</span>
              </div>
              <div className="flex-1 flex flex-col items-center border-r border-black/5">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5">Rating</span>
                <div className="flex items-center gap-1 text-[#1a73e8]">
                  <span className="text-[13px] font-bold">{place.rating}</span>
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center border-r border-black/5">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5">Costo</span>
                <span className="text-[13px] font-bold text-neutral-700">{'$'.repeat(place.cost)}<span className="text-neutral-300">{'$'.repeat(4 - place.cost)}</span></span>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5">Dist.</span>
                <span className="text-[13px] font-bold text-neutral-700">{place.distance}</span>
              </div>
            </div>

            {/* Info list */}
            <div className="space-y-4 mb-6">
              <div className="flex flex-col">
                <span className="text-[13px] text-neutral-500 font-semibold mb-1">Dirección</span>
                <span className="text-[15px] text-neutral-900 font-medium leading-snug">{place.address}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] text-neutral-500 font-semibold mb-1">Horario regular</span>
                <span className="text-[15px] text-neutral-900 font-medium">{place.hours}</span>
              </div>
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
            
            {/* Photos */}
            <h3 className="text-[18px] font-bold text-neutral-900 mb-3">Fotos</h3>
            <div className="flex overflow-x-auto gap-3 pb-4 scrollbar-hide snap-x">
              {(place.images.length > 1 ? place.images.slice(1) : place.images).map((img, idx) => (
                <div 
                  key={idx} 
                  className="ck-apply w-[180px] h-[240px] overflow-hidden shrink-0 snap-start shadow-sm border border-black/5 cursor-pointer active:opacity-80 transition-opacity"
                  onPointerDownCapture={(e) => e.stopPropagation()}
                  onClick={() => openViewer(place.images.length > 1 ? idx + 1 : 0)}
                >
                  <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover pointer-events-none" />
                </div>
              ))}
            </div>
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
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={handleMapSelectorDragEnd}
              className="fixed inset-x-0 bottom-0 z-[73] bg-white rounded-t-[24px] overflow-hidden flex flex-col p-5 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
            >
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-neutral-200 rounded-full" />
              
              <div className="flex justify-between items-center mt-3 mb-6">
                <h3 className="font-bold text-lg text-neutral-900">Abrir en...</h3>
                <button 
                  onClick={() => setShowMapSelector(false)}
                  className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200"
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => openMap('apple')}
                  className="flex flex-col items-center justify-center gap-3 bg-[#f8f9fa] rounded-2xl p-5 active:opacity-70 transition-opacity"
                >
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/2/21/Apple_Maps_iOS_26_icon.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original" 
                    alt="Apple Maps" 
                    className="w-14 h-14 object-contain"
                  />
                  <span className="font-semibold text-[15px] text-neutral-900">Apple Maps</span>
                </button>

                <button 
                  onClick={() => openMap('google')}
                  className="flex flex-col items-center justify-center gap-3 bg-[#f8f9fa] rounded-2xl p-5 active:opacity-70 transition-opacity"
                >
                  <img 
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS3hFKrhuTeClXXQfAvizjlCEdqqFEEyk1ThzLrhjWzIA&s=10" 
                    alt="Google Maps" 
                    className="w-14 h-14 object-contain"
                  />
                  <span className="font-semibold text-[15px] text-neutral-900">Google Maps</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
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
                    let url = `https://www.google.com/search?q=${encodeURIComponent(place.name)}`;
                    if (place.name.toLowerCase().includes('aurrera')) {
                      url = 'https://www.bodegaaurrera.com.mx/';
                    } else if (place.name.toLowerCase().includes('guadalajara')) {
                      url = 'https://www.farmaciasguadalajara.com/';
                    } else if (place.name.toLowerCase().includes('banorte')) {
                      url = 'https://www.banorte.com/';
                    } else if (place.name.toLowerCase().includes('bbva')) {
                      url = 'https://www.bbva.mx/';
                    } else if (place.name.toLowerCase().includes('hotel nochistlán') || place.name.toLowerCase().includes('hotel nochistlan')) {
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
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                if (info.offset.y > 50) setShowPhoneModal(false);
              }}
              className="fixed inset-x-0 bottom-0 z-[73] bg-white rounded-t-[24px] overflow-hidden flex flex-col p-5 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
            >
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-neutral-200 rounded-full" />
              
              <div className="mt-6 mb-2 flex flex-col gap-3">
                <a 
                  href={`tel:${place.phone}`}
                  className="w-full bg-[#f1f3f4] text-neutral-900 font-bold text-[16px] py-4 rounded-full flex items-center justify-center active:bg-[#e8eaed] transition-colors"
                >
                  <Phone className="w-5 h-5 mr-2" strokeWidth={2} />
                  {place.phone}
                </a>
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
              transition={{ type: "spring", damping: 28, stiffness: 250 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100) setShowMenuModal(false);
              }}
              className="fixed inset-x-0 bottom-0 z-[73] h-[85vh] bg-white rounded-t-[32px] overflow-hidden flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
            >
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-black/20 rounded-full z-20" />
              
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
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-[81] bg-white rounded-t-3xl p-6 shadow-2xl flex flex-col pb-safe"
              drag="y"
              dragConstraints={{ top: 0 }}
              onDragEnd={(e, info) => {
                if (info.offset.y > 50) setShowShareModal(false);
              }}
            >
              <div className="w-12 h-1.5 bg-neutral-200 rounded-full mx-auto mb-6" />
              <h3 className="font-bold text-xl text-neutral-900 mb-4 px-2 text-center">Compartir</h3>

              <div className="mb-6 flex flex-col items-center rounded-2xl bg-neutral-50 p-4">
                <img src={qrCodeUrl} alt={`Código QR para abrir ${place.name}`} className="h-36 w-36 rounded-lg bg-white p-2" />
                <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                  <QrCode className="h-4 w-4" /> Escanea para abrir {place.name}
                </div>
              </div>
              
              <div className="flex justify-around mb-8 px-2">
                <button onClick={() => { navigator.clipboard.writeText(businessUrl); setShowShareModal(false); alert('Enlace copiado!'); }} className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700 group-hover:bg-neutral-200 transition-colors">
                    <Link className="w-6 h-6" />
                  </div>
                  <span className="text-[12px] font-medium text-neutral-600">Copiar</span>
                </button>
                <button className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366] group-hover:bg-[#25D366]/20 transition-colors">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <span className="text-[12px] font-medium text-neutral-600">WhatsApp</span>
                </button>
                <button className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2] group-hover:bg-[#1877F2]/20 transition-colors">
                    <Facebook className="w-6 h-6" />
                  </div>
                  <span className="text-[12px] font-medium text-neutral-600">Facebook</span>
                </button>
                <button className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-[#1DA1F2]/10 flex items-center justify-center text-[#1DA1F2] group-hover:bg-[#1DA1F2]/20 transition-colors">
                    <Twitter className="w-6 h-6" />
                  </div>
                  <span className="text-[12px] font-medium text-neutral-600">Twitter</span>
                </button>
              </div>

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
