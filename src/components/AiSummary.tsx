import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

// Shows the AI summary saved in the database (the server generates it once, then reuses it).
export function AiSummary({ placeId }: { placeId: string }) {
  const [summary, setSummary] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'hidden'>('loading');

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    setSummary(''); setState('loading');
    const load = async (attempt: number) => {
      try {
        const response = await fetch(`/api/places/${encodeURIComponent(placeId)}/overview`, { credentials: 'same-origin' });
        if (!active) return;
        if (response.status === 202 && attempt < 4) { timer = window.setTimeout(() => void load(attempt + 1), 2000); return; }
        const result = await response.json().catch(() => ({}));
        if (!active) return;
        if (response.ok && typeof result.overview === 'string' && result.overview.trim()) { setSummary(result.overview.trim()); setState('ready'); }
        else setState('hidden');
      } catch { if (active) setState('hidden'); }
    };
    void load(0);
    return () => { active = false; if (timer) window.clearTimeout(timer); };
  }, [placeId]);

  if (state === 'hidden') return null;
  return <section aria-label="Resumen con IA" className="mt-4 rounded-[22px] bg-white/[.06] px-4 py-3.5 backdrop-blur-xl">
    <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-sky-300"><Sparkles aria-hidden="true" className="h-3.5 w-3.5" />Resumen con IA</div>
    {state === 'loading'
      ? <div className="space-y-2" role="status" aria-label="Generando resumen"><div className="h-3 w-full animate-pulse rounded-full bg-white/10" /><div className="h-3 w-11/12 animate-pulse rounded-full bg-white/10" /><div className="h-3 w-2/3 animate-pulse rounded-full bg-white/10" /></div>
      : <p className="text-[14px] leading-relaxed text-white/80">{summary}</p>}
  </section>;
}
