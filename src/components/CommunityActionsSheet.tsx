import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Camera, Check, Clock3, MessageSquareText, Pencil, Send, Star, X } from 'lucide-react';
import type { Place, Review } from '../types';
import { createDefaultWeeklySchedule, formatWeeklyHours, WeeklyHoursEditor, type WeeklyHours } from './WeeklyHoursEditor';
import { SheetDragHandle, useSheetDrag } from './SheetDragHandle';

type Props = { place: Place; onClose: () => void };
type Mode = 'menu' | 'reviews' | 'edit';
type EditField = 'name' | 'category' | 'subtitle' | 'location' | 'address' | 'phone' | 'imageUrl' | 'weeklyHours';
type SuggestedChanges = Partial<Record<EditField, string | WeeklyHours>>;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'No se pudo completar la solicitud.');
  return result as T;
}

const dateLabel = (value: string) => new Date(value).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

export function CommunityActionsSheet({ place, onClose }: Props) {
  const sheetDrag = useSheetDrag(onClose);
  const [mode, setMode] = useState<Mode>('menu');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [author, setAuthor] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);
  const [editAuthor, setEditAuthor] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [changes, setChanges] = useState<SuggestedChanges>({});
  const [activeField, setActiveField] = useState<EditField | null>(null);
  const [fieldValue, setFieldValue] = useState('');
  const [scheduleValue, setScheduleValue] = useState<WeeklyHours>(place.weeklyHours || createDefaultWeeklySchedule());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (mode !== 'reviews') return;
    setReviewsLoading(true);
    request<Review[]>(`/api/places/${encodeURIComponent(place.id)}/reviews`)
      .then(setReviews)
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las reseñas.'))
      .finally(() => setReviewsLoading(false));
  }, [mode, place.id]);

  const shownImage = changes.imageUrl !== undefined ? String(changes.imageUrl) : place.images?.[0] || place.logo || '';
  const fields = useMemo(() => [
    { key: 'name' as const, label: 'Nombre', original: place.name, value: changes.name },
    { key: 'category' as const, label: 'Categoría', original: place.category, value: changes.category },
    { key: 'subtitle' as const, label: 'Descripción', original: place.subtitle || 'Agregar descripción', value: changes.subtitle },
    { key: 'location' as const, label: 'Ubicación', original: place.location, value: changes.location },
    { key: 'address' as const, label: 'Dirección', original: place.address || 'Agregar dirección', value: changes.address },
    { key: 'phone' as const, label: 'Teléfono', original: place.phone || 'Agregar teléfono', value: changes.phone },
    { key: 'weeklyHours' as const, label: 'Horario', original: place.hours || 'Agregar horario', value: changes.weeklyHours },
  ], [place, changes]);

  const beginEdit = (key: EditField) => {
    setError(''); setNotice(''); setActiveField(key);
    if (key === 'weeklyHours') return;
    const existing = changes[key];
    const fallback: Partial<Record<EditField, string>> = {
      name: place.name, category: place.category, subtitle: place.subtitle || '', location: place.location,
      address: place.address || '', phone: place.phone || '', imageUrl: place.images?.[0] || '',
    };
    setFieldValue(typeof existing === 'string' ? existing : fallback[key] || '');
  };

  const saveField = () => {
    if (!activeField || activeField === 'weeklyHours') return;
    setChanges((current) => ({ ...current, [activeField]: fieldValue.trim() }));
    setActiveField(null); setError('');
  };

  const submitReview = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const review = await request<Review>(`/api/places/${encodeURIComponent(place.id)}/reviews`, {
        method: 'POST', body: JSON.stringify({ author, rating, text: reviewText }),
      });
      setReviews((current) => [review, ...current]); setAuthor(''); setRating(0); setReviewText('');
      setNotice('Tu reseña ya aparece en la ficha del negocio.');
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'No se pudo guardar la reseña.'); }
    finally { setBusy(false); }
  };

  const submitSuggestion = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const submittedChanges: SuggestedChanges = { ...changes };
      if (activeField === 'weeklyHours') submittedChanges.weeklyHours = scheduleValue;
      if (activeField && activeField !== 'weeklyHours') submittedChanges[activeField] = fieldValue.trim();
      if (!Object.keys(submittedChanges).length) throw new Error('Toca un dato en la vista previa para elegir qué quieres corregir.');
      await request(`/api/business-edit-suggestions`, { method: 'POST', body: JSON.stringify({ placeId: place.id, author: editAuthor, email: editEmail, changes: submittedChanges }) });
      setNotice('Enviamos tu sugerencia al equipo para revisión.'); setChanges({}); setActiveField(null);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'No se pudo enviar la sugerencia.'); }
    finally { setBusy(false); }
  };

  const title = mode === 'menu' ? 'Comunidad' : mode === 'reviews' ? 'Reseñas' : 'Sugerir una edición';
  const currentField = fields.find((field) => field.key === activeField);

  return <>
    <motion.button aria-label="Cerrar opciones de comunidad" onClick={onClose} className="fixed inset-0 z-[84] bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
    <motion.section {...sheetDrag} role="dialog" aria-modal="true" aria-label={title} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 360, mass: 0.82 }} className="fixed inset-x-0 bottom-0 z-[85] flex max-h-[90dvh] flex-col overflow-hidden rounded-t-[30px] bg-[#202124] text-white shadow-2xl">
      <div className="relative shrink-0 border-b border-white/[0.08] px-5 pb-4 pt-7"><SheetDragHandle controls={sheetDrag.dragControls} className="absolute inset-x-0 top-0"/><div className="flex items-center gap-3">{mode !== 'menu' && <button type="button" onClick={() => { setMode('menu'); setError(''); setNotice(''); }} aria-label="Volver" className="rounded-full bg-white/[0.08] p-2"><ArrowLeft className="h-4 w-4"/></button>}<div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">{place.name}</p><h2 className="mt-0.5 text-xl font-bold">{title}</h2></div><button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full bg-white/[0.08] p-2"><X className="h-5 w-5"/></button></div></div>
      <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 py-5">
        {mode === 'menu' && <div className="space-y-3"><p className="mb-4 text-sm text-white/55">Ayuda a mantener actualizada la información de {place.name}.</p><button type="button" onClick={() => { setMode('reviews'); setNotice(''); setError(''); }} className="flex w-full items-center gap-4 rounded-[22px] bg-[#2b2c30] p-4 text-left"><span className="rounded-2xl bg-amber-300/15 p-3 text-amber-200"><Star className="h-5 w-5"/></span><span className="flex-1"><span className="block font-bold">Dejar una reseña</span><span className="mt-1 block text-xs text-white/50">Comparte tu experiencia y lee opiniones</span></span><MessageSquareText className="h-5 w-5 text-white/35"/></button><button type="button" onClick={() => { setMode('edit'); setNotice(''); setError(''); }} className="flex w-full items-center gap-4 rounded-[22px] bg-[#2b2c30] p-4 text-left"><span className="rounded-2xl bg-blue-300/15 p-3 text-blue-200"><Pencil className="h-5 w-5"/></span><span className="flex-1"><span className="block font-bold">Sugerir una edición</span><span className="mt-1 block text-xs text-white/50">Toca los datos en la ficha para corregirlos</span></span><Camera className="h-5 w-5 text-white/35"/></button></div>}

        {mode === 'reviews' && <div>
          <form onSubmit={submitReview} className="rounded-[22px] bg-[#2b2c30] p-4"><h3 className="font-bold">¿Cómo fue tu experiencia?</h3><div className="mt-3 flex gap-1" role="radiogroup" aria-label="Calificación">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} estrellas`} onClick={() => setRating(value)} className="rounded-lg p-1 text-amber-300"><Star className={`h-7 w-7 ${value <= rating ? 'fill-current' : ''}`}/></button>)}</div><input required maxLength={80} value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Tu nombre" className="mt-3 w-full rounded-2xl bg-[#202124] px-4 py-3 text-sm"/><textarea required maxLength={1500} rows={3} value={reviewText} onChange={(event) => setReviewText(event.target.value)} placeholder="Cuéntale a la comunidad…" className="mt-2 w-full resize-y rounded-2xl bg-[#202124] px-4 py-3 text-sm"/><button type="submit" disabled={busy || !rating} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-bold text-black disabled:opacity-50">{busy ? 'Guardando…' : <><Send className="h-4 w-4"/>Publicar reseña</>}</button></form>
          {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}{notice && <p role="status" className="mt-3 text-sm text-emerald-300">{notice}</p>}
          <h3 className="mb-3 mt-6 font-bold">Opiniones de la comunidad <span className="text-white/40">{reviews.length}</span></h3>{reviewsLoading ? <p className="text-sm text-white/50">Cargando reseñas…</p> : reviews.length ? <div className="space-y-2">{reviews.map((review) => <article key={review.id} className="rounded-[20px] bg-[#2b2c30] p-4"><div className="flex items-start justify-between gap-2"><div><h4 className="text-sm font-bold">{review.author}</h4>{(review.date || review.createdAt) && <time className="text-xs text-white/40">{review.date || dateLabel(review.createdAt!)}</time>}</div><span className="flex items-center gap-1 text-sm font-bold text-amber-200"><Star className="h-3.5 w-3.5 fill-current"/>{review.rating}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/75">{review.text}</p></article>)}</div> : <p className="rounded-[20px] bg-[#2b2c30] p-4 text-sm text-white/50">Aún no hay reseñas. ¡Sé la primera persona en compartir una!</p>}
        </div>}

        {mode === 'edit' && <form onSubmit={submitSuggestion} className="space-y-4">
          <p className="text-sm leading-relaxed text-white/55">Esta vista previa es interactiva: toca cualquier dato para proponer una corrección. El equipo revisará cada sugerencia antes de publicarla.</p>
          <div className="overflow-hidden rounded-[26px] bg-[#2b2c30] p-2">
            <button type="button" onClick={() => beginEdit('imageUrl')} className={`group relative block aspect-[16/8] w-full overflow-hidden rounded-[20px] bg-[#18191b] text-left ${activeField === 'imageUrl' || changes.imageUrl !== undefined ? 'ring-2 ring-blue-400' : ''}`}>{shownImage ? <img src={shownImage} alt="Vista previa del negocio" className="h-full w-full object-cover"/> : <span className="flex h-full flex-col items-center justify-center gap-2 text-sm text-white/50"><Camera className="h-6 w-6"/>Imagen retirada en esta sugerencia</span>}<span className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"><Camera className="h-3.5 w-3.5"/>Cambiar imagen</span></button>
            <div className="space-y-1 p-3">{fields.map((field) => <button key={field.key} type="button" onClick={() => beginEdit(field.key)} className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-colors ${activeField === field.key || changes[field.key] !== undefined ? 'bg-blue-400/10 ring-1 ring-blue-300/50' : 'hover:bg-white/[0.04]'}`}><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-white/25"/><span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-wider text-white/40">{field.label}</span><span className={`mt-1 block break-words text-sm ${field.key === 'name' ? 'font-bold' : 'text-white/75'}`}>{field.key === 'weeklyHours' && field.value && typeof field.value === 'object' ? formatWeeklyHours(field.value as WeeklyHours) : typeof field.value === 'string' ? field.value : field.original}</span></span><Pencil className="mt-2 h-4 w-4 shrink-0 text-white/35"/></button>)}</div>
          </div>
          {activeField && <section className="rounded-[22px] bg-[#2b2c30] p-4"><div className="mb-3 flex items-center gap-2 text-sm font-bold">{activeField === 'weeklyHours' ? <Clock3 className="h-4 w-4"/> : <Pencil className="h-4 w-4"/>}Editar {currentField?.label || 'imagen'}</div>{activeField === 'weeklyHours' ? <><WeeklyHoursEditor value={scheduleValue} onChange={(value) => { setScheduleValue(value); setChanges((current) => ({ ...current, weeklyHours: value })); }}/> <p className="text-xs text-white/45">El horario actual: {place.hours}</p></> : <><input autoFocus value={fieldValue} onChange={(event) => setFieldValue(event.target.value)} type={activeField === 'imageUrl' ? 'url' : activeField === 'phone' ? 'tel' : 'text'} maxLength={activeField === 'imageUrl' ? 2048 : 500} placeholder={activeField === 'imageUrl' ? 'https://…' : `Nuevo ${activeField}`} className="w-full rounded-2xl bg-[#202124] px-4 py-3 text-sm"/><button type="button" onClick={saveField} className="mt-3 rounded-full bg-white px-5 py-2 text-sm font-bold text-black">Aplicar a la vista previa</button></>}</section>}
          <div className="grid gap-3 sm:grid-cols-2"><input required maxLength={80} value={editAuthor} onChange={(event) => setEditAuthor(event.target.value)} placeholder="Tu nombre" className="w-full rounded-2xl bg-[#2b2c30] px-4 py-3 text-sm"/><input type="email" maxLength={180} value={editEmail} onChange={(event) => setEditEmail(event.target.value)} placeholder="Correo (opcional)" className="w-full rounded-2xl bg-[#2b2c30] px-4 py-3 text-sm"/></div>
          {error && <p role="alert" className="rounded-2xl bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}{notice && <p role="status" className="rounded-2xl bg-emerald-400/10 p-3 text-sm text-emerald-200"><Check className="mr-1 inline h-4 w-4"/>{notice}</p>}
          <button type="submit" disabled={busy || !editAuthor} className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-bold text-black disabled:opacity-50">{busy ? 'Enviando…' : <><Send className="h-4 w-4"/>Enviar sugerencia al equipo</>}</button>
        </form>}
      </div>
    </motion.section>
  </>;
}
