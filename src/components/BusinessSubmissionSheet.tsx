import { useState, FormEvent, ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Camera, Check, Clock3, ImagePlus, LoaderCircle, MapPin, Phone, Plus, Store, Tag, Trash2, X, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { apiFetch } from '../api';
import { mockPlaces } from '../data';
import type { Place } from '../types';

const categories = ['Restaurante', 'Cafetería', 'Hotel', 'Farmacia', 'Tienda', 'Servicios', 'Otro'];
const costs = [1, 2, 3, 4];

type BusinessPhoto = { name: string; url: string; file: File };
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
type BusinessHours = { closed: boolean; intervals: { open: string; close: string }[] };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

export function BusinessSubmissionSheet({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Restaurante');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [hours, setHours] = useState('');
  const [cost, setCost] = useState(2);
  const [email, setEmail] = useState('');
  const [photos, setPhotos] = useState<BusinessPhoto[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedPhotoCount, setUploadedPhotoCount] = useState(0);
  const [mode, setMode] = useState<'add' | 'claim'>('add');
  const [selectedClaimPlace, setSelectedClaimPlace] = useState<Place | null>(null);
  const [claimSearch, setClaimSearch] = useState('');
  const [claimName, setClaimName] = useState('');
  const [claimAddress, setClaimAddress] = useState('');
  const [claimPhone, setClaimPhone] = useState('');
  const [claimEmail, setClaimEmail] = useState('');
  const [claimDescription, setClaimDescription] = useState('');
  const [claimProof, setClaimProof] = useState<File | null>(null);
  const [claimSubmitted, setClaimSubmitted] = useState(false);
  const [claimHours, setClaimHours] = useState<Record<string, BusinessHours>>(() => Object.fromEntries(weekDays.map((day) => [day, { closed: day === 'Domingo', intervals: [{ open: '09:00', close: '18:00' }] }])));

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    setPhotoError('');
    const accepted: BusinessPhoto[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        setPhotoError('Elige archivos de imagen.');
      } else if (file.size > MAX_PHOTO_BYTES) {
        setPhotoError(`${file.name} supera el límite de 5 MB.`);
      } else if (photos.length + accepted.length < 8) {
        accepted.push({ name: file.name, url: URL.createObjectURL(file), file });
      }
    }
    setPhotos((current) => [...current, ...accepted].slice(0, 8));
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) setTags((current) => [...current, tag]);
    setTagInput('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setUploadedPhotoCount(0);
    setSubmitError('');
    try {
      const created = await apiFetch('/api/business-applications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, description, address, phone, hours, cost, email, tags }),
      });
      const createdBody = await created.json();
      if (!created.ok) throw new Error(createdBody.error || 'No se pudo guardar la solicitud.');
      for (const photo of photos) {
        const uploaded = await apiFetch(`/api/business-applications/${createdBody.id}/photos`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: photo.name, mimeType: photo.file.type, base64: await fileToBase64(photo.file) }),
        });
        const uploadedBody = await uploaded.json();
        if (!uploaded.ok) throw new Error(uploadedBody.error || `No se pudo subir ${photo.name}.`);
        setUploadedPhotoCount((count) => count + 1);
      }
      const finalized = await apiFetch(`/api/business-applications/${createdBody.id}/submit`, { method: 'POST' });
      const finalizedBody = await finalized.json();
      if (!finalized.ok) throw new Error(finalizedBody.error || 'No se pudo enviar la solicitud.');
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudo enviar la solicitud. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const matchingClaims = mockPlaces.filter((place) => `${place.name} ${place.location}`.toLocaleLowerCase('es').includes(claimSearch.toLocaleLowerCase('es')));
  const selectClaimPlace = (place: Place) => {
    setSelectedClaimPlace(place); setClaimName(place.name); setClaimAddress(place.address || place.location); setClaimPhone(place.phone || ''); setClaimDescription(place.subtitle || '');
    setClaimHours(Object.fromEntries(weekDays.map((day) => [day, { closed: day === 'Domingo', intervals: [{ open: '09:00', close: '18:00' }] }])));
    setSubmitError('');
  };
  const updateHours = (day: string, updater: (current: BusinessHours) => BusinessHours) => setClaimHours((current) => ({ ...current, [day]: updater(current[day]) }));
  const submitClaim = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClaimPlace || !claimProof) { setSubmitError('Selecciona un negocio y agrega un comprobante.'); return; }
    setIsSubmitting(true); setSubmitError('');
    try {
      const created = await apiFetch('/api/business-claims', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placeId: selectedClaimPlace.id, name: claimName, address: claimAddress, phone: claimPhone, description: claimDescription, email: claimEmail, hours: claimHours, proofName: claimProof.name, proofMimeType: claimProof.type, proofBase64: await fileToBase64(claimProof) }) });
      const body = await created.json();
      if (!created.ok) throw new Error(body.error || 'No se pudo enviar la solicitud.');
      setClaimSubmitted(true);
    } catch (error) { setSubmitError(error instanceof Error ? error.message : 'No se pudo enviar la solicitud.'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <>
      <motion.button aria-label="Cerrar formulario" className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.section role="dialog" aria-modal="true" aria-label="Registra tu negocio" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 280 }} className="fixed inset-x-0 bottom-0 z-[71] mx-auto flex max-h-[94dvh] w-full max-w-[680px] flex-col overflow-hidden rounded-t-[32px] bg-[#202124] text-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 pb-4 pt-3">
          <div className="mx-auto absolute left-1/2 top-2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/20" />
          <div className="pt-2"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">PuntoNochi · Negocios</p><h2 className="mt-1 text-xl font-bold">{submitted || claimSubmitted ? 'Solicitud recibida' : mode === 'claim' ? 'Reclama tu negocio' : 'Presenta tu negocio'}</h2></div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.07] text-white/70"><X className="h-5 w-5" /></button>
        </div>

        {submitted || claimSubmitted ? (
          <div className="overflow-y-auto px-6 py-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"><Check className="h-8 w-8" /></div>
            <h3 className="mt-5 text-2xl font-bold">¡Ya está en revisión!</h3>
            <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-white/65">{claimSubmitted ? `El equipo revisará la solicitud de ${claimName} y eliminará el comprobante al resolverla.` : `Revisaremos los datos de ${name}.`}</p>
            <button type="button" onClick={onClose} className="mt-8 rounded-full bg-white px-7 py-3 text-sm font-bold text-[#202124]">Listo</button>
          </div>
        ) : (
          <>
          <div className="shrink-0 border-b border-white/[0.07] px-5 py-3">
            <div className="mx-auto flex w-fit rounded-full bg-[#292a2d] p-1" role="tablist" aria-label="Tipo de solicitud">
              <button type="button" role="tab" aria-selected={mode === 'add'} onClick={() => { setMode('add'); setSubmitError(''); }} className={`rounded-full px-5 py-2 text-sm font-semibold ${mode === 'add' ? 'bg-[#36373b] !text-white' : 'text-white/60'}`}>Agregar</button>
              <button type="button" role="tab" aria-selected={mode === 'claim'} onClick={() => { setMode('claim'); setSubmitError(''); }} className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold ${mode === 'claim' ? 'bg-white text-[#202124]' : 'text-white/60'}`}><UserRoundCheck className="h-4 w-4" />Reclamar/editar</button>
            </div>
          </div>
          {mode === 'claim' ? (
            <form onSubmit={submitClaim} className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-8 pt-4">
              <p className="mb-4 text-sm text-white/55">Verifica que eres responsable del negocio y mantén su información actualizada.</p>
              {!selectedClaimPlace ? <section className="rounded-[22px] bg-[#292a2d] p-4"><label className="mb-3 block text-sm font-semibold">Selecciona tu negocio<input value={claimSearch} onChange={(e) => setClaimSearch(e.target.value)} placeholder="Buscar negocio" className={`${inputClass} mt-3`} /></label><div className="max-h-56 space-y-2 overflow-y-auto overscroll-contain">{matchingClaims.slice(0, 60).map((place) => <button key={place.id} type="button" onClick={() => selectClaimPlace(place)} className="flex w-full items-center gap-3 rounded-2xl bg-[#36373b] p-2.5 text-left"><img src={place.logo || place.images?.[0]} alt="" className="h-10 w-10 rounded-xl object-cover" /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{place.name}<span className="block text-xs font-normal text-white/45">{place.location}</span></span></button>)}</div></section> : <>
                <button type="button" onClick={() => setSelectedClaimPlace(null)} className="mb-4 flex w-full items-center justify-between rounded-2xl bg-[#292a2d] p-4 text-left"><span><span className="block text-xs text-white/45">Negocio seleccionado</span><span className="mt-1 block text-sm font-semibold">{selectedClaimPlace.name}</span></span><span className="text-xs text-white/55">Cambiar</span></button>
                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  <Field icon={<Store />} label="Nombre"><input required value={claimName} onChange={(e) => setClaimName(e.target.value)} className={inputClass} /></Field>
                  <Field icon={<MapPin />} label="Dirección"><input required value={claimAddress} onChange={(e) => setClaimAddress(e.target.value)} className={inputClass} /></Field>
                  <Field icon={<Phone />} label="Teléfono"><input required value={claimPhone} onChange={(e) => setClaimPhone(e.target.value)} className={inputClass} /></Field>
                  <Field icon={<span>@</span>} label="Correo de contacto"><input required type="email" value={claimEmail} onChange={(e) => setClaimEmail(e.target.value)} placeholder="tu@correo.com" className={inputClass} /></Field>
                </div>
                <Field icon={<Store />} label="Descripción"><textarea value={claimDescription} onChange={(e) => setClaimDescription(e.target.value)} rows={3} className={`${inputClass} !h-24 resize-y !py-3`} /></Field>
                <section className="my-4 rounded-[22px] bg-[#292a2d] p-4"><div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Clock3 className="h-4 w-4" />Horario semanal</div><div className="space-y-3">{weekDays.map((day) => { const dayHours = claimHours[day]; return <div key={day} className="rounded-2xl bg-white/[0.04] p-3"><div className="flex items-center justify-between"><span className="text-sm font-semibold">{day}</span><label className="flex items-center gap-2 text-xs text-white/60"><input type="checkbox" checked={dayHours.closed} onChange={(e) => updateHours(day, (current) => ({ ...current, closed: e.target.checked }))} />Cerrado</label></div>{!dayHours.closed && <div className="mt-2 space-y-2">{dayHours.intervals.map((interval, index) => <div key={index} className="flex items-center gap-2"><input aria-label={`${day}, apertura ${index + 1}`} type="time" value={interval.open} onChange={(e) => updateHours(day, (current) => ({ ...current, intervals: current.intervals.map((item, i) => i === index ? { ...item, open: e.target.value } : item) }))} className="min-w-0 flex-1 rounded-xl bg-[#202124] p-2 text-sm" /><span className="text-xs text-white/45">a</span><input aria-label={`${day}, cierre ${index + 1}`} type="time" value={interval.close} onChange={(e) => updateHours(day, (current) => ({ ...current, intervals: current.intervals.map((item, i) => i === index ? { ...item, close: e.target.value } : item) }))} className="min-w-0 flex-1 rounded-xl bg-[#202124] p-2 text-sm" />{index > 0 && <button type="button" aria-label="Quitar horario" onClick={() => updateHours(day, (current) => ({ ...current, intervals: current.intervals.filter((_, i) => i !== index) }))} className="rounded-full p-1 text-white/50"><Trash2 className="h-4 w-4" /></button>}</div>)}<button type="button" onClick={() => updateHours(day, (current) => ({ ...current, intervals: [...current.intervals, { open: '16:00', close: '20:00' }] }))} className="mt-1 text-xs font-semibold text-white/60">+ Agregar otro horario</button></div>}</div>; })}</div></section>
                <section className="mb-4 rounded-[22px] bg-[#292a2d] p-4"><div className="mb-2 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4" />Comprobante de propiedad</div><p className="mb-3 text-xs leading-relaxed text-white/55">Sube una factura de CFE u otro comprobante donde aparezca el negocio o tu nombre. Solo JPG o PNG, máximo 5 MB, sin límite de proporción.</p><input required type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={(e) => { const file = e.target.files?.[0] || null; if (file && (!['image/jpeg', 'image/png'].includes(file.type) || file.size > MAX_PHOTO_BYTES)) { setSubmitError(file.size > MAX_PHOTO_BYTES ? 'El comprobante debe pesar 5 MB o menos.' : 'El comprobante debe ser JPG o PNG.'); setClaimProof(null); return; } setSubmitError(''); setClaimProof(file); }} className="block w-full text-xs text-white/65 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-xs file:font-semibold file:text-black" />{claimProof && <p className="mt-2 truncate text-xs text-emerald-200">{claimProof.name}</p>}<p className="mt-3 text-[11px] leading-relaxed text-white/45">El comprobante se conservará de forma privada solo mientras se revisa tu solicitud y se eliminará al aprobarla o rechazarla. El correo queda registrado para contacto.</p></section>
              </>}
              {submitError && <p role="alert" className="mt-3 rounded-2xl bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{submitError}</p>}
              {selectedClaimPlace && <button type="submit" disabled={isSubmitting || !claimProof} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-bold text-black disabled:opacity-50">{isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}{isSubmitting ? 'Enviando solicitud…' : 'Enviar para revisión'}</button>}
            </form>
          ) : (
          <form onSubmit={submit} className="min-h-0 overflow-y-auto px-5 pb-8 pt-4">
            <p className="mb-5 text-sm text-white/55">Comparte los datos que aparecerán en la ficha pública de tu negocio.</p>

            <section className="mb-5 rounded-[22px] bg-[#292a2d] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><ImagePlus className="h-4 w-4 text-violet-300" /> Fotos del negocio <span className="text-xs font-normal text-white/40">Hasta 8</span></div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <label className="flex h-[92px] w-[100px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-white/20 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]">
                  <Camera className="h-5 w-5" /><span className="text-[11px] font-medium">Añadir fotos</span><input type="file" accept="image/*" multiple className="hidden" onChange={(event) => addPhotos(event.target.files)} />
                </label>
                {photos.map((photo, index) => <div key={`${photo.name}-${index}`} className="relative h-[92px] w-[100px] shrink-0 overflow-hidden rounded-2xl"><img src={photo.url} alt={photo.name} className="h-full w-full object-cover" />{isSubmitting && <div className="absolute inset-0 flex items-center justify-center bg-black/45"><div className="rounded-full bg-black/60 p-2"><LoaderCircle className="h-5 w-5 animate-spin text-white" /></div></div>}{!isSubmitting && <button type="button" onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded-full bg-black/60 p-1"><Trash2 className="h-3.5 w-3.5" /></button>}</div>)}
              </div>
              <p className="mt-2 text-[11px] text-white/45">Máximo 5 MB por imagen.</p>
              {photoError && <p className="mt-1 text-xs text-rose-300">{photoError}</p>}
              {isSubmitting && photos.length > 0 && <div className="mt-3" role="status" aria-live="polite"><div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/75"><LoaderCircle className="h-4 w-4 animate-spin text-white" />Subiendo fotos {uploadedPhotoCount} de {photos.length}</div><div className="flex gap-1.5">{photos.map((photo, index) => <div key={`${photo.name}-skeleton-${index}`} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><motion.div className="h-full rounded-full bg-white" initial={{ width: 0 }} animate={{ width: index < uploadedPhotoCount ? '100%' : index === uploadedPhotoCount ? '55%' : '0%' }} transition={{ duration: 0.35 }} /></div>)}</div></div>}
            </section>

            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field icon={<Store />} label="Nombre del negocio"><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Café de la Plaza" className={inputClass} /></Field>
              <Field icon={<MapPin />} label="Dirección"><input required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle, número y colonia" className={inputClass} /></Field>
              <Field icon={<Phone />} label="Teléfono"><input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(346) 123 4567" className={inputClass} /></Field>
              <Field icon={<Clock3 />} label="Horario"><input required value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Lun–Sáb · 9:00–18:00" className={inputClass} /></Field>
            </div>

            <section className="mb-4 rounded-[22px] bg-[#292a2d] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Tag className="h-4 w-4 text-amber-300" /> Categoría</div>
              <div className="flex flex-wrap gap-2">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} style={category === item ? { backgroundColor: '#ffffff', color: '#202124' } : { backgroundColor: '#36373b', color: '#f4f4f5' }} className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${category === item ? '!bg-white !text-[#202124]' : '!bg-[#36373b] !text-white'}`}>{item}</button>)}</div>
            </section>

            <section className="mb-4 rounded-[22px] bg-[#292a2d] p-4">
              <div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-semibold">Rango de precios</p><p className="mt-0.5 text-xs text-white/45">Precio promedio por persona</p></div><span className="rounded-full bg-white/[0.08] px-3 py-1 text-sm font-bold text-emerald-300">{'$'.repeat(cost)}</span></div>
              <div className="flex gap-2">{costs.map((value) => <button key={value} type="button" onClick={() => setCost(value)} className={`flex-1 rounded-xl py-2.5 text-sm font-bold ${cost === value ? 'bg-emerald-300 text-[#17221b]' : 'bg-white/[0.06] text-white/45'}`}>{'$'.repeat(value)}</button>)}</div>
            </section>

            <Field icon={<Store />} label="Descripción"><textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="¿Qué hace especial a tu negocio?" rows={5} className={`${inputClass} !h-36 resize-y !py-3.5`} /></Field>

            <section className="mb-4 mt-4 rounded-[22px] bg-[#292a2d] p-4">
              <p className="mb-3 text-sm font-semibold">Lo que deben saber tus clientes</p>
              <div className="mb-3 flex gap-2"><input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="Ej. Terraza, acepta tarjeta" className={`${inputClass} flex-1`} /><button type="button" onClick={addTag} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08]"><Plus className="h-5 w-5" /></button></div>
              <div className="flex flex-wrap gap-2">{['Wi-Fi', 'Accesible', 'Pet friendly', 'Para llevar'].map((tag) => <button type="button" key={tag} onClick={() => setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])} className={`rounded-full px-3 py-1.5 text-xs font-medium ${tags.includes(tag) ? 'bg-violet-300 text-[#241d2c]' : 'bg-white/[0.07] text-white/60'}`}>{tag}</button>)}{tags.filter((tag) => !['Wi-Fi', 'Accesible', 'Pet friendly', 'Para llevar'].includes(tag)).map((tag) => <button type="button" key={tag} onClick={() => setTags((current) => current.filter((item) => item !== tag))} className="rounded-full bg-violet-300/15 px-3 py-1.5 text-xs font-medium text-violet-200">{tag} ×</button>)}</div>
            </section>

            <Field icon={<span className="text-sm font-bold">@</span>} label="Correo para avisarte"><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" className={inputClass} /><span className="mt-2 block text-xs leading-relaxed text-white/55">Te enviaremos un correo cuando tu negocio sea aprobado.</span></Field>

            {submitError && <p role="alert" className="mt-4 rounded-2xl bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{submitError}</p>}
            {isSubmitting && photos.length > 0 && <div className="mt-4 space-y-2" aria-hidden="true"><div className="h-3 w-2/5 animate-pulse rounded-full bg-white/10" /><div className="h-2 w-full animate-pulse rounded-full bg-white/[0.06]" /></div>}
            <button type="submit" disabled={isSubmitting} style={{ backgroundColor: '#ffffff', color: '#111111' }} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full !bg-white py-3.5 text-sm font-bold !text-black transition-transform active:scale-[0.98] disabled:opacity-75">{isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}{isSubmitting ? (photos.length ? 'Subiendo imágenes…' : 'Enviando…') : 'Enviar para aprobación'}</button>
            <p className="mt-3 text-center text-[11px] text-white/35">Tu ficha se publicará cuando nuestro equipo la apruebe.</p>
          </form>
          )}
          </>
        )}
      </motion.section>
    </>
  );
}

const inputClass = 'h-12 w-full rounded-2xl !bg-[#303135] px-3.5 text-sm !text-white outline-none placeholder:!text-white/45 focus:ring-2 focus:ring-white/20';

function Field({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return <label className="mb-1 block rounded-[22px] bg-[#292a2d] p-4 text-xs font-semibold text-white/75"><span className="mb-3 flex items-center gap-2">{icon}<span>{label}</span></span>{children}</label>;
}
