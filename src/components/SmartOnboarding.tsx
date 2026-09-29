import { useEffect, useState } from 'react';
import { ArrowRight, Bell, Check, LoaderCircle, MapPin } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

const ONBOARDING_DONE_KEY = 'puntonochi-smart-onboarding-done-v1';
const LOCATION_KEY = 'puntonochi-device-location-v1';

export type DeviceLocation = { latitude: number; longitude: number; accuracy: number; updatedAt: string };

function isInstalledPwa() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function decodeVapidKey(value: string) {
  const padded = `${value}${'='.repeat((4 - value.length % 4) % 4)}`;
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function readDeviceLocation(): DeviceLocation | null {
  try {
    const value = JSON.parse(localStorage.getItem(LOCATION_KEY) || 'null') as DeviceLocation | null;
    return value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude) ? value : null;
  } catch { return null; }
}

export function SmartOnboarding({ enabled, onLocation }: { enabled: boolean; onLocation: (location: DeviceLocation) => void }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<'notifications' | 'location'>('notifications');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notificationReady, setNotificationReady] = useState(false);

  useEffect(() => {
    if (!enabled || !isInstalledPwa()) return;
    try { if (localStorage.getItem(ONBOARDING_DONE_KEY) === 'true') return; } catch { /* Continue if storage is unavailable. */ }
    setVisible(true);
  }, [enabled]);

  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return;
    let active = true;
    void navigator.serviceWorker.ready.then((registration) => registration.pushManager.getSubscription()).then(async (subscription) => {
      if (!subscription) return;
      const response = await fetch('/api/notifications/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: subscription.toJSON() }) }).catch(() => null);
      if (active && response?.ok) setNotificationReady(true);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [visible]);

  const finish = () => {
    try { localStorage.setItem(ONBOARDING_DONE_KEY, 'true'); } catch { /* It still finishes for this session. */ }
    setVisible(false);
  };

  const enableNotifications = async () => {
    setBusy(true); setError('');
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setError('Este dispositivo no admite notificaciones web. Puedes continuar.');
        return;
      }
      const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
      if (permission !== 'granted') {
        setError(permission === 'denied' ? 'Puedes activarlas después desde la configuración del dispositivo.' : 'No se activaron. Puedes continuar y cambiarlo después.');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const keyResponse = await fetch('/api/notifications/vapid-public-key');
        const keyBody = await keyResponse.json();
        if (!keyResponse.ok || !keyBody.publicKey) throw new Error(keyBody.error || 'No se pudieron configurar los avisos.');
        subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(keyBody.publicKey) });
      }
      const saved = await fetch('/api/notifications/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: subscription.toJSON() }) });
      if (!saved.ok) throw new Error('No se pudo guardar la suscripción; puedes volver a intentarlo después.');
      setNotificationReady(true);
      setError('');
    } catch (activationError) {
      setError(activationError instanceof Error ? activationError.message : 'No se pudieron activar las notificaciones.');
    } finally { setBusy(false); }
  };

  const enableLocation = () => {
    if (!navigator.geolocation) { setError('Este dispositivo no permite compartir ubicación. Puedes continuar sin ella.'); return; }
    setBusy(true); setError('');
    navigator.geolocation.getCurrentPosition((position) => {
      const location = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, updatedAt: new Date().toISOString() };
      try { localStorage.setItem(LOCATION_KEY, JSON.stringify(location)); } catch { /* Location is still usable in this session. */ }
      onLocation(location);
      setBusy(false);
      finish();
    }, (locationError) => {
      setBusy(false);
      setError(locationError.code === locationError.PERMISSION_DENIED ? 'No se concedió ubicación. Puedes activarla después en la configuración del dispositivo.' : 'No pudimos obtener tu ubicación. Puedes intentarlo después.');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  if (!visible) return null;
  const notificationStep = step === 'notifications';
  return <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="smart-onboarding-title">
    <div className="w-full max-w-md overflow-hidden rounded-[30px] bg-[#202124] text-white shadow-2xl">
      <div className="flex justify-center gap-1.5 pt-5" aria-label={`Paso ${notificationStep ? 1 : 2} de 2`}><span className={`h-1 w-8 rounded-full ${notificationStep ? 'bg-white' : 'bg-white/20'}`}/><span className={`h-1 w-8 rounded-full ${notificationStep ? 'bg-white/20' : 'bg-white'}`}/></div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.section key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }} className="px-6 pb-6 pt-7">
          <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/[0.08]">{notificationStep ? <Bell className="h-6 w-6"/> : <MapPin className="h-6 w-6"/>}</span>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">PuntoNochi · Paso {notificationStep ? '1' : '2'} de 2</p>
          <h1 id="smart-onboarding-title" className="mt-2 text-2xl font-bold tracking-tight">{notificationStep ? 'Mantente al tanto' : 'Encuentra negocios cerca de ti'}</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">{notificationStep ? 'Recibe avisos de noticias, eventos y novedades de Nochistlán.' : 'Usa tu ubicación precisa para poner primero los negocios que están más cerca. Solo se guarda en este dispositivo.'}</p>
          {error && <p role="alert" className="mt-4 rounded-2xl bg-white/[0.06] p-3 text-xs leading-relaxed text-white/75">{error}</p>}
          <div className="mt-6 space-y-2.5">
            {notificationStep ? <>
              {notificationReady ? <button type="button" onClick={() => { setError(''); setStep('location'); }} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black"><Check className="h-4 w-4"/>Notificaciones activas · Continuar</button> : <button type="button" disabled={busy} onClick={() => void enableNotifications()} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black disabled:opacity-60">{busy && <LoaderCircle className="h-4 w-4 animate-spin"/>}Activar notificaciones</button>}
              <button type="button" onClick={() => { setError(''); setStep('location'); }} className="h-11 w-full rounded-full text-sm font-semibold text-white/65">Ahora no</button>
            </> : <>
              <button type="button" disabled={busy} onClick={enableLocation} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black disabled:opacity-60">{busy && <LoaderCircle className="h-4 w-4 animate-spin"/>}Compartir ubicación</button>
              <button type="button" onClick={finish} className="flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white/65">Ahora no <ArrowRight className="h-4 w-4"/></button>
            </>}
          </div>
        </motion.section>
      </AnimatePresence>
    </div>
  </div>;
}
