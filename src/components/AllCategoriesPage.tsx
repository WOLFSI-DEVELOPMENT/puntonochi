import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Category } from '../types';
import { categories, mockPlaces } from '../data';

export function AllCategoriesPage({ onClose, onSelectCategory }: { onClose: () => void; onSelectCategory: (cat: Category) => void }) {
  return <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .2 }} className="fixed inset-0 z-40 overflow-y-auto bg-black text-white">
    <header className="sticky top-0 z-10 isolate flex items-center gap-3 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
      <div aria-hidden="true" className="pointer-events-none absolute -inset-x-2 -top-3 z-0 h-[128px] bg-gradient-to-b from-black/85 via-black/50 to-transparent backdrop-blur-[12px] [mask-image:linear-gradient(to_bottom,black_0%,black_46%,transparent_100%)]"/>
      <button type="button" onClick={onClose} aria-label="Volver" className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1b1b1d] text-white transition-colors hover:bg-[#29292c] active:scale-95"><ChevronLeft className="h-6 w-6"/></button>
      <div className="relative z-10 min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.17em] text-white/40">PUNTONOCHI</p><h1 className="truncate text-xl font-bold tracking-tight">Todas las categorías</h1></div>
    </header>
    <section className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-2.5 px-3 pb-[calc(env(safe-area-inset-bottom)+110px)] pt-2 sm:gap-3 sm:px-5">
      {categories.map((category, index) => {
        const count = mockPlaces.filter((place) => place.category === category.name).length;
        return <motion.button key={category.id} type="button" onClick={() => onSelectCategory(category)} whileTap={{ scale: .97 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .015, .2), duration: .2 }} className="group relative flex aspect-[1.18] min-w-0 flex-col justify-between overflow-hidden rounded-[20px] bg-[#171719] p-3.5 text-left ring-1 ring-white/[.04] sm:rounded-[24px] sm:p-4">
          <span aria-hidden="true" className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(ellipse at 75% 15%, ${['#34353a', '#302a28', '#272d31', '#2e2933'][index % 4]} 0%, transparent 62%)` }}/>
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-xl">{category.emoji && (category.emoji.startsWith('http') || category.emoji.startsWith('/')) ? <img src={category.emoji} alt="" loading="lazy" className="h-6 w-6 object-contain"/> : category.emoji || '🏷️'}</span>
          <span className="relative flex min-w-0 items-end justify-between gap-2"><span className="min-w-0"><span className="block truncate text-[14px] font-bold leading-tight sm:text-base">{category.name}</span><span className="mt-1 block text-[11px] text-white/45">{count} {count === 1 ? 'negocio' : 'negocios'}</span></span><ChevronRight aria-hidden="true" className="mb-0.5 h-4 w-4 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5"/></span>
        </motion.button>;
      })}
    </section>
  </motion.main>;
}
