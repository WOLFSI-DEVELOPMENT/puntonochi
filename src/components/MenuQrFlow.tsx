import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ArrowLeft, Camera, Check, Download, LoaderCircle, Plus, Printer, QrCode, RefreshCw, Sparkles, Trash2, Upload, X } from 'lucide-react';
import QRCode from 'qrcode';

type MenuItem = { name: string; description: string; price: string };
type MenuSection = { name: string; items: MenuItem[] };
type MenuDraft = { businessName: string; description: string; sections: MenuSection[] };
export type SavedMenuProject = { id: string; title: string; subtitle: string; image: string; date: string; kind: 'menu' };

const initialDraft: MenuDraft = { businessName: '', description: '', sections: [] };

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(blob);
  });
}

async function compressPhoto(file: Blob) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo preparar la foto.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const compressed = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('No se pudo comprimir la foto.')), 'image/jpeg', .86));
  return { base64: await blobToBase64(compressed), preview: URL.createObjectURL(compressed) };
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  let line = '';
  let lineNumber = 0;
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      if (lineNumber >= maxLines) return;
      context.fillText(line, x, y + lineNumber * lineHeight);
      line = word;
      lineNumber += 1;
    } else line = candidate;
  }
  if (line && lineNumber < maxLines) context.fillText(line, x, y + lineNumber * lineHeight);
}

async function renderMenuPoster(menu: MenuDraft, publicUrl: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear el diseño del menú.');
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, publicUrl, { width: 360, margin: 1, errorCorrectionLevel: 'H', color: { dark: '#171717', light: '#ffffff' } });

  context.fillStyle = '#f7f5ef';
  context.fillRect(0, 0, 1080, 1920);
  context.fillStyle = '#ee4b2d';
  context.fillRect(0, 0, 1080, 360);
  context.fillStyle = '#ffffff';
  context.font = '700 30px Arial';
  context.fillText('PUNTONOCHI  ·  MENÚ', 82, 92);
  context.font = '700 66px Arial';
  wrapCanvasText(context, menu.businessName || 'Nuestro menú', 82, 192, 900, 78, 2);
  if (menu.description) {
    context.font = '400 30px Arial';
    context.fillStyle = 'rgba(255,255,255,.84)';
    wrapCanvasText(context, menu.description, 84, 298, 890, 40, 1);
  }

  const menuPanelY = 402;
  const qrBlockHeight = 500;
  const menuPanelHeight = 1920 - menuPanelY - qrBlockHeight - 56;
  context.fillStyle = '#ffffff';
  roundedRect(context, 58, menuPanelY, 964, menuPanelHeight, 38);
  context.fill();
  const allItems = menu.sections.flatMap((section) => section.items.map((item) => ({ ...item, section: section.name })));
  const visibleCount = Math.max(1, Math.floor((menuPanelHeight - 110) / 104));
  const shownItems = allItems.slice(0, visibleCount);
  let y = menuPanelY + 80;
  context.textAlign = 'left';
  for (let index = 0; index < shownItems.length; index += 1) {
    const item = shownItems[index];
    context.fillStyle = '#ee4b2d';
    context.font = '700 17px Arial';
    context.fillText((item.section || '').toLocaleUpperCase('es-MX').slice(0, 40), 100, y - 30);
    context.fillStyle = '#171717';
    context.font = '700 28px Arial';
    context.fillText(item.name.slice(0, 36), 100, y + 2);
    if (item.price) {
      context.textAlign = 'right';
      context.font = '700 25px Arial';
      context.fillText(item.price.slice(0, 18), 970, y + 2);
      context.textAlign = 'left';
    }
    if (item.description) {
      context.fillStyle = '#686868';
      context.font = '400 18px Arial';
      context.fillText(item.description.slice(0, 78), 100, y + 32);
    }
    if (index < shownItems.length - 1) {
      context.strokeStyle = '#ece9e2';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(100, y + 55);
      context.lineTo(980, y + 55);
      context.stroke();
    }
    y += 104;
  }
  if (allItems.length > shownItems.length) {
    context.fillStyle = '#777777';
    context.font = '600 18px Arial';
    context.fillText(`Escanea el código para ver los ${allItems.length} productos`, 100, menuPanelY + menuPanelHeight - 35);
  }

  const qrSize = 310;
  const qrX = (1080 - qrSize) / 2;
  const qrY = 1424;
  context.fillStyle = '#ffffff';
  roundedRect(context, qrX - 22, qrY - 22, qrSize + 44, qrSize + 44, 30);
  context.fill();
  context.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
  context.fillStyle = '#171717';
  context.textAlign = 'center';
  context.font = '700 28px Arial';
  context.fillText('ESCANEA PARA VER EL MENÚ', 540, 1808);
  context.fillStyle = '#737373';
  context.font = '400 18px Arial';
  context.fillText('Consulta el menú completo en PuntoNochi', 540, 1848);
  return canvas.toDataURL('image/png');
}

export function MenuQrFlow({ accountName, onClose, onSaved }: { accountName: string; onClose: () => void; onSaved: (project: SavedMenuProject) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [photo, setPhoto] = useState<{ base64: string; preview: string } | null>(null);
  const [draft, setDraft] = useState<MenuDraft>({ ...initialDraft, businessName: accountName || '' });
  const [step, setStep] = useState<'capture' | 'edit' | 'done'>('capture');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [poster, setPoster] = useState('');
  const [savedMenuUrl, setSavedMenuUrl] = useState('');

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  };

  useEffect(() => {
    if (videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [cameraReady]);
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (photo?.preview) URL.revokeObjectURL(photo.preview);
  }, [photo?.preview]);

  const openCamera = async () => {
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('La cámara no está disponible aquí. Puedes subir una foto del menú.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      streamRef.current = stream;
      setCameraReady(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo abrir la cámara. Revisa los permisos o sube una foto.');
    }
  };

  const setPhotoFromBlob = async (blob: Blob) => {
    if (photo?.preview) URL.revokeObjectURL(photo.preview);
    const next = await compressPhoto(blob);
    setPhoto(next);
    stopCamera();
    setError('');
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', .9));
    if (blob) await setPhotoFromBlob(blob);
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Elige una foto JPG, PNG o WebP del menú.'); return; }
    try { await setPhotoFromBlob(file); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo abrir esa imagen.'); }
  };

  const analyzePhoto = async () => {
    if (!photo) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/menus/analyze', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mimeType: 'image/jpeg', base64: photo.base64 }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo analizar la foto.');
      const analyzed = result.menu as MenuDraft;
      setDraft({ businessName: analyzed.businessName || accountName || '', description: analyzed.description || '', sections: Array.isArray(analyzed.sections) ? analyzed.sections.map((section) => ({ name: String(section.name || 'Menú').slice(0, 60), items: Array.isArray(section.items) ? section.items.slice(0, 40).map((item) => ({ name: String(item.name || '').slice(0, 100), description: String(item.description || '').slice(0, 220), price: String(item.price || '').slice(0, 30) })) : [] })).filter((section) => section.items.length) : [] });
      setStep('edit');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo analizar la imagen.'); }
    finally { setBusy(false); }
  };

  const updateItem = (sectionIndex: number, itemIndex: number, field: keyof MenuItem, value: string) => {
    setDraft((current) => ({ ...current, sections: current.sections.map((section, currentSection) => currentSection !== sectionIndex ? section : { ...section, items: section.items.map((item, currentItem) => currentItem !== itemIndex ? item : { ...item, [field]: value }) }) }));
  };

  const createMenu = async () => {
    const itemCount = draft.sections.reduce((count, section) => count + section.items.filter((item) => item.name.trim()).length, 0);
    if (!draft.businessName.trim() || !itemCount) { setError('Agrega el nombre del negocio y al menos un producto.'); return; }
    setBusy(true);
    setError('');
    try {
      const id = crypto.randomUUID();
      const menuUrl = `${window.location.origin}/menu/${id}`;
      const posterDataUrl = await renderMenuPoster(draft, menuUrl);
      const posterBase64 = posterDataUrl.split(',')[1] || '';
      const response = await fetch('/api/menus', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, menu: draft, posterBase64, posterMimeType: 'image/png' }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar el menú.');
      setPoster(posterDataUrl);
      setSavedMenuUrl(result.url || menuUrl);
      onSaved({ id, title: draft.businessName, subtitle: 'Menú interactivo · QR listo', image: result.posterUrl, date: result.createdAt || new Date().toISOString(), kind: 'menu' });
      setStep('done');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el menú. Inténtalo de nuevo.'); }
    finally { setBusy(false); }
  };

  const printPoster = () => {
    if (!poster) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { setError('Permite las ventanas emergentes para imprimir el diseño.'); return; }
    printWindow.document.write(`<!doctype html><html><head><title>Menú · ${draft.businessName.replace(/[<>]/g, '')}</title><style>@page{size:108mm 192mm;margin:0}html,body{margin:0;width:108mm;height:192mm}img{width:100%;height:100%;object-fit:contain}</style></head><body><img src="${poster}" alt="Menú QR" onload="window.print()"></body></html>`);
    printWindow.document.close();
  };

  return <main className="menu-qr-flow fixed inset-0 z-[100] overflow-y-auto bg-[#f4f4f2] text-[#171717]">
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-black/[.08] bg-[#f4f4f2]/95 px-4 backdrop-blur sm:px-7"><button type="button" onClick={() => step === 'capture' ? onClose() : setStep('capture')} className="flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-black/5"><ArrowLeft className="h-4 w-4"/>{step === 'capture' ? 'Crear' : step === 'edit' ? 'Foto del menú' : 'Terminado'}</button><span className="text-xs font-semibold text-black/45">Menú con QR</span><button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/5"><X className="h-5 w-5"/></button></header>

    <div className="mx-auto w-full max-w-xl px-4 pb-10 pt-5 sm:px-7">
      {step === 'capture' && <>
        <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#ee4b2d]">Paso 1 de 3</p><h1 className="mt-2 text-2xl font-bold">Toma una foto de tu menú</h1><p className="mt-1 text-sm text-black/55">La IA leerá los platillos, categorías y precios para crear un menú digital.</p></div>
        <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[26px] bg-[#e5e3dd]">
          {photo ? <img src={photo.preview} alt="Foto del menú" className="h-full w-full object-contain"/> : cameraReady ? <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover"/> : <div className="px-8 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#ee4b2d] shadow-sm"><Camera className="h-7 w-7"/></span><p className="mt-3 text-sm font-semibold">Encuadra todo el menú</p><p className="mt-1 text-xs text-black/45">Procura tener buena luz y que los precios se lean.</p></div>}
          {cameraReady && <div className="pointer-events-none absolute inset-5 rounded-[18px] border border-white/75"/>}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={(event) => void handleFile(event)} className="sr-only"/>
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {!photo && !cameraReady && <><button type="button" onClick={() => void openCamera()} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#171717] text-sm font-bold text-white"><Camera className="h-4 w-4"/>Abrir cámara</button><button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-12 items-center justify-center gap-2 rounded-full border border-black/10 bg-white text-sm font-semibold"><Upload className="h-4 w-4"/>Subir foto</button></>}
          {cameraReady && <><button type="button" onClick={() => void capturePhoto()} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#ee4b2d] text-sm font-bold text-white"><Camera className="h-4 w-4"/>Tomar foto</button><button type="button" onClick={() => { stopCamera(); fileInputRef.current?.click(); }} className="flex h-12 items-center justify-center gap-2 rounded-full border border-black/10 bg-white text-sm font-semibold"><Upload className="h-4 w-4"/>Subir foto</button></>}
          {photo && <><button type="button" onClick={() => { setPhoto(null); setError(''); }} className="flex h-12 items-center justify-center gap-2 rounded-full border border-black/10 bg-white text-sm font-semibold"><RefreshCw className="h-4 w-4"/>Cambiar foto</button><button type="button" onClick={() => void analyzePhoto()} disabled={busy} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#171717] text-sm font-bold text-white disabled:opacity-55">{busy ? <><LoaderCircle className="h-4 w-4 animate-spin"/>Analizando…</> : <><Sparkles className="h-4 w-4"/>Analizar con IA</>}</button></>}
        </div>
      </>}

      {step === 'edit' && <>
        <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#ee4b2d]">Paso 2 de 3</p><h1 className="mt-2 text-2xl font-bold">Revisa tu menú</h1><p className="mt-1 text-sm text-black/55">La IA hizo un borrador. Corrige nombres o precios antes de publicarlo.</p></div>
        <label className="menu-qr-field mb-3 block text-xs font-semibold text-black/60">Nombre del negocio<input value={draft.businessName} onChange={(event) => setDraft((current) => ({ ...current, businessName: event.target.value }))} maxLength={100} className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-black outline-none focus:border-black/30"/></label>
        <label className="menu-qr-field mb-5 block text-xs font-semibold text-black/60">Descripción breve<input value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} maxLength={200} className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-black outline-none focus:border-black/30"/></label>
        {draft.sections.length ? <div className="space-y-4">{draft.sections.map((section, sectionIndex) => <section key={`${section.name}-${sectionIndex}`} className="rounded-[22px] border border-black/[.06] bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between gap-3"><input aria-label="Nombre de la sección" value={section.name} onChange={(event) => setDraft((current) => ({ ...current, sections: current.sections.map((item, index) => index === sectionIndex ? { ...item, name: event.target.value } : item) }))} className="menu-qr-field min-w-0 flex-1 bg-transparent text-sm font-bold text-black outline-none"/><button type="button" aria-label="Eliminar platillos de esta categoría" onClick={() => setDraft((current) => ({ ...current, sections: current.sections.filter((_, index) => index !== sectionIndex) }))} className="rounded-full p-2 text-black/40 hover:bg-black/5"><Trash2 className="h-4 w-4"/></button></div><div className="space-y-3">{section.items.map((item, itemIndex) => <div key={`${sectionIndex}-${itemIndex}`} className="grid grid-cols-[minmax(0,1fr)_90px] gap-2 border-t border-black/[.06] pt-3"><label className="menu-qr-field text-[10px] font-medium text-black/50">Platillo<input value={item.name} onChange={(event) => updateItem(sectionIndex, itemIndex, 'name', event.target.value)} maxLength={100} className="mt-1 h-9 w-full rounded-lg border border-black/10 bg-[#fafaf9] px-2 text-xs text-black outline-none"/></label><label className="menu-qr-field text-[10px] font-medium text-black/50">Precio<input value={item.price} onChange={(event) => updateItem(sectionIndex, itemIndex, 'price', event.target.value)} maxLength={30} className="mt-1 h-9 w-full rounded-lg border border-black/10 bg-[#fafaf9] px-2 text-xs text-black outline-none"/></label><label className="menu-qr-field col-span-2 text-[10px] font-medium text-black/50">Descripción<input value={item.description} onChange={(event) => updateItem(sectionIndex, itemIndex, 'description', event.target.value)} maxLength={220} className="mt-1 h-9 w-full rounded-lg border border-black/10 bg-[#fafaf9] px-2 text-xs text-black outline-none"/></label></div>)}</div><button type="button" onClick={() => setDraft((current) => ({ ...current, sections: current.sections.map((item, index) => index === sectionIndex ? { ...item, items: [...item.items, { name: '', description: '', price: '' }] } : item) }))} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#d63c23]"><Plus className="h-3.5 w-3.5"/>Agregar producto</button></section>)}</div> : <div className="rounded-[22px] bg-white p-5 text-center text-sm text-black/60">No se detectaron platillos. Puedes volver a tomar la foto y probar con más luz.</div>}
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <button type="button" onClick={() => void createMenu()} disabled={busy} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#171717] text-sm font-bold text-white disabled:opacity-55">{busy ? <><LoaderCircle className="h-4 w-4 animate-spin"/>Creando menú QR…</> : <><QrCode className="h-4 w-4"/>Crear menú y código QR</>}</button>
      </>}

      {step === 'done' && <div className="mx-auto max-w-sm text-center"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#ee4b2d]">Paso 3 de 3</p><h1 className="mt-2 text-2xl font-bold">Tu menú está listo</h1><p className="mt-1 text-sm text-black/55">El diseño con QR ya está guardado y puedes imprimirlo o compartirlo.</p><img src={poster} alt={`Diseño de menú QR de ${draft.businessName}`} className="mx-auto mt-5 max-h-[54dvh] w-auto rounded-[18px] border border-black/10 shadow-[0_12px_30px_rgba(0,0,0,.12)]"/><p className="mt-3 break-all text-xs text-black/50">{savedMenuUrl}</p><div className="mt-4 grid grid-cols-2 gap-3"><a href={poster} download={`menu-${draft.businessName.toLocaleLowerCase('es-MX').replace(/[^a-z0-9]+/g, '-')}-qr.png`} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#171717] text-sm font-bold text-white"><Download className="h-4 w-4"/>Descargar</a><button type="button" onClick={printPoster} className="flex h-12 items-center justify-center gap-2 rounded-full border border-black/10 bg-white text-sm font-semibold"><Printer className="h-4 w-4"/>Imprimir</button></div><a href={savedMenuUrl} target="_blank" rel="noreferrer" className="mt-3 flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold text-[#d63c23]">Abrir menú digital <Check className="h-4 w-4"/></a><button type="button" onClick={onClose} className="mt-3 h-11 w-full rounded-full border border-black/10 text-sm font-semibold">Volver a Crear</button></div>}
    </div>
  </main>;
}
