import { useMemo } from 'react';
import { ArrowLeft, MapPin, Search, Star } from 'lucide-react';
import { mockPlaces } from '../data';
import { Place } from '../types';

type SearchPageProps = {
  query: string;
  onQueryChange: (query: string) => void;
  onClose: () => void;
  onSelectBusiness: (place: Place) => void;
};

export function SearchPage({ query, onQueryChange, onClose, onSelectBusiness }: SearchPageProps) {
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es');
    if (!normalized) return [];

    const words = normalized.split(/\s+/);
    return mockPlaces.filter((place) => {
      const searchable = [place.name, place.category, place.subtitle, place.location, place.address]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('es');
      return words.every((word) => searchable.includes(word));
    });
  }, [query]);

  return (
    <main className="fixed inset-0 z-[45] overflow-y-auto bg-[#171717] pb-32 text-white">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-[#171717]/95 px-4 pb-4 pt-5 backdrop-blur-xl">
        <button onClick={onClose} aria-label="Volver" className="flex h-11 w-10 shrink-0 items-center justify-center text-white/80">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl bg-[#292929] px-4">
          <Search className="h-5 w-5 shrink-0 text-white/50" />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar lugares y negocios"
            aria-label="Buscar lugares y negocios"
            className="search-input-fix min-w-0 flex-1 bg-transparent text-[16px] text-white outline-none placeholder:text-white/40"
          />
        </div>
      </header>

      <section className="px-5 pt-2">
        <h1 className="mb-5 text-[25px] font-bold tracking-tight">
          {query.trim() ? `Resultados (${results.length})` : 'Busca un lugar'}
        </h1>

        {!query.trim() && (
          <p className="text-[15px] text-white/55">Busca por nombre, categoría o zona.</p>
        )}

        {query.trim() && results.length === 0 && (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <Search className="mb-4 h-8 w-8 text-white/35" />
            <p className="text-base font-semibold">No encontramos lugares</p>
            <p className="mt-1 text-sm text-white/50">Prueba con otro nombre, categoría o zona.</p>
          </div>
        )}

        <div className="space-y-4">
          {results.map((place) => (
            <button
              type="button"
              key={place.id}
              onClick={() => onSelectBusiness(place)}
              className="block w-full rounded-[26px] bg-[#242424] p-3 text-left transition-colors hover:bg-[#2b2b2b] active:scale-[0.99]"
            >
              <div className="relative aspect-[1.75/1] overflow-hidden rounded-[19px] bg-[#333]">
                {place.images?.[0] ? (
                  <img src={place.images[0]} alt={place.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center text-white/35"><MapPin className="h-9 w-9" /></div>
                )}
              </div>
              <div className="px-1 pb-1 pt-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-[18px] font-bold leading-tight">{place.name}</h2>
                    <p className="mt-1 text-[13px] font-medium text-white/55">{place.category}{place.subtitle ? ` · ${place.subtitle}` : ''}</p>
                  </div>
                  {place.rating > 0 && (
                    <span className="flex shrink-0 items-center gap-1 pt-0.5 text-[13px] font-semibold text-white/85">
                      <Star className="h-3.5 w-3.5 fill-current" /> {place.rating.toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-[13px] text-white/50">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{place.location || place.address || 'Nochistlán'}</span>
                  {place.distance && <><span>·</span><span>{place.distance}</span></>}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
