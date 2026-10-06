import React, { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';

export function PushNotificationButton() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribe = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Permiso denegado');

      const keyRes = await fetch('/api/notifications/vapid-public-key');
      const { publicKey } = await keyRes.json();
      if (!publicKey) throw new Error('VAPID key faltante');

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub }),
      });

      setIsSubscribed(true);
      alert('¡Notificaciones activadas exitosamente!');
    } catch (err) {
      console.error(err);
      alert('Error activando notificaciones: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) return null;

  return (
    <button
      onClick={subscribe}
      disabled={isSubscribed || loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all ${
        isSubscribed
          ? 'bg-neutral-100 text-neutral-500 cursor-not-allowed'
          : 'bg-[#1a73e8] text-white hover:bg-blue-600 active:scale-95'
      }`}
    >
      {isSubscribed ? <BellOff size={18} /> : <Bell size={18} />}
      {loading ? 'Activando...' : isSubscribed ? 'Notificaciones Activas' : 'Activar Notificaciones'}
    </button>
  );
}
