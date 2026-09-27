import { useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, MoreHorizontal, Star } from 'lucide-react';
import { Category, Place } from '../types';
import { mockPlaces } from '../data';
import CornerKit from '@cornerkit/core';
import { SearchBar } from './SearchPage';

const categoryCorners = new CornerKit();

export function CategoryPage({ category, onClose, onSelectBusiness, query, onQueryChange }: { category: Category, onClose: () => void, onSelectBusiness: (place: Place) => void, query: string, onQueryChange: (query: string) => void }) {
  const normalizedQuery = query.trim().toLocaleLowerCase('es');
  const places = mockPlaces.filter((place) => {
    if (place.category !== category.name) return false;
    if (!normalizedQuery) return true;
    return [place.name, place.category, place.subtitle, place.location, place.address].filter(Boolean).join(' ').toLocaleLowerCase('es').includes(normalizedQuery);
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      categoryCorners.applyAll('[data-category-place-card]', { radius: 28, smoothing: 1 });
      categoryCorners.applyAll('[data-category-place-image]', { radius: 23, smoothing: 1 });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [category.id, places.length]);

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
          {category.emoji && (category.emoji.startsWith('http') || category.emoji.startsWith('/')) ? (
            <img src={category.emoji} alt="" className="h-7 w-7 object-contain" />
          ) : (
            <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center text-xl leading-none">{category.emoji || '🏷️'}</span>
          )}
          {category.name}
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 active:bg-black/10 transition-colors">
          <MoreHorizontal className="w-6 h-6 text-neutral-800" strokeWidth={1.5} />
        </button>
      </div>

      <div className="p-5 pb-32">
        <SearchBar value={query} onChange={onQueryChange} className="mb-5" />
        <div className="flex flex-col gap-4">
          {places.map((place) => (
            <motion.button
              key={place.id}
              data-category-place-card
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectBusiness(place)}
              className="flex flex-col rounded-[28px] bg-[#292a2d] p-[5px] text-left text-white active:opacity-80 transition-opacity"
            >
              <div data-category-place-image className="relative h-[180px] w-full overflow-hidden rounded-[23px] bg-[#35363a]">
                  {place.images?.[0] && <img src={place.images[0]} alt={place.name} loading="lazy" className="h-full w-full object-cover" />}
                  <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-xl">
                    <Star className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
                    {place.rating > 0 ? place.rating.toFixed(1) : 'Nuevo'}
                  </div>
              </div>
              <div className="flex items-center gap-3 px-3 pb-3 pt-3">
                {place.logo && <img src={place.logo} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-full bg-[#35363a] object-cover" />}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[17px] font-bold text-white">{place.name}</h3>
                  <p className="truncate text-[14px] font-medium text-white/55">{place.subtitle || `${place.category} • ${place.location}`}</p>
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
