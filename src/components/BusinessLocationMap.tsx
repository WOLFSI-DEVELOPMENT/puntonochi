import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl, { type Map as MapboxMap } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { LocateFixed, Minus, Plus, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { Place } from '../types';

const NOCHISTLAN: [number, number] = [-102.8456, 21.3653];
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN || '';

function BusinessMapCanvas({ place, expanded = false }: { place: Place; expanded?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const point = useMemo(() =>
    Number.isFinite(place.lat) && Number.isFinite(place.lng)
      ? { center: [place.lng as number, place.lat as number] as [number, number], exact: true }
      : { center: NOCHISTLAN, exact: false },
    [place.lat, place.lng],
  );
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !MAPBOX_TOKEN) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/standard',
      center: point.center,
      zoom: point.exact ? 15 : 12,
      pitch: 0,
      bearing: 0,
      dragPan: true,
      touchZoomRotate: true,
      scrollZoom: true,
      doubleClickZoom: true,
      attributionControl: true,
      config: { basemap: { lightPreset: 'day', theme: 'faded' } },
    });
    mapRef.current = map;
    const marker = new mapboxgl.Marker({ color: '#007AFF' }).setLngLat(point.center).addTo(map);
    const onLoad = () => setMapReady(true);
    const onError = () => setMapError(true);
    map.on('load', onLoad);
    map.on('error', onError);
    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [point]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.resize();
    mapRef.current.flyTo({ center: point.center, zoom: point.exact ? 15 : 12, duration: 650 });
  }, [point, expanded]);

  const zoom = (direction: 'in' | 'out') => {
    const map = mapRef.current;
    if (!map) return;
    direction === 'in' ? map.zoomIn({ duration: 250 }) : map.zoomOut({ duration: 250 });
  };

  const recenter = () => mapRef.current?.flyTo({ center: point.center, zoom: point.exact ? 15 : 12, duration: 650 });

  return <div className={`relative overflow-hidden bg-[#e8edf2] ${expanded ? 'h-full min-h-0 w-full' : 'h-[210px] w-full rounded-[24px]'}`}>
    {MAPBOX_TOKEN ? <div ref={containerRef} aria-label={`Mapa de ${place.name}`} role="application" className="absolute inset-0" /> : <div className="absolute inset-0 grid place-items-center bg-[#f2f4f7] px-6 text-center text-sm text-[#5b6470]">El mapa necesita configurar <code className="mx-1 rounded bg-black/5 px-1.5 py-0.5">VITE_MAPBOX_ACCESS_TOKEN</code>.</div>}
    {mapError && <div className="absolute inset-x-3 top-3 z-10 rounded-2xl bg-white/95 px-4 py-3 text-sm text-[#4b5563] shadow-lg backdrop-blur-xl">No se pudo cargar el mapa. Revisa el token público de Mapbox.</div>}
    {expanded && mapReady && <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2">
      <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white/95 shadow-[0_4px_18px_rgba(0,0,0,.16)] backdrop-blur-xl">
        <button type="button" aria-label="Acercar mapa" onClick={() => zoom('in')} className="flex h-11 w-11 items-center justify-center text-[#007AFF] transition-colors hover:bg-[#007AFF]/10 active:bg-[#007AFF]/15"><Plus className="h-5 w-5"/></button>
        <span className="mx-2 block h-px bg-black/10" />
        <button type="button" aria-label="Alejar mapa" onClick={() => zoom('out')} className="flex h-11 w-11 items-center justify-center text-[#007AFF] transition-colors hover:bg-[#007AFF]/10 active:bg-[#007AFF]/15"><Minus className="h-5 w-5"/></button>
      </div>
      <button type="button" aria-label="Centrar mapa en el negocio" onClick={recenter} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/[0.06] bg-white/95 text-[#007AFF] shadow-[0_4px_18px_rgba(0,0,0,.16)] backdrop-blur-xl transition-colors hover:bg-[#f3f8ff] active:bg-[#e6f1ff]"><LocateFixed className="h-[19px] w-[19px]"/></button>
    </div>}
    {!point.exact && <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[2] rounded-xl bg-white/90 px-3 py-2 text-center text-xs text-[#475569] shadow-sm backdrop-blur-md">Ubicación aproximada en Nochistlán; ficha sin coordenadas exactas.</div>}
  </div>;
}

export function BusinessLocationMap({ place }: { place: Place }) {
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

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] bg-black/45 backdrop-blur-md" onClick={onClose}>
    <motion.section data-desktop-sheet="side-left" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 280, mass: 0.9 }} className="absolute inset-x-0 bottom-0 flex h-[min(92dvh,940px)] flex-col overflow-hidden rounded-t-[30px] border border-white/20 bg-[#f6f7f9] shadow-[0_-16px_60px_rgba(0,0,0,.28)]" onClick={(event) => event.stopPropagation()}>
      <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-black/[0.06] bg-white/90 px-4 pb-3 pt-[max(env(safe-area-inset-top),14px)] backdrop-blur-2xl sm:px-6">
        <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#8b929c]">Ubicación del negocio</p><h2 className="truncate text-[17px] font-bold leading-6 text-[#1c1c1e]">{place.name}</h2><p className="truncate text-[13px] leading-5 text-[#636a73]">{place.address || place.location}</p></div>
        <button type="button" onClick={onClose} aria-label="Cerrar mapa" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e9ebef] text-[#3a3a3c] transition-colors hover:bg-[#dfe2e7] active:bg-[#d2d5db]"><X className="h-5 w-5"/></button>
      </header>
      <div className="min-h-0 flex-1"><BusinessMapCanvas place={place} expanded /></div>
      <div className="shrink-0 border-t border-black/[0.06] bg-white/90 px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-3 text-center text-[11px] text-[#868d97] backdrop-blur-xl">Arrastra el mapa para explorar · © Mapbox</div>
    </motion.section>
  </motion.div>;
}
