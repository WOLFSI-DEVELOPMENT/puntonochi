import { Guide, Place, FeedItem, Category, Colonia, Visit } from './types';

export let categories: Category[] = [];
export let allColonias: Colonia[] = [];
export let colonias: Colonia[] = [];
export let visits: Visit[] = [];
export let mockPlaces: Place[] = [];
export let mockGuides: Guide[] = [];
export let feedData: FeedItem[] = [];

try {
  const [categoriesRes, coloniasRes, placesRes] = await Promise.all([
    fetch('/api/categories'),
    fetch('/api/colonias'),
    fetch('/api/places')
  ]);
  
  categories = await categoriesRes.json();
  allColonias = await coloniasRes.json();
  colonias = allColonias;
  mockPlaces = await placesRes.json();
} catch (e) {
  console.error("Failed to load from API, make sure server is running on port 3001", e);
}
