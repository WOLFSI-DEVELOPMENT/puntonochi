import { useEffect, useMemo, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import type { Place } from '../types';
import CornerKit from '@cornerkit/core';
import { OPENFREEMAP_STYLE } from '../mapConfig';

const NOCHISTLAN: [number, number] = [-102.8456, 21.3653];
function BusinessMapCanvas({ place, expanded = false }: { place: Place; expanded?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const point = useMemo(() =>
    Number.isFinite(place.lat) && Number.isFinite(place.lng)
      ? { center: [place.lng as number, place.lat as number], exact: true }
      : { center: NOCHISTLAN, exact: false },
    [place.lat, place.lng],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const map = new maplibregl.Map({
      container,
      style: OPENFREEMAP_STYLE,
      center: point.center,
      zoom: point.exact ? 16 : 12.5,
      pitch: 0,
      attributionControl: true,
      dragPan: expanded,
      scrollZoom: expanded,
      doubleClickZoom: expanded,
      touchZoomRotate: true,
      antialias: true,
    });
    mapRef.current = map;

    const markerElement = document.createElement('div');
    markerElement.className = 'business-map-marker';
    markerElement.setAttribute('aria-label', place.name);
    markerElement.innerHTML = '<svg viewBox="0 0 24 24" width="25" height="25" fill="none" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" fill="#0A84FF" stroke="white" stroke-width="2"/><circle cx="12" cy="10" r="2.5" fill="white"/></svg>';
    const marker = new maplibregl.Marker({ element: markerElement, anchor: 'bottom' }).setLngLat(point.center).addTo(map);
    if (expanded) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);
    const resizeTimer = window.setTimeout(() => map.resize(), 180);
    return () => {
      window.clearTimeout(resizeTimer);
      observer.disconnect();
      marker.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [place.id, place.name, point, expanded]);

  return <div data-detail-squircle={expanded ? undefined : 'true'} className={`relative overflow-hidden bg-[#22252a] ${expanded ? 'h-full min-h-[65dvh] w-full' : 'h-[210px] w-full rounded-[24px]'}`}>
    <div ref={containerRef} className="absolute inset-0" />
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
