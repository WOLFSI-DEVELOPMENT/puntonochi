import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Check, Clock3, CreditCard, Search, X } from 'lucide-react';
import { mockPlaces } from '../data';
import { Place } from '../types';
import { apiFetch } from '../api';

type Props = { onClose: () => void };
const periods = ['Mañana · 8–12 h', 'Tarde · 12–18 h', 'Noche · 18–23 h'];

export function BusinessPromotionSheet({ onClose }: Props) {
  const [place, setPlace] = useState<Place | null>(null);
  const [query, setQuery] = useState('');
  const [budget, setBudget] = useState(500);
  const [choosingPlace, setChoosingPlace] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [complete, setComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

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
        body: JSON.stringify({ placeId: place.id, placeName: place.name, budgetMXN: budget, estimatedAppearances: appearances, schedule: placementSchedule }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar la promoción.');
      setCheckout(false);
      setComplete(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudo guardar la promoción. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return <>
    <motion.button aria-label="Cerrar promoción" onClick={onClose} className="fixed inset-0 z-[70] bg-black/65" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
    <motion.section role="dialog" aria-modal="true" aria-label="Promociona tu negocio" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 270 }} className="fixed inset-x-0 bottom-0 z-[71] mx-auto flex h-[min(88dvh,820px)] w-full max-w-[620px] flex-col overflow-hidden rounded-t-[32px] bg-[#202124] text-white">
      <div className="relative flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 pb-4 pt-5"><div className="absolute left-1/2 top-2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/20" /><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">PuntoNochi · Promociones</p><h2 className="mt-1 text-xl font-bold">{complete ? 'Solicitud lista' : checkout ? 'Confirmar promoción' : 'Promociona tu negocio'}</h2></div><button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full bg-white/[0.08] p-2.5"><X className="h-4 w-4" /></button></div>

      {complete ? <div className="flex flex-1 flex-col items-center justify-center px-7 text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-300/15 text-emerald-300"><Check className="h-8 w-8" /></span><h3 className="mt-5 text-2xl font-bold">¡Promoción solicitada!</h3><p className="mt-3 max-w-sm text-sm leading-relaxed text-white/60">Registramos la promoción de <strong className="text-white">{place?.name}</strong> por <strong className="text-white">${budget.toLocaleString('es-MX')} MXN</strong>. El equipo te enviará un correo con los siguientes pasos y la confirmación de espacios.</p><button type="button" onClick={onClose} style={{ backgroundColor: '#fff', color: '#111' }} className="mt-7 rounded-full !bg-white px-8 py-3 text-sm font-bold !text-black">Listo</button></div>
      : checkout ? <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 py-5"><div className="rounded-[24px] bg-[#292a2d] p-5"><div className="flex items-center gap-3"><CreditCard className="h-5 w-5 text-white/60" /><div><p className="text-sm font-bold">Pago de demostración</p><p className="mt-0.5 text-xs text-white/45">No se realizará ningún cobro.</p></div></div><div className="my-5 h-px bg-white/10"/><div className="flex justify-between text-sm text-white/60"><span>Negocio</span><span className="max-w-[60%] truncate text-white">{place?.name}</span></div><div className="mt-3 flex justify-between text-sm text-white/60"><span>Espacios estimados</span><span className="text-white">{appearances}</span></div><div className="mt-4 flex justify-between border-t border-white/10 pt-4 text-base font-bold"><span>Total</span><span>${budget.toLocaleString('es-MX')} MXN</span></div></div>{saveError && <p role="alert" className="mt-4 rounded-2xl bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{saveError}</p>}<button type="button" disabled={saving} onClick={saveCampaign} style={{ backgroundColor: '#fff', color: '#111' }} className="mt-5 w-full rounded-full !bg-white py-3.5 text-sm font-bold !text-black disabled:opacity-60">{saving ? 'Guardando…' : 'Confirmar pago simulado'}</button><button type="button" onClick={() => setCheckout(false)} className="mt-3 w-full py-3 text-sm font-semibold text-white/55">Volver</button></div>
      : <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 pb-8 pt-5">
        <p className="mb-5 text-sm leading-relaxed text-white/55">Elige un negocio y un presupuesto. Estimamos una aparición en el feed por cada $50 MXN y repartimos los espacios durante el día.</p>
        <button type="button" onClick={() => setChoosingPlace(true)} className="flex w-full items-center gap-3 rounded-[22px] bg-[#292a2d] p-3 text-left">{place?.images?.[0] ? <img src={place.images[0]} alt="" className="h-14 w-14 rounded-2xl object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#36373b]"><Search className="h-5 w-5 text-white/50" /></span>}<span className="min-w-0 flex-1"><span className="block text-xs text-white/45">Negocio a promocionar</span><span className="mt-1 block truncate text-sm font-semibold">{place?.name || 'Selecciona un negocio'}</span></span><span className="text-sm text-white/60">{place ? 'Cambiar' : 'Elegir'}</span></button>
        <section className="mt-4 rounded-[22px] bg-[#292a2d] p-4"><div className="flex items-end justify-between"><div><p className="text-sm font-semibold">Presupuesto</p><p className="mt-1 text-xs text-white/45">Ajusta cuánto quieres invertir</p></div><p className="text-xl font-bold">${budget.toLocaleString('es-MX')} <span className="text-xs font-semibold text-white/50">MXN</span></p></div><input aria-label="Presupuesto en pesos" type="range" min="100" max="5000" step="100" value={budget} onChange={(event) => setBudget(Number(event.target.value))} className="mt-5 w-full accent-white"/><div className="mt-1 flex justify-between text-[11px] text-white/40"><span>$100</span><span>$5,000</span></div><div className="mt-4 flex gap-2">{[300, 500, 1000].map((value) => <button key={value} type="button" aria-pressed={budget === value} onClick={() => setBudget(value)} style={budget === value ? { backgroundColor: '#fff', color: '#111', textShadow: 'none' } : undefined} className={`flex-1 rounded-full py-2 text-xs font-semibold transition-colors ${budget === value ? '!bg-white !text-black' : 'bg-[#36373b] text-white/65'}`}>${value}</button>)}</div></section>
        <section className="mt-4 rounded-[22px] bg-[#292a2d] p-4"><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-white/60"/><h3 className="text-sm font-semibold">Alcance estimado en el feed</h3></div><p className="mt-3 text-3xl font-bold">{appearances} <span className="text-sm font-medium text-white/50">apariciones</span></p><div className="mt-4 space-y-2">{placementSchedule.map((slot) => <div key={slot.period} className="flex items-center justify-between rounded-2xl bg-[#343538] px-3.5 py-3 text-sm"><span className="text-white/70">{slot.period}</span><span className="font-semibold">{slot.count} {slot.count === 1 ? 'espacio' : 'espacios'}</span></div>)}</div><p className="mt-3 text-[11px] leading-relaxed text-white/40">Estimación ilustrativa; el equipo confirmará disponibilidad y horarios por correo.</p></section>
        <button type="button" onClick={() => place && setCheckout(true)} disabled={!place} aria-disabled={!place} style={place ? { backgroundColor: '#fff', color: '#111', opacity: 1 } : { backgroundColor: '#36373b', color: '#a1a1aa', opacity: 1 }} className={`mt-5 w-full rounded-full py-3.5 text-sm font-bold transition-colors ${place ? '!bg-white !text-black' : '!bg-[#36373b] !text-white/50'}`}>Continuar al pago</button>
      </div>}

      <AnimatePresence>{choosingPlace && <>
        <motion.button aria-label="Cerrar negocios" onClick={() => setChoosingPlace(false)} className="fixed inset-0 z-[80] bg-black/65" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}/>
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 280 }} className="fixed inset-x-0 bottom-0 z-[81] mx-auto flex h-[min(75dvh,680px)] w-full max-w-[620px] flex-col overflow-hidden overscroll-none rounded-t-[32px] bg-[#202124] pt-5">
          <div className="mb-4 flex items-center justify-between px-5"><h3 className="text-lg font-bold">Elige un negocio</h3><button type="button" onClick={() => setChoosingPlace(false)} className="rounded-full bg-white/[0.08] p-2"><X className="h-4 w-4"/></button></div>
          <div className="mx-5 mb-4 flex items-center gap-2 rounded-full bg-[#303135] px-4 py-3"><Search className="h-4 w-4 shrink-0 text-white/45"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar negocio" style={{ background: 'transparent', backgroundColor: 'transparent' }} className="!min-w-0 !flex-1 !bg-transparent text-sm text-white outline-none placeholder:text-white/50"/></div>
          <div className="min-h-0 flex-1 touch-pan-y space-y-2 overflow-y-auto overscroll-contain px-5 pb-5">{filtered.map((item) => <button key={item.id} type="button" onClick={() => { setPlace(item); setChoosingPlace(false); }} className={`flex w-full items-center gap-3 rounded-full p-2 text-left ${place?.id === item.id ? 'bg-[#3a3a3a]' : 'bg-[#292929]'}`}><img src={item.images?.[0]} alt="" className="h-12 w-12 rounded-full object-cover"/><span className="min-w-0 flex-1 truncate text-sm font-semibold">{item.name}</span>{place?.id === item.id && <Check className="mr-2 h-5 w-5"/>}</button>)}</div>
        </motion.div>
      </>}</AnimatePresence>
    </motion.section>
  </>;
}
