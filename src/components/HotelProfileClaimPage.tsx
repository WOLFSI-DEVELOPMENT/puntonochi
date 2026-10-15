import { useEffect, useState } from 'react';
import { Check, LoaderCircle, ShieldCheck } from 'lucide-react';

type ClaimInfo = { businessName: string; logoUrl: string; claimed: boolean; signedIn: boolean; access: string[] };

export function HotelProfileClaimPage({ onRequireAccount, onClose }: { onRequireAccount: () => void; onClose: () => void }) {
  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { fetch('/api/profile-claims/hotelnochistlan', { credentials: 'same-origin', cache: 'no-store' }).then((r) => r.json()).then(setInfo).catch(() => setMessage('No se pudo cargar la invitación.')); }, []);
  const claim = async () => {
    setMessage('');
    const session = await fetch('/api/account/session', { credentials: 'same-origin', cache: 'no-store' }).then((r) => r.json()).catch(() => ({}));
    if (!session.authenticated) { onRequireAccount(); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/profile-claims/hotelnochistlan/claim', { method: 'POST', credentials: 'same-origin' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo reclamar el perfil.');
      setInfo((current) => current ? { ...current, claimed: true, signedIn: true } : current);
      setMessage('Perfil reclamado. Ya puedes publicar PuntoShorts desde tu cuenta.');
      window.dispatchEvent(new CustomEvent('account-profile-updated', { detail: data }));
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo reclamar el perfil.'); }
    finally { setBusy(false); }
  };
  return <main className="min-h-screen bg-[#f8f9fa] px-5 py-8 text-neutral-900 sm:px-8"><div className="mx-auto max-w-lg">
    <button onClick={onClose} className="mb-8 text-sm font-semibold text-neutral-500">← Volver a PuntoNochi</button>
    <section className="rounded-[30px] bg-white p-6 shadow-xl shadow-neutral-900/10 sm:p-8">
      {info ? <><img src={info.logoUrl} alt="Logo de Hotel Nochistlán" className="mx-auto h-24 w-24 rounded-[24px] object-cover"/><div className="mt-5 text-center"><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Perfil oficial</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight">Reclama {info.businessName}</h1><p className="mt-3 text-sm leading-relaxed text-neutral-500">Conecta este perfil con tu cuenta para administrar su presencia pública en PuntoNochi.</p></div>
      <div className="mt-7 space-y-3">{info.access.map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-3 text-sm font-medium"><Check className="h-4 w-4 shrink-0 text-blue-600"/>{item}</div>)}</div>
      <button disabled={busy || info.claimed} onClick={() => void claim()} className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-neutral-300">{busy ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <ShieldCheck className="h-4 w-4"/>}{info.claimed ? 'Perfil ya reclamado' : 'Reclamar este perfil'}</button>
      {message && <p role="status" className="mt-4 text-center text-sm text-neutral-600">{message}</p>}</> : <div className="flex min-h-64 items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin text-neutral-400"/></div>}
    </section>
  </div></main>;
}
