import type { Place } from './types';
import type { SearchLearning } from './searchLearning';
import { normalizeSearchTerm } from './searchLearning';

type Coordinates = { latitude: number; longitude: number } | null;

function distanceKm(place: Place, coordinates: Coordinates) {
  if (!coordinates || typeof place.lat !== 'number' || typeof place.lng !== 'number') return null;
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(place.lat - coordinates.latitude);
  const dLng = radians(place.lng - coordinates.longitude);
  const latA = radians(coordinates.latitude);
  const latB = radians(place.lat);
  const haversine = Math.sin(dLat / 2) ** 2 + Math.cos(latA) * Math.cos(latB) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

/** Small, deterministic, on-device ranking. Work is linear to score and capped at 8 picks. */
export function rankHomeRecommendations(
  places: Place[],
  signals: { searches: string[]; recentPlaces: string[]; bookmarks: string[]; coordinates: Coordinates; learning: SearchLearning },
  limit = 8,
) {
  const recentSearchTerms = signals.searches.slice(0, 12).map(normalizeSearchTerm).filter(Boolean);
  const recentPlacePosition = new Map(signals.recentPlaces.map((id, index) => [id, index]));
  const bookmarked = new Set(signals.bookmarks);
  const scored = places.filter((place) => place.images?.some(Boolean)).map((place) => {
    const name = normalizeSearchTerm(place.name);
    const category = normalizeSearchTerm(place.category);
    const searchable = normalizeSearchTerm([place.name, place.category, place.subtitle, place.location, place.address, ...(place.goodToKnow || [])].filter(Boolean).join(' '));
    const searchRelevance = recentSearchTerms.reduce((score, term, index) => {
      const terms = term.split(' ').filter((word) => word.length > 2);
      if (!terms.length) return score;
      const matching = terms.filter((word) => searchable.includes(word)).length;
      if (matching === terms.length) return score + Math.max(1, 7 - index * 0.45);
      return score + Math.max(0, 4 - index * 0.4) * matching / terms.length;
    }, 0);
    const learningCategory = signals.learning.categories[category] || 0;
    const learningPlace = signals.learning.places[place.id] || 0;
    const viewedIndex = recentPlacePosition.get(place.id);
    const distance = distanceKm(place, signals.coordinates);
    const proximity = distance === null ? 0 : Math.max(0, 12 - distance * 1.1);
    const quality = Math.max(0, (place.rating || 0) - 3) * 1.8 + Math.min(3, Math.log1p(place.reviewCount || 0) * 0.65);
    const score = searchRelevance
      + Math.min(14, learningCategory * 3)
      + Math.min(14, learningPlace * 3)
      + (bookmarked.has(place.id) ? 10 : 0)
      + (viewedIndex === undefined ? 0 : Math.max(0, 4 - viewedIndex * 0.35))
      + proximity
      + quality;
    return { place, category, score, name };
  });

  // Greedy category balancing keeps the first row from being eight near-identical listings.
  const selected: typeof scored = [];
  const categoryCounts = new Map<string, number>();
  while (scored.length && selected.length < limit) {
    let bestIndex = 0;
    let bestAdjusted = -Infinity;
    for (let index = 0; index < scored.length; index++) {
      const candidate = scored[index];
      const categoryKey = candidate.category || candidate.place.id;
      const adjusted = candidate.score - (categoryCounts.get(categoryKey) || 0) * 5.5;
      if (adjusted > bestAdjusted || (adjusted === bestAdjusted && candidate.name.localeCompare(scored[bestIndex].name, 'es') < 0)) {
        bestAdjusted = adjusted;
        bestIndex = index;
      }
    }
    const [next] = scored.splice(bestIndex, 1);
    selected.push(next);
    categoryCounts.set(next.category || next.place.id, (categoryCounts.get(next.category || next.place.id) || 0) + 1);
  }
  return selected.map(({ place }) => place);
}
