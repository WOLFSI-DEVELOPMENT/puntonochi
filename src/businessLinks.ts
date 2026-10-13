import type { Place } from './types';

export function businessNameSlug(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'negocio';
}

export function getBusinessRouteSlug(place: Place, places: Place[]) {
  const base = businessNameSlug(place.name);
  const duplicates = [place, ...places.filter((candidate) => candidate.id !== place.id && businessNameSlug(candidate.name) === base)]
    .sort((a, b) => String(a.id).localeCompare(String(b.id), 'en'));
  if (duplicates.length < 2) return base;
  const duplicateIndex = duplicates.findIndex((candidate) => candidate.id === place.id);
  return `${base}${Math.max(duplicateIndex, 0) + 1}`;
}

export function getBusinessPath(place: Place, places: Place[]) {
  return `/negocio/@${getBusinessRouteSlug(place, places)}`;
}

export function findBusinessByRouteSlug(routeSlug: string, places: Place[]) {
  const normalized = decodeURIComponent(routeSlug).replace(/^@/, '').toLocaleLowerCase('es');
  return places.find((place) => getBusinessRouteSlug(place, places).toLocaleLowerCase('es') === normalized);
}
