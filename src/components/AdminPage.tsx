import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowLeft, Check, ImagePlus, LoaderCircle, LogOut, Plus, Store, X } from 'lucide-react';
import { Place } from '../types';
import { mockPlaces } from '../data';

type AdminPageProps = { onClose: () => void };
type AdminStatus = 'checking' | 'not-configured' | 'login' | 'ready';
type AdminPlace = Pick<Place, 'id' | 'name' | 'category' | 'location' | 'images'> & Partial<Pick<Place, 'subtitle' | 'address' | 'phone' | 'hours' | 'cost'>>;
type BusinessForm = {
  name: string;
  category: string;
  subtitle: string;
  location: string;
  address: string;
  phone: string;
  hours: string;
  cost: string;
  imageUrl: string;
};
type BusinessClaim = { id: string; placeId: string; name: string; address: string; phone: string; description: string; email: string; hours: Record<string, { closed: boolean; intervals: { open: string; close: string }[] }>; proofName: string; proofMimeType: string; proofBase64: string; createdAt: string };

const emptyForm: BusinessForm = {
  name: '', category: '', subtitle: '', location: 'Nochistlán de Mejía, Zacatecas',
  address: '', phone: '', hours: 'Por confirmar', cost: '1', imageUrl: '',
};
const placeholderPattern = /placeholder|no[-_ ]?image|image[-_ ]?not[-_ ]?found|default[-_ ]?(?:image|photo)|no[-_ ]?photo/i;
const hasRealImage = (url: string) => Boolean(url && !placeholderPattern.test(url));

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'No se pudo completar la solicitud.');
  return result as T;
}

export function AdminPage({ onClose }: AdminPageProps) {
  const [status, setStatus] = useState<AdminStatus>('checking');
  const [password, setPassword] = useState('');
  const [places, setPlaces] = useState<AdminPlace[]>([]);
  const [form, setForm] = useState<BusinessForm>(emptyForm);
  const [imageDrafts, setImageDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [claims, setClaims] = useState<BusinessClaim[]>([]);

  const loadPlaces = async () => {
    const result = await apiRequest<AdminPlace[]>('/api/admin/places');
    setPlaces(result);
  };
  const loadClaims = async () => setClaims(await apiRequest<BusinessClaim[]>('/api/admin/business-claims'));

  useEffect(() => {
    let active = true;
    apiRequest<{ configured: boolean; authenticated: boolean }>('/api/admin/session')
      .then(async (session) => {
        if (!active) return;
        if (!session.configured) {
          setStatus('not-configured');
          return;
        }
        if (!session.authenticated) {
          setStatus('login');
          return;
        }
        await loadPlaces();
        await loadClaims();
        if (active) setStatus('ready');
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'No se pudo abrir el panel.');
          setStatus('login');
        }
      });
    return () => { active = false; };
  }, []);

  const missingImagePlaces = useMemo(
    () => places.filter((place) => !(place.images || []).some(hasRealImage)),
    [places],
  );

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await apiRequest('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
      setPassword('');
      await loadPlaces();
      await loadClaims();
      setStatus('ready');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'No se pudo iniciar sesión.');
    } finally {
      setBusy(false);
    }
  };

  const createBusiness = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const created = await apiRequest<Place>('/api/admin/places', {
        method: 'POST', body: JSON.stringify({ ...form, cost: Number(form.cost) }),
      });
      mockPlaces.unshift(created);
      setPlaces((current) => [created, ...current]);
      window.dispatchEvent(new Event('business-directory-updated'));
      setForm({ ...emptyForm, category: form.category || '' });
      setNotice(`Se guardó ${created.name} en Neon.`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No se pudo guardar el negocio.');
    } finally {
      setBusy(false);
    }
  };

  const saveImage = async (place: AdminPlace) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await apiRequest<{ id: string; images: string[] }>(`/api/admin/places/${encodeURIComponent(place.id)}/image`, {
        method: 'PATCH', body: JSON.stringify({ imageUrl: imageDrafts[place.id] || '' }),
      });
      const directoryPlace = mockPlaces.find((item) => item.id === result.id);
      if (directoryPlace) directoryPlace.images = result.images;
      setPlaces((current) => current.map((item) => item.id === result.id ? { ...item, images: result.images } : item));
      window.dispatchEvent(new Event('business-directory-updated'));
      setImageDrafts((current) => { const next = { ...current }; delete next[place.id]; return next; });
      setNotice(`Imagen guardada para ${place.name}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la imagen.');
    } finally {
      setBusy(false);
    }
  };

  const reviewClaim = async (claim: BusinessClaim, decision: 'approved' | 'rejected') => {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await apiRequest<{ emailSent: boolean; emailConfigured: boolean }>(`/api/admin/business-claims/${encodeURIComponent(claim.id)}`, { method: 'PATCH', body: JSON.stringify({ status: decision }) });
      await Promise.all([loadClaims(), loadPlaces()]);
      const decisionText = decision === 'approved' ? `Se aprobaron los cambios de ${claim.name}.` : `Se rechazó la solicitud de ${claim.name}.`;
      setNotice(`${decisionText} El comprobante fue eliminado.${result.emailSent ? ' Se envió el correo.' : result.emailConfigured ? ' No se pudo enviar el correo; revisa los registros del servidor.' : ' Configura RESEND_API_KEY y RESEND_FROM_EMAIL para enviar el correo.'}`);
    } catch (reviewError) { setError(reviewError instanceof Error ? reviewError.message : 'No se pudo revisar la solicitud.'); }
    finally { setBusy(false); }
  };

  const logout = async () => {
    setBusy(true);
    try {
      await apiRequest('/api/admin/logout', { method: 'POST' });
      setError('');
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'No se pudo cerrar la sesión.');
    } finally {
      setBusy(false);
      setPlaces([]);
      setStatus('login');
    }
  };

  return (
    <main className="fixed inset-0 z-[90] overflow-y-auto bg-[#121212] px-4 pb-10 pt-5 text-white sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} aria-label="Volver" className="rounded-full bg-white/[0.08] p-2.5"><ArrowLeft className="h-5 w-5" /></button>
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">PuntoNochi</p><h1 className="text-xl font-bold">Administración</h1></div>
          </div>
          {status === 'ready' && <button type="button" disabled={busy} onClick={logout} className="flex items-center gap-2 rounded-full bg-white/[0.08] px-3 py-2 text-sm font-semibold"><LogOut className="h-4 w-4" />Salir</button>}
        </header>

        {status === 'checking' && <div className="flex items-center justify-center gap-2 py-16 text-sm text-white/60"><LoaderCircle className="h-5 w-5 animate-spin" />Comprobando acceso…</div>}

        {status === 'not-configured' && <section className="rounded-[24px] bg-[#202124] p-5"><h2 className="font-semibold">Falta configurar el acceso seguro</h2><p className="mt-2 text-sm leading-relaxed text-white/60">En las variables de entorno del servidor agrega <code>ADMIN_PASSWORD</code> (12 caracteres o más) y <code>ADMIN_SESSION_SECRET</code> (32 caracteres o más). En Vercel, selecciona Production y Preview y vuelve a desplegar.</p></section>}

        {status === 'login' && <form onSubmit={login} className="rounded-[24px] bg-[#202124] p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3"><span className="rounded-2xl bg-white/[0.08] p-3"><Store className="h-5 w-5" /></span><div><h2 className="font-semibold">Acceso de administrador</h2><p className="text-sm text-white/50">Ingresa tu contraseña para administrar negocios.</p></div></div>
          <label className="mb-4 block text-sm font-medium text-white/70">Contraseña<input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-12 w-full rounded-2xl bg-[#303135] px-4 text-base text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/20" placeholder="Contraseña de administrador" /></label>
          {error && <p role="alert" className="mb-4 text-sm text-rose-300">{error}</p>}
          <button disabled={busy} className="admin-login-button flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white font-semibold text-black disabled:opacity-60">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}Entrar</button>
        </form>}

        {status === 'ready' && <div className="space-y-6">
          <section className="space-y-3">
            <div><h2 className="text-lg font-semibold">Reclamaciones de negocios</h2><p className="mt-1 text-sm text-white/50">{claims.length} solicitud{claims.length === 1 ? '' : 'es'} pendiente{claims.length === 1 ? '' : 's'}. El comprobante se elimina al decidir.</p></div>
            {claims.map((claim) => <article key={claim.id} className="rounded-[24px] bg-[#202124] p-4 sm:p-5"><div className="grid gap-4 sm:grid-cols-[160px_1fr]"><img src={`data:${claim.proofMimeType};base64,${claim.proofBase64}`} alt={`Comprobante de ${claim.name}`} className="max-h-52 w-full rounded-2xl bg-white object-contain sm:h-40" /><div className="min-w-0"><h3 className="font-semibold">{claim.name}</h3><p className="mt-1 text-sm text-white/55">{claim.address} · {claim.phone}</p><p className="mt-1 text-sm text-white/55">{claim.email} · Archivo: {claim.proofName}</p>{claim.description && <p className="mt-2 text-sm text-white/75">{claim.description}</p>}<div className="mt-3 space-y-1 text-xs text-white/50">{Object.entries(claim.hours || {}).map(([day, hours]) => <p key={day}>{day}: {hours.closed ? 'Cerrado' : (hours.intervals || []).map((item) => `${item.open}–${item.close}`).join(', ')}</p>)}</div><div className="mt-4 flex gap-2"><button type="button" disabled={busy} onClick={() => reviewClaim(claim, 'approved')} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"><Check className="h-4 w-4" />Aprobar y actualizar</button><button type="button" disabled={busy} onClick={() => reviewClaim(claim, 'rejected')} className="flex items-center gap-2 rounded-full bg-white/[0.08] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><X className="h-4 w-4" />Rechazar</button></div></div></div></article>)}
            {!claims.length && <p className="rounded-[20px] bg-[#202124] p-4 text-sm text-white/55">No hay reclamaciones pendientes.</p>}
          </section>
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}{notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
          <form onSubmit={createBusiness} className="space-y-4 rounded-[24px] bg-[#202124] p-5 sm:p-6">
            <div><h2 className="text-lg font-semibold">Crear negocio</h2><p className="mt-1 text-sm text-white/50">Los datos se guardan directamente en Neon.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Nombre del negocio"><input required maxLength={180} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Café de la Plaza" /></AdminField>
              <AdminField label="Categoría"><input required maxLength={100} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Restaurante, hotel…" /></AdminField>
              <AdminField label="Ubicación"><input required maxLength={180} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></AdminField>
              <AdminField label="Dirección"><input maxLength={300} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Calle, colonia" /></AdminField>
              <AdminField label="Teléfono"><input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="(346) …" /></AdminField>
              <AdminField label="Horario"><input value={form.hours} onChange={(event) => setForm({ ...form, hours: event.target.value })} /></AdminField>
              <AdminField label="Descripción corta"><input maxLength={500} value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} placeholder="Qué ofrece este negocio" /></AdminField>
              <AdminField label="Rango de precio"><select value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })}><option value="1">$</option><option value="2">$$</option><option value="3">$$$</option><option value="4">$$$$</option></select></AdminField>
              <AdminField label="URL de imagen (opcional)"><input type="url" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://…" /></AdminField>
            </div>
            {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
            {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
            <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white font-semibold text-black disabled:opacity-60"><Plus className="h-4 w-4" />Crear y guardar</button>
          </form>

          <section className="space-y-3">
            <div><h2 className="text-lg font-semibold">Negocios sin imagen real</h2><p className="mt-1 text-sm text-white/50">{missingImagePlaces.length} negocio{missingImagePlaces.length === 1 ? '' : 's'} con imagen pendiente.</p></div>
            {missingImagePlaces.length ? missingImagePlaces.map((place) => <article key={place.id} className="flex gap-3 rounded-[22px] bg-[#202124] p-3 sm:gap-4 sm:p-4">
              <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-[18px] bg-[#303135] text-white/40 sm:h-28 sm:w-32"><ImagePlus className="h-6 w-6" /><span className="text-[10px]">Sin imagen real</span></div>
              <div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{place.name}</h3><p className="mt-0.5 truncate text-xs text-white/50">{place.category} · {place.location}</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input type="url" value={imageDrafts[place.id] ?? ''} onChange={(event) => setImageDrafts((current) => ({ ...current, [place.id]: event.target.value }))} placeholder="Pega la URL de la imagen" aria-label={`URL de imagen para ${place.name}`} className="h-10 min-w-0 flex-1 rounded-xl bg-[#303135] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/20" /><button type="button" disabled={busy || !imageDrafts[place.id]?.trim()} onClick={() => saveImage(place)} className="h-10 shrink-0 rounded-xl bg-white px-4 text-sm font-semibold text-black disabled:opacity-45">Guardar imagen</button></div></div>
            </article>) : <p className="rounded-[20px] bg-[#202124] p-4 text-sm text-white/55">Todos los negocios tienen una imagen. Si agregas uno sin imagen, aparecerá aquí.</p>}
          </section>
        </div>}
      </div>
    </main>
  );
}

function AdminField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-xs font-semibold text-white/60">{label}<span className="mt-1.5 block">{children}</span></label>;
}
