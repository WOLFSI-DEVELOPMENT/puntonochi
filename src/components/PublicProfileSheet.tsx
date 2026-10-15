import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Camera, LoaderCircle, Pencil, UserRound, Users, X } from 'lucide-react';
import { AccountRequiredPrompt } from './AccountSheets';
import { SheetDragHandle, useSheetDrag } from './SheetDragHandle';

type Profile = { id: string; name: string; picture: string | null; bio: string; posts: number; reviews: number; events: number; listings: number; followers: number; following: number; isFollowing: boolean; isSelf: boolean };
type Activity = {
  posts: { id: string; imageUrl: string; caption: string; createdAt: string; postType: string; placeName?: string | null }[];
  reviews: { id: string; placeName: string; rating: number; text: string; createdAt: string }[];
  events: { id: string; title: string; date: string; location: string; imageUrl: string }[];
  marketplaceListings: { id: string; category: string; title: string; price: string; location: string; description: string; images: { id: string; url: string; sortOrder: number }[] }[];
};
async function readApiJson<T>(response: Response): Promise<T> {
  const body = await response.text();
  try { return JSON.parse(body) as T; }
  catch { throw new Error(response.ok ? 'El servidor devolvió una respuesta inesperada.' : `No se pudo cargar el perfil (HTTP ${response.status}).`); }
}

export function PublicProfileSheet({ profileId, onClose }: { profileId: string; onClose: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activity, setActivity] = useState<Activity>({ posts: [], reviews: [], events: [], marketplaceListings: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [photoData, setPhotoData] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const editSheetDrag = useSheetDrag(() => { setEditing(false); setPhotoData(''); });

  useEffect(() => {
    let active = true;
    setProfile(null); setLoading(true); setError('');
    Promise.all([
      fetch(`/api/profiles/${encodeURIComponent(profileId)}`, { cache: 'no-store' }).then(async (response) => { const data = await readApiJson<Profile & { error?: string }>(response); if (!response.ok) throw new Error(data.error || 'No se pudo cargar este perfil.'); return data; }),
      fetch(`/api/profiles/${encodeURIComponent(profileId)}/activity`, { cache: 'no-store' }).then(async (response) => { const data = await readApiJson<Activity & { error?: string }>(response); if (!response.ok) throw new Error(data.error || 'No se pudo cargar la actividad.'); return data; }),
    ]).then(([person, posts]) => { if (active) { setProfile(person); setActivity(posts); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'No se pudo cargar este perfil.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profileId]);

  const toggleFollow = async () => {
    if (!profile || busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/profiles/${encodeURIComponent(profile.id)}/follow`, { method: profile.isFollowing ? 'DELETE' : 'POST', credentials: 'same-origin' });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { setShowAccountPrompt(true); return; }
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar el seguimiento.');
      setProfile((current) => current ? { ...current, isFollowing: Boolean(data.following), followers: Math.max(0, current.followers + (data.following ? 1 : -1)) } : current);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo actualizar el seguimiento.'); }
    finally { setBusy(false); }
  };

  const choosePhoto = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Elige un archivo de imagen.'); return; }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No se pudo procesar la imagen.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      setPhotoData(canvas.toDataURL('image/jpeg', 0.84));
      setError('');
    } catch { setError('No se pudo cargar esa foto.'); }
  };

  const saveProfile = async () => {
    if (!profile || savingProfile) return;
    setSavingProfile(true); setError('');
    try {
      const response = await fetch('/api/account/profile', { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editName, bio: editBio, pictureData: photoData || undefined }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar tu perfil.');
      setProfile((current) => current ? { ...current, name: data.name, bio: data.bio, picture: data.picture } : current);
      window.dispatchEvent(new CustomEvent('account-profile-updated', { detail: data }));
      setPhotoData(''); setEditing(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo guardar tu perfil.'); }
    finally { setSavingProfile(false); }
  };

  return <>
    <motion.button type="button" data-sheet-close aria-label="Cerrar perfil público" onClick={onClose} className="fixed inset-0 z-[126] bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}/>
    <motion.main role="dialog" aria-modal="true" aria-label="Perfil público" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 340 }} className="fixed inset-0 z-[127] flex w-full flex-col overflow-y-auto bg-[#050506] pb-[env(safe-area-inset-bottom)] text-white">
      <button type="button" data-sheet-close aria-label="Cerrar perfil" onClick={onClose} className="fixed right-4 top-[max(16px,env(safe-area-inset-top))] z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-white/80 backdrop-blur-md"><X className="h-4 w-4"/></button>
      {loading ? <div className="flex min-h-64 items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin text-white/55"/></div> : error && !profile ? <p role="alert" className="py-20 text-center text-sm text-white/55">{error}</p> : profile && <>
        <section className="mx-auto w-full max-w-5xl px-5 pb-6 pt-[max(56px,calc(env(safe-area-inset-top)+38px))] sm:px-8 sm:pt-16">
          <div className="flex items-start gap-5 sm:gap-8">
            {profile.picture ? <img src={profile.picture} alt="" referrerPolicy="no-referrer" className="h-[92px] w-[92px] shrink-0 rounded-full object-cover sm:h-32 sm:w-32"/> : <span className="flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full bg-[#252629] sm:h-32 sm:w-32"><UserRound className="h-10 w-10 text-white/65 sm:h-14 sm:w-14"/></span>}
            <div className="min-w-0 flex-1 pt-1 sm:pt-2">
              <h1 className="pr-10 text-[22px] font-extrabold leading-tight tracking-[-.035em] sm:text-3xl">{profile.name}</h1>
              <p className="mt-1 text-xs font-medium text-white/45 sm:text-sm">Perfil de la comunidad</p>
              <div className="mt-4 flex max-w-[390px] items-center gap-5 sm:gap-8">
                <div><strong className="block text-base font-bold tabular-nums sm:text-lg">{profile.posts}</strong><span className="text-[10px] text-white/45 sm:text-xs">publicaciones</span></div>
                <div><strong className="block text-base font-bold tabular-nums sm:text-lg">{profile.followers}</strong><span className="text-[10px] text-white/45 sm:text-xs">seguidores</span></div>
                <div><strong className="block text-base font-bold tabular-nums sm:text-lg">{profile.following}</strong><span className="text-[10px] text-white/45 sm:text-xs">siguiendo</span></div>
              </div>
            </div>
          </div>
          {profile.bio && <p className="mt-5 max-w-2xl whitespace-pre-wrap text-[13px] leading-relaxed text-white/80 sm:text-sm">{profile.bio}</p>}
          <div className="mt-5 max-w-sm">
            {profile.isSelf ? <button type="button" onClick={() => { setEditName(profile.name); setEditBio(profile.bio); setPhotoData(''); setEditing(true); }} className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-white/[0.1] px-4 text-xs font-semibold text-white"><Pencil className="h-3.5 w-3.5"/>Editar perfil</button> : <button type="button" disabled={busy} onClick={() => void toggleFollow()} className={`flex h-10 w-full items-center justify-center rounded-full text-xs font-bold disabled:opacity-60 ${profile.isFollowing ? 'bg-white/[0.1] text-white' : 'bg-white text-black'}`}>{busy ? 'Un momento…' : profile.isFollowing ? 'Siguiendo' : 'Seguir'}</button>}
          </div>
          {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
        </section>
        <section className="mx-auto min-h-[45vh] w-full max-w-5xl flex-1 px-5 pb-12 sm:px-8">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[.16em] text-white/45">Publicaciones</h2>
          {activity.posts.length ? <div className="grid grid-cols-3 gap-1.5 sm:gap-2">{activity.posts.map((post) => <article key={post.id} className="relative aspect-square overflow-hidden rounded-[4px] bg-[#1b1c1f]">{post.imageUrl && <img src={post.imageUrl} alt={post.caption || 'Publicación'} loading="lazy" className="h-full w-full object-cover"/>}{post.caption && <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 text-[10px]">{post.caption}</span>}</article>)}</div> : <Empty label="Todavía no hay publicaciones"/>}
        </section>
      </>}
    </motion.main>
    <AnimatePresence>
      {editing && profile?.isSelf && <>
        <motion.button type="button" data-sheet-close aria-label="Cerrar edición del perfil" onClick={() => { setEditing(false); setPhotoData(''); }} className="fixed inset-0 z-[138] bg-black/65 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}/>
        <motion.section {...editSheetDrag} data-desktop-sheet="popup" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 360, mass: .82 }} className="fixed inset-x-0 bottom-0 z-[139] mx-auto flex max-h-[85dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-[30px] bg-[#202124] px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-2 text-white shadow-2xl">
          <SheetDragHandle controls={editSheetDrag.dragControls} tone="dark" className="mb-2"/>
          <header className="mb-5 flex items-center justify-between"><div><h2 id="edit-profile-title" className="text-xl font-bold">Editar perfil</h2><p className="mt-1 text-xs text-white/45">Actualiza cómo te ve la comunidad.</p></div><button type="button" data-sheet-close aria-label="Cerrar edición del perfil" onClick={() => { setEditing(false); setPhotoData(''); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-white/75"><X className="h-4 w-4"/></button></header>
          <div className="space-y-4">
            <label className="block text-xs font-semibold text-white/55">Nombre público<input value={editName} maxLength={60} onChange={(event) => setEditName(event.target.value)} className="mt-1.5 h-12 w-full rounded-[16px] bg-[#151618] px-4 text-sm text-white outline-none placeholder:text-white/25 focus:ring-1 focus:ring-blue-300/60"/></label>
            <label className="block text-xs font-semibold text-white/55">Biografía<textarea value={editBio} maxLength={280} rows={4} onChange={(event) => setEditBio(event.target.value)} placeholder="Cuéntale algo a la comunidad" className="mt-1.5 w-full resize-none rounded-[16px] bg-[#151618] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:ring-1 focus:ring-blue-300/60"/><span className="mt-1 block text-right text-[10px] text-white/35">{editBio.length}/280</span></label>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[16px] bg-[#151618] px-4 py-3 text-sm font-semibold text-white/75"><Camera className="h-4 w-4"/>{photoData ? 'Foto lista' : 'Cambiar foto de perfil'}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void choosePhoto(event.target.files?.[0])}/></label>
            {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2.5"><button type="button" onClick={() => { setEditing(false); setPhotoData(''); }} className="min-h-12 rounded-full bg-white/[0.08] text-sm font-semibold">Cancelar</button><button type="button" disabled={savingProfile} onClick={() => void saveProfile()} className="min-h-12 rounded-full bg-blue-500 text-sm font-bold disabled:opacity-50">{savingProfile ? 'Guardando…' : 'Guardar perfil'}</button></div>
        </motion.section>
      </>}
    </AnimatePresence>
    {showAccountPrompt && <AccountRequiredPrompt onClose={() => setShowAccountPrompt(false)} message="Inicia sesión con Google o Facebook para seguir a otras personas de la comunidad."/>}
  </>;
}

function Empty({ label }: { label: string }) { return <div className="flex min-h-44 flex-col items-center justify-center text-center text-sm text-white/40"><Users className="mb-3 h-7 w-7"/>{label}</div>; }
