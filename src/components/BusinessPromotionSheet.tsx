import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Clock3, Search, X } from 'lucide-react';
import { mockPlaces } from '../data';
import { Place } from '../types';
import { apiFetch } from '../api';
import { SheetDragHandle, useSheetDrag } from './SheetDragHandle';

type Props = { onClose: () => void };
const periods = ['Mañana · 8–12 h', 'Tarde · 12–18 h', 'Noche · 18–23 h'];

export function BusinessPromotionSheet({ onClose }: Props) {
  const [place, setPlace] = useState<Place | null>(null);
  const [query, setQuery] = useState('');
  const [budget, setBudget] = useState(500);
  const [contactEmail, setContactEmail] = useState('');
  const [choosingPlace, setChoosingPlace] = useState(false);
  const [complete, setComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const sheetDrag = useSheetDrag(onClose);
  const placePickerDrag = useSheetDrag(() => setChoosingPlace(false));

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previous = {
      rootOverflow: root.style.overflow,
      rootOverscroll: root.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
    };
    root.style.overflow = 'hidden';
    root.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    return () => {
      root.style.overflow = previous.rootOverflow;
      root.style.overscrollBehavior = previous.rootOverscroll;
      body.style.overflow = previous.bodyOverflow;
      body.style.overscrollBehavior = previous.bodyOverscroll;
    };
  }, []);
  const appearances = Math.floor(budget / 50);
  const filtered = useMemo(() => mockPlaces.filter((item) => `${item.name} ${item.category}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))), [query]);
  const placementSchedule = useMemo(() => {
    if (!appearances) return [];
    return periods.map((period, index) => ({ period, count: Math.floor(appearances / periods.length) + (index < appearances % periods.length ? 1 : 0) })).filter((item) => item.count > 0);
  }, [appearances]);

  const saveCampaign = async () => {
    if (!place) return;
    setSaving(true);
    setSaveError('');
    try {
      const response = await apiFetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: place.id, placeName: place.name, budgetMXN: budget, estimatedAppearances: appearances, schedule: placementSchedule, contactEmail }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar la promoción.');
      setComplete(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudo guardar la promoción. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return <>
    <motion.button aria-label="Cerrar promoción" onClick={onClose} className="fixed inset-0 z-[70] bg-black/65" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
    <motion.section {...sheetDrag} role="dialog" aria-modal="true" aria-label="Promociona tu negocio" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 360, mass: 0.82 }} className="fixed inset-x-0 bottom-0 z-[71] mx-auto flex h-[min(88dvh,820px)] w-full max-w-[620px] flex-col overflow-hidden rounded-t-[32px] bg-[#202124] text-white">
      <div className="relative flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 pb-4 pt-7"><SheetDragHandle controls={sheetDrag.dragControls} className="absolute inset-x-0 top-0"/><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">PuntoNochi · Promociones</p><h2 className="mt-1 text-xl font-bold">{complete ? 'Solicitud lista' : 'Promociona tu negocio'}</h2></div><button type="button" onClick={onClose} aria-label="Cerrar" className="absolute right-3 top-3 rounded-full bg-white/[0.08] p-2.5"><X className="h-4 w-4" /></button></div>

      {complete ? <div className="flex flex-1 flex-col items-center justify-center px-7 text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-300/15 text-emerald-300"><Check className="h-8 w-8" /></span><h3 className="mt-5 text-2xl font-bold">¡Solicitud recibida!</h3><p className="mt-3 max-w-sm text-sm leading-relaxed text-white/60">Recibimos la solicitud para promocionar <strong className="text-white">{place?.name}</strong> por <strong className="text-white">${budget.toLocaleString('es-MX')} MXN</strong>. El equipo te enviará a <strong className="text-white">{contactEmail}</strong> un enlace de pago de Mercado Pago y los siguientes pasos.</p><button type="button" onClick={onClose} style={{ backgroundColor: '#fff', color: '#111' }} className="mt-7 rounded-full !bg-white px-8 py-3 text-sm font-bold !text-black">Listo</button></div>
      : <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 pb-8 pt-5">
        <p className="mb-5 text-sm leading-relaxed text-white/55">Elige un negocio y un presupuesto. Estimamos una aparición en el feed por cada $50 MXN y repartimos los espacios durante el día.</p>
        <button type="button" onClick={() => setChoosingPlace(true)} className="flex w-full items-center gap-3 rounded-[22px] bg-[#292a2d] p-3 text-left">{place?.images?.[0] ? <img src={place.images[0]} alt="" className="h-14 w-14 rounded-2xl object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#36373b]"><Search className="h-5 w-5 text-white/50" /></span>}<span className="min-w-0 flex-1"><span className="block text-xs text-white/45">Negocio a promocionar</span><span className="mt-1 block truncate text-sm font-semibold">{place?.name || 'Selecciona un negocio'}</span></span><span className="text-sm text-white/60">{place ? 'Cambiar' : 'Elegir'}</span></button>
        <section className="mt-4 rounded-[22px] bg-[#292a2d] p-4"><div className="flex items-end justify-between"><div><p className="text-sm font-semibold">Presupuesto</p><p className="mt-1 text-xs text-white/45">Ajusta cuánto quieres invertir</p></div><p className="text-xl font-bold">${budget.toLocaleString('es-MX')} <span className="text-xs font-semibold text-white/50">MXN</span></p></div><input aria-label="Presupuesto en pesos" type="range" min="100" max="5000" step="100" value={budget} onChange={(event) => setBudget(Number(event.target.value))} className="mt-5 w-full accent-white"/><div className="mt-1 flex justify-between text-[11px] text-white/40"><span>$100</span><span>$5,000</span></div><div className="mt-4 flex gap-2">{[300, 500, 1000].map((value) => <button key={value} type="button" aria-pressed={budget === value} onClick={() => setBudget(value)} style={budget === value ? { backgroundColor: '#fff', color: '#111', textShadow: 'none' } : undefined} className={`flex-1 rounded-full py-2 text-xs font-semibold transition-colors ${budget === value ? '!bg-white !text-black' : 'bg-[#36373b] text-white/65'}`}>${value}</button>)}</div></section>
        <section className="mt-4 rounded-[22px] bg-[#292a2d] p-4"><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-white/60"/><h3 className="text-sm font-semibold">Alcance estimado en el feed</h3></div><p className="mt-3 text-3xl font-bold">{appearances} <span className="text-sm font-medium text-white/50">apariciones</span></p><div className="mt-4 space-y-2">{placementSchedule.map((slot) => <div key={slot.period} className="flex items-center justify-between rounded-2xl bg-[#343538] px-3.5 py-3 text-sm"><span className="text-white/70">{slot.period}</span><span className="font-semibold">{slot.count} {slot.count === 1 ? 'espacio' : 'espacios'}</span></div>)}</div><p className="mt-3 text-[11px] leading-relaxed text-white/40">Estimación ilustrativa; el equipo confirmará disponibilidad y horarios por correo.</p></section>
        <label className="mt-5 block"><span className="mb-2 block text-sm font-semibold">Correo para recibir el enlace de pago</span><input required type="email" maxLength={180} value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="tu@correo.com" className="w-full rounded-2xl bg-[#303134] px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/20"/><span className="mt-2 block text-xs leading-relaxed text-white/45">El equipo revisará tu solicitud y te enviará por correo un enlace seguro de Mercado Pago. No se cobra aquí.</span></label>
        {saveError && <p role="alert" className="mt-4 rounded-2xl bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{saveError}</p>}
        <button type="button" disabled={!place || !contactEmail.includes('@') || saving} onClick={() => void saveCampaign()} style={place && contactEmail.includes('@') ? { backgroundColor: '#fff', color: '#111', opacity: 1 } : { backgroundColor: '#36373b', color: '#a1a1aa', opacity: 1 }} className={`mt-4 w-full rounded-full py-3.5 text-sm font-bold transition-colors disabled:cursor-not-allowed ${place && contactEmail.includes('@') ? '!bg-white !text-black' : '!bg-[#36373b] !text-white/50'}`}>{saving ? 'Enviando solicitud…' : 'Solicitar promoción'}</button>
      </div>}

      <AnimatePresence>{choosingPlace && <>
        <motion.button aria-label="Cerrar negocios" onClick={() => setChoosingPlace(false)} className="fixed inset-0 z-[80] bg-black/65" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}/>
        <motion.div {...placePickerDrag} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 360, mass: 0.82 }} className="fixed inset-x-0 bottom-0 z-[81] mx-auto flex h-[min(75dvh,680px)] w-full max-w-[620px] flex-col overflow-hidden overscroll-none rounded-t-[32px] bg-[#202124] pt-2">
          <SheetDragHandle controls={placePickerDrag.dragControls}/><div className="mb-4 flex items-center justify-between px-5"><h3 className="text-lg font-bold">Elige un negocio</h3><button type="button" onClick={() => setChoosingPlace(false)} className="rounded-full bg-white/[0.08] p-2"><X className="h-4 w-4"/></button></div>
          <div className="mx-5 mb-4 flex items-center gap-2 rounded-full bg-[#303135] px-4 py-3"><Search className="h-4 w-4 shrink-0 text-white/45"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar negocio" style={{ background: 'transparent', backgroundColor: 'transparent' }} className="!min-w-0 !flex-1 !bg-transparent text-sm text-white outline-none placeholder:text-white/50"/></div>
          <div className="min-h-0 flex-1 touch-pan-y space-y-2 overflow-y-auto overscroll-contain px-5 pb-5">{filtered.map((item) => <button key={item.id} type="button" onClick={() => { setPlace(item); setChoosingPlace(false); }} className={`flex w-full items-center gap-3 rounded-full p-2 text-left ${place?.id === item.id ? 'bg-[#3a3a3a]' : 'bg-[#292929]'}`}><img src={item.images?.[0]} alt="" className="h-12 w-12 rounded-full object-cover"/><span className="min-w-0 flex-1 truncate text-sm font-semibold">{item.name}</span>{place?.id === item.id && <Check className="mr-2 h-5 w-5"/>}</button>)}</div>
        </motion.div>
      </>}</AnimatePresence>
    </motion.section>
  </>;
}
