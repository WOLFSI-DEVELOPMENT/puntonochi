import { useMemo, useState } from 'react';
import { Activity, ArrowLeft, ChevronLeft, ChevronRight, Flame, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { getProfileActivity, profileDateKey } from '../profileStorage';

type Props = { totalDays: number; currentStreak: number; onClose: () => void };
const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const calendarWeekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
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
  const activityLevel = (seconds: number) => seconds <= 0 ? 0 : seconds < 300 ? 1 : seconds < 900 ? 2 : seconds < 1800 ? 3 : 4;
  const dayTone = ['bg-white/[0.035] text-white/45', 'bg-red-950 text-rose-100', 'bg-red-900 text-rose-50', 'bg-red-700 text-white', 'bg-orange-400 text-[#27160e]'];
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
        <div aria-label="Calendario mensual de actividad">
          <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[10px] font-medium text-white/40">
            {calendarWeekdays.map((day) => <span key={day} className="py-1">{day}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: cellCount }, (_, index) => {
              const day = cells[index];
              if (!day) return <span key={`blank-${index}`} aria-hidden="true" className="aspect-square"/>;
              const key = dateKey(new Date(month.getFullYear(), month.getMonth(), day));
              const seconds = getSeconds(key);
              const level = activityLevel(seconds);
              return <motion.div key={key} title={`${key}: ${minutesLabel(seconds)} activos`} initial={reduceMotion ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : index * 0.006 }} className={`relative flex aspect-square flex-col items-center justify-center gap-1 rounded-[14px] text-xs font-semibold tabular-nums transition-[filter,transform] hover:brightness-125 ${dayTone[level]} ${key === todayKey ? 'ring-1 ring-inset ring-orange-200/80' : ''}`}>
                <span>{day}</span>
                <span className={`h-1 w-1 rounded-full ${level === 0 ? 'bg-transparent' : level === 4 ? 'bg-[#27160e]/65' : 'bg-orange-300'}`}/>
              </motion.div>;
            })}
          </div>
          <div className="mt-4 flex items-center justify-between text-[10px] text-white/40">
            <span>Menos actividad</span>
            <div className="flex items-center gap-1.5" aria-label="Escala de actividad">
              {dayTone.map((className, index) => <span key={className} title={`Nivel ${index}`} className={`h-3 w-3 rounded-full ${className.split(' ')[0]}`}/>)}
            </div>
            <span>Más</span>
          </div>
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
