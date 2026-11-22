import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Camera, ChevronRight, ImagePlus, Video, X } from 'lucide-react';
import { SheetDragHandle, useSheetDrag } from './SheetDragHandle';

const MAX_SIDE = 1600;

// Resize on the phone so uploads are fast and always fit in a normal request.
async function prepareImage(file: File): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  if (!file.type.startsWith('image/')) throw new Error('Elige un archivo de imagen válido.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  let quality = 0.82;
  let blob: Blob | null = null;
  for (let i = 0; i < 4; i += 1) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (blob && blob.type === 'image/webp' && blob.size <= 2_200_000) break;
    if (blob && blob.type !== 'image/webp') { // browser without WebP encoding
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size <= 2_200_000) break;
    }
    quality -= 0.15;
  }
  if (!blob || blob.size > 3_000_000) throw new Error('No se pudo optimizar la imagen. Prueba con otra foto.');
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(blob!);
  });
  return { base64, mimeType: blob.type, previewUrl: URL.createObjectURL(blob) };
}

export function CreateSheet({ onClose, onReel }: { onClose: () => void; onReel: () => void }) {
  const sheetDrag = useSheetDrag(onClose);
  const [step, setStep] = useState<'choose' | 'photo'>('choose');
  const [image, setImage] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl); }, [image]);

  const choose = async (file?: File) => {
    if (!file) return;
    setMessage(''); setBusy(true);
    try { setImage(await prepareImage(file)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo preparar la imagen.'); }
    finally { setBusy(false); }
  };

  const publish = async () => {
    if (!image || busy) return;
    setBusy(true); setMessage('Publicando…');
    try {
      const response = await fetch('/api/community-posts', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base64: image.base64, mimeType: image.mimeType, caption }) });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) { setMessage('Inicia sesión para publicar tu foto.'); return; }
      if (!response.ok) throw new Error(result.error || 'No se pudo publicar la foto.');
      window.dispatchEvent(new CustomEvent('puntonochi:community-post-published'));
      setDone(true); setMessage('¡Foto publicada en tu perfil!');
      window.setTimeout(onClose, 1200);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo publicar la foto.'); }
    finally { setBusy(false); }
  };

  return <>
    <motion.button type="button" data-sheet-close aria-label="Cerrar" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[84] cursor-default bg-black/60 backdrop-blur-sm" />
    <motion.section {...sheetDrag} role="dialog" aria-modal="true" aria-label="Crear" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 360, mass: 0.82 }} className="fixed inset-x-0 bottom-0 z-[85] mx-auto flex max-h-[92dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[32px] bg-[#1b1c1f]/80 text-white backdrop-blur-2xl backdrop-saturate-150">
      <div className="relative shrink-0 px-5 pb-3 pt-7">
        <SheetDragHandle controls={sheetDrag.dragControls} className="absolute inset-x-0 top-0" />
        <div className="flex items-center gap-3">
          {step === 'photo' && <button type="button" onClick={() => { setStep('choose'); setMessage(''); }} aria-label="Volver" className="rounded-full bg-white/[0.08] p-2"><ArrowLeft className="h-4 w-4" /></button>}
          <h2 className="min-w-0 flex-1 text-xl font-bold">{step === 'choose' ? 'Crear' : 'Publicar foto'}</h2>
          <button type="button" onClick={onClose} data-sheet-close aria-label="Cerrar" className="rounded-full bg-white/[0.08] p-2"><X className="h-5 w-5" /></button>
        </div>
      </div>

      <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-2">
        {step === 'choose' && <div className="space-y-3">
          <button type="button" onClick={() => { onClose(); onReel(); }} className="flex w-full items-center gap-4 rounded-[24px] bg-white/[.07] p-4 text-left backdrop-blur-xl">
            <span className="rounded-2xl bg-rose-400/15 p-3 text-rose-200"><Video className="h-5 w-5" /></span>
            <span className="flex-1"><span className="block font-bold">Subir reel</span><span className="mt-1 block text-xs text-white/50">Comparte un video corto de Nochistlán</span></span>
            <ChevronRight className="h-5 w-5 text-white/35" />
          </button>
          <button type="button" onClick={() => setStep('photo')} className="flex w-full items-center gap-4 rounded-[24px] bg-white/[.07] p-4 text-left backdrop-blur-xl">
            <span className="rounded-2xl bg-sky-300/15 p-3 text-sky-200"><ImagePlus className="h-5 w-5" /></span>
            <span className="flex-1"><span className="block font-bold">Publicar foto</span><span className="mt-1 block text-xs text-white/50">Muestra un lugar, un platillo o un momento</span></span>
            <ChevronRight className="h-5 w-5 text-white/35" />
          </button>
        </div>}

        {step === 'photo' && <div className="space-y-4">
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ''; }} />
          {image
            ? <button type="button" onClick={() => fileRef.current?.click()} aria-label="Cambiar foto" className="relative block w-full overflow-hidden rounded-[24px] bg-black/30">
                <img src={image.previewUrl} alt="Vista previa de tu foto" className="max-h-[46dvh] w-full object-cover" />
              </button>
            : <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="flex h-48 w-full flex-col items-center justify-center gap-3 rounded-[24px] bg-white/[.07] text-white/70 backdrop-blur-xl disabled:opacity-60">
                <Camera className="h-8 w-8" /><span className="text-sm font-semibold">{busy ? 'Preparando…' : 'Elegir o tomar una foto'}</span>
              </button>}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-white/55">Descripción (opcional)</span>
            <textarea value={caption} onChange={(event) => setCaption(event.target.value.slice(0, 500))} rows={3} placeholder="Cuenta algo sobre esta foto…" className="w-full resize-none rounded-[18px] bg-white/[.07] px-4 py-3 text-[16px] text-white placeholder:text-white/35 outline-none" />
          </label>
          {message && <p role="status" className={`text-center text-xs font-medium ${done ? 'text-emerald-300' : 'text-white/65'}`}>{message}</p>}
          <button type="button" onClick={() => void publish()} disabled={!image || busy || done} className="h-12 w-full rounded-full bg-white text-sm font-bold text-[#202124] transition active:scale-[.98] disabled:opacity-40">{busy ? 'Publicando…' : 'Publicar'}</button>
        </div>}
      </div>
    </motion.section>
  </>;
}
