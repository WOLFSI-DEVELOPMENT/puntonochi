import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { Place } from '../types';
import CornerKit from '@cornerkit/core';

const NOCHISTLAN: [number, number] = [-102.8456, 21.3653];
function BusinessMapCanvas({ place, expanded = false }: { place: Place; expanded?: boolean }) {
  const point = useMemo(() =>
    Number.isFinite(place.lat) && Number.isFinite(place.lng)
      ? { center: [place.lng as number, place.lat as number], exact: true }
      : { center: NOCHISTLAN, exact: false },
    [place.lat, place.lng],
  );
  const [center, setCenter] = useState<[number, number]>(point.center);
  const [zoom, setZoom] = useState(point.exact ? 16 : 12);
  useEffect(() => { setCenter(point.center); setZoom(point.exact ? 16 : 12); }, [point]);
  const fallbackTiles = useMemo(() => {
    const n = 2 ** zoom;
    const lat = Math.max(-85.05112878, Math.min(85.05112878, center[1]));
    const x = (center[0] + 180) / 360 * n;
    const rad = lat * Math.PI / 180;
    const y = (1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2 * n;
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    return {
      left: 256 + (x - tileX) * 256,
      top: 256 + (y - tileY) * 256,
      tiles: Array.from({ length: 9 }, (_, index) => {
        const dx = index % 3 - 1;
        const dy = Math.floor(index / 3) - 1;
        const tx = ((tileX + dx) % n + n) % n;
        const ty = tileY + dy;
        return { x: tx, y: ty, left: (dx + 1) * 256, top: (dy + 1) * 256 };
      }).filter((tile) => tile.y >= 0 && tile.y < n),
    };
  }, [center, zoom]);

  return <div data-detail-squircle={expanded ? undefined : 'true'} className={`relative overflow-hidden bg-[#22252a] ${expanded ? 'h-full min-h-[65dvh] w-full' : 'h-[210px] w-full rounded-[24px]'}`}>
    <div aria-label={`Mapa de ${place.name}`} role="img" className="absolute inset-0 overflow-hidden bg-[#e8e4dc]">
      <div className="absolute h-[768px] w-[768px]" style={{ left: `calc(50% - ${fallbackTiles.left}px)`, top: `calc(50% - ${fallbackTiles.top}px)` }}>
        {fallbackTiles.tiles.map((tile) => <img key={`${zoom}-${tile.x}-${tile.y}`} src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`} alt="" loading="eager" draggable={false} className="absolute h-64 w-64 max-w-none select-none" style={{ left: tile.left, top: tile.top }} />)}
      </div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[4] -translate-x-1/2 -translate-y-full"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" fill="#0A84FF" stroke="white" strokeWidth="2"/><circle cx="12" cy="10" r="2.5" fill="white"/></svg></div>
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="absolute bottom-1 right-1 z-[5] rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-slate-700">© OpenStreetMap contributors</a>
    </div>
    {expanded && <div className="absolute right-3 top-16 z-10 flex flex-col overflow-hidden rounded-xl bg-white shadow-lg"><button type="button" aria-label="Acercar mapa" disabled={zoom >= 19} onClick={() => setZoom((value) => Math.min(19, value + 1))} className="flex h-10 w-10 items-center justify-center text-slate-800 disabled:opacity-40"><Plus className="h-5 w-5"/></button><span className="h-px bg-slate-200"/><button type="button" aria-label="Alejar mapa" disabled={zoom <= 3} onClick={() => setZoom((value) => Math.max(3, value - 1))} className="flex h-10 w-10 items-center justify-center text-slate-800 disabled:opacity-40"><Minus className="h-5 w-5"/></button></div>}
    {!point.exact && <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-black/55 px-3 py-2 text-center text-xs text-white/80 backdrop-blur-md">Ubicación aproximada en Nochistlán; ficha sin coordenadas exactas.</div>}
  </div>;
}

export function BusinessLocationMap({ place }: { place: Place }) {
  useEffect(() => {
    const timer = window.setTimeout(() => new CornerKit().applyAll('[data-detail-squircle]', { radius: 24, smoothing: 1 }), 50);
    return () => window.clearTimeout(timer);
  }, [place.id]);
  return <section className="mb-6" aria-labelledby="business-map-title">
    <h3 id="business-map-title" className="mb-3 text-[18px] font-bold text-white">Mapa</h3>
    <BusinessMapCanvas place={place} />
  </section>;
}

export function BusinessMapOverlay({ place, onClose }: { place: Place; onClose: () => void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeOnEscape); };
  }, [onClose]);

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-3 backdrop-blur-2xl sm:p-6" onClick={onClose}>
    <motion.section initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ type: 'spring', damping: 28, stiffness: 260 }} className="relative flex h-[min(88dvh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-white/15 bg-[#202124]/85 shadow-2xl backdrop-blur-2xl" onClick={(event) => event.stopPropagation()}>
      <header className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 bg-gradient-to-b from-black/70 to-transparent p-4 sm:p-5">
        <div className="min-w-0 rounded-2xl bg-black/35 px-3 py-2 backdrop-blur-xl"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">Ubicación del negocio</p><h2 className="mt-0.5 truncate text-base font-bold text-white sm:text-lg">{place.name}</h2><p className="truncate text-xs text-white/70">{place.address || place.location}</p></div>
        <button type="button" onClick={onClose} aria-label="Cerrar mapa" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-xl transition-colors hover:bg-black/65"><X className="h-5 w-5"/></button>
      </header>
      <div className="flex-1"><BusinessMapCanvas place={place} expanded /></div>
    </motion.section>
  </motion.div>;
}
