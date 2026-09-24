import { Place } from '../types';
import { Phone, Navigation, Globe, ShoppingBag, Star, MoreHorizontal, Plus, ThumbsUp } from 'lucide-react';
import { cn } from '../utils';

interface PlaceDetailProps {
  place: Place;
}

export function PlaceDetail({ place }: PlaceDetailProps) {
  return (
    <div className="flex flex-col min-h-full pb-20 relative">
      <div className="px-6 pt-2 pb-6">
        <h1 className="text-3xl font-bold mb-1">{place.name}</h1>
        <p className="text-neutral-500 text-sm font-medium">
          {place.category} • {place.location}
        </p>

        {/* Primary Action Buttons */}
        <div className="flex justify-between items-center gap-2 mt-6">
          <button className="flex-1 bg-blue-500 text-white squircle py-3 flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition-transform">
            <Navigation className="w-5 h-5" fill="currentColor" />
            <span className="text-[11px] font-bold">Planear</span>
          </button>
          <button className="flex-1 bg-blue-50 text-blue-500 squircle py-3 flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition-transform">
            <Phone className="w-5 h-5" fill="currentColor" />
            <span className="text-[11px] font-bold">Llamar</span>
          </button>
          <button className="flex-1 bg-blue-50 text-blue-500 squircle py-3 flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition-transform">
            <Globe className="w-5 h-5" />
            <span className="text-[11px] font-bold">Sitio Web</span>
          </button>
          <button className="flex-1 bg-blue-50 text-blue-500 squircle py-3 flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition-transform">
            <ShoppingBag className="w-5 h-5" fill="currentColor" />
            <span className="text-[11px] font-bold">Pedir</span>
          </button>
        </div>

        {/* Quick Info Bar */}
        <div className="flex justify-between items-start mt-8 py-4 border-y border-neutral-100">
          <div className="text-center">
            <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mb-1">Horario</p>
            <p className="text-sm font-semibold text-green-600">{place.isOpen ? 'Abierto' : 'Cerrado'}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mb-1">Yelp ({place.reviewCount})</p>
            <p className="text-sm font-semibold flex items-center gap-1 justify-center">
              <Star className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
              {place.rating}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mb-1">Precio</p>
            <p className="text-sm font-semibold text-neutral-900">
              {Array.from({ length: 4 }).map((_, i) => (
                <span key={i} className={i < place.cost ? 'text-neutral-900' : 'text-neutral-300'}>$</span>
              ))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mb-1">Distancia</p>
            <p className="text-sm font-semibold">{place.distance}</p>
          </div>
        </div>

        {/* Photos Horizontal Scroll */}
        <div className="mt-8">
          <div className="flex overflow-x-auto gap-3 pb-4 scrollbar-hide -mx-6 px-6 snap-x">
            {place.images.map((img, idx) => (
              <div key={idx} className="relative w-48 h-48 squircle overflow-hidden shrink-0 snap-start bg-neutral-100">
                <img 
                  src={img}
                  alt={`${place.name} photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                  Yelp
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ratings & Reviews */}
        {place.reviews && place.reviews.length > 0 && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Calificaciones y Reseñas</h2>
              <button className="text-blue-500 text-sm font-medium">Abrir Yelp</button>
            </div>
            <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide -mx-6 px-6 snap-x">
              {/* Aggregate Rating Card */}
              <div className="w-64 shrink-0 snap-start bg-neutral-50 squircle p-5 flex flex-col justify-between">
                <div>
                   <h3 className="font-bold text-neutral-900 mb-2">yelp</h3>
                   <div className="flex text-orange-500 gap-1 mb-1">
                     {Array.from({ length: 5 }).map((_, i) => (
                       <Star key={i} className={cn("w-4 h-4", i < Math.floor(place.rating) ? "fill-orange-500" : "text-neutral-300")} />
                     ))}
                   </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{place.rating.toFixed(1)}</span>
                  <span className="text-neutral-400 text-sm">de 5</span>
                </div>
              </div>

              {/* Review Cards */}
              {place.reviews.map(review => (
                <div key={review.id} className="w-72 shrink-0 snap-start bg-neutral-50 squircle p-5">
                  <p className="text-[15px] text-neutral-700 leading-relaxed line-clamp-4 mb-4">
                    "{review.text}"
                  </p>
                  <div className="flex items-center gap-3">
                    <img src={review.avatar} alt={review.author} className="w-8 h-8 rounded-full bg-neutral-200 object-cover" />
                    <div>
                      <div className="flex items-center gap-1 mb-0.5 text-orange-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn("w-3 h-3", i < review.rating ? "fill-orange-500" : "text-neutral-300")} />
                        ))}
                      </div>
                      <div className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                        <span className="text-neutral-900 font-semibold">{review.author}</span>
                        <span>•</span>
                        <span>{review.date}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Good to Know */}
        <div className="mt-8 border-t border-neutral-100 pt-6">
          <h2 className="text-xl font-bold mb-4">Bueno Saber</h2>
          <div className="space-y-3">
            {place.goodToKnow.slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 text-neutral-700">
                <div className="w-5 h-5 flex items-center justify-center">
                  <Star className="w-4 h-4 text-neutral-400" />
                </div>
                <span className="text-[15px]">{item}</span>
              </div>
            ))}
            {place.goodToKnow.length > 5 && (
              <button className="text-[13px] font-bold text-neutral-900 uppercase tracking-wider mt-2 pt-2">
                Más
              </button>
            )}
          </div>
        </div>

        {/* Hours Detailed */}
        <div className="mt-8 border-t border-neutral-100 pt-6 mb-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">Horario</h2>
            <button className="text-blue-500 text-sm font-medium">Editar</button>
          </div>
          <div className="flex justify-between items-center text-[15px]">
            <span className={place.isOpen ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
              {place.isOpen ? 'Abierto' : 'Cerrado'}
            </span>
            <span className="text-neutral-600">{place.hours}</span>
          </div>
          <button className="w-full flex justify-between items-center mt-4 text-neutral-600 text-[15px] border-t border-neutral-100 pt-4">
            <span>Horario Normal</span>
            <div className="flex items-center gap-2 text-neutral-400">
              <span>Todos los días</span>
              <span>›</span>
            </div>
          </button>
        </div>
      </div>

      {/* Floating Action Bar (Sticky to bottom of sheet) */}
      <div className="sticky bottom-4 left-0 right-0 mx-6 flex justify-center pointer-events-none">
        <div className="bg-white/80 backdrop-blur-xl border border-neutral-200/60 shadow-lg rounded-full px-6 py-3 flex items-center gap-8 pointer-events-auto">
          <button className="text-neutral-500 hover:text-neutral-900 transition-colors">
            <Plus className="w-6 h-6" />
          </button>
          <button className="text-neutral-500 hover:text-neutral-900 transition-colors">
            <Star className="w-6 h-6" />
          </button>
          <button className="text-neutral-500 hover:text-neutral-900 transition-colors">
            <ThumbsUp className="w-6 h-6" />
          </button>
          <button className="text-neutral-500 hover:text-neutral-900 transition-colors">
            <MoreHorizontal className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
