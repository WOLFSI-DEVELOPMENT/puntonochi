import { useEffect, useMemo, useState } from 'react';
import { Flame } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { profileDateKey } from '../profileStorage';
import CornerKit from '@cornerkit/core';

type Props = { totalDays: number; currentStreak: number; onClose: () => void };
type Milestone = { days: number; name: string; mark: string };
export const streakMilestones: Milestone[] = [
  { days: 3, name: 'Primeros pasos', mark: 'I' }, { days: 7, name: 'Una semana', mark: 'II' },
  { days: 10, name: 'En racha', mark: 'III' }, { days: 20, name: 'Imparable', mark: 'IV' },
  { days: 30, name: 'Constancia', mark: 'V' }, { days: 50, name: 'Leyenda local', mark: 'VI' },
  { days: 100, name: 'Ícono de Nochi', mark: 'VII' },
];
const dateKey = (date: Date) => profileDateKey(date);
export function getStreakMilestone(streak: number) { return streakMilestones.find((item) => item.days === streak) || null; }

function StreakBadge({ days, mark, unlocked, active = false }: { days: number; mark: string; unlocked: boolean; active?: boolean }) {
  const id = `streak-badge-${days}`;
  const badgeShape = days <= 7
    ? 'M50 4 88 19v27c0 27-17 46-38 60C29 92 12 73 12 46V19L50 4Z'
    : days <= 20
      ? 'M50 4 84 15l9 29c-2 27-18 46-43 62C25 90 9 71 7 44l9-29L50 4Z'
      : days <= 50
        ? 'M50 4 89 28 76 74 50 106 24 74 11 28 50 4Z'
        : 'M50 4 91 34 82 78 50 106 18 78 9 34 50 4Z';
  return <svg aria-hidden="true" viewBox="0 0 100 112" className={`h-[68px] w-[61px] ${unlocked ? 'text-[#ff6a32]' : 'text-white/20'} ${active ? 'drop-shadow-[0_6px_18px_rgba(255,93,42,.32)]' : ''}`}>
    <defs><linearGradient id={id} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#ffb13b"/><stop offset="1" stopColor="#f04427"/></linearGradient></defs>
    <path d={badgeShape} fill={unlocked ? `url(#${id})` : 'rgba(255,255,255,.035)'} stroke={unlocked ? '#ff9b49' : 'rgba(255,255,255,.18)'} strokeWidth="2.4"/>
    <path d={badgeShape} fill="none" stroke={unlocked ? 'rgba(255,255,255,.72)' : 'rgba(255,255,255,.14)'} strokeWidth="1.2" transform="translate(6 7) scale(.88 .86)"/>
    <path d="M50 34c-8 10-3 15-9 21-5 5-5 15 1 20 1-6 4-8 7-10 1 5 6 8 5 14 9-4 13-12 10-20-2-6-7-10-6-18-5 3-6 8-5 11-7-4-7-10-3-18Z" fill={unlocked ? '#fff8ed' : 'rgba(255,255,255,.27)'}/>
    <text x="50" y="103" textAnchor="middle" fontSize="9" fontWeight="700" fill={unlocked ? '#fff8ed' : 'rgba(255,255,255,.4)'}>{mark}</text>
  </svg>;
}

export function StreakBadgeCelebration({ days, name, onDone }: { days: number; name: string; onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  const badge = streakMilestones.find((item) => item.days === days) || streakMilestones[0];
  const [ready, setReady] = useState(Boolean(reduceMotion));
  useEffect(() => { const timer = window.setTimeout(() => setReady(true), reduceMotion ? 0 : 1450); return () => window.clearTimeout(timer); }, [reduceMotion]);
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[140] flex items-center justify-center overflow-hidden bg-[#111318]/55 px-6 py-8 backdrop-blur-2xl">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_43%,rgba(255,117,39,.22),transparent_34%),radial-gradient(ellipse_at_50%_55%,rgba(238,54,34,.16),transparent_56%)]"/>
    <div className="relative z-10 mx-auto flex w-full max-w-sm flex-col items-center text-center">
      <motion.div initial={reduceMotion ? false : { scale: .35, rotate: -20, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }} className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[#ff9e31]/25 to-[#ed3c2b]/25 shadow-[0_0_80px_rgba(255,95,35,.23)]"><Flame className="h-[68px] w-[68px] fill-[#ff6b31] text-[#e83b2d] drop-shadow-[0_5px_24px_rgba(255,91,43,.38)]" strokeWidth={1.5}/></motion.div>
      <motion.p initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : .38 }} className="mt-6 text-5xl font-extrabold tabular-nums tracking-tight">{days} <span className="text-2xl">días</span></motion.p>
      <motion.h1 initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : .56 }} className="mt-2 text-xl font-bold">¡Insignia desbloqueada!</motion.h1>
      <motion.p initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduceMotion ? 0 : .72 }} className="mt-2 text-sm text-white/65">Alcanzaste {days} días de racha: <span className="font-semibold text-white">{name}</span></motion.p>
      <motion.div initial={reduceMotion ? false : { opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: reduceMotion ? 0 : .88, type: 'spring', stiffness: 240, damping: 20 }} className="mt-5"><StreakBadge days={days} mark={badge.mark} unlocked active/></motion.div>
      <AnimatePresence>{ready && <motion.button type="button" onClick={onDone} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 23 }} className="mt-7 h-12 w-full max-w-[280px] rounded-full bg-gradient-to-r from-[#ff8b2d] to-[#ed3e2c] text-sm font-bold text-white shadow-[0_8px_28px_rgba(239,69,42,.28)]">Listo</motion.button>}</AnimatePresence>
    </div>
  </motion.div>;
}

export function StreakPage({ totalDays, currentStreak, onClose }: Props) {
  const reduceMotion = useReducedMotion();
  const [showDone, setShowDone] = useState(Boolean(reduceMotion));
  const today = new Date();
  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today); date.setDate(today.getDate() - ((today.getDay() + 6) % 7) + index);
    return { date, key: dateKey(date), label: new Intl.DateTimeFormat('es-MX', { weekday: 'narrow' }).format(date) };
  }), []);
  useEffect(() => {
    const timer = window.setTimeout(() => setShowDone(true), reduceMotion ? 0 : 1650);
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      new CornerKit().applyAll('[data-streak-squircle]', { radius: 26, smoothing: 1 });
    }, 50);
    return () => window.clearTimeout(timer);
  }, []);
  const nextMilestone = streakMilestones.find((item) => item.days > currentStreak) || { days: 100, name: 'Ícono de Nochi', mark: 'VII' };
  const previousMilestone = [...streakMilestones].reverse().find((item) => item.days <= currentStreak)?.days || 0;
  const progress = Math.min(100, ((currentStreak - previousMilestone) / Math.max(1, nextMilestone.days - previousMilestone)) * 100);
  const handleDone = onClose;
  return <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? .12 : .26 }} className="fixed inset-0 z-[60] overflow-y-auto bg-[#090909] text-white">
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pb-[max(22px,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+18px)]">
      <header className="relative -mx-5 -mt-[calc(env(safe-area-inset-top)+18px)] overflow-visible bg-gradient-to-br from-[#ff8a16] via-[#ff5b16] to-[#ef3e25] px-5 pb-4 pt-[calc(env(safe-area-inset-top)+22px)] text-center">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden"><Flame className="absolute -bottom-16 left-1/2 h-[300px] w-[min(118vw,560px)] -translate-x-1/2 scale-x-[1.55] fill-white/[.075] text-white/[.075]" strokeWidth={0.8}/></div>
        <button type="button" onClick={handleDone} aria-label="Cerrar racha" className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/15 text-white/90 transition-colors hover:bg-black/25"><span className="material-symbols-rounded text-[20px]">close</span></button>
        <motion.p initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : .2, duration: .42 }} className="relative mt-3 text-[38px] font-extrabold tabular-nums leading-none tracking-tight">{currentStreak}<span className="ml-2 text-[19px] font-bold">{currentStreak === 1 ? 'día de racha' : 'días de racha'}</span></motion.p>
        <motion.h1 initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : .42, duration: .35 }} className="relative mt-2 text-[18px] font-bold">¡Tu racha sigue!</motion.h1>
        <motion.p initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduceMotion ? 0 : .62, duration: .35 }} className="relative mx-auto mt-1 max-w-[290px] text-xs leading-relaxed text-white/80">Vuelve mañana para sumar otro día a tu racha.</motion.p>
        <motion.div data-streak-squircle initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : .78 }} className="relative z-10 mt-5 -mb-9 rounded-[26px] [corner-shape:squircle] bg-[#171717] px-4 py-3.5 text-left shadow-[0_12px_30px_rgba(102,30,0,.15)]"><div className="mb-2.5 flex items-center justify-between text-[10px] font-semibold text-white/80"><span>Reto semanal</span><span>Día {Math.min(currentStreak, 7)} de 7</span></div><div className="grid grid-cols-7 gap-2">{week.map(({ date, key, label }) => { const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime(); const dayMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime(); const daysAgo = Math.round((todayMidnight - dayMidnight) / 86400000); const active = daysAgo >= 0 && daysAgo < currentStreak; return <div key={key} className="flex flex-col items-center gap-1"><span className={`text-[9px] font-semibold ${active ? 'text-[#ff8b39]' : 'text-white/45'}`}>{label}</span><span className={`flex h-7 w-7 items-center justify-center rounded-full ${active ? 'bg-[#ff651e] text-white' : 'bg-white/[.08] text-white/30'}`}><Flame className={`h-[17px] w-[17px] ${active ? 'fill-current' : ''}`}/></span></div>; })}</div></motion.div>
      </header>
      <motion.section data-streak-squircle initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : 1.1 }} className="mt-14 rounded-[26px] [corner-shape:squircle] bg-[#151515] px-4 py-4"><div className="flex items-center justify-between"><div><h2 className="text-sm font-bold">Tu próximo logro</h2><p className="mt-1 text-[11px] text-white/45">{Math.max(0, nextMilestone.days - currentStreak)} días para {nextMilestone.name}</p></div><StreakBadge days={nextMilestone.days} mark={nextMilestone.mark} unlocked={false}/></div><div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ delay: reduceMotion ? 0 : 1.35, duration: .6 }} className="h-full rounded-full bg-gradient-to-r from-[#ff9c30] to-[#f04427]"/></div></motion.section>
      <section className="mt-5"><div className="mb-3 flex items-end justify-between"><div><h2 className="text-sm font-bold">Tus insignias</h2><p className="mt-1 text-[10px] text-white/40">Se desbloquean al alcanzar cada racha</p></div><span className="text-[10px] font-semibold text-[#ff8651]">{streakMilestones.filter((item) => item.days <= currentStreak).length}/{streakMilestones.length}</span></div><div className="grid grid-cols-4 gap-x-1 gap-y-3">{streakMilestones.map((item, index) => { const unlocked = item.days <= currentStreak; return <motion.div key={item.days} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : 1.25 + index * .065 }} className="flex flex-col items-center text-center"><div className="relative"><StreakBadge days={item.days} mark={item.mark} unlocked={unlocked}/>{unlocked && <span className="absolute -right-0.5 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#ff692f] ring-2 ring-[#090909]"><span className="material-symbols-rounded text-[11px]">check</span></span>}</div><p className={`mt-1 text-[10px] font-semibold ${unlocked ? 'text-white/85' : 'text-white/40'}`}>{item.days} días</p><p className="mt-0.5 max-w-full truncate text-[9px] text-white/35">{item.name}</p></motion.div>; })}</div></section>
      <div className="mt-auto flex items-center justify-between border-t border-white/[.07] pt-4 text-[11px] text-white/40"><span>{totalDays} días usando PuntoNochi</span><span>Se suma una vez al día</span></div>
      <AnimatePresence>{showDone && <motion.button type="button" onClick={handleDone} initial={reduceMotion ? false : { opacity: 0, y: 14, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={{ type: 'spring', stiffness: 260, damping: 23 }} className="mt-4 h-12 w-full rounded-full bg-gradient-to-r from-[#ff7a22] to-[#f04427] text-sm font-bold text-white shadow-[0_7px_24px_rgba(244,68,39,.23)]">Listo</motion.button>}</AnimatePresence>
    </div>
  </motion.main>;
}
