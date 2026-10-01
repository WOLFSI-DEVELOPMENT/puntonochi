import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AlignCenter, AlignLeft, AlignRight, ArrowLeft, Download, Frame, ImagePlus, Smartphone } from 'lucide-react';

type Ratio = { id: string; label: string; width: number; height: number };
type Template = { id: string; name: string; style: 'quote' | 'photo' | 'bold' | 'minimal'; background: string; accent: string; ink: string; paper: string; headline: string; body: string; eyebrow: string; button: string };
const ratios: Ratio[] = [
  { id: 'square', label: 'Cuadrado · 1:1', width: 1080, height: 1080 },
  { id: 'story', label: 'Historia · 9:16', width: 1080, height: 1920 },
];
export const adTemplates: Template[] = [
  { id: 'quote', name: 'Lavanda', style: 'quote', background: '#d9d5ff', accent: '#7773e8', ink: '#272442', paper: '#d9d5ff', eyebrow: 'RECIÉN HECHO', headline: 'Un antojo que alegra el día.', body: 'Prueba algo delicioso y comparte el momento.', button: 'DESCUBRIR' },
  { id: 'photo', name: 'Fresa', style: 'photo', background: '#ffdce6', accent: '#ed7898', ink: '#542b3a', paper: '#ffdce6', eyebrow: 'HECHO CON CARIÑO', headline: 'Un lugar para disfrutar.', body: 'Ven por tu nuevo favorito.', button: 'VISÍTANOS' },
  { id: 'bold', name: 'Menta', style: 'bold', background: '#d5f2e4', accent: '#48b992', ink: '#173b32', paper: '#d5f2e4', eyebrow: 'ALGO ESPECIAL', headline: 'Hoy se antoja algo rico.', body: 'Una pausa bonita empieza aquí.', button: 'CONÓCENOS' },
  { id: 'minimal', name: 'Durazno', style: 'minimal', background: '#ffe2c9', accent: '#f19661', ink: '#51372d', paper: '#ffe2c9', eyebrow: 'TU NUEVO FAVORITO', headline: 'Pequeños momentos, gran sabor.', body: 'Te esperamos con algo especial.', button: 'VER MÁS' },
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

type EditablePart = 'background' | 'image' | 'eyebrow' | 'title' | 'body' | 'button';
type PreviewOptions = { selectedPart?: EditablePart; onSelectPart?: (part: EditablePart) => void; titleColor?: string; bodyColor?: string; titleSize?: number; titleAlign?: CanvasTextAlign; titlePosition?: number; fontFamily?: string; imageOpacity?: number; imageBlur?: number; imageRotation?: number; imageScale?: number };

export function AdTemplatePreview({ template, ratio, title, body, brand, background, accent, imageUrl, compact = false, selectedPart, onSelectPart, titleColor, bodyColor, titleSize = 90, titleAlign = 'left', titlePosition = .30, fontFamily = 'Arial', imageOpacity = 1, imageBlur = 0, imageRotation = 0, imageScale = 1 }: { template: Template; ratio: Ratio; title: string; body: string; brand: string; background: string; accent: string; imageUrl: string; compact?: boolean } & PreviewOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr)); canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const w = canvas.width; const h = canvas.height; const s = w / 1080; ctx.scale(s, s); const logicalH = h / s;
    let uploaded: HTMLImageElement | null = null;
    if (imageUrl) { const img = new Image(); img.onload = () => { uploaded = img; drawTemplate(); }; img.src = imageUrl; }
    const drawTemplate = () => {
      ctx.clearRect(0, 0, w, h); ctx.fillStyle = background; ctx.fillRect(0, 0, 1080, logicalH);
      const pad = 70; const innerW = 940; const photoY = logicalH * .45; const photoH = logicalH * .29;
      ctx.fillStyle = background; ctx.fillRect(0, 0, 1080, logicalH);
      ctx.fillStyle = accent; roundedRect(ctx, pad, logicalH * .075, 270, 54, 27); ctx.fill();
      ctx.fillStyle = template.ink; ctx.textAlign = 'center'; ctx.font = '700 23px Arial'; ctx.fillText(template.eyebrow, pad + 135, logicalH * .075 + 36);
      ctx.save(); ctx.globalAlpha = imageOpacity; ctx.filter = `blur(${imageBlur * 3}px)`;
      if (uploaded) {
        ctx.beginPath(); ctx.roundRect(pad, photoY, innerW, photoH, 55); ctx.clip();
        const iw = innerW * imageScale; const ih = photoH * imageScale;
        ctx.translate(540, photoY + photoH / 2); ctx.rotate(imageRotation * Math.PI / 180);
        ctx.drawImage(uploaded, -iw / 2, -ih / 2, iw, ih); ctx.restore();
      } else {
        ctx.fillStyle = `${template.accent}55`; roundedRect(ctx, pad, photoY, innerW, photoH, 55); ctx.fill();
        ctx.fillStyle = template.ink; ctx.textAlign = 'center'; ctx.font = '500 30px Arial'; ctx.fillText('Toca para agregar una foto', 540, photoY + photoH / 2);
        ctx.restore();
      }
      ctx.fillStyle = titleColor || template.ink; ctx.textAlign = titleAlign; ctx.font = `700 ${titleSize}px ${fontFamily}`;
      const titleX = titleAlign === 'left' ? pad : titleAlign === 'right' ? 1080 - pad : 540;
      wrapText(ctx, title, titleX, logicalH * titlePosition, innerW, titleSize * 1.12, 3);
      ctx.fillStyle = bodyColor || template.ink; ctx.textAlign = titleAlign; ctx.font = `400 32px ${fontFamily}`;
      const bodyY = logicalH * .78; wrapText(ctx, body, titleX, bodyY, innerW, 42, 2);
      const buttonY = logicalH * .89; ctx.fillStyle = accent; roundedRect(ctx, pad, buttonY, 270, 58, 29); ctx.fill();
      ctx.fillStyle = template.ink; ctx.textAlign = 'center'; ctx.font = '700 20px Arial'; ctx.fillText(template.button, pad + 135, buttonY + 38);
      ctx.textAlign = 'right'; ctx.fillStyle = template.ink; ctx.font = '600 23px Arial'; ctx.fillText(brand.slice(0, 26), 1080 - pad, buttonY + 38);
    };
    drawTemplate();
    if (imageUrl) { const img = new Image(); img.onload = () => { uploaded = img; drawTemplate(); }; img.src = imageUrl; }
    const observer = new ResizeObserver(drawTemplate); observer.observe(canvas); return () => observer.disconnect();
  }, [template, ratio, title, body, brand, background, accent, imageUrl, titleColor, bodyColor, titleSize, titleAlign, titlePosition, fontFamily, imageOpacity, imageBlur, imageRotation, imageScale]);
  return <canvas ref={canvasRef} aria-label={`${template.name} ad preview`} onClick={(event) => {
    if (!onSelectPart) return;
    const rect = event.currentTarget.getBoundingClientRect(); const y = (event.clientY - rect.top) / rect.height; const x = (event.clientX - rect.left) / rect.width;
    onSelectPart(x > .92 ? 'background' : y < .16 ? 'eyebrow' : y < .44 ? 'title' : y < .75 ? 'image' : y < .88 ? 'body' : y < .97 ? 'button' : 'background');
  }} className={`block w-full bg-white ${compact ? 'h-full' : 'h-full'} ${onSelectPart ? 'cursor-pointer' : ''} ${selectedPart ? 'touch-manipulation' : ''}`} />;
}

export function AdTemplateEditor({ template: initialTemplate, onClose, onExported }: { template: Template; onClose: () => void; onExported?: (url: string, name: string) => void }) {
  const [template, setTemplate] = useState(initialTemplate); const [ratio, setRatio] = useState(ratios[0]);
  const [title, setTitle] = useState(initialTemplate.headline); const [body, setBody] = useState(initialTemplate.body); const [brand] = useState('MI NEGOCIO');
  const [background, setBackground] = useState(initialTemplate.background); const [accent, setAccent] = useState(initialTemplate.accent); const [imageUrl, setImageUrl] = useState('');
  const [selectedPart, setSelectedPart] = useState<EditablePart>('background'); const [titleColor, setTitleColor] = useState(initialTemplate.ink); const [bodyColor, setBodyColor] = useState(initialTemplate.ink);
  const [titleSize, setTitleSize] = useState(90); const [titleAlign, setTitleAlign] = useState<CanvasTextAlign>('left'); const [titlePosition, setTitlePosition] = useState(.30); const [fontFamily, setFontFamily] = useState('Arial');
  const [imageOpacity, setImageOpacity] = useState(1); const [imageBlur, setImageBlur] = useState(0); const [imageRotation, setImageRotation] = useState(0); const [imageScale, setImageScale] = useState(1);
  const [exporting, setExporting] = useState(false); const imagePicker = useRef<HTMLInputElement>(null);
  const palette = ['#d9d5ff', '#ffdce6', '#d5f2e4', '#ffe2c9', '#d5e8ff', '#fff0b8', '#d7f1f0'];
  const updateColor = (color: string) => {
    if (selectedPart === 'background') { setBackground(color); setTemplate((current) => ({ ...current, background: color, paper: color })); }
    else if (selectedPart === 'image') setAccent(color);
    else if (selectedPart === 'body' || selectedPart === 'eyebrow') setBodyColor(color);
    else if (selectedPart === 'button') setAccent(color);
    else setTitleColor(color);
  };
  const changeImage = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file?.type.startsWith('image/')) return; const reader = new FileReader(); reader.onload = () => setImageUrl(String(reader.result || '')); reader.readAsDataURL(file); event.target.value = ''; };
  const exportImage = async () => {
    const preview = document.querySelector<HTMLCanvasElement>('[aria-label="'+template.name+' ad preview"]'); if (!preview) return;
    setExporting(true);
    try {
      const canvas = document.createElement('canvas'); canvas.width = ratio.width; canvas.height = ratio.height; const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.drawImage(preview, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('No se pudo exportar la imagen.')), 'image/png'));
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `anuncio-${ratio.id}.png`; link.click(); onExported?.(url, `${template.name} · ${ratio.label}`); window.setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch (error) { window.alert(error instanceof Error ? error.message : 'No se pudo exportar el anuncio.'); } finally { setExporting(false); }
  };
  const partName: Record<EditablePart, string> = { background: 'Fondo', image: 'Imagen', eyebrow: 'Etiqueta', title: 'Título', body: 'Texto', button: 'Botón' };
  return <main className="ad-template-editor fixed inset-0 z-[95] flex h-[100dvh] flex-col overflow-hidden bg-[#111214] text-white">
    <header className="relative z-10 flex h-[58px] shrink-0 items-center justify-between px-3">
      <button type="button" onClick={onClose} aria-label="Salir del editor" className="flex h-10 items-center gap-2 rounded-full bg-white/[0.09] px-4 text-xs font-semibold text-white/85 shadow-lg backdrop-blur-xl"><ArrowLeft className="h-4 w-4"/>Salir</button>
      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/[0.09] p-1 shadow-lg backdrop-blur-xl">
        {ratios.map((item) => <button key={item.id} type="button" aria-label={`Formato ${item.id === 'square' ? '1:1' : '9:16'}`} aria-pressed={ratio.id === item.id} title={item.id === 'square' ? '1:1' : '9:16'} onClick={() => setRatio(item)} className={`flex h-8 w-10 items-center justify-center rounded-full ${ratio.id === item.id ? 'bg-white/15 text-white' : 'text-white/45'}`}>{item.id === 'square' ? <Frame className="h-4 w-4"/> : <Smartphone className="h-4 w-4"/>}</button>)}
      </div>
      <button type="button" onClick={() => void exportImage()} disabled={exporting} className="flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#48aaff] via-[#1684f5] to-[#0754c9] px-4 text-xs font-bold text-white shadow-[0_5px_20px_rgba(15,116,235,.35)] disabled:opacity-50"><Download className="h-4 w-4"/>{exporting ? '...' : 'Exportar'}</button>
    </header>

    <section className="flex min-h-0 flex-1 items-center justify-center px-4 py-2" aria-label="Vista previa. Toca un elemento para editarlo.">
      <div className="relative overflow-hidden rounded-[20px] bg-black shadow-[0_18px_60px_rgba(0,0,0,.45)]" style={ratio.id === 'square' ? { width: 'min(76vw, 430px)', aspectRatio: '1', maxHeight: 'calc(100dvh - 250px)' } : { height: 'min(59dvh, 520px)', aspectRatio: '9 / 16', maxWidth: 'calc(100vw - 40px)' }}>
        <AdTemplatePreview template={template} ratio={ratio} title={title} body={body} brand={brand} background={background} accent={accent} imageUrl={imageUrl} selectedPart={selectedPart} onSelectPart={setSelectedPart} titleColor={titleColor} bodyColor={bodyColor} titleSize={titleSize} titleAlign={titleAlign} titlePosition={titlePosition} fontFamily={fontFamily} imageOpacity={imageOpacity} imageBlur={imageBlur} imageRotation={imageRotation} imageScale={imageScale}/>
        <span className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/50 px-2.5 py-1 text-[9px] font-semibold text-white/75 backdrop-blur-md">{partName[selectedPart]}</span>
      </div>
    </section>

    <section className="shrink-0 pb-[max(10px,env(safe-area-inset-bottom))]">
      <div className="mb-2 flex items-center justify-between px-4"><p className="text-xs font-bold">{partName[selectedPart]}</p><span className="text-[10px] text-white/35">Toca un elemento para editarlo</span></div>
      <div className="flex h-[94px] items-center gap-3 overflow-x-auto px-4 scrollbar-hide">
        {selectedPart === 'title' && <input aria-label="Editar título" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={110} className="h-9 w-48 shrink-0 rounded-full bg-white/[0.08] px-4 text-xs text-white placeholder:text-white/40 outline-none"/>}
        {selectedPart === 'body' && <input aria-label="Editar texto secundario" value={body} onChange={(event) => setBody(event.target.value)} maxLength={180} className="h-9 w-48 shrink-0 rounded-full bg-white/[0.08] px-4 text-xs text-white placeholder:text-white/40 outline-none"/>}
        {(selectedPart === 'background' || selectedPart === 'button' || selectedPart === 'title' || selectedPart === 'body' || selectedPart === 'eyebrow') && <div className="flex shrink-0 items-center gap-2">{palette.map((color) => <button key={color} type="button" aria-label={`Elegir color ${color}`} onClick={() => updateColor(color)} className={`h-8 w-8 shrink-0 rounded-full ${color === (selectedPart === 'background' ? background : selectedPart === 'button' ? accent : selectedPart === 'body' || selectedPart === 'eyebrow' ? bodyColor : titleColor) ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111214]' : ''}`} style={{ backgroundColor: color }}/>)}</div>}
        {selectedPart === 'background' && <div className="flex shrink-0 items-center gap-2">{adTemplates.map((item) => <button key={item.id} type="button" aria-label={`Estilo ${item.name}`} onClick={() => { setTemplate(item); setBackground(item.background); setAccent(item.accent); setTitleColor(item.ink); setBodyColor(item.ink); }} className={`h-8 w-8 rounded-full ${template.id === item.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111214]' : ''}`} style={{ background: `linear-gradient(145deg, ${item.background} 52%, ${item.accent} 52%)` }}/>)}</div>}
        {(selectedPart === 'title' || selectedPart === 'body' || selectedPart === 'eyebrow') && <>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/[0.08] p-1">{([{ value: 'left', icon: AlignLeft }, { value: 'center', icon: AlignCenter }, { value: 'right', icon: AlignRight }] as const).map(({ value, icon: Icon }) => <button key={value} type="button" aria-label={`Alinear ${value}`} onClick={() => setTitleAlign(value)} className={`flex h-8 w-9 items-center justify-center rounded-full ${titleAlign === value ? 'bg-white/15 text-white' : 'text-white/45'}`}><Icon className="h-4 w-4"/></button>)}</div>
          {selectedPart === 'title' && <><label className="flex shrink-0 items-center gap-2 text-[10px] text-white/55">Tamaño<input aria-label="Tamaño del título" type="range" min="54" max="138" value={titleSize} onChange={(event) => setTitleSize(Number(event.target.value))} className="w-24 accent-white"/></label><select aria-label="Estilo de letra" value={fontFamily} onChange={(event) => setFontFamily(event.target.value)} className="h-9 shrink-0 rounded-full bg-white/10 px-3 text-[10px] text-white"><option className="text-black" value="Arial">Redonda</option><option className="text-black" value="Georgia">Editorial</option><option className="text-black" value="serif">Serif</option></select><div className="flex shrink-0 gap-1">{[{ label: 'Arriba', value: .24 }, { label: 'Centro', value: .31 }, { label: 'Abajo', value: .38 }].map((item) => <button key={item.label} type="button" onClick={() => setTitlePosition(item.value)} className={`rounded-full px-3 py-2 text-[10px] ${titlePosition === item.value ? 'bg-white/20 text-white' : 'bg-white/[0.07] text-white/55'}`}>{item.label}</button>)}</div></>}
        </>}
        {selectedPart === 'image' && <><button type="button" onClick={() => imagePicker.current?.click()} className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 text-xs font-semibold"><ImagePlus className="h-4 w-4"/>{imageUrl ? 'Cambiar foto' : 'Elegir foto'}</button><input ref={imagePicker} type="file" accept="image/*" onChange={changeImage} className="hidden"/><label className="flex shrink-0 items-center gap-2 text-[10px] text-white/55">Opacidad<input aria-label="Opacidad de imagen" type="range" min="20" max="100" value={imageOpacity * 100} onChange={(event) => setImageOpacity(Number(event.target.value) / 100)} className="w-20 accent-white"/></label><label className="flex shrink-0 items-center gap-2 text-[10px] text-white/55">Desenfoque<input aria-label="Desenfoque de imagen" type="range" min="0" max="10" value={imageBlur} onChange={(event) => setImageBlur(Number(event.target.value))} className="w-20 accent-white"/></label><label className="flex shrink-0 items-center gap-2 text-[10px] text-white/55">Rotar<input aria-label="Rotar imagen" type="range" min="-180" max="180" value={imageRotation} onChange={(event) => setImageRotation(Number(event.target.value))} className="w-20 accent-white"/></label><label className="flex shrink-0 items-center gap-2 text-[10px] text-white/55">Tamaño<input aria-label="Tamaño de imagen" type="range" min="70" max="140" value={imageScale * 100} onChange={(event) => setImageScale(Number(event.target.value) / 100)} className="w-20 accent-white"/></label></>}
      </div>
    </section>
  </main>;
}
