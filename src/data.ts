import { Guide, Place, FeedItem, Category, Colonia, Visit } from './types';

export let categories: Category[] = [];
export let allColonias: Colonia[] = [];
export let colonias: Colonia[] = [];
export let visits: Visit[] = [];
export let mockPlaces: Place[] = [];
export let mockGuides: Guide[] = [];
export let feedData: FeedItem[] = [];

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

  categories = categoriesRes;
  allColonias = coloniasRes;
  colonias = allColonias;
  mockPlaces = placesRes;
} catch (e) {
  console.error('Failed to load directory data from the API.', e);
}
