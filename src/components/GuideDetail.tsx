import { Guide, Place } from '../types';
import { Share, Plus } from 'lucide-react';

interface GuideDetailProps {
  guide: Guide;
  onPlaceClick: (place: Place) => void;
}

export function GuideDetail({ guide, onPlaceClick }: GuideDetailProps) {
  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Image */}
      <div className="relative h-72 shrink-0">
        <img 
          src={guide.image} 
          alt={guide.title} 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-2 mb-2 text-white/90">
            {guide.publisherLogo && (
              <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center p-0.5">
                <img src={guide.publisherLogo} alt={guide.publisher} className="w-full h-full object-contain" />
              </div>
            )}
            <span className="text-xs font-bold uppercase tracking-wider">{guide.publisher}</span>
          </div>
          <h1 className="text-3xl font-bold text-white leading-tight drop-shadow-md">
            {guide.title}
          </h1>
        </div>
      </div>

      <div className="p-6 pb-20">
        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button className="flex-1 bg-neutral-900 text-white squircle py-3.5 px-4 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
            <Plus className="w-5 h-5" />
            Añadir a las Guías
          </button>
          <button className="flex-1 bg-neutral-100 text-neutral-900 squircle py-3.5 px-4 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
            <Share className="w-5 h-5" />
            Compartir
          </button>
        </div>

        <p className="text-neutral-600 leading-relaxed mb-4 text-sm">
          {guide.description}
        </p>

        <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium mb-8">
          {guide.publisherLogo && (
            <img src={guide.publisherLogo} alt={guide.publisher} className="w-4 h-4 rounded-full bg-neutral-200 p-0.5" />
          )}
          <span>{guide.publisher}</span>
          <span>•</span>
          <span>{guide.placeCount} lugares</span>
          <span>•</span>
          <span>Actualizado {guide.updatedAt}</span>
        </div>

        {/* Places List */}
        <div className="space-y-4">
          {guide.places.map((place) => (
            <div 
              key={place.id}
              onClick={() => onPlaceClick(place)}
              className="flex gap-4 items-center group cursor-pointer active:bg-neutral-50 squircle p-2 -mx-2 transition-colors"
            >
              <div className="w-24 h-24 squircle overflow-hidden shrink-0">
                <img 
                  src={place.images[0]} 
                  alt={place.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="flex-1 min-w-0 py-1 border-b border-neutral-100 h-full flex flex-col justify-center">
                <h3 className="font-bold text-lg truncate">{place.name}</h3>
                <div className="text-sm text-neutral-500 mt-0.5 truncate">
                  {place.category} • {place.location}
                </div>
                <div className="text-sm text-neutral-400 mt-1 flex items-center gap-2">
                  <span className={place.isOpen ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                    {place.isOpen ? 'Abierto' : 'Cerrado'}
                  </span>
                  <span>•</span>
                  <span>{place.distance}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
