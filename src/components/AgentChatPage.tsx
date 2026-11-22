import { Fragment, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUp, CheckCircle2, Lock, Sparkles, X } from 'lucide-react';

type FormField = { key: string; label: string; type: string; optional: boolean };
type FormUi = { type: 'form'; title: string; reason: string; businessId: string | null; fields: FormField[] };
type Message = { id: string; role: 'user' | 'assistant'; text: string; ui?: FormUi; formDone?: boolean };

const WELCOME = '¡Hola! Soy el asistente de PuntoNochi. Puedo registrar tu negocio en minutos o editar uno que ya hayas creado. ¿Qué quieres hacer?';
const SUGGESTIONS = ['Quiero agregar mi negocio', 'Quiero editar mi negocio'];

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

// Tiny, safe formatter: **bold** and line breaks only.
function RichText({ text }: { text: string }) {
  return <>{text.split('\n').map((line, index) => <Fragment key={index}>
    {index > 0 && <br />}
    {line.split(/(\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith('**') && part.endsWith('**') ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>)}
  </Fragment>)}</>;
}

function SecureForm({ ui, done, onSubmit }: { ui: FormUi; done?: boolean; onSubmit: (values: Record<string, string>) => Promise<string | null> }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (done) return <div className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"><CheckCircle2 className="h-4 w-4 shrink-0" />Datos enviados de forma segura</div>;
  const ready = ui.fields.every((field) => field.optional || (values[field.key] || '').trim());
  return <form
    className="mt-3 space-y-3 rounded-[22px] bg-white/[.06] p-4"
    onSubmit={async (event) => { event.preventDefault(); if (!ready || busy) return; setBusy(true); setError(''); const problem = await onSubmit(values); if (problem) setError(problem); setBusy(false); }}
  >
    <div className="flex items-start gap-2 text-white/80"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /><div><p className="text-sm font-semibold">{ui.title}</p><p className="mt-0.5 text-xs text-white/50">{ui.reason} La IA no ve estos datos.</p></div></div>
    {ui.fields.map((field) => <label key={field.key} className="block">
      <span className="mb-1 block text-xs font-medium text-white/60">{field.label}</span>
      <input type={field.type} inputMode={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : 'text'} autoComplete={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : 'off'} value={values[field.key] || ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} className="h-11 w-full rounded-xl bg-black/30 px-3 text-[16px] text-white outline-none placeholder:text-white/30" />
    </label>)}
    {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
    <button type="submit" disabled={!ready || busy} className="h-11 w-full rounded-full bg-white text-sm font-bold text-[#202124] transition active:scale-[.98] disabled:opacity-40">{busy ? 'Enviando…' : 'Enviar de forma segura'}</button>
  </form>;
}

export function AgentChatPage({ onClose, onRequireAuth }: { onClose: () => void; onRequireAuth: () => void }) {
  const [messages, setMessages] = useState<Message[]>([{ id: 'welcome', role: 'assistant', text: WELCOME }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const draftId = useRef(newId().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40).padEnd(8, 'x'));
  const endRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>(messages);
  messagesRef.current = messages;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);
  useEffect(() => {
    const root = document.documentElement; const previous = root.style.overflow; root.style.overflow = 'hidden';
    return () => { root.style.overflow = previous; };
  }, []);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const next: Message[] = [...messagesRef.current, { id: newId(), role: 'user', text: trimmed }];
    setMessages(next); setInput(''); setBusy(true);
    try {
      const response = await fetch('/api/agent/chat', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ draftId: draftId.current, messages: next.map(({ role, text: body }) => ({ role, text: body })) }) });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) { setMessages((current) => [...current, { id: newId(), role: 'assistant', text: 'Inicia sesión para continuar.' }]); onRequireAuth(); return; }
      if (!response.ok) throw new Error(result.error || 'No pude responder. Inténtalo de nuevo.');
      setMessages((current) => [...current, { id: newId(), role: 'assistant', text: result.reply || '…', ui: result.ui || undefined }]);
      if (result.created || result.updated) window.dispatchEvent(new CustomEvent('puntonochi:directory-changed'));
    } catch (error) {
      setMessages((current) => [...current, { id: newId(), role: 'assistant', text: error instanceof Error ? error.message : 'No pude responder. Inténtalo de nuevo.' }]);
    } finally { setBusy(false); }
  };

  const submitPrivate = (messageId: string, ui: FormUi) => async (values: Record<string, string>): Promise<string | null> => {
    try {
      const response = await fetch('/api/agent/private', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ draftId: draftId.current, businessId: ui.businessId, values }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return result.error || 'No se pudieron enviar los datos.';
      setMessages((current) => current.map((message) => message.id === messageId ? { ...message, formDone: true } : message));
      void send('Ya envié mis datos privados por el formulario seguro.');
      return null;
    } catch { return 'Sin conexión. Inténtalo de nuevo.'; }
  };

  return <motion.div role="dialog" aria-modal="true" aria-label="Asistente de negocios" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: 0.25 }} className="fixed inset-0 z-[115] flex flex-col bg-[#1a1b1e] text-white">
    <header className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))]">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[.08]"><Sparkles className="h-4 w-4 text-sky-300" /></span>
      <div className="min-w-0 flex-1"><h1 className="text-[15px] font-bold leading-tight">Asistente de negocios</h1><p className="text-[11px] text-white/45">Registra o edita tu negocio chateando</p></div>
      <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[.08]"><X className="h-5 w-5" /></button>
    </header>

    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
      <div className="mx-auto w-full max-w-[640px] space-y-5 pt-2">
        {messages.map((message) => message.role === 'user'
          ? <div key={message.id} className="flex justify-end"><p className="max-w-[85%] whitespace-pre-wrap break-words rounded-[22px] rounded-br-md bg-[#2f3136] px-4 py-2.5 text-[15px] leading-snug">{message.text}</p></div>
          : <div key={message.id} className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[.08]"><Sparkles className="h-3.5 w-3.5 text-sky-300" /></span>
              <div className="min-w-0 flex-1 text-[15px] leading-relaxed text-white/90"><RichText text={message.text} />
                {message.ui && <SecureForm ui={message.ui} done={message.formDone} onSubmit={submitPrivate(message.id, message.ui)} />}
              </div>
            </div>)}
        {messages.length === 1 && <div className="flex flex-wrap gap-2 pl-10">{SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" onClick={() => void send(suggestion)} className="rounded-full bg-white/[.08] px-4 py-2 text-sm font-medium text-white/85 transition active:scale-[.97]">{suggestion}</button>)}</div>}
        {busy && <div className="flex gap-3" role="status" aria-label="El asistente está escribiendo"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[.08]"><Sparkles className="h-3.5 w-3.5 text-sky-300" /></span><span className="flex items-center gap-1 pt-2">{[0, 1, 2].map((dot) => <span key={dot} className="h-2 w-2 animate-pulse rounded-full bg-white/50" style={{ animationDelay: `${dot * 160}ms` }} />)}</span></div>}
        <div ref={endRef} />
      </div>
    </div>

    <form onSubmit={(event) => { event.preventDefault(); void send(input); }} className="shrink-0 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto flex w-full max-w-[640px] items-end gap-2 rounded-[26px] bg-[#2a2b30] py-2 pl-4 pr-2">
        <textarea value={input} onChange={(event) => setInput(event.target.value.slice(0, 1500))} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(input); } }} rows={1} placeholder="Escribe un mensaje…" aria-label="Mensaje" className="max-h-32 min-h-[28px] flex-1 resize-none bg-transparent py-1.5 text-[16px] leading-snug text-white outline-none placeholder:text-white/35" />
        <button type="submit" disabled={!input.trim() || busy} aria-label="Enviar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#1a1b1e] transition active:scale-95 disabled:opacity-30"><ArrowUp className="h-5 w-5" /></button>
      </div>
    </form>
  </motion.div>;
}
