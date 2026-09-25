import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowLeft, Check, ImagePlus, LoaderCircle, LogOut, Pencil, Plus, Save, Store, X } from 'lucide-react';
import { Place } from '../types';
import { mockPlaces } from '../data';
import { createDefaultWeeklySchedule, formatWeeklyHours, WeeklyHoursEditor, type BusinessHours, type WeeklyHours } from './WeeklyHoursEditor';

type AdminPageProps = { onClose: () => void };
type AdminStatus = 'checking' | 'not-configured' | 'login' | 'ready' | 'api-error';
type AdminPlace = Pick<Place, 'id' | 'name' | 'category' | 'location' | 'images'> & Partial<Pick<Place, 'subtitle' | 'address' | 'phone' | 'hours' | 'cost'>> & { weeklyHours?: WeeklyHours | null };
type BusinessForm = {
  name: string;
  category: string;
  subtitle: string;
  location: string;
  address: string;
  phone: string;
  weeklyHours: WeeklyHours;
  cost: string;
  imageUrl: string;
};
type BusinessClaim = { id: string; placeId: string; name: string; address: string; phone: string; description: string; email: string; hours: Record<string, { closed: boolean; intervals: { open: string; close: string }[] }>; proofName: string; proofMimeType: string; proofBase64: string; createdAt: string };
type CommunityEdit = { id: string; placeId: string; placeName: string; author: string; email: string; changes: Record<string, unknown>; createdAt: string };

const makeEmptyForm = (category = ''): BusinessForm => ({
  name: '', category, subtitle: '', location: 'Nochistlán de Mejía, Zacatecas',
  address: '', phone: '', weeklyHours: createDefaultWeeklySchedule(), cost: '1', imageUrl: '',
});
const placeholderPattern = /placeholder|no[-_ ]?image|image[-_ ]?not[-_ ]?found|default[-_ ]?(?:image|photo)|no[-_ ]?photo/i;
const hasRealImage = (url: string) => Boolean(url && !placeholderPattern.test(url));

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(`La ruta ${path} no respondió JSON (HTTP ${response.status}). Revisa la función API y vuelve a desplegar.`);
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'No se pudo completar la solicitud.');
  return result as T;
}

export function AdminPage({ onClose }: AdminPageProps) {
  const [status, setStatus] = useState<AdminStatus>('checking');
  const [adminEmail, setAdminEmail] = useState('');
  const [places, setPlaces] = useState<AdminPlace[]>([]);
  const [form, setForm] = useState<BusinessForm>(() => makeEmptyForm());
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<BusinessForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [claims, setClaims] = useState<BusinessClaim[]>([]);
  const [communityEdits, setCommunityEdits] = useState<CommunityEdit[]>([]);

  const loadPlaces = async (): Promise<AdminPlace[]> => {
    const result = await apiRequest<AdminPlace[]>('/api/admin/places');
    setPlaces(result);
    return result;
  };
  const loadClaims = async () => setClaims(await apiRequest<BusinessClaim[]>('/api/admin/business-claims'));
  const loadCommunityEdits = async () => setCommunityEdits(await apiRequest<CommunityEdit[]>('/api/admin/business-edit-suggestions'));

  useEffect(() => {
    let active = true;
    const loginError = new URLSearchParams(window.location.search).get('loginError');
    if (loginError) {
      setError(loginError);
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
    }
    apiRequest<{ configured: boolean; databaseConfigured?: boolean; googleConfigured?: boolean; authenticated: boolean; email?: string | null }>('/api/admin/session')
      .then(async (session) => {
        if (!active) return;
        if (!session.configured) {
          setStatus('not-configured');
          if (session.databaseConfigured === false) setError('Falta DATABASE_URL en el entorno de Producción de Vercel.');
          else if (session.googleConfigured === false) setError('La función de Vercel no está recibiendo GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET. Confirma que ambos estén en Production y vuelve a desplegar.');
          else setError('La función API está usando una versión anterior. Vuelve a desplegar el proyecto en Vercel.');
          return;
        }
        if (!session.authenticated) {
          setStatus('login');
          return;
        }
        setAdminEmail(session.email || '');
        await Promise.all([loadPlaces(), loadClaims(), loadCommunityEdits()]);
        if (active) setStatus('ready');
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'No se pudo abrir el panel.');
          setStatus('api-error');
        }
      });
    return () => { active = false; };
  }, []);

  const createBusiness = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const created = await apiRequest<Place>('/api/admin/places', {
        method: 'POST', body: JSON.stringify({ ...form, hours: formatWeeklyHours(form.weeklyHours), cost: Number(form.cost) }),
      });
      mockPlaces.unshift(created);
      setPlaces((current) => [created, ...current]);
      window.dispatchEvent(new Event('business-directory-updated'));
      setForm(makeEmptyForm(form.category));
      setNotice(`Se guardó ${created.name} en Neon.`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No se pudo guardar el negocio.');
    } finally {
      setBusy(false);
    }
  };

  const editBusiness = (place: AdminPlace) => {
    setEditingPlaceId(place.id);
    setEditForm({
      name: place.name,
      category: place.category,
      subtitle: place.subtitle || '',
      location: place.location || 'Nochistlán de Mejía, Zacatecas',
      address: place.address || '',
      phone: place.phone || '',
      weeklyHours: place.weeklyHours || createDefaultWeeklySchedule(),
      cost: String(place.cost || 1),
      imageUrl: place.images?.[0] || '',
    });
  };

  const saveBusinessEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingPlaceId || !editForm) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await apiRequest<AdminPlace>(`/api/admin/places/${encodeURIComponent(editingPlaceId)}`, {
        method: 'PATCH', body: JSON.stringify({ ...editForm, hours: formatWeeklyHours(editForm.weeklyHours), cost: Number(editForm.cost) }),
      });
      const directoryPlace = mockPlaces.find((item) => item.id === result.id);
      if (directoryPlace) Object.assign(directoryPlace, result);
      setPlaces((current) => current.map((item) => item.id === result.id ? { ...item, ...result } : item));
      window.dispatchEvent(new Event('business-directory-updated'));
      setEditingPlaceId(null);
      setEditForm(null);
      setNotice(`Se actualizaron los datos de ${result.name}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudieron guardar los cambios.');
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

  const reviewCommunityEdit = async (suggestion: CommunityEdit, decision: 'approved' | 'rejected') => {
    setBusy(true); setError(''); setNotice('');
    try {
      await apiRequest<{ reviewed: boolean }>(`/api/admin/business-edit-suggestions/${encodeURIComponent(suggestion.id)}`, { method: 'PATCH', body: JSON.stringify({ status: decision }) });
      const [, updatedPlaces] = await Promise.all([loadCommunityEdits(), loadPlaces()]);
      if (decision === 'approved') {
        const updated = updatedPlaces.find((place) => place.id === suggestion.placeId);
        if (updated) {
          const cached = mockPlaces.find((place) => place.id === suggestion.placeId);
          if (cached) Object.assign(cached, updated);
        }
        window.dispatchEvent(new Event('business-directory-updated'));
      }
      setNotice(decision === 'approved' ? `Se aplicaron las sugerencias para ${suggestion.placeName}.` : `Se rechazó la sugerencia para ${suggestion.placeName}.`);
    } catch (reviewError) { setError(reviewError instanceof Error ? reviewError.message : 'No se pudo revisar la sugerencia.'); }
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
          {status === 'ready' && <div className="flex items-center gap-3"><span className="hidden text-xs text-white/45 sm:inline">{adminEmail}</span><button type="button" disabled={busy} onClick={logout} className="flex items-center gap-2 rounded-full bg-white/[0.08] px-3 py-2 text-sm font-semibold"><LogOut className="h-4 w-4" />Salir</button></div>}
        </header>

        {status === 'checking' && <div className="flex items-center justify-center gap-2 py-16 text-sm text-white/60"><LoaderCircle className="h-5 w-5 animate-spin" />Comprobando acceso…</div>}

        {status === 'not-configured' && <section className="rounded-[24px] bg-[#202124] p-5"><h2 className="font-semibold">Falta configurar el acceso</h2><p role="alert" className="mt-2 text-sm leading-relaxed text-white/60">{error}</p></section>}

        {status === 'api-error' && <section className="rounded-[24px] bg-[#202124] p-5"><h2 className="font-semibold">No se pudo comprobar el acceso</h2><p role="alert" className="mt-2 text-sm leading-relaxed text-white/60">{error}</p><button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black">Reintentar</button></section>}

        {status === 'login' && <section className="rounded-[24px] bg-[#202124] p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3"><span className="rounded-2xl bg-white/[0.08] p-3"><Store className="h-5 w-5" /></span><div><h2 className="font-semibold">Acceso de administrador</h2><p className="text-sm text-white/50">Continúa con una de las cuentas Google autorizadas.</p></div></div>
          {error && <p role="alert" className="mb-4 text-sm text-rose-300">{error}</p>}
          <button type="button" onClick={() => window.location.assign('/api/admin/oauth/start')} className="admin-login-button flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white font-semibold text-black"><span aria-hidden="true" className="text-base font-bold">G</span>Continuar con Google</button>
        </section>}

        {status === 'ready' && <div className="space-y-6">
          <section className="space-y-3">
            <div><h2 className="text-lg font-semibold">Sugerencias de la comunidad</h2><p className="mt-1 text-sm text-white/50">{communityEdits.length} sugerencia{communityEdits.length === 1 ? '' : 's'} pendiente{communityEdits.length === 1 ? '' : 's'} de cambios a negocios.</p></div>
            {communityEdits.map((suggestion) => <article key={suggestion.id} className="rounded-[24px] bg-[#202124] p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{suggestion.placeName}</h3><p className="mt-1 text-xs text-white/45">Sugerido por {suggestion.author}{suggestion.email ? ` · ${suggestion.email}` : ''}</p></div><time className="shrink-0 text-[11px] text-white/40">{new Date(suggestion.createdAt).toLocaleDateString('es-MX')}</time></div><div className="mt-3 space-y-2">{Object.entries(suggestion.changes || {}).map(([key, rawValue]) => <div key={key} className="rounded-2xl bg-white/[0.04] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{{ name: 'Nombre', category: 'Categoría', subtitle: 'Descripción', location: 'Ubicación', address: 'Dirección', phone: 'Teléfono', imageUrl: 'Imagen', weeklyHours: 'Horario' }[key] || key}</p><p className="mt-1 break-words text-sm text-white/80">{key === 'weeklyHours' && rawValue && typeof rawValue === 'object' ? formatWeeklyHours(rawValue as WeeklyHours) : String(rawValue || '(vacío)')}</p>{key === 'imageUrl' && typeof rawValue === 'string' && rawValue && <img src={rawValue} alt="Imagen sugerida" className="mt-2 h-24 w-full rounded-xl object-cover"/>}</div>)}</div><div className="mt-4 flex gap-2"><button type="button" disabled={busy} onClick={() => reviewCommunityEdit(suggestion, 'approved')} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50"><Check className="h-4 w-4"/>Aprobar cambios</button><button type="button" disabled={busy} onClick={() => reviewCommunityEdit(suggestion, 'rejected')} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><X className="h-4 w-4"/>Rechazar</button></div></article>)}
            {!communityEdits.length && <p className="rounded-[20px] bg-[#202124] p-4 text-sm text-white/55">No hay sugerencias pendientes.</p>}
          </section>
          <section className="space-y-3">
            <div><h2 className="text-lg font-semibold">Reclamaciones de negocios</h2><p className="mt-1 text-sm text-white/50">{claims.length} solicitud{claims.length === 1 ? '' : 'es'} pendiente{claims.length === 1 ? '' : 's'}. El comprobante se elimina al decidir.</p></div>
            {claims.map((claim) => <article key={claim.id} className="rounded-[24px] bg-[#202124] p-4 sm:p-5"><div className="grid gap-4 sm:grid-cols-[160px_1fr]"><img src={`data:${claim.proofMimeType};base64,${claim.proofBase64}`} alt={`Comprobante de ${claim.name}`} className="max-h-52 w-full rounded-2xl bg-white object-contain sm:h-40" /><div className="min-w-0"><h3 className="font-semibold">{claim.name}</h3><p className="mt-1 text-sm text-white/55">{claim.address} · {claim.phone}</p><p className="mt-1 text-sm text-white/55">{claim.email} · Archivo: {claim.proofName}</p>{claim.description && <p className="mt-2 text-sm text-white/75">{claim.description}</p>}<div className="mt-3 space-y-1 text-xs text-white/50">{(Object.entries(claim.hours || {}) as [string, BusinessHours][]).map(([day, hours]) => <p key={day}>{day}: {hours.closed ? 'Cerrado' : (hours.intervals || []).map((item) => `${item.open}–${item.close}`).join(', ')}</p>)}</div><div className="mt-4 flex gap-2"><button type="button" disabled={busy} onClick={() => reviewClaim(claim, 'approved')} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"><Check className="h-4 w-4" />Aprobar y actualizar</button><button type="button" disabled={busy} onClick={() => reviewClaim(claim, 'rejected')} className="flex items-center gap-2 rounded-full bg-white/[0.08] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><X className="h-4 w-4" />Rechazar</button></div></div></div></article>)}
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
              <AdminField label="Descripción corta"><input maxLength={500} value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} placeholder="Qué ofrece este negocio" /></AdminField>
              <AdminField label="Rango de precio"><select value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })}><option value="1">$</option><option value="2">$$</option><option value="3">$$$</option><option value="4">$$$$</option></select></AdminField>
              <AdminField label="URL de imagen (opcional)"><input type="url" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://…" /></AdminField>
            </div>
            <WeeklyHoursEditor value={form.weeklyHours} onChange={(weeklyHours) => setForm((current) => ({ ...current, weeklyHours }))} />
            {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
            {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
            <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white font-semibold text-black disabled:opacity-60"><Plus className="h-4 w-4" />Crear y guardar</button>
          </form>

          <section className="space-y-3">
            <div><h2 className="text-lg font-semibold">Negocios</h2><p className="mt-1 text-sm text-white/50">{places.length} negocio{places.length === 1 ? '' : 's'} guardado{places.length === 1 ? '' : 's'} en Neon. Puedes editar sus datos, horarios e imagen.</p></div>
            {places.map((place) => {
              const isEditing = editingPlaceId === place.id && editForm;
              return <article key={place.id} className="rounded-[22px] bg-[#202124] p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  {hasRealImage(place.images?.[0] || '') ? <img src={place.images[0]} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" /> : <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-[#303135] text-white/40"><ImagePlus className="h-5 w-5" /><span className="text-[9px]">Sin imagen</span></div>}
                  <div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{place.name}</h3><p className="mt-0.5 truncate text-xs text-white/50">{place.category} · {place.location}</p></div>
                  <button type="button" disabled={busy} onClick={() => isEditing ? (setEditingPlaceId(null), setEditForm(null)) : editBusiness(place)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-2 text-sm font-semibold">{isEditing ? <><X className="h-4 w-4" />Cancelar</> : <><Pencil className="h-4 w-4" />Editar</>}</button>
                </div>
                {isEditing && <form onSubmit={saveBusinessEdit} className="mt-4 space-y-3 border-t border-white/[0.08] pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <AdminField label="Nombre del negocio"><input required maxLength={180} value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} /></AdminField>
                    <AdminField label="Categoría"><input required maxLength={100} value={editForm.category} onChange={(event) => setEditForm({ ...editForm, category: event.target.value })} /></AdminField>
                    <AdminField label="Ubicación"><input required maxLength={180} value={editForm.location} onChange={(event) => setEditForm({ ...editForm, location: event.target.value })} /></AdminField>
                    <AdminField label="Dirección"><input maxLength={300} value={editForm.address} onChange={(event) => setEditForm({ ...editForm, address: event.target.value })} /></AdminField>
                    <AdminField label="Teléfono"><input type="tel" value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} /></AdminField>
                    <AdminField label="Rango de precio"><select value={editForm.cost} onChange={(event) => setEditForm({ ...editForm, cost: event.target.value })}><option value="1">$</option><option value="2">$$</option><option value="3">$$$</option><option value="4">$$$$</option></select></AdminField>
                    <AdminField label="Descripción corta"><input maxLength={500} value={editForm.subtitle} onChange={(event) => setEditForm({ ...editForm, subtitle: event.target.value })} /></AdminField>
                    <AdminField label="URL de imagen principal"><input type="url" value={editForm.imageUrl} onChange={(event) => setEditForm({ ...editForm, imageUrl: event.target.value })} placeholder="https://…" /></AdminField>
                  </div>
                  <WeeklyHoursEditor value={editForm.weeklyHours} onChange={(weeklyHours) => setEditForm((current) => current ? { ...current, weeklyHours } : current)} />
                  <button type="submit" disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white font-semibold text-black disabled:opacity-60"><Save className="h-4 w-4" />{busy ? 'Guardando…' : 'Guardar cambios'}</button>
                </form>}
              </article>;
            })}
          </section>
        </div>}
      </div>
    </main>
  );
}

function AdminField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-xs font-semibold text-white/60">{label}<span className="mt-1.5 block">{children}</span></label>;
}
