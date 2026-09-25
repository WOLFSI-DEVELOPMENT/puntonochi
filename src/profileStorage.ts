export const DAILY_USE_KEY = 'puntonochi-daily-use-v1';
export const PROFILE_ACTIVITY_KEY = 'puntonochi-profile-activity-v1';
export const BOOKMARKS_KEY = 'puntonochi-bookmarks-v1';

export type ProfileActivity = { activeSecondsByDay: Record<string, number> };

export function profileDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getProfileActivity(): ProfileActivity {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(PROFILE_ACTIVITY_KEY) || '{}');
    if (!value || typeof value !== 'object' || !('activeSecondsByDay' in value) || !value.activeSecondsByDay || typeof value.activeSecondsByDay !== 'object') {
      return { activeSecondsByDay: {} };
    }
    const entries = Object.entries(value.activeSecondsByDay).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]));
    return { activeSecondsByDay: Object.fromEntries(entries) };
  } catch {
    return { activeSecondsByDay: {} };
  }
}

export function recordProfileActiveSeconds(seconds: number) {
  if (typeof window === 'undefined' || !Number.isFinite(seconds) || seconds <= 0) return;
  const activity = getProfileActivity();
  const day = profileDateKey();
  activity.activeSecondsByDay[day] = Math.max(0, Number(activity.activeSecondsByDay[day] || 0)) + seconds;
  try {
    localStorage.setItem(PROFILE_ACTIVITY_KEY, JSON.stringify(activity));
    window.dispatchEvent(new Event('puntonochi-profile-updated'));
  } catch { /* Local usage stats are optional when storage is unavailable. */ }
}

export function getBookmarkedPlaceIds(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function setBookmarkedPlaceIds(ids: string[]) {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...new Set(ids)]));
    window.dispatchEvent(new Event('puntonochi-bookmarks-updated'));
  } catch { /* Keep the app usable if local storage is unavailable. */ }
}
