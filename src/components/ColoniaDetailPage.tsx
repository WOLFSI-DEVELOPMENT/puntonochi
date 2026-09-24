import { motion } from 'motion/react';
import { ChevronLeft, MoreHorizontal, Star } from 'lucide-react';
import { Colonia, Place } from '../types';
import { mockPlaces } from '../data';
import React from 'react';

export function ColoniaDetailPage({ colonia, onClose, onSelectBusiness }: { colonia: Colonia, onClose: () => void, onSelectBusiness: (place: Place) => void }) {
  // Filter places based on the exact category name
  const places = React.useMemo(() => {
    return mockPlaces.filter(p => p.location.toLowerCase().includes(colonia.name.toLowerCase()));
  }, [colonia.name]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="fixed inset-0 z-[55] bg-[#f8f9fa] overflow-y-auto"
    >
      <div className="sticky top-0 z-10 bg-[#f8f9fa]/80 backdrop-blur-xl border-b border-black/[0.05] px-4 py-3 flex items-center justify-between">
        <button 
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 active:bg-black/10 transition-colors -ml-2"
        >
          <ChevronLeft className="w-7 h-7 text-neutral-800" strokeWidth={1.5} />
        </button>
        <div className="font-bold text-lg text-neutral-900 line-clamp-1 flex-1 text-center px-2">
          {colonia.name}
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 active:bg-black/10 transition-colors -mr-2">
          <MoreHorizontal className="w-6 h-6 text-neutral-800" strokeWidth={1.5} />
        </button>
      </div>

      <div className="relative h-48 w-full mb-6">
        <img src={colonia.image} alt={colonia.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-white text-3xl font-bold">{colonia.name}</h1>
          <p className="text-white/80 font-medium text-sm mt-1">{places.length} lugares encontrados</p>
        </div>
      </div>

      <div className="px-4 pb-32">
        <div className="grid grid-cols-2 gap-4">
          {places.length > 0 ? places.map((place, i) => (
            <motion.div 
              key={place.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: [0.23, 1, 0.32, 1] }}
              onClick={() => onSelectBusiness(place)}
              className="bg-white rounded-3xl flex flex-col cursor-pointer active:scale-95 transition-transform p-[5px]"
            >
              <div className="aspect-square relative bg-neutral-100 rounded-2xl overflow-hidden">
                {place.images && place.images[0] ? (
                  <img src={place.images[0]} alt={place.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-neutral-300">No image</div>
                )}
                {place.rating && (
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 fill-[#FFB253] text-[#FFB253]" />
                    <span className="text-xs font-bold text-neutral-700">{place.rating}</span>
                  </div>
                )}
              </div>
              <div className="px-3 pb-3 pt-2 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-[#1a73e8] uppercase tracking-wider mb-1">{place.category}</p>
                  <h3 className="font-bold text-[15px] leading-tight text-neutral-900 line-clamp-2 mb-1">{place.name}</h3>
                </div>
                <p className="text-[12px] text-neutral-500 font-medium line-clamp-1">{place.subtitle || place.location}</p>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-2 py-10 text-center text-neutral-400 font-medium">
              No hay lugares registrados en esta colonia aún.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
