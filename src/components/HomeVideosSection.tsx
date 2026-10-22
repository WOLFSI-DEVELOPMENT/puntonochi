import { ChevronRight } from 'lucide-react';
import { AYUNTAMIENTO_SHORTS } from '../shortsData';

export function HomeVideosSection({ onViewAll, onSelectShort }: { onViewAll: () => void; onSelectShort: (id: string) => void }) {
  return <section aria-label="Videos de Nochistlán" className="mb-10">
    <div className="mb-4 flex items-end justify-between gap-3 px-5">
      <div><h2 className="text-2xl font-bold tracking-tight">PuntoShorts</h2><p className="mt-0.5 text-[15px] font-medium text-neutral-500">Ayuntamiento de Nochistlán</p></div>
      <button type="button" onClick={onViewAll} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-neutral-500">Ver todos <ChevronRight className="h-4 w-4"/></button>
    </div>
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
      {AYUNTAMIENTO_SHORTS.map((short, index) => <button data-home-photo-card key={short.id} type="button" onClick={() => onSelectShort(short.id)} aria-label={`Ver PuntoShort del Ayuntamiento ${index + 1}`} className="group relative h-[248px] w-[148px] shrink-0 snap-start overflow-hidden rounded-[22px] bg-[#202124] text-left text-white">
        <video src={short.url} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
        <span className="absolute left-3 top-3 rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm">Ayuntamiento</span>
        <span className="absolute bottom-3 left-3 text-xs font-semibold">PuntoShort</span>
      </button>)}
    </div>
  </section>;
}
