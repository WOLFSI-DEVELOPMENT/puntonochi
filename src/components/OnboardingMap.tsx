import { useRef, useEffect } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin } from 'lucide-react';

interface OnboardingMapProps {
  center?: [number, number];
}

export function OnboardingMap({ center = [-102.8456, 21.3653] }: OnboardingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
      center: center,
      zoom: 15,
      pitch: 0,
      bearing: 0,
      attributionControl: false
    });

    const resizeObserver = new ResizeObserver(() => {
      if (map.current) map.current.resize();
    });
    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      resizeObserver.disconnect();
    };
  }, []);

  // Update center when prop changes
  useEffect(() => {
    if (map.current) {
      map.current.flyTo({ center, zoom: 16, essential: true });
    }
  }, [center]);

  return (
    <div className="w-full h-48 bg-neutral-200 rounded-xl overflow-hidden relative mb-4 shadow-inner">
      <div ref={mapContainer} className="absolute inset-0" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <MapPin className="w-10 h-10 text-blue-600 drop-shadow-lg mb-10" />
      </div>
    </div>
  );
}
