const TOTALS_KEY = 'puntonochi-place-hypes-v1';
const DAILY_KEY = 'puntonochi-daily-place-hypes-v1';
export const HYPES_UPDATED_EVENT = 'puntonochi-hypes-updated';

type CountMap = Record<string, number>;
type DailyMap = Record<string, string>;

function readMap<T>(key: string): T {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}') as T;
  } catch {
    return {} as T;
  }
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getTotalHypes(placeId: string) {
  const value = readMap<CountMap>(TOTALS_KEY)[placeId];
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function canHypePlaceToday(placeId: string) {
  return readMap<DailyMap>(DAILY_KEY)[placeId] !== todayKey();
}

export function hypePlace(placeId: string) {
  if (!canHypePlaceToday(placeId)) return false;
  try {
    const totals = readMap<CountMap>(TOTALS_KEY);
    const daily = readMap<DailyMap>(DAILY_KEY);
    totals[placeId] = getTotalHypes(placeId) + 1;
    daily[placeId] = todayKey();
    localStorage.setItem(TOTALS_KEY, JSON.stringify(totals));
    localStorage.setItem(DAILY_KEY, JSON.stringify(daily));
    window.dispatchEvent(new Event(HYPES_UPDATED_EVENT));
    return true;
  } catch {
    return false;
  }
}
