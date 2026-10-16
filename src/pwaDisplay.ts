export function isInstalledMobilePwa() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const standalone = window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (!standalone) return false;

  const userAgent = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isIOS || /Android/i.test(userAgent);
}
