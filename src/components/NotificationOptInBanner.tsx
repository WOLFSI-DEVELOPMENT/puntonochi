import { useEffect, useState } from 'react';
import { Bell, X, LoaderCircle } from 'lucide-react';

function isInstalledPwa() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function decodeVapidKey(value: string) {
  const padded = `${value}${'='.repeat((4 - value.length % 4) % 4)}`;
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function NotificationOptInBanner() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isInstalledPwa() || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    let active = true;
    navigator.serviceWorker.ready.then((registration) => registration.pushManager.getSubscription()).then(async (subscription) => {
      if (!active) return;
      if (Notification.permission === 'granted' && subscription) {
        const response = await fetch('/api/notifications/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: subscription.toJSON() }) }).catch(() => null);
        if (active && response?.ok) return;
      }
      if (active) setVisible(true);
    }).catch(() => { if (active) setVisible(true); });
    return () => { active = false; };
  }, []);

  const enableNotifications = async () => {
    setBusy(true); setError('');
    try {
      // Permission requests must be initiated synchronously from this tap.
      const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
      if (permission !== 'granted') {
        setError(permission === 'denied' ? 'Las notificaciones están bloqueadas. Cámbialo en la configuración del navegador.' : 'No se pudo conceder permiso.');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const keyResponse = await fetch('/api/notifications/vapid-public-key');
        const keyBody = await keyResponse.json();
        if (!keyResponse.ok || !keyBody.publicKey) throw new Error(keyBody.error || 'Las notificaciones todavía no están configuradas.');
        subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(keyBody.publicKey) });
      }
      const saved = await fetch('/api/notifications/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: subscription.toJSON() }) });
      const savedBody = await saved.json().catch(() => ({}));
      if (!saved.ok) throw new Error(savedBody.error || 'No se pudo guardar la suscripción.');
      setVisible(false);
    } catch (activationError) {
      setError(activationError instanceof Error ? activationError.message : 'No se pudieron activar las notificaciones.');
    } finally { setBusy(false); }
  };

  if (!visible) return null;
  return <aside className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[110] mx-auto max-w-2xl rounded-2xl bg-blue-600 px-4 py-3 text-white shadow-lg" aria-label="Activar notificaciones">
    <div className="flex items-start gap-3"><Bell className="mt-0.5 h-5 w-5 shrink-0" /><div className="min-w-0 flex-1"><p className="text-sm font-bold">Recibe noticias y novedades</p><p className="mt-0.5 text-xs leading-relaxed text-blue-100">Activa avisos por la mañana y durante el día. Tú eliges si los permites.</p>{error && <p role="alert" className="mt-2 text-xs font-medium text-white">{error}</p>}<button type="button" disabled={busy} onClick={enableNotifications} className="mt-2 flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-blue-700 disabled:opacity-70">{busy && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}Activar notificaciones</button></div><button type="button" onClick={() => setVisible(false)} aria-label="Cerrar aviso" className="-mr-1 -mt-1 rounded-full p-1.5 text-white/80 hover:bg-white/15"><X className="h-4 w-4" /></button></div>
  </aside>;
}
