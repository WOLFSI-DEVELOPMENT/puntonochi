import { useMemo, useState } from 'react';
import { Activity, ArrowLeft, ChevronLeft, ChevronRight, Flame, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { getProfileActivity, profileDateKey } from '../profileStorage';

type Props = { totalDays: number; currentStreak: number; onClose: () => void };
const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const dateKey = (date: Date) => profileDateKey(date);
function minutesLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

export function StreakPage({ totalDays, currentStreak, onClose }: Props) {
  const reduceMotion = useReducedMotion();
  const [monthOffset, setMonthOffset] = useState(0);
  const activity = useMemo(() => getProfileActivity().activeSecondsByDay, [monthOffset]);
  const today = new Date();
  const month = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthLabel = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(month);
  const offset = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const cellCount = Math.ceil(cells.length / 7) * 7;
  const getSeconds = (key: string) => Math.max(0, activity[key] || 0);
  const color = (seconds: number) => seconds <= 0 ? 'bg-white/[0.07]' : seconds < 300 ? 'bg-red-950' : seconds < 900 ? 'bg-red-800' : seconds < 1800 ? 'bg-orange-600' : 'bg-orange-300';
  const todayKey = dateKey(today);
  const todaySeconds = getSeconds(todayKey);
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - ((today.getDay() + 6) % 7) + index);
    return { date, key: dateKey(date) };
  });
  const weekSeconds = week.reduce((sum, day) => sum + getSeconds(day.key), 0);
  const activeDays = cells.filter((day): day is number => typeof day === 'number').filter((day) => getSeconds(dateKey(new Date(month.getFullYear(), month.getMonth(), day))) > 0).length;

  return <motion.main initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0.12 : 0.22 }} className="fixed inset-0 z-[60] overflow-y-auto bg-[#111214] px-5 pb-10 pt-[calc(env(safe-area-inset-top)+18px)] text-white">
    <div className="mx-auto max-w-2xl">
      <button onClick={onClose} type="button" className="mb-7 flex h-9 items-center gap-2 text-sm font-medium text-white/65 transition-colors hover:text-white"><ArrowLeft className="h-4 w-4"/>Inicio</button>
      <header className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-3"><Flame className="h-5 w-5 fill-orange-300 text-orange-300"/><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">Tu constancia</p><h1 className="text-xl font-bold tracking-tight">Racha y actividad</h1></div></div>
        <div className="mt-6 flex items-baseline gap-8"><div><strong className="text-3xl font-bold tabular-nums">{currentStreak}</strong><span className="ml-2 text-sm text-white/55">días de racha</span></div><div className="h-7 w-px bg-white/10"/><div><strong className="text-xl font-semibold tabular-nums">{totalDays}</strong><span className="ml-2 text-sm text-white/55">días en PuntoNochi</span></div></div>
      </header>
      <section className="border-b border-white/10 py-6">
        <div className="mb-4 flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-white/55"/><h2 className="text-sm font-semibold">Actividad mensual</h2></div><p className="mt-1 text-[11px] text-white/40">{activeDays} días activos</p></div><div className="flex items-center gap-2"><button type="button" aria-label="Mes anterior" onClick={() => setMonthOffset((value) => value - 1)} className="flex h-8 w-8 items-center justify-center text-white/55 hover:text-white"><ChevronLeft className="h-4 w-4"/></button><span className="min-w-[105px] text-center text-xs font-medium capitalize text-white/75">{monthLabel}</span><button type="button" aria-label="Mes siguiente" disabled={monthOffset >= 0} onClick={() => setMonthOffset((value) => Math.min(0, value + 1))} className="flex h-8 w-8 items-center justify-center text-white/55 hover:text-white disabled:opacity-25"><ChevronRight className="h-4 w-4"/></button></div></div>
        <div className="w-full" aria-label="Mapa mensual de actividad">
          <div className="flex w-full items-start gap-2">
            <div className="grid h-[112px] w-8 shrink-0 grid-rows-7 items-center gap-2 text-[9px] leading-none text-white/40">
              {weekdays.map((day, index) => <span key={`${day}-${index}`} className="flex h-3 items-center">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][index]}</span>)}
            </div>
            <div className="grid min-w-0 flex-1 grid-flow-col gap-y-2" style={{ gridTemplateColumns: `repeat(${cellCount / 7}, minmax(0, 1fr))`, gridTemplateRows: 'repeat(7, 12px)' }}>
            {Array.from({ length: cellCount }, (_, index) => {
              const day = cells[index];
              if (!day) return <span key={`blank-${index}`} className="mx-auto h-3 w-full max-w-[24px]"/>;
              const key = dateKey(new Date(month.getFullYear(), month.getMonth(), day));
              const seconds = getSeconds(key);
              return <motion.span key={key} title={`${key}: ${minutesLabel(seconds)} activos`} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduceMotion ? 0 : index * 0.004 }} className={`mx-auto h-3 w-full max-w-[24px] rounded-full ${color(seconds)} ${key === todayKey ? 'ring-1 ring-white/80' : ''}`}/>;
            })}
          </div>
          </div>
          <div className="mt-4 flex justify-between pl-10 text-[9px] text-white/40">
            {Array.from({ length: cellCount / 7 }, (_, weekIndex) => {
              const firstDay = cells[weekIndex * 7];
              const date = firstDay ? new Date(month.getFullYear(), month.getMonth(), firstDay) : null;
              const label = date && (weekIndex === 0 || date.getDate() <= 7) ? new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(date).replace('.', '') : '';
              return <span key={`month-${weekIndex}`} className="flex-1 text-center">{label}</span>;
            })}
          </div>
          <div className="mt-3 flex justify-end"><div className="flex items-center gap-1 text-[9px] text-white/40"><span>Menos</span>{['bg-white/[0.07]', 'bg-red-950', 'bg-red-800', 'bg-orange-600', 'bg-orange-300'].map((className) => <span key={className} className={`h-[10px] w-[10px] rounded-full ${className}`}/>)}<span>Más</span></div></div>
        </div>
      </section>
      <section className="grid gap-6 border-b border-white/10 py-6 sm:grid-cols-2">
        <div><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-white/55"/><h2 className="text-sm font-semibold">Hoy</h2></div><p className="mt-3 text-2xl font-bold tabular-nums">{minutesLabel(todaySeconds)}</p><p className="mt-1 text-xs text-white/40">Tiempo activo hoy</p><div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.08]"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, todaySeconds / 1800 * 100)}%` }} transition={{ duration: reduceMotion ? 0 : 0.55 }} className="h-full rounded-full bg-gradient-to-r from-red-500 via-orange-500 to-amber-300"/></div></div>
        <div><h2 className="text-sm font-semibold">Esta semana</h2><p className="mt-1 text-xs text-white/40">{minutesLabel(weekSeconds)} activos</p><div className="mt-4 flex h-14 items-end gap-2">{week.map(({ date, key }, index) => { const seconds = getSeconds(key); const height = seconds ? Math.max(12, Math.min(100, seconds / 1200 * 100)) : 6; return <div key={key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"><motion.div initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ delay: reduceMotion ? 0 : index * 0.035, duration: 0.3 }} className={`w-full ${seconds ? 'bg-orange-400' : 'bg-white/[0.08]'}`}/><span className={`text-[9px] ${dateKey(date) === todayKey ? 'text-white' : 'text-white/35'}`}>{weekdays[index]}</span></div>; })}</div></div>
      </section>
      <p className="pt-4 text-[10px] text-white/30">La actividad se guarda en este dispositivo.</p>
    </div>
  </motion.main>;
}
