import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { allColonias } from '../data';
import { Colonia } from '../types';

interface ColoniasPageProps {
  onClose: () => void;
  onSelectColonia: (colonia: Colonia) => void;
}

export function ColoniasPage({ onClose, onSelectColonia }: ColoniasPageProps) {
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-[#f8f9fa] overflow-y-auto scrollbar-hide"
    >
      <div className="sticky top-0 z-10 px-4 pt-4 pb-2 flex items-center pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-[#f8f9fa] from-40% to-transparent -z-10" />
        <button 
          onClick={onClose} 
          className="text-blue-500 flex items-center font-medium active:opacity-70 transition-opacity pointer-events-auto"
        >
          <ChevronLeft className="w-5 h-5 -ml-1" />
          <span>Atrás</span>
        </button>
        <h1 className="flex-1 text-center font-bold text-[17px] mr-12 text-neutral-900">Colonias</h1>
      </div>

      <div className="px-4 space-y-4 pb-32">
        {allColonias.map((colonia) => (
          <div 
            key={colonia.id} 
            onClick={() => onSelectColonia(colonia)}
            className="relative h-[240px] w-full squircle-32 overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.08)] group cursor-pointer active:scale-[0.98] transition-transform"
          >
            <img 
              src={colonia.image} 
              alt={colonia.name} 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            
            {/* Soft dark gradient fade */}
            <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
            
            <div className="absolute inset-x-0 bottom-0 p-5 flex items-end justify-between text-white z-10 pointer-events-auto">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="font-bold text-[24px] leading-tight tracking-tight mb-1 truncate">{colonia.name}</h3>
                <p className="text-white/80 text-[14px] font-medium truncate">
                  {colonia.type} • {colonia.cp}
                </p>
              </div>
              
              <button className="shrink-0 bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-1.5 rounded-full text-[13px] font-semibold text-white transition-colors active:scale-95">
                Ver más
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
