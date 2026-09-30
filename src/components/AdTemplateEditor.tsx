import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ArrowLeft, Check, Download, ImagePlus, LayoutTemplate, Palette, Type, X } from 'lucide-react';

type Ratio = { id: string; label: string; width: number; height: number };
type Template = { id: string; name: string; style: 'quote' | 'photo' | 'bold' | 'minimal'; background: string; accent: string; ink: string; paper: string; headline: string; body: string; eyebrow: string; button: string };
const ratios: Ratio[] = [
  { id: 'story', label: 'Historia · 9:16', width: 1080, height: 1920 },
  { id: 'post', label: 'Publicación · 4:5', width: 1080, height: 1350 },
  { id: 'square', label: 'Cuadrado · 1:1', width: 1080, height: 1080 },
  { id: 'landscape', label: 'Horizontal · 16:9', width: 1920, height: 1080 },
];
export const adTemplates: Template[] = [
  { id: 'quote', name: 'Editorial', style: 'quote', background: '#f5f4ef', accent: '#f05236', ink: '#171717', paper: '#f5f4ef', eyebrow: 'HECHO EN NOCHISTLÁN', headline: 'Un buen día comienza aquí.', body: 'Ven a conocernos y disfruta algo especial.', button: 'VISÍTANOS' },
  { id: 'photo', name: 'Foto protagonista', style: 'photo', background: '#d6ddd5', accent: '#d8f36a', ink: '#ffffff', paper: '#f5f4ef', eyebrow: 'TU LUGAR FAVORITO', headline: 'Momentos que se disfrutan.', body: 'Te esperamos en el corazón de Nochistlán.', button: 'CONÓCENOS' },
  { id: 'bold', name: 'Color y forma', style: 'bold', background: '#ee4b2d', accent: '#f4dc75', ink: '#ffffff', paper: '#ee4b2d', eyebrow: 'NUEVO · LOCAL', headline: 'Lo bueno está más cerca.', body: 'Descubre todo lo que tenemos para ti.', button: 'DESCUBRIR' },
  { id: 'minimal', name: 'Oferta clara', style: 'minimal', background: '#e8e3de', accent: '#ee4b2d', ink: '#171717', paper: '#e8e3de', eyebrow: 'POR TI, PARA TI', headline: 'Un pequeño gusto. Un gran día.', body: 'Pregunta por nuestras novedades y promociones.', button: 'VER MÁS' },
];

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius);
}
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  let line = ''; let lineNo = 0;
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) { ctx.fillText(line, x, y + lineNo * lineHeight); line = word; lineNo += 1; if (lineNo >= maxLines) return; }
    else line = next;
  }
  if (line && lineNo < maxLines) ctx.fillText(line, x, y + lineNo * lineHeight);
}

export function AdTemplatePreview({ template, ratio, title, body, brand, background, accent, imageUrl, compact = false }: { template: Template; ratio: Ratio; title: string; body: string; brand: string; background: string; accent: string; imageUrl: string; compact?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr)); canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const w = canvas.width; const h = canvas.height; const s = w / 1080; ctx.scale(s, s); const logicalH = h / s;
    const drawImage = (img: CanvasImageSource, iw: number, ih: number, x: number, y: number, pw: number, ph: number, alpha = 1) => {
        const scale = Math.max(pw / iw, ph / ih); const dw = iw * scale; const dh = ih * scale;
        ctx.save(); ctx.globalAlpha = alpha; ctx.beginPath(); ctx.rect(x, y, pw, ph); ctx.clip(); ctx.drawImage(img, x + (pw - dw) / 2, y + (ph - dh) / 2, dw, dh); ctx.restore();
    };
    let uploaded: HTMLImageElement | null = null;
    if (imageUrl) { const img = new Image(); img.onload = () => { uploaded = img; drawTemplate(); }; img.src = imageUrl; }
    const drawTemplate = () => {
      ctx.clearRect(0, 0, w, h); ctx.fillStyle = background; ctx.fillRect(0, 0, 1080, logicalH);
      const pad = 82; const center = 540;
      if (template.style === 'photo') {
        const photoH = logicalH * .58; if (uploaded) drawImage(uploaded, uploaded.naturalWidth, uploaded.naturalHeight, 0, 0, 1080, photoH, .92); else { ctx.fillStyle = '#b7c8c0'; ctx.fillRect(0, 0, 1080, photoH); }
        ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, 0, 1080, photoH);
        ctx.fillStyle = template.ink; ctx.fillRect(0, photoH, 1080, logicalH - photoH); ctx.fillStyle = template.paper; ctx.fillRect(0, photoH, 1080, logicalH - photoH);
        ctx.fillStyle = template.ink; ctx.textAlign = 'left'; ctx.font = '500 32px Arial'; ctx.fillText(brand.toLocaleUpperCase('es-MX').slice(0, 32), pad, 76);
        ctx.fillStyle = template.ink; ctx.font = `700 ${Math.min(92, logicalH * .066)}px Arial`; wrapText(ctx, title, pad, photoH + 150, 916, Math.min(104, logicalH * .075), 4);
        ctx.font = '400 38px Arial'; ctx.fillStyle = '#555'; wrapText(ctx, body, pad, photoH + 430, 860, 52, 3);
      } else if (template.style === 'bold') {
        ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(1030, 90, 225, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = template.ink; ctx.textAlign = 'left'; ctx.font = '600 32px Arial'; ctx.fillText(template.eyebrow, pad, 104);
        ctx.font = `700 ${Math.min(126, logicalH * .09)}px Georgia`; wrapText(ctx, title, pad, logicalH * .32, 900, Math.min(140, logicalH * .098), 5);
        ctx.fillStyle = template.ink; ctx.font = '400 42px Arial'; wrapText(ctx, body, pad, logicalH * .68, 850, 56, 3);
      } else {
        ctx.fillStyle = template.ink; ctx.textAlign = 'left'; ctx.font = '600 30px Arial'; ctx.fillText(template.eyebrow, pad, 96);
        ctx.fillStyle = template.accent; ctx.beginPath(); ctx.arc(950, 80, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = template.ink; ctx.font = `500 ${Math.min(108, logicalH * .082)}px ${template.style === 'quote' ? 'Georgia' : 'Arial'}`;
        wrapText(ctx, title, pad, logicalH * .30, 910, Math.min(122, logicalH * .092), 5);
        if (template.style === 'minimal' && uploaded) drawImage(uploaded, uploaded.naturalWidth, uploaded.naturalHeight, pad, logicalH * .52, 916, logicalH * .22, .9);
        ctx.fillStyle = template.ink; ctx.font = '400 38px Arial'; wrapText(ctx, body, pad, logicalH * (template.style === 'minimal' ? .79 : .66), 840, 52, 3);
      }
      const buttonY = logicalH - 172; ctx.fillStyle = template.style === 'bold' ? template.ink : template.accent;
      roundedRect(ctx, pad, buttonY, 330, 88, 44); ctx.fill();
      ctx.fillStyle = template.style === 'bold' ? background : (template.style === 'photo' ? '#171717' : '#ffffff');
      ctx.textAlign = 'center'; ctx.font = '700 27px Arial'; ctx.fillText(template.button, pad + 165, buttonY + 55);
      ctx.textAlign = 'right'; ctx.fillStyle = template.style === 'photo' ? '#777' : template.ink; ctx.font = '600 27px Arial'; ctx.fillText(brand.slice(0, 26), 1080 - pad, logicalH - 113);
    };
    drawTemplate();
    if (imageUrl) { const img = new Image(); img.onload = () => { uploaded = img; drawTemplate(); }; img.src = imageUrl; }
    const observer = new ResizeObserver(drawTemplate); observer.observe(canvas); return () => observer.disconnect();
  }, [template, ratio, title, body, brand, background, accent, imageUrl]);
  return <canvas ref={canvasRef} aria-label={`${template.name} ad preview`} className={`block w-full bg-white ${compact ? 'h-full' : 'h-full'}`} />;
}

export function AdTemplateEditor({ template: initialTemplate, onClose, onExported }: { template: Template; onClose: () => void; onExported?: (url: string, name: string) => void }) {
  const [template, setTemplate] = useState(initialTemplate); const [ratio, setRatio] = useState(ratios[0]);
  const [title, setTitle] = useState(initialTemplate.headline); const [body, setBody] = useState(initialTemplate.body); const [brand, setBrand] = useState('MI NEGOCIO');
  const [background, setBackground] = useState(initialTemplate.background); const [accent, setAccent] = useState(initialTemplate.accent); const [imageUrl, setImageUrl] = useState(''); const [exporting, setExporting] = useState(false); const imagePicker = useRef<HTMLInputElement>(null);
  const changeImage = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith('image/')) return; const reader = new FileReader(); reader.onload = () => setImageUrl(String(reader.result || '')); reader.readAsDataURL(file); event.target.value = ''; };
  const exportImage = async () => {
    const preview = document.querySelector<HTMLCanvasElement>('[aria-label="'+template.name+' ad preview"]'); if (!preview) return;
    setExporting(true);
    try {
      const canvas = document.createElement('canvas'); canvas.width = ratio.width; canvas.height = ratio.height; const ctx = canvas.getContext('2d'); if (!ctx) return;
      if (preview.width / preview.height > canvas.width / canvas.height) {
        const sourceWidth = preview.height * canvas.width / canvas.height;
        ctx.drawImage(preview, (preview.width - sourceWidth) / 2, 0, sourceWidth, preview.height, 0, 0, canvas.width, canvas.height);
      } else {
        const sourceHeight = preview.width * canvas.height / canvas.width;
        ctx.drawImage(preview, 0, (preview.height - sourceHeight) / 2, preview.width, sourceHeight, 0, 0, canvas.width, canvas.height);
      }
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('No se pudo exportar la imagen.')), 'image/png'));
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `anuncio-${ratio.id}.png`; link.click(); onExported?.(url, `${template.name} · ${ratio.label}`); window.setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch (error) { window.alert(error instanceof Error ? error.message : 'No se pudo exportar el anuncio.'); } finally { setExporting(false); }
  };
  const colorPresets = ['#f5f4ef', '#ee4b2d', '#d8f36a', '#c6d8d1', '#171717', '#7895ba', '#edc9ce', '#f4dc75'];
  return <main className="ad-template-editor fixed inset-0 z-[95] flex flex-col overflow-y-auto bg-[#f4f4f2] text-[#171717]">
    <header className="sticky top-0 z-10 flex h-[62px] shrink-0 items-center justify-between border-b border-black/[.06] bg-[#f4f4f2]/95 px-4 backdrop-blur-xl sm:px-7"><button type="button" onClick={onClose} aria-label="Volver a plantillas" className="flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-black/5"><ArrowLeft className="h-4 w-4"/>Plantillas</button><span className="text-xs font-semibold text-black/45">Editor de anuncio</span><button type="button" onClick={onClose} aria-label="Cerrar editor" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/5"><X className="h-5 w-5"/></button></header>
    <div className="mx-auto flex w-full max-w-[1050px] flex-1 flex-col items-center px-4 pb-10 pt-5 sm:px-8">
      <div className="mb-4 flex w-full max-w-[650px] items-center justify-between gap-3"><div><h1 className="text-xl font-bold">Personaliza tu anuncio</h1><p className="mt-1 text-xs text-black/50">Ajusta el diseño y expórtalo para tus redes.</p></div><span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-black/55 shadow-sm">{template.name}</span></div>
      <div className="flex w-full flex-1 flex-col items-center">
        <div className="flex min-h-[250px] w-full max-w-[460px] flex-1 items-center justify-center rounded-[28px] bg-[#e6e6e2] p-4 sm:p-6"><div className="overflow-hidden rounded-[8px] bg-white shadow-[0_18px_55px_rgba(0,0,0,.14)]" style={{ width: ratio.width / ratio.height > 1 ? '100%' : `min(100%, ${Math.round(400 * ratio.width / ratio.height)}px)`, aspectRatio: `${ratio.width}/${ratio.height}`, maxHeight: '56dvh' }}><AdTemplatePreview template={template} ratio={ratio} title={title} body={body} brand={brand} background={background} accent={accent} imageUrl={imageUrl}/></div></div>
        <section className="mt-4 w-full max-w-[650px] rounded-[25px] bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,.05)] sm:p-5"><div className="mb-4 flex items-center gap-2"><Palette className="h-4 w-4 text-black/55"/><h2 className="text-sm font-bold">Herramientas</h2></div>
          <div className="space-y-4">
            <div><label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-black/60"><Type className="h-3.5 w-3.5"/>Título</label><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={110} className="h-10 w-full rounded-xl border border-black/10 bg-[#fafaf9] px-3 text-sm outline-none focus:border-black/30"/></div>
            <div><label className="mb-1.5 block text-[11px] font-semibold text-black/60">Texto secundario</label><textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={180} rows={2} className="w-full resize-none rounded-xl border border-black/10 bg-[#fafaf9] px-3 py-2.5 text-sm outline-none focus:border-black/30"/></div>
            <div className="grid grid-cols-2 gap-3"><label className="text-[11px] font-semibold text-black/60">Nombre o marca<input value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={32} className="mt-1.5 h-10 w-full rounded-xl border border-black/10 bg-[#fafaf9] px-3 text-sm font-normal text-black outline-none focus:border-black/30"/></label><div><p className="text-[11px] font-semibold text-black/60">Imagen</p><button type="button" onClick={() => imagePicker.current?.click()} className="mt-1.5 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-[#fafaf9] text-xs font-semibold"><ImagePlus className="h-4 w-4"/>{imageUrl ? 'Cambiar imagen' : 'Elegir imagen'}</button><input ref={imagePicker} type="file" accept="image/*" onChange={changeImage} className="hidden"/></div></div>
            <div className="grid grid-cols-2 gap-3"><div><p className="mb-2 text-[11px] font-semibold text-black/60">Color de fondo</p><div className="flex flex-wrap gap-2">{colorPresets.map((color) => <button key={`bg-${color}`} type="button" aria-label={`Fondo ${color}`} onClick={() => { setBackground(color); setTemplate((current) => ({ ...current, background: color, paper: color })); }} className={`h-7 w-7 rounded-full border border-black/10 ${background === color ? 'ring-2 ring-black ring-offset-2' : ''}`} style={{ backgroundColor: color }}>{background === color && <Check className={`mx-auto h-3.5 w-3.5 ${color === '#171717' || color === '#ee4b2d' ? 'text-white' : 'text-black'}`}/>}</button>)}<label aria-label="Color personalizado para el fondo" className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-black/10"><span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-rose-400 via-amber-300 to-sky-400 text-[13px] text-black">+</span><input type="color" value={background} onChange={(e) => { setBackground(e.target.value); setTemplate((current) => ({ ...current, background: e.target.value, paper: e.target.value })); }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0"/></label></div></div><div><p className="mb-2 text-[11px] font-semibold text-black/60">Color de acento</p><div className="flex flex-wrap gap-2">{colorPresets.map((color) => <button key={`accent-${color}`} type="button" aria-label={`Acento ${color}`} onClick={() => { setAccent(color); setTemplate((current) => ({ ...current, accent: color })); }} className={`h-7 w-7 rounded-full border border-black/10 ${accent === color ? 'ring-2 ring-black ring-offset-2' : ''}`} style={{ backgroundColor: color }}>{accent === color && <Check className={`mx-auto h-3.5 w-3.5 ${color === '#171717' || color === '#ee4b2d' ? 'text-white' : 'text-black'}`}/>}</button>)}<label aria-label="Color personalizado de acento" className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-black/10"><span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-rose-400 via-amber-300 to-sky-400 text-[13px] text-black">+</span><input type="color" value={accent} onChange={(e) => { setAccent(e.target.value); setTemplate((current) => ({ ...current, accent: e.target.value })); }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0"/></label></div></div></div>
            <div><label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-black/60"><LayoutTemplate className="h-3.5 w-3.5"/>Formato de exportación</label><select value={ratio.id} onChange={(e) => setRatio(ratios.find((item) => item.id === e.target.value) || ratios[0])} className="h-11 w-full rounded-xl border border-black/10 bg-[#fafaf9] px-3 text-sm outline-none">{ratios.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.width} × {item.height}</option>)}</select></div>
          </div>
        </section>
        <div className="mt-4 flex w-full max-w-[650px] gap-3"><button type="button" onClick={onClose} className="h-12 flex-1 rounded-full border border-black/10 bg-white text-sm font-semibold">Volver</button><button type="button" onClick={() => void exportImage()} disabled={exporting} className="flex h-12 flex-[1.5] items-center justify-center gap-2 rounded-full bg-black text-sm font-bold text-white disabled:opacity-55"><Download className="h-4 w-4"/>{exporting ? 'Exportando…' : 'Exportar anuncio'}</button></div>
      </div>
    </div>
  </main>;
}
