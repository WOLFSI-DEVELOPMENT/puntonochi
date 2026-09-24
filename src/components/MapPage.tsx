import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { mockPlaces, categories } from '../data';
import { Place } from '../types';
import { Protocol } from 'pmtiles';

interface MapPageProps {
  onSelectBusiness?: (place: Place) => void;
}

import { Plus, Minus, Compass } from 'lucide-react';
import { useState } from 'react';

function generateLensMap(w: number, h: number, r: number, blurAmount: number, intensity: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, w, h);
  
  ctx.filter = `blur(${blurAmount}px)`;
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, r);
  ctx.fill();

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const out = new ImageData(w, h);
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        out.data[i] = 128;
        out.data[i + 1] = 128;
        out.data[i + 2] = 0;
        out.data[i + 3] = 255;
        continue;
      }
      
      const vL = data[((y) * w + x - 1) * 4];
      const vR = data[((y) * w + x + 1) * 4];
      const vT = data[((y - 1) * w + x) * 4];
      const vB = data[((y + 1) * w + x) * 4];
      
      const dx = (vR - vL) / 2;
      const dy = (vB - vT) / 2;
      
      out.data[i] = Math.max(0, Math.min(255, 128 + dx * intensity));
      out.data[i + 1] = Math.max(0, Math.min(255, 128 + dy * intensity));
      out.data[i + 2] = 0;
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas.toDataURL();
}

export function MapPage({ onSelectBusiness }: MapPageProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [lensMapCtrl, setLensMapCtrl] = useState<string | null>(null);

  useEffect(() => {
    setLensMapCtrl(generateLensMap(44, 132, 22, 8, 1.5));
  }, []);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    
    // Register PMTiles protocol for 100% free Overture Maps global 3D buildings
    let protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);

    const nochistlanCenter: [number, number] = [-102.8456, 21.3653];

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
      center: nochistlanCenter,
      zoom: 16.5,
      pitch: 60, // 3D tilt!
      bearing: -20,
    });

    const getCategoryColor = (categoryName: string) => {
      const cat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
      if (cat?.gradient) {
        if (cat.gradient.includes('blue')) return '#3b82f6';
        if (cat.gradient.includes('red')) return '#ef4444';
        if (cat.gradient.includes('orange')) return '#f97316';
        if (cat.gradient.includes('yellow')) return '#eab308';
        if (cat.gradient.includes('green')) return '#22c55e';
        if (cat.gradient.includes('pink')) return '#ec4899';
        if (cat.gradient.includes('teal')) return '#14b8a6';
      }
      return '#3b82f6';
    };

    map.current.on('load', () => {
      // Add 3D terrain for realistic mountains/valleys
      map.current.addSource('terrain', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 14
      });
      map.current.setTerrain({
        source: 'terrain',
        exaggeration: 1.5 // Enhances the 3D effect of the hills around Nochistlan
      });

      
      // Add global 3D-styled roads from Overture Maps
      map.current.addSource('roads', {
        type: 'vector',
        url: 'pmtiles://https://overturemaps-extras-us-west-2.s3.us-west-2.amazonaws.com/tiles/2026-08-19.0/transportation.pmtiles'
      });
      
      // Road Casing (Bottom layer, creates a border/shadow effect)
      map.current.addLayer({
        'id': 'roads-casing',
        'source': 'roads',
        'source-layer': 'segment',
        'type': 'line',
        'minzoom': 12,
        'paint': {
          'line-color': '#111111',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2, 16, 8, 20, 20],
          'line-opacity': 0.7
        }
      });

      // Road Fill (Top layer, creates the raised 3D look)
      map.current.addLayer({
        'id': 'roads-fill',
        'source': 'roads',
        'source-layer': 'segment',
        'type': 'line',
        'minzoom': 12,
        'paint': {
          'line-color': '#444444',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 16, 5, 20, 14],
          'line-opacity': 0.9
        }
      });

      // Add global 3D buildings from Overture Maps (100% free)
      map.current.addSource('buildings', {
        type: 'vector',
        url: 'pmtiles://https://overturemaps-extras-us-west-2.s3.us-west-2.amazonaws.com/tiles/2026-08-19.0/buildings.pmtiles'
      });
      map.current.addLayer({
        'id': '3d-buildings',
        'source': 'buildings',
        'source-layer': 'building',
        'type': 'fill-extrusion',
        'minzoom': 13,
        'paint': {
          'fill-extrusion-color': '#e0e0e0',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 0.8
        }
      });

      
      // 1. Collect unique colors
      const uniqueColors = Array.from(new Set(mockPlaces.map(p => getCategoryColor(p.category))));
      
      // 2. Generate and add SVG images for each color
      uniqueColors.forEach(color => {
        const svg = `<svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 42C20 42 35 27.5685 35 16C35 7.71573 28.2843 1 20 1C11.7157 1 5 7.71573 5 16C5 27.5685 20 42 20 42Z" fill="${color}" stroke="white" stroke-width="2.5"/>
            <circle cx="20" cy="16" r="6" fill="white"/>
        </svg>`;
        const img = new Image();
        img.onload = () => {
          if (map.current && !map.current.hasImage('pin-' + color)) {
            map.current.addImage('pin-' + color, img);
          }
        };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      });

      // 3. Create GeoJSON source
      const placesGeoJSON = {
        type: 'FeatureCollection',
        features: mockPlaces.map((place, index) => {
          const randX = (Math.sin(index * 12.9898) * 43758.5453) % 1;
          const randY = (Math.cos(index * 78.233) * 43758.5453) % 1;
          const lon = place.lng ?? (nochistlanCenter[0] + (randX * 0.01 - 0.005));
          const lat = place.lat ?? (nochistlanCenter[1] + (randY * 0.01 - 0.005));
          
          return {
            type: 'Feature',
            properties: {
              id: place.id,
              color: getCategoryColor(place.category),
              placeStr: JSON.stringify(place)
            },
            geometry: { type: 'Point', coordinates: [lon, lat] }
          };
        })
      };

      map.current.addSource('places', {
        type: 'geojson',
        data: placesGeoJSON
      });

      // 4. Add Symbol Layer for the pins
      map.current.addLayer({
        id: 'places-layer',
        type: 'symbol',
        source: 'places',
        layout: {
          'icon-image': ['concat', 'pin-', ['get', 'color']],
          'icon-size': 0.7,
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
          'icon-pitch-alignment': 'viewport' // Keeps pins standing upright in 3D
        }
      });

      // 5. Interactivity
      map.current.on('click', 'places-layer', (e) => {
        if (e.features && e.features.length > 0 && onSelectBusiness) {
          const place = JSON.parse(e.features[0].properties.placeStr);
          onSelectBusiness(place);
        }
      });

      map.current.on('mouseenter', 'places-layer', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'places-layer', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });

    });

  }, [onSelectBusiness]);

  return (
    <motion.div
      key="map-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-0 bg-[#e5e5e5]"
    >
      <div className="w-full h-full">
        <iframe width="100%" height="100%" frameBorder="0" style={{ border: 0 }} src="https://www.google.com/maps/embed/v1/place?key=AIzaSyB2NIWI3Tv9iDPrlnowr_0ZqZWoAQydKJU&q=Nochistl%C3%A1n%2C%20Zacatecas%2C%20Mexico&maptype=satellite" allowFullScreen></iframe>
      </div>

      {/* SVG Filter for Vertical Pill Controls */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <filter id="liquid-glass-ctrl" x="-20%" y="-20%" width="140%" height="140%">
          {lensMapCtrl && (
            <feImage href={lensMapCtrl} result="lensMap" width="44" height="132" preserveAspectRatio="none" />
          )}
          <feDisplacementMap in="SourceGraphic" in2="lensMap" scale="15" xChannelSelector="R" yChannelSelector="G" result="displaced" />
          <feGaussianBlur in="displaced" stdDeviation="0.5" result="smoothed" />
          <feComposite in="smoothed" in2="SourceGraphic" operator="in" />
        </filter>
      </svg>

      {/* Liquid Glass Pill Controls */}
      <div className="absolute right-4 top-32 z-10">
        <div 
          className="relative w-[44px] h-[132px] rounded-full flex flex-col"
          style={{ boxShadow: '0 12px 24px rgba(0,0,0,0.15)' }}
        >
          {/* Glass Backdrop Layer */}
          <div 
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'rgba(255, 255, 255, 0.45)',
              backdropFilter: 'url(#liquid-glass-ctrl)',
              WebkitBackdropFilter: 'url(#liquid-glass-ctrl)',
              WebkitMaskImage: '-webkit-radial-gradient(white, black)',
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), inset 0 -1px 2px rgba(0,0,0,0.1)'
            }}
          />

          {/* Internal diagonal lighting for 3D glass effect */}
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-white/60 via-transparent to-black/10 pointer-events-none rounded-full" />

          <button 
            onClick={() => map.current?.zoomIn()}
            className="flex-1 flex items-center justify-center text-black hover:bg-black/5 active:bg-black/10 transition-colors z-10"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </button>
          
          <div className="w-full h-[1px] bg-black/5 z-10" />
          
          <button 
            onClick={() => map.current?.zoomOut()}
            className="flex-1 flex items-center justify-center text-black hover:bg-black/5 active:bg-black/10 transition-colors z-10"
          >
            <Minus className="w-5 h-5" strokeWidth={2.5} />
          </button>
          
          <div className="w-full h-[1px] bg-black/5 z-10" />

          <button 
            onClick={() => {
              map.current?.resetNorthPitch();
            }}
            className="flex-1 flex items-center justify-center text-black hover:bg-black/5 active:bg-black/10 transition-colors z-10"
          >
            <Compass className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
