export const SEARCH_LEARNING_KEY = 'puntonochi-search-learning-v1';

export type SearchLearning = {
  categories: Record<string, number>;
  places: Record<string, number>;
};

export function normalizeSearchTerm(value: unknown) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function readSearchLearning(): SearchLearning {
  try {
    const value = JSON.parse(localStorage.getItem(SEARCH_LEARNING_KEY) || '{}');
    const counts = (input: unknown): Record<string, number> => input && typeof input === 'object'
      ? Object.fromEntries(Object.entries(input).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] > 0))
      : {};
    return { categories: counts(value.categories), places: counts(value.places) };
  } catch { return { categories: {}, places: {} }; }
}
