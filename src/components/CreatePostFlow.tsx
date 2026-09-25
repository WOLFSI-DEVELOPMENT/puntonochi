import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Camera, Check, Images, LoaderCircle, RotateCcw, Search, X } from 'lucide-react';
import { mockPlaces } from '../data';
import { Place } from '../types';
import { apiFetch } from '../api';
import { SheetDragHandle, useSheetDrag } from './SheetDragHandle';

type FlowStep = 'camera' | 'preview' | 'compose' | 'published';

export function CreatePostFlow({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoPickerRef = useRef<HTMLInputElement>(null);
  const coverPickerRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<FlowStep>('camera');
  const [cameraError, setCameraError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [photo, setPhoto] = useState('');
  const [cover, setCover] = useState('');
  const [caption, setCaption] = useState('');
  const [search, setSearch] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showPlacePicker, setShowPlacePicker] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [photoName, setPhotoName] = useState('captured-photo.jpg');
  const [coverName, setCoverName] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const placePickerDrag = useSheetDrag(() => setShowPlacePicker(false));

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  };

  useEffect(() => {
    let cancelled = false;
    const startCamera = async () => {
      setCameraError('');
      setCameraReady(false);
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('La cámara no está disponible en este navegador. Puedes elegir una foto.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing } }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
          setCameraReady(true);
        }
      } catch {
        setCameraError('Permite el acceso a la cámara para tomar una foto. También puedes elegir una imagen.');
      }
    };
    if (step === 'camera') void startCamera();
    else stopCamera();
    return () => { cancelled = true; };
  }, [facing, step]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (photo.startsWith('blob:')) URL.revokeObjectURL(photo);
    if (cover.startsWith('blob:')) URL.revokeObjectURL(cover);
  }, [photo, cover]);

  const acceptPhoto = (image: string, name = 'uploaded-photo.jpg') => {
    setPhoto(image);
    setCover(image);
    setPhotoName(name);
    setCoverName('');
    setStep('preview');
  };

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setCapturing(true);
    const canvas = document.createElement('canvas');
    const side = Math.min(video.videoWidth, video.videoHeight, 1600);
    canvas.width = side;
    canvas.height = side;
    const context = canvas.getContext('2d');
    if (!context) { setCapturing(false); return; }
    context.translate(side, 0);
    context.scale(-1, 1);
    context.drawImage(video, (video.videoWidth - side) / 2, (video.videoHeight - side) / 2, side, side, 0, 0, side, side);
    window.setTimeout(() => {
      acceptPhoto(canvas.toDataURL('image/jpeg', 0.82), 'captured-photo.jpg');
      setCapturing(false);
    }, 140);
  };

  const onFile = (event: ChangeEvent<HTMLInputElement>, isCover = false) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPublishError('Elige un archivo de imagen válido.');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPublishError('Cada imagen debe pesar 5 MB o menos.');
      event.target.value = '';
      return;
    }
    setPublishError('');
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || '');
      if (isCover) { setCover(data); setCoverName(file.name); }
      else acceptPhoto(data, file.name);
    };
    reader.onerror = () => setPublishError('No se pudo leer la imagen. Inténtalo de nuevo.');
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const uploadImage = async (id: string, kind: 'photo' | 'cover', dataUrl: string, fileName: string) => {
    const comma = dataUrl.indexOf(',');
    if (comma < 0) throw new Error('La imagen seleccionada no es válida.');
    const mimeType = dataUrl.slice(5, dataUrl.indexOf(';'));
    const response = await apiFetch(`/api/community-posts/${id}/${kind}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, mimeType, base64: dataUrl.slice(comma + 1) }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || 'No se pudo subir la imagen.');
    }
  };

  const publish = async () => {
    if (!photo || isPublishing) return;
    if (!selectedPlace) {
      setShowPlacePicker(true);
      return;
    }
    setIsPublishing(true);
    setPublishError('');
    let postId = '';
    try {
      const draftResponse = await apiFetch('/api/community-posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: selectedPlace.id, placeName: selectedPlace.name, caption: caption.trim() }),
      });
      const draft = await draftResponse.json().catch(() => ({}));
      if (!draftResponse.ok || typeof draft.id !== 'string') throw new Error(draft.error || 'No se pudo crear la publicación.');
      postId = draft.id;
      await uploadImage(postId, 'photo', photo, photoName);
      if (cover && cover !== photo) await uploadImage(postId, 'cover', cover, coverName || 'cover-image.jpg');
      const publishResponse = await apiFetch(`/api/community-posts/${postId}/publish`, { method: 'POST' });
      const published = await publishResponse.json().catch(() => ({}));
      if (!publishResponse.ok) throw new Error(published.error || 'No se pudo publicar la imagen.');
      const imageUrl = String(published.imageUrl || '');
      const business = mockPlaces.find((place) => place.id === selectedPlace.id);
      if (business && imageUrl && !business.images.includes(imageUrl)) business.images = [...business.images, imageUrl];
      window.dispatchEvent(new CustomEvent('community-post-published', {
        detail: { id: postId, placeId: selectedPlace.id, placeName: selectedPlace.name, imageUrl, coverUrl: cover !== photo ? published.coverUrl : imageUrl, caption: caption.trim() },
      }));
      setStep('published');
    } catch (error) {
      if (postId) void apiFetch(`/api/community-posts/${postId}`, { method: 'DELETE' }).catch(() => undefined);
      setPublishError(error instanceof Error ? error.message : 'No se pudo publicar la imagen.');
    } finally {
      setIsPublishing(false);
    }
  };

  const matchingPlaces = mockPlaces.filter((place) => place.name.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')) || place.category.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));

  return (
    <motion.div className="fixed inset-0 z-[80] overflow-y-auto bg-black text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_43%,rgba(255,255,255,0.08),transparent_48%),linear-gradient(180deg,#050505_0%,#000_50%,#090909_100%)]" />

      {step === 'camera' && <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-5 pb-8 pt-16">
        <button type="button" onClick={onClose} className="absolute left-5 top-5 rounded-full bg-[#292929] px-4 py-2.5 text-sm font-semibold text-white"><ArrowLeft className="mr-2 inline h-4 w-4" />Volver</button>
        <div className="relative aspect-square w-full max-w-[min(78vw,440px)] overflow-hidden rounded-[34px] bg-[#171717] [corner-shape:squircle]">
          <video ref={videoRef} playsInline muted className={`h-full w-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`} />
          {!cameraReady && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#111] px-7 text-center"><Camera className="h-9 w-9 text-white/55" />{cameraError ? <p className="text-sm text-white/65">{cameraError}</p> : <><LoaderCircle className="h-5 w-5 animate-spin text-white/55" /><p className="text-sm text-white/55">Abriendo cámara…</p></>}</div>}
          {capturing && <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0.95 }} animate={{ opacity: 0 }} transition={{ duration: 0.35 }} />}
        </div>
        <div className="mt-7 flex w-full max-w-[440px] items-center justify-between px-5">
          <button type="button" onClick={() => photoPickerRef.current?.click()} aria-label="Elegir foto" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#292929] text-white"><Images className="h-5 w-5" /></button>
          <button type="button" onClick={takePhoto} disabled={!cameraReady} aria-label="Tomar foto" style={{ backgroundColor: '#ffffff', opacity: 1, boxShadow: '0 0 0 7px rgba(80,80,80,0.42), 0 0 14px 9px rgba(180,180,180,0.12)', backdropFilter: 'blur(10px)' }} className="flex h-16 w-16 items-center justify-center rounded-full !bg-white ring-1 ring-white/30 disabled:!opacity-100"><span className="h-full w-full rounded-full !bg-white" /></button>
          <button type="button" onClick={() => setFacing((current) => current === 'environment' ? 'user' : 'environment')} aria-label="Girar cámara" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#292929] text-white"><RotateCcw className="h-5 w-5" /></button>
        </div>
        <input ref={photoPickerRef} type="file" accept="image/*" className="hidden" onChange={(event) => onFile(event)} />
      </div>}

      {step === 'preview' && <div className="relative z-10 flex min-h-[100dvh] flex-col items-center px-5 pb-7 pt-5">
        <div className="flex w-full max-w-[520px] items-center"><button type="button" onClick={() => setStep('camera')} className="rounded-full bg-[#292929] px-4 py-2.5 text-sm font-semibold"><ArrowLeft className="mr-2 inline h-4 w-4" />Volver</button></div>
        <div className="flex flex-1 items-center justify-center py-6"><motion.img src={photo} alt="Foto capturada" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', damping: 22 }} className="aspect-square w-full max-w-[min(78vw,440px)] rounded-[34px] object-cover [corner-shape:squircle]" /></div>
        <button type="button" onClick={() => setStep('compose')} style={{ backgroundColor: '#ffffff', color: '#000000' }} className="w-full max-w-[520px] rounded-full !bg-white py-3.5 text-[15px] font-bold !text-black">Continuar</button>
      </div>}

      {step === 'compose' && <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[620px] flex-col px-5 pb-7 pt-5">
        <div className="flex items-center"><button type="button" onClick={() => setStep('preview')} className="rounded-full bg-[#292929] px-4 py-2.5 text-sm font-semibold"><ArrowLeft className="mr-2 inline h-4 w-4" />Volver</button><h1 className="ml-4 text-lg font-bold">Nueva publicación</h1></div>
        <div className="flex-1 overflow-y-auto pb-6 pt-5">
          <div className="flex gap-3 rounded-[28px] bg-[#202020] p-3">
            <img src={cover || photo} alt="Portada de publicación" className="aspect-[4/5] w-28 rounded-[21px] object-cover [corner-shape:squircle]" />
            <div className="flex min-w-0 flex-1 flex-col items-start justify-center"><p className="text-sm font-bold">Portada</p><p className="mt-1 text-xs leading-relaxed text-white/50">Usaremos tu foto automáticamente o elige otra imagen.</p><button type="button" onClick={() => coverPickerRef.current?.click()} className="mt-3 rounded-full bg-[#353535] px-4 py-2 text-xs font-semibold">Elegir portada</button><input ref={coverPickerRef} type="file" accept="image/*" className="hidden" onChange={(event) => onFile(event, true)} /></div>
          </div>
          <label className="mt-5 block"><span className="mb-2 block text-sm font-semibold">Detalles</span><textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={400} rows={4} placeholder="Cuéntale a la comunidad qué te gustó…" className="w-full resize-none rounded-[24px] bg-[#202020] px-4 py-4 text-sm text-white outline-none placeholder:text-white/35 focus:ring-1 focus:ring-white/20" /><span className="mt-1 block text-right text-xs text-white/35">{caption.length}/400</span></label>
          <button type="button" onClick={() => setShowPlacePicker(true)} className="mt-5 flex w-full items-center justify-between rounded-full bg-[#202020] px-5 py-4 text-left">
            <span><span className="block text-xs text-white/45">Este lugar pertenece a</span><span className="mt-1 block text-sm font-semibold">{selectedPlace?.name || 'Selecciona un negocio'}</span></span><span className="text-sm text-white/65">{selectedPlace ? 'Cambiar' : 'Elegir'}</span>
          </button>
        </div>
        {publishError && <p role="alert" className="mb-3 text-center text-sm text-red-300">{publishError}</p>}
        <button type="button" onClick={() => void publish()} disabled={isPublishing} style={{ backgroundColor: '#ffffff', color: '#000000' }} className="flex w-full items-center justify-center gap-2 rounded-full !bg-white py-3.5 text-[15px] font-bold !text-black disabled:opacity-70">{isPublishing && <LoaderCircle className="h-4 w-4 animate-spin" />}{isPublishing ? 'Publicando…' : 'Publicar'}</button>
      </div>}

      {step === 'published' && <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-7 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black"><Check className="h-8 w-8" /></div><h2 className="mt-5 text-2xl font-bold">¡Publicado!</h2><p className="mt-2 text-sm text-white/55">La imagen ya aparece en Explorar y en las fotos de {selectedPlace?.name}.</p><button type="button" onClick={onClose} style={{ backgroundColor: '#ffffff', color: '#000000' }} className="mt-7 rounded-full !bg-white px-8 py-3 text-sm font-bold !text-black">Listo</button></div>}

      <AnimatePresence>
        {showPlacePicker && <>
          <motion.button aria-label="Cerrar selector" onClick={() => setShowPlacePicker(false)} className="fixed inset-0 z-[90] bg-black/65" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.section {...placePickerDrag} role="dialog" aria-modal="true" className="fixed inset-x-0 bottom-0 z-[91] mx-auto flex h-[min(78dvh,720px)] w-full max-w-[620px] flex-col overflow-hidden rounded-t-[32px] bg-[#202020] pt-2" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 360, mass: 0.82 }}>
            <SheetDragHandle controls={placePickerDrag.dragControls}/>
            <div className="mb-4 flex items-center justify-between px-5"><h2 className="text-lg font-bold">Elige un negocio</h2><button type="button" onClick={() => setShowPlacePicker(false)} aria-label="Cerrar" className="rounded-full bg-white/[0.08] p-2"><X className="h-4 w-4" /></button></div>
            <div className="mx-5 mb-4 flex items-center gap-2 rounded-full bg-[#303030] px-4 py-3"><Search className="h-4 w-4 shrink-0 text-white/45" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar negocio" style={{ background: 'transparent', backgroundColor: 'transparent' }} className="!min-w-0 !flex-1 !bg-transparent text-sm text-white outline-none placeholder:text-white/50" /></div>
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_62%,rgba(0,0,0,0.78)_100%)]" />
              <div className="absolute inset-0 space-y-2 overflow-y-auto overscroll-contain touch-pan-y px-5 pb-8">{matchingPlaces.map((place) => <button key={place.id} type="button" onClick={() => setSelectedPlace(place)} className={`flex w-full items-center gap-3 rounded-full p-2 text-left transition-colors ${selectedPlace?.id === place.id ? 'bg-[#3a3a3a]' : 'bg-[#292929]'}`}><img src={place.images?.[0]} alt="" className="h-12 w-12 rounded-full object-cover" /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{place.name}</span>{selectedPlace?.id === place.id && <Check className="mr-2 h-5 w-5 text-white" />}</button>)}</div>
            </div>
            <div className="relative z-10 w-full bg-transparent px-5 pb-7 pt-5">
              <button type="button" disabled={!selectedPlace} onClick={() => setShowPlacePicker(false)} style={{ backgroundColor: '#ffffff', color: '#000000' }} className="flex w-full items-center justify-center gap-2 rounded-full !bg-white py-3.5 text-sm font-bold !text-black disabled:!bg-white disabled:!text-black"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-white"><Check className="h-4 w-4" /></span>{selectedPlace ? 'Seleccionar negocio' : 'Selecciona un negocio'}</button>
            </div>
          </motion.section>
        </>}
      </AnimatePresence>
    </motion.div>
  );
}
