import { motion } from 'motion/react';
import { ChevronLeft, MoreHorizontal, Star } from 'lucide-react';
import { Category, Place } from '../types';
import { mockPlaces } from '../data';

export function CategoryPage({ category, onClose, onSelectBusiness }: { category: Category, onClose: () => void, onSelectBusiness: (place: Place) => void }) {
  // Filter places based on the exact category name
  const places = mockPlaces.filter(p => p.category === category.name);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="fixed inset-0 z-[45] bg-[#f8f9fa] overflow-y-auto"
    >
      <div className="sticky top-0 z-10 bg-[#f8f9fa]/80 backdrop-blur-xl border-b border-black/[0.05] px-4 py-3 flex items-center justify-between">
        <button 
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 active:bg-black/10 transition-colors"
        >
          <ChevronLeft className="w-7 h-7 text-neutral-800" strokeWidth={1.5} />
        </button>
        <div className="font-semibold text-lg flex items-center gap-2">
          {category.emoji ? (
            <img src={category.emoji} alt="" className="w-7 h-7 object-contain" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-black/5 flex items-center justify-center">
              <span className="text-black/60 text-sm font-bold">{category.name.charAt(0)}</span>
            </div>
          )}
          {category.name}
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 active:bg-black/10 transition-colors">
          <MoreHorizontal className="w-6 h-6 text-neutral-800" strokeWidth={1.5} />
        </button>
      </div>

      <div className="p-5 pb-32">
        <div className="flex flex-col gap-4">
          {places.map((place) => (
            <motion.button
              key={place.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectBusiness(place)}
              className="bg-white rounded-[24px] text-left flex flex-col active:opacity-80 transition-opacity"
            >
              <div className="w-full p-[5px]">
                <div className="w-full h-[180px] relative rounded-[20px] overflow-hidden">
                  <img src={place.images[0]} alt={place.name} className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
                    {place.rating}
                  </div>
                </div>
              </div>
              <div className="px-4 pb-4 pt-2 flex items-center gap-4">
                <img src={place.logo} alt="Logo" className="w-12 h-12 rounded-full border border-black/5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[17px] text-neutral-900 truncate">{place.name}</h3>
                  <p className="text-[14px] text-neutral-500 font-medium truncate">{place.subtitle || `${place.category} • ${place.location}`}</p>
                </div>
              </div>
            </motion.button>
          ))}
          {places.length === 0 && (
            <div className="text-center text-neutral-400 py-10">
              No hay negocios listados en esta categoría aún.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
