import { Guide, Place, FeedItem, Category, Colonia, Visit } from './types';

export let categories: Category[] = [];
export let allColonias: Colonia[] = [];
export let colonias: Colonia[] = [];
export let visits: Visit[] = [];
export let mockPlaces: Place[] = [];
export let mockGuides: Guide[] = [];
export let feedData: FeedItem[] = [];

const requestedCategoryCatalog: Category[] = [
  ['comida', 'Comida', '🍽️', 'bg-card-orange'],
  ['vinos-licores', 'Vinos y Licores', '🍷', 'bg-card-purple'],
  ['bebidas-depositos', 'Bebidas y Depósitos', '🥤', 'bg-card-blue'],
  ['mercado', 'Mercado', '🧺', 'bg-card-green'],
  ['farmacia', 'Farmacia', '💊', 'bg-card-purple'],
  ['hogar', 'Hogar', '🏠', 'bg-card-orange'],
  ['oficios', 'Oficios', '🛠️', 'bg-card-blue'],
  ['mecanica', 'Mecánica', '🔧', 'bg-card-green'],
  ['educacion', 'Educación', '🎓', 'bg-card-purple'],
  ['servicios-profesionales', 'Servicios Pro.', '💼', 'bg-card-orange'],
  ['fiestas', 'Fiestas', '🎉', 'bg-card-blue'],
  ['musica-audio', 'Música y Audio', '🎶', 'bg-card-purple'],
  ['viajes-vehiculos', 'Viajes y Vehículos', '🚕', 'bg-card-green'],
  ['agricultura', 'Agricultura', '🌾', 'bg-card-orange'],
  ['supermercados', 'Supermercados', '🍎', 'bg-card-blue'],
  ['moda-regalos', 'Moda y Regalos', '🛍️', 'bg-card-purple'],
  ['belleza', 'Belleza', '💅', 'bg-card-orange'],
  ['salud-especializada', 'Salud Esp.', '🩺', 'bg-card-green'],
  ['entretenimiento', 'Entretenimiento', '🎬', 'bg-card-blue'],
  ['estilo-de-vida', 'Estilo de Vida', '🧘', 'bg-card-purple'],
  ['construccion', 'Construcción', '🏗️', 'bg-card-orange'],
  ['tecnologia', 'Tecnología', '💻', 'bg-card-green'],
  ['hoteles-rentas', 'Hoteles y Rentas', '🏨', 'bg-card-blue'],
  ['ayuntamiento', 'Ayuntamiento', '🏛️', 'bg-card-purple'],
  ['eventos', 'Eventos', '🎟️', 'bg-card-orange'],
].map(([id, name, emoji, gradient]) => ({ id: `catalog-${id}`, name, emoji, gradient, visits: 0 }));

function mergeRequestedCategories(apiCategories: Category[] = []) {
  const merged = [...apiCategories];
  for (const requested of requestedCategoryCatalog) {
    const existing = merged.find((category) => category.name.trim().toLocaleLowerCase('es') === requested.name.toLocaleLowerCase('es'));
    if (existing) {
      if (!existing.emoji) existing.emoji = requested.emoji;
    } else {
      merged.push(requested);
    }
  }
  return merged;
}

async function fetchJson(path: string) {
  const response = await fetch(path);
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.includes('application/json')) {
    throw new Error(`${path} returned ${response.status} ${contentType || 'without a content type'}`);
  }
  return response.json();
}

try {
  const [categoriesRes, coloniasRes, placesRes] = await Promise.all([
    fetchJson('/api/categories'),
    fetchJson('/api/colonias'),
    fetchJson('/api/places')
  ]);

  categories = mergeRequestedCategories(categoriesRes);
  allColonias = coloniasRes;
  colonias = allColonias;
  mockPlaces = placesRes;
} catch (e) {
  console.error('Failed to load directory data from the API.', e);
  categories = mergeRequestedCategories();
}
