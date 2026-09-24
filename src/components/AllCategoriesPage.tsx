import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { Category } from '../types';
import { categories, mockPlaces } from '../data';

export function AllCategoriesPage({ onClose, onSelectCategory }: { onClose: () => void, onSelectCategory: (cat: Category) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="fixed inset-0 z-40 bg-[#f8f9fa] overflow-y-auto"
    >
      <div className="sticky top-0 z-10 bg-[#f8f9fa]/80 backdrop-blur-xl border-b border-black/[0.05] px-4 py-3 flex items-center">
        <button 
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 active:bg-black/10 transition-colors mr-2"
        >
          <ChevronLeft className="w-7 h-7 text-neutral-800" strokeWidth={1.5} />
        </button>
        <h1 className="font-bold text-[20px] text-neutral-900 leading-none">Todas las Categorías</h1>
      </div>

      <div className="p-5 pb-32">
        <div className="grid grid-cols-2 gap-4">
          {categories.map((cat) => {
            const itemCount = mockPlaces.filter(p => p.category === cat.name).length;
            return (
              <div 
                key={cat.id} 
                onClick={() => onSelectCategory(cat)}
                className={`squircle-24 w-full h-[160px] ${cat.gradient} p-4 flex flex-col justify-between shadow-[0_4px_12px_rgba(0,0,0,0.05)] text-white relative overflow-hidden cursor-pointer hover:opacity-90 active:scale-95 transition-all`}
              >
                <div className="h-[72px] w-full flex items-center justify-center mt-1 drop-shadow-[0_8px_6px_rgba(0,0,0,0.2)]">
                  {cat.emoji ? (
                    <img src={cat.emoji} alt={cat.name} className="h-full object-contain scale-110" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-white/60 text-2xl font-bold">{cat.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold tracking-[-0.4px] mb-[2px] leading-tight">{cat.name}</h3>
                  <p className="text-[13px] font-medium opacity-80 leading-none">{itemCount} {itemCount === 1 ? 'lugar' : 'lugares'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
