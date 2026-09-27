import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, Grid2X2, LoaderCircle, MapPin, MessageCircle, Star, UserRound, Users, X } from 'lucide-react';
import { AccountRequiredPrompt } from './AccountSheets';

type Profile = { id: string; name: string; picture: string | null; bio: string; posts: number; reviews: number; events: number; followers: number; following: number; isFollowing: boolean; isSelf: boolean };
type Activity = {
  posts: { id: string; imageUrl: string; caption: string; createdAt: string; postType: string; placeName?: string | null }[];
  reviews: { id: string; placeName: string; rating: number; text: string; createdAt: string }[];
  events: { id: string; title: string; date: string; location: string; imageUrl: string }[];
};
type Tab = 'posts' | 'reviews' | 'events';

export function PublicProfileSheet({ profileId, onClose }: { profileId: string; onClose: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activity, setActivity] = useState<Activity>({ posts: [], reviews: [], events: [] });
  const [tab, setTab] = useState<Tab>('posts');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);

  useEffect(() => {
    let active = true;
    setProfile(null); setLoading(true); setError('');
    Promise.all([
      fetch(`/api/profiles/${encodeURIComponent(profileId)}`, { cache: 'no-store' }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo cargar este perfil.'); return data as Profile; }),
      fetch(`/api/profiles/${encodeURIComponent(profileId)}/activity`, { cache: 'no-store' }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo cargar la actividad.'); return data as Activity; }),
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

  return <>
    <motion.button type="button" aria-label="Cerrar perfil público" onClick={onClose} className="fixed inset-0 z-[126] bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}/>
    <motion.main role="dialog" aria-modal="true" aria-label="Perfil público" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 340 }} className="fixed inset-0 z-[127] mx-auto flex w-full max-w-[640px] flex-col overflow-y-auto bg-[#111214] pb-[env(safe-area-inset-bottom)] text-white">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-[#111214]/85 px-5 py-3 backdrop-blur-xl"><span className="text-sm font-semibold">Perfil</span><button type="button" aria-label="Cerrar" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08]"><X className="h-4 w-4"/></button></header>
      <section className="px-5 pb-5 pt-2">
        {loading ? <div className="flex min-h-44 items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin text-white/55"/></div> : error && !profile ? <p role="alert" className="py-12 text-center text-sm text-white/55">{error}</p> : profile && <>
          <div className="flex items-center gap-4">{profile.picture ? <img src={profile.picture} alt="" referrerPolicy="no-referrer" className="h-20 w-20 rounded-full object-cover"/> : <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#292a2d]"><UserRound className="h-9 w-9 text-white/65"/></span>}<div className="min-w-0"><h1 className="truncate text-2xl font-bold">{profile.name}</h1><p className="mt-1 text-xs text-white/45">Comunidad de Nochistlán</p></div></div>
          {profile.bio && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/75">{profile.bio}</p>}
          <div className="mt-5 flex items-center gap-6"><div><strong>{profile.posts}</strong><span className="ml-1.5 text-xs text-white/50">publicaciones</span></div><div><strong>{profile.followers}</strong><span className="ml-1.5 text-xs text-white/50">seguidores</span></div><div><strong>{profile.following}</strong><span className="ml-1.5 text-xs text-white/50">siguiendo</span></div></div>
          {!profile.isSelf && <button type="button" disabled={busy} onClick={() => void toggleFollow()} className={`mt-5 flex h-10 w-full items-center justify-center rounded-full text-sm font-bold disabled:opacity-60 ${profile.isFollowing ? 'bg-[#292a2d] text-white' : 'bg-[#1683f8] text-white'}`}>{busy ? 'Un momento…' : profile.isFollowing ? 'Siguiendo' : 'Seguir'}</button>}
          {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
        </>}
      </section>
      {profile && <>
        <nav className="sticky top-[56px] z-10 flex border-y border-white/[0.07] bg-[#111214]/90 backdrop-blur-xl">{([{ key: 'posts', label: 'Publicaciones', icon: Grid2X2 }, { key: 'reviews', label: 'Reseñas', icon: MessageCircle }, { key: 'events', label: 'Eventos', icon: CalendarDays }] as const).map(({ key, label, icon: Icon }) => <button key={key} type="button" onClick={() => setTab(key)} aria-pressed={tab === key} className={`flex flex-1 items-center justify-center gap-2 py-3 text-xs font-semibold ${tab === key ? 'text-white' : 'text-white/45'}`}><Icon className="h-4 w-4"/><span>{label}</span><span className="text-white/35">{key === 'posts' ? profile.posts : key === 'reviews' ? profile.reviews : profile.events}</span></button>)}</nav>
        <section className="flex-1 px-4 py-4">
          {tab === 'posts' && (activity.posts.length ? <div className="grid grid-cols-3 gap-1">{activity.posts.map((post) => <div key={post.id} className="relative aspect-square overflow-hidden rounded-[16px] bg-[#202124]"><img src={post.imageUrl} alt={post.caption || 'Publicación'} loading="lazy" className="h-full w-full object-cover"/><span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 text-[10px]">{post.caption}</span></div>)}</div> : <Empty label="Todavía no hay publicaciones"/>)}
          {tab === 'reviews' && (activity.reviews.length ? <div className="space-y-2">{activity.reviews.map((review) => <article key={review.id} className="rounded-[22px] bg-[#202124] p-4"><div className="flex items-center justify-between gap-2"><h2 className="truncate text-sm font-bold">{review.placeName}</h2><span className="flex items-center gap-1 text-sm text-blue-300"><Star className="h-3.5 w-3.5 fill-current"/>{review.rating}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/65">{review.text}</p></article>)}</div> : <Empty label="Todavía no hay reseñas"/>)}
          {tab === 'events' && (activity.events.length ? <div className="space-y-3">{activity.events.map((event) => <article key={event.id} className="overflow-hidden rounded-[22px] bg-[#202124]"><img src={event.imageUrl} alt="" className="aspect-video w-full object-cover"/><div className="p-4"><h2 className="text-base font-bold">{event.title}</h2><p className="mt-2 flex items-center gap-1.5 text-xs text-white/55"><CalendarDays className="h-3.5 w-3.5"/>{new Date(`${event.date}T12:00:00Z`).toLocaleDateString('es-MX', { dateStyle: 'medium', timeZone: 'UTC' })}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-white/55"><MapPin className="h-3.5 w-3.5"/>{event.location}</p></div></article>)}</div> : <Empty label="Todavía no hay eventos"/>)}
        </section>
      </>}
    </motion.main>
    {showAccountPrompt && <AccountRequiredPrompt onClose={() => setShowAccountPrompt(false)} message="Inicia sesión con Google para seguir a otras personas de la comunidad."/>}
  </>;
}

function Empty({ label }: { label: string }) { return <div className="flex min-h-44 flex-col items-center justify-center text-center text-sm text-white/40"><Users className="mb-3 h-7 w-7"/>{label}</div>; }
