import { useRef, useState, type ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Camera, Check, Home, ImagePlus, LoaderCircle, MapPin, Plus, Store, Trash2, Utensils, Wrench, X } from 'lucide-react';
import { apiFetch } from '../api';
import { SheetDragHandle, useSheetDrag } from './SheetDragHandle';

const categories = [
  { label: 'Artículos', emoji: '🛍️', note: 'Objetos nuevos o usados', fields: [{ id: 'condition', label: 'Condición', type: 'select', options: ['Nuevo', 'Buen estado', 'Usado'] }, { id: 'brand', label: 'Marca', type: 'text' }] },
  { label: 'Empleos', emoji: '💼', note: 'Vacantes y trabajo local', fields: [{ id: 'workType', label: 'Tipo de empleo', type: 'select', options: ['Tiempo completo', 'Medio tiempo', 'Temporal', 'Por proyecto'] }, { id: 'schedule', label: 'Horario', type: 'text' }, { id: 'requirements', label: 'Requisitos', type: 'text' }] },
  { label: 'Casas', emoji: '🏡', note: 'Compra y venta de casas', fields: [{ id: 'operation', label: 'Operación', type: 'select', options: ['Venta', 'Traspaso'] }, { id: 'bedrooms', label: 'Recámaras', type: 'number' }, { id: 'bathrooms', label: 'Baños', type: 'number' }] },
  { label: 'Rentas', emoji: '🔑', note: 'Casas, cuartos y locales', fields: [{ id: 'propertyType', label: 'Tipo de espacio', type: 'select', options: ['Casa', 'Cuarto', 'Departamento', 'Local'] }, { id: 'bedrooms', label: 'Recámaras', type: 'number' }, { id: 'furnished', label: 'Amueblado', type: 'select', options: ['Sí', 'No'] }] },
  { label: 'Comida', emoji: '🍒', note: 'Platillos, menús y antojos', fields: [{ id: 'foodType', label: 'Tipo de comida', type: 'text' }, { id: 'orderMethod', label: 'Entrega', type: 'select', options: ['Recoger', 'Entrega a domicilio', 'En el local'] }, { id: 'hours', label: 'Horario de pedidos', type: 'text' }] },
  { label: 'Servicios', emoji: '🛠️', note: 'Oficios y ayuda profesional', fields: [{ id: 'serviceType', label: 'Tipo de servicio', type: 'text' }, { id: 'serviceArea', label: 'Zona de servicio', type: 'text' }, { id: 'availability', label: 'Disponibilidad', type: 'text' }] },
  { label: 'Negocios', emoji: '🏪', note: 'Tiendas y comercios locales', fields: [{ id: 'businessType', label: 'Tipo de negocio', type: 'text' }, { id: 'hours', label: 'Horario', type: 'text' }, { id: 'phone', label: 'Teléfono de contacto', type: 'tel' }] },
  { label: 'Otros', emoji: '✨', note: 'Lo que no cabe en otra categoría', fields: [{ id: 'condition', label: 'Condición', type: 'select', options: ['Nuevo', 'Buen estado', 'Usado'] }] },
] as const;

type Category = (typeof categories)[number];
type Photo = { name: string; preview: string; base64: string; mimeType: string };
type Field = Category['fields'][number];

const readDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('No se pudo leer esta foto.'));
  reader.readAsDataURL(blob);
});

async function preparePhoto(file: File): Promise<Photo> {
  if (!file.type.startsWith('image/')) throw new Error('Elige archivos de imagen.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) { bitmap.close(); throw new Error('No se pudo preparar la foto.'); }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const compressed = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('No se pudo comprimir esta foto.')), 'image/jpeg', .84));
  if (compressed.size > 4 * 1024 * 1024) throw new Error('Una foto sigue siendo muy pesada. Elige otra imagen.');
  const dataUrl = await readDataUrl(compressed);
  return { name: file.name, preview: dataUrl, base64: dataUrl.split(',')[1] || '', mimeType: 'image/jpeg' };
}

export function MarketplaceListingFlow({ onClose }: { onClose: () => void }) {
  const drag = useSheetDrag(onClose);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<Category | null>(null);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const addPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    if (photos.length + files.length > 5) { setError('Puedes agregar hasta cinco fotos.'); return; }
    setError('');
    try {
      const prepared = await Promise.all(files.map(preparePhoto));
      setPhotos((current) => [...current, ...prepared].slice(0, 5));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudieron preparar las fotos.'); }
  };

  const next = () => {
    setError('');
    if (step === 0 && !category) { setError('Elige una categoría para continuar.'); return; }
    if (step === 1 && (!title.trim() || !price.trim() || !location.trim() || !description.trim())) { setError('Completa título, precio, ubicación y descripción.'); return; }
    if (step === 2 && !photos.length) { setError('Agrega al menos una foto para publicar.'); return; }
    setStep((current) => Math.min(3, current + 1));
  };

  const publish = async () => {
    if (!category || busy) return;
    setBusy(true); setError('');
    let listingId = '';
    try {
      const draftResponse = await apiFetch('/api/marketplace/listings', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: category.label, title, price, location, description, details }) });
      const draft = await draftResponse.json().catch(() => ({}));
      if (!draftResponse.ok) throw new Error(draft.error || 'No se pudo guardar el anuncio.');
      listingId = draft.id;
      for (let index = 0; index < photos.length; index += 1) {
        setUploadStatus(`Subiendo foto ${index + 1} de ${photos.length}…`);
        const photo = photos[index];
        const response = await apiFetch(`/api/marketplace/listings/${encodeURIComponent(listingId)}/images`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(photo) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'No se pudo guardar una foto.');
      }
      const response = await apiFetch(`/api/marketplace/listings/${encodeURIComponent(listingId)}/publish`, { method: 'POST', credentials: 'same-origin' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'No se pudo publicar el anuncio.');
      window.dispatchEvent(new Event('marketplace-listing-published'));
      setPublished(true);
    } catch (reason) {
      if (listingId) await apiFetch(`/api/marketplace/listings/${encodeURIComponent(listingId)}/draft`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => undefined);
      setError(reason instanceof Error ? reason.message : 'No se pudo publicar. Inténtalo de nuevo.');
    } finally { setBusy(false); setUploadStatus(''); }
  };

  const fieldLabel = (field: Field) => field.label;
  const fieldType = (field: Field) => field.type;

  return <>
    <motion.button type="button" aria-label="Cerrar publicación" onClick={onClose} className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}/>
    <motion.section {...drag} role="dialog" aria-modal="true" aria-label="Publicar en Mercado" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 360 }} className="fixed inset-x-0 bottom-0 z-[101] mx-auto flex max-h-[94dvh] w-full max-w-[680px] flex-col overflow-hidden rounded-t-[30px] bg-[#202124] text-white shadow-2xl">
      <div className="shrink-0 border-b border-white/[0.07] px-5 pb-4 pt-1"><SheetDragHandle controls={drag.dragControls}/><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-white/40">Mercado local</p><h2 className="mt-1 text-xl font-bold">{published ? 'Anuncio publicado' : 'Publica tu anuncio'}</h2></div><button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08]"><X className="h-4 w-4"/></button></div>
        {!published && <div className="mt-4 flex gap-1.5">{[0,1,2,3].map((value) => <span key={value} className={`h-1 flex-1 rounded-full ${value <= step ? 'bg-white/90' : 'bg-white/10'}`}/>)}</div>}
      </div>
      {published ? <div className="flex-1 px-6 py-12 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"><Check className="h-7 w-7"/></span><h3 className="mt-4 text-lg font-bold">Ya está en el Mercado</h3><p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/55">Tu anuncio y sus fotos se guardaron y ya aparecen publicados.</p><button type="button" onClick={onClose} className="mt-6 h-11 w-full rounded-full bg-white text-sm font-bold text-black">Listo</button></div> : <>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {step === 0 && <section><h3 className="text-base font-bold">¿Qué quieres publicar?</h3><p className="mt-1 text-xs text-white/50">Elige la categoría que mejor lo describe.</p><div className="mt-4 grid grid-cols-2 gap-2">{categories.map((item) => <button type="button" key={item.label} onClick={() => setCategory(item)} aria-pressed={category?.label === item.label} className={`marketplace-create-category ${category?.label === item.label ? 'marketplace-create-category-selected' : ''}`}><span className="text-2xl">{item.emoji}</span><span className="mt-1 text-left text-xs font-bold">{item.label}</span><span className="mt-0.5 text-left text-[10px] text-white/45">{item.note}</span></button>)}</div></section>}
          {step === 1 && category && <section><h3 className="text-base font-bold">Detalles del anuncio</h3><p className="mt-1 text-xs text-white/50">{category.label} · Describe claramente lo que ofreces.</p><div className="mt-4 space-y-3">
            <label className="marketplace-create-label">Título<input value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Bicicleta rodada 26"/></label>
            <label className="marketplace-create-label">Precio<input value={price} maxLength={60} onChange={(event) => setPrice(event.target.value)} placeholder={category.label === 'Empleos' ? 'Ej. $2,000 por semana' : 'Ej. $2,400 o A tratar'}/></label>
            <label className="marketplace-create-label">Ubicación<input value={location} maxLength={120} onChange={(event) => setLocation(event.target.value)} placeholder="Ej. Centro, Nochistlán"/></label>
            {category.fields.map((field) => <label key={field.id} className="marketplace-create-label">{fieldLabel(field)}{'options' in field ? <select value={details[field.id] || ''} onChange={(event) => setDetails((current) => ({ ...current, [field.id]: event.target.value }))}><option value="">Selecciona una opción</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : <input type={fieldType(field)} value={details[field.id] || ''} onChange={(event) => setDetails((current) => ({ ...current, [field.id]: event.target.value }))} placeholder={field.type === 'number' ? '0' : field.label}/>}</label>)}
            <label className="marketplace-create-label">Descripción<textarea value={description} maxLength={2000} rows={4} onChange={(event) => setDescription(event.target.value)} placeholder="Agrega detalles importantes para las personas interesadas."/></label>
          </div></section>}
          {step === 2 && <section><h3 className="text-base font-bold">Fotos del anuncio</h3><p className="mt-1 text-xs text-white/50">Agrega entre una y cinco fotos. Puedes cambiar el orden quitando y seleccionando de nuevo.</p><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => void addPhotos(event)}/><div className="mt-4 grid grid-cols-3 gap-2">{photos.map((photo, index) => <div key={`${photo.name}-${index}`} className="relative aspect-square overflow-hidden rounded-[18px] bg-[#161719]"><img src={photo.preview} alt={photo.name} className="h-full w-full object-cover"/><span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/65 px-2 py-1 text-[9px]">{index + 1}</span><button type="button" onClick={() => setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))} aria-label={`Quitar foto ${index + 1}`} className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/65"><Trash2 className="h-3.5 w-3.5"/></button></div>)}{photos.length < 5 && <button type="button" onClick={() => fileInputRef.current?.click()} className="flex aspect-square flex-col items-center justify-center rounded-[18px] bg-[#292a2d] text-white/65"><ImagePlus className="h-6 w-6"/><span className="mt-1 text-[10px]">Agregar foto</span></button>}</div></section>}
          {step === 3 && category && <section><h3 className="text-base font-bold">Revisa y publica</h3><div className="mt-4 overflow-hidden rounded-[22px] bg-[#292a2d]">{photos.length > 0 && <img src={photos[0].preview} alt="Vista previa del anuncio" className="aspect-[1.7/1] w-full object-cover"/>}<div className="p-4"><span className="text-[10px] font-semibold text-white/45">{category.label} · {location}</span><h4 className="mt-1 text-base font-bold">{title}</h4><p className="mt-1 text-lg font-extrabold">{price}</p><p className="mt-2 line-clamp-4 text-xs leading-relaxed text-white/60">{description}</p><p className="mt-3 text-[10px] text-white/40">{photos.length} {photos.length === 1 ? 'foto' : 'fotos'} · Trato directo entre personas</p></div></div><p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-white/45"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0"/>Coordina la entrega y el pago directamente con quien te contacte.</p></section>}
          {error && <p role="alert" className="mt-4 rounded-[14px] bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>}
        </div>
        <div className="flex shrink-0 gap-2 border-t border-white/[0.07] px-5 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
          {step > 0 && <button type="button" disabled={busy} onClick={() => { setError(''); setStep((current) => current - 1); }} className="flex h-11 w-12 shrink-0 items-center justify-center rounded-full bg-[#303135] text-white"><ArrowLeft className="h-4 w-4"/></button>}
          {step < 3 ? <button type="button" onClick={next} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-[#17181a]">Continuar <ArrowRight className="h-4 w-4"/></button> : <button type="button" disabled={busy} onClick={() => void publish()} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-[#17181a] disabled:opacity-55">{busy ? <><LoaderCircle className="h-4 w-4 animate-spin"/>{uploadStatus || 'Publicando…'}</> : <>Publicar anuncio <ArrowRight className="h-4 w-4"/></>}</button>}
        </div>
      </>}
    </motion.section>
  </>;
}
