import { Clock3, Trash2 } from 'lucide-react';

export const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export type BusinessHours = { closed: boolean; intervals: { open: string; close: string }[] };
export type WeeklyHours = Record<string, BusinessHours>;

export function createDefaultWeeklySchedule(): WeeklyHours {
  return Object.fromEntries(weekDays.map((day) => [day, {
    closed: day === 'Domingo',
    intervals: [{ open: '09:00', close: '18:00' }],
  }]));
}

export function formatWeeklyHours(schedule: WeeklyHours) {
  return weekDays.map((day) => {
    const dayHours = schedule[day];
    if (!dayHours || dayHours.closed) return `${day}: cerrado`;
    return `${day}: ${dayHours.intervals.map(({ open, close }) => `${open}–${close}`).join(' y ') || 'Por confirmar'}`;
  }).join(' · ');
}

export function WeeklyHoursEditor({ value, onChange }: { value: WeeklyHours; onChange: (value: WeeklyHours) => void }) {
  const updateDay = (day: string, updater: (current: BusinessHours) => BusinessHours) => {
    const current = value[day] || { closed: false, intervals: [{ open: '09:00', close: '18:00' }] };
    onChange({ ...value, [day]: updater(current) });
  };

  return (
    <section className="my-4 rounded-[22px] bg-[#292a2d] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Clock3 className="h-4 w-4" />Horario semanal</div>
      <div className="space-y-3">
        {weekDays.map((day) => {
          const dayHours = value[day] || { closed: false, intervals: [{ open: '09:00', close: '18:00' }] };
          return <div key={day} className="rounded-2xl bg-white/[0.04] p-3">
            <div className="flex items-center justify-between"><span className="text-sm font-semibold">{day}</span><label className="flex items-center gap-2 text-xs text-white/60"><input type="checkbox" checked={dayHours.closed} onChange={(event) => updateDay(day, (current) => ({ ...current, closed: event.target.checked }))} />Cerrado</label></div>
            {!dayHours.closed && <div className="mt-2 space-y-2">
              {dayHours.intervals.map((interval, index) => <div key={index} className="flex items-center gap-2">
                <input aria-label={`${day}, apertura ${index + 1}`} type="time" value={interval.open} onChange={(event) => updateDay(day, (current) => ({ ...current, intervals: current.intervals.map((item, itemIndex) => itemIndex === index ? { ...item, open: event.target.value } : item) }))} className="min-w-0 flex-1 rounded-xl bg-[#202124] p-2 text-sm" />
                <span className="text-xs text-white/45">a</span>
                <input aria-label={`${day}, cierre ${index + 1}`} type="time" value={interval.close} onChange={(event) => updateDay(day, (current) => ({ ...current, intervals: current.intervals.map((item, itemIndex) => itemIndex === index ? { ...item, close: event.target.value } : item) }))} className="min-w-0 flex-1 rounded-xl bg-[#202124] p-2 text-sm" />
                {index > 0 && <button type="button" aria-label={`Quitar horario ${index + 1} de ${day}`} onClick={() => updateDay(day, (current) => ({ ...current, intervals: current.intervals.filter((_, itemIndex) => itemIndex !== index) }))} className="rounded-full p-1 text-white/50"><Trash2 className="h-4 w-4" /></button>}
              </div>)}
              <button type="button" onClick={() => updateDay(day, (current) => ({ ...current, intervals: [...current.intervals, { open: '16:00', close: '20:00' }] }))} className="mt-1 text-xs font-semibold text-white/60">+ Agregar otro horario</button>
            </div>}
          </div>;
        })}
      </div>
    </section>
  );
}
