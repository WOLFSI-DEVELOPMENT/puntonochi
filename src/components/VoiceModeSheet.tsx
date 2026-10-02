import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { Camera, CameraOff, FlipHorizontal, MapPin, Mic, MicOff, Scan, Volume2, VolumeX, X } from 'lucide-react';
import type { Place } from '../types';
import { getBookmarkedPlaceIds, setBookmarkedPlaceIds } from '../profileStorage';

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type BrowserRecognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { results: ArrayLike<RecognitionResult>; resultIndex: number }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void;
};
type VoiceWindow = Window & { SpeechRecognition?: new () => BrowserRecognition; webkitSpeechRecognition?: new () => BrowserRecognition };
type Selection = { x: number; y: number; width: number; height: number };

const promptIdeas = ['Encuentra este negocio', '¿Qué me recomiendas aquí?', 'Busca algo parecido cerca', '¿Qué horario tiene?'];

export function VoiceModeSheet({ open, onClose, onSelectBusiness }: { open: boolean; onClose: () => void; onSelectBusiness: (place: Place) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<BrowserRecognition | null>(null);
  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [pointMode, setPointMode] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [interimText, setInterimText] = useState('');
  const [answer, setAnswer] = useState('');
  const [matches, setMatches] = useState<Place[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationState, setLocationState] = useState<'idle' | 'ready' | 'denied'>('idle');
  const dragControls = useDragControls();

  useEffect(() => {
    if (!open || !cameraEnabled || !navigator.mediaDevices?.getUserMedia) return;
    let cancelled = false;
    void navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }).then((stream) => {
      if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    }).catch(() => { setCameraEnabled(false); setError('No se pudo abrir la cámara. Puedes continuar con voz o texto.'); });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open, cameraEnabled, facing]);

  useEffect(() => {
    if (open) return;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    window.speechSynthesis?.cancel();
    historyRef.current = [];
    setListening(false); setSpeaking(false); setAnswer(''); setMatches([]); setSelection(null); setPointMode(false);
  }, [open]);

  const selectPoint = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointMode) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    setSelection({ x: Math.min(88, Math.max(12, x)), y: Math.min(85, Math.max(15, y)), width: 24, height: 22 });
    setPointMode(false);
  };

  const getSelectedImage = () => {
    const video = videoRef.current;
    if (!video || !cameraEnabled || !video.videoWidth || !video.videoHeight) return undefined;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth; const height = video.videoHeight;
    if (selection) {
      const cropWidth = Math.round(width * selection.width / 100);
      const cropHeight = Math.round(height * selection.height / 100);
      const screenX = selection.x / 100 * width;
      const centerX = facing === 'user' ? width - screenX : screenX;
      const centerY = selection.y / 100 * height;
      const sx = Math.max(0, Math.min(width - cropWidth, centerX - cropWidth / 2));
      const sy = Math.max(0, Math.min(height - cropHeight, centerY - cropHeight / 2));
      canvas.width = cropWidth; canvas.height = cropHeight;
      canvas.getContext('2d')?.drawImage(video, sx, sy, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    } else {
      const scale = Math.min(1, 1280 / width);
      canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    return canvas.toDataURL('image/jpeg', .78);
  };

  const ask = async (text: string) => {
    if (!text.trim() || busy) return;
    const cameraImage = getSelectedImage();
    const contextualQuery = `${text.trim()}${selection && cameraImage ? '\nIncluyo una foto recortada del objeto que señalé. Ayúdame a identificar si es uno de los negocios de Punto Nochi.' : cameraImage ? '\nIncluyo una foto tomada con la cámara. Ayúdame a identificar negocios o información visible pertinente.' : ''}`;
    setBusy(true); setError(''); setAnswer(''); setMatches([]); setInterimText('');
    const history = historyRef.current;
    historyRef.current = [...history, { role: 'user', content: text.trim() }].slice(-12);
    try {
      const response = await fetch('/api/ask-nochi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: contextualQuery, history: history.slice(-10), ...(location ? { location } : {}), ...(cameraImage ? { imageData: cameraImage, imageMimeType: 'image/jpeg' } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'No se pudo completar la pregunta.');
      const reply = String(data.answer || '');
      setAnswer(reply);
      setMatches(Array.isArray(data.places) ? data.places as Place[] : []);
      historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }].slice(-12);
      if (speaking && reply && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(reply.replace(/[*#`_]/g, ''));
        utterance.lang = 'es-MX'; utterance.onend = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo completar la pregunta.'); }
    finally { setBusy(false); }
  };

  const toggleListening = () => {
    if (listening) { recognitionRef.current?.stop(); return; }
    const Recognition = (window as VoiceWindow).SpeechRecognition || (window as VoiceWindow).webkitSpeechRecognition;
    if (!Recognition) { setError('El reconocimiento de voz no está disponible en este navegador. Puedes escribir tu pregunta.'); return; }
    const recognition = new Recognition();
    recognition.lang = 'es-MX'; recognition.continuous = false; recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalText = ''; let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      setInterimText(interim);
      if (finalText.trim()) void ask(finalText.trim());
    };
    recognition.onerror = (event) => { setListening(false); if (event.error !== 'aborted' && event.error !== 'no-speech') setError('No se pudo reconocer la voz. Inténtalo otra vez o escribe tu pregunta.'); };
    recognition.onend = () => { setListening(false); setInterimText(''); };
    recognitionRef.current = recognition;
    try { recognition.start(); setListening(true); setError(''); } catch { setError('No se pudo iniciar el micrófono.'); }
  };

  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) { setError('La lectura en voz alta no está disponible en este navegador.'); return; }
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    if (!answer) { setSpeaking(true); return; }
    const utterance = new SpeechSynthesisUtterance(answer.replace(/[*#`_]/g, ''));
    utterance.lang = 'es-MX'; utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance); setSpeaking(true);
  };

  const requestLocation = () => {
    if (!navigator.geolocation) { setLocationState('denied'); return; }
    navigator.geolocation.getCurrentPosition((position) => { setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setLocationState('ready'); }, () => setLocationState('denied'), { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 });
  };

  const close = () => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    onClose();
  };

  return <AnimatePresence>
    {open && <>
      <motion.button type="button" aria-label="Cerrar modo de voz" onClick={close} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}/>
      <motion.section role="dialog" aria-modal="true" aria-label="Modo de voz" className="fixed inset-x-0 bottom-0 z-[101] flex h-[min(94dvh,960px)] flex-col overflow-hidden rounded-t-[32px] bg-[#101113] text-white shadow-[0_-20px_70px_rgba(0,0,0,.55)]" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 280, damping: 32 }} drag="y" dragListener={false} dragControls={dragControls} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: .16 }} dragMomentum={false} onDragEnd={(_, info) => { if (info.offset.y > 130 || info.velocity.y > 850) close(); }}>
        <div className="relative z-10 flex h-14 shrink-0 items-center justify-center" onPointerDown={(event) => dragControls.start(event)}><div className="absolute top-3 h-1.5 w-11 rounded-full bg-white/25"/><button type="button" aria-label="Cerrar" onClick={close} className="absolute right-4 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80"><X className="h-5 w-5"/></button><button type="button" onClick={requestLocation} className="absolute left-4 top-3 flex h-9 items-center gap-1.5 rounded-full bg-white/[.08] px-3 text-xs text-white/75"><MapPin className="h-3.5 w-3.5"/>{locationState === 'ready' ? 'Cerca de ti' : locationState === 'denied' ? 'Ubicación apagada' : 'Usar ubicación'}</button></div>
        <div className="relative mx-3 min-h-[220px] flex-1 overflow-hidden rounded-[26px] bg-[#202226] sm:mx-5">
          <div onPointerDown={selectPoint} className={`absolute inset-0 ${pointMode ? 'cursor-crosshair' : ''}`}>
            {cameraEnabled ? <video ref={videoRef} autoPlay muted playsInline className={`h-full w-full object-cover ${facing === 'user' ? 'scale-x-[-1]' : ''}`} /> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(ellipse_at_50%_65%,rgba(77,92,114,.45),transparent_50%),linear-gradient(145deg,#202329,#111214)] text-white/45"><CameraOff className="h-9 w-9"/><span className="text-sm font-medium">Cámara apagada</span><span className="text-xs text-white/30">Puedes continuar usando solo tu voz</span></div>}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/50"/>
            {pointMode && <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-white/85 bg-white/10 shadow-[0_0_0_9999px_rgba(0,0,0,.16),0_0_22px_rgba(255,255,255,.3)]" style={{ width: '24%', height: '22%' }}><span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">Toca el negocio</span></div>}
            {selection && <div aria-label="Objeto seleccionado" className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,.08),0_0_18px_rgba(255,255,255,.35)]" style={{ left: `${selection.x}%`, top: `${selection.y}%`, width: `${selection.width}%`, height: `${selection.height}%` }}><span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/45 px-3 py-1 text-xs text-white backdrop-blur-md">Enfocando objeto</span></div>}
            <div className="absolute right-3 top-3 flex gap-2">
              <button type="button" aria-label={cameraEnabled ? 'Apagar cámara' : 'Encender cámara'} onClick={() => setCameraEnabled((enabled) => !enabled)} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-lg">{cameraEnabled ? <Camera className="h-[18px] w-[18px]"/> : <CameraOff className="h-[18px] w-[18px]"/>}</button>
              <button type="button" aria-label="Rotar cámara" onClick={() => setFacing((value) => value === 'environment' ? 'user' : 'environment')} disabled={!cameraEnabled} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-lg disabled:opacity-35"><FlipHorizontal className="h-[18px] w-[18px]"/></button>
            </div>
            <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2 px-4 text-center">
              <div className="flex h-11 items-center justify-center gap-[5px]" aria-label="Animación de ondas de voz">{[25, 42, 35, 29].map((height, index) => <motion.span key={index} className="w-[11px] rounded-full bg-gradient-to-b from-white via-[#edf7ff] to-[#68aaff] shadow-[0_2px_9px_rgba(101,167,255,.4)]" animate={{ height: muted || !listening ? 8 : [height * .72, height, height * .8] }} transition={{ duration: .68 + index * .09, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: index * .09 }}/>)}</div>
              <p className="max-w-full truncate text-sm font-medium text-white/90">{busy ? 'Nochi está buscando…' : listening ? interimText || 'Te escucho…' : answer ? 'Respuesta lista' : pointMode ? 'Toca el objeto que quieres identificar' : 'Pregunta por un negocio, lugar o recomendación'}</p>
            </div>
          </div>
        </div>
        <div className="max-h-[34dvh] shrink-0 overflow-y-auto px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 sm:px-6">
          {(answer || error) && <div className="mb-3 max-h-36 overflow-y-auto rounded-2xl bg-white/[.06] px-4 py-3 text-sm leading-5 text-white/80">{error ? <span role="alert" className="text-rose-200">{error}</span> : <>{answer}<button type="button" aria-label={speaking ? 'Detener lectura' : 'Escuchar respuesta'} onClick={toggleSpeech} className="ml-2 inline-flex h-7 w-7 translate-y-1 items-center justify-center rounded-full bg-white/10 text-white/75">{speaking ? <VolumeX className="h-4 w-4"/> : <Volume2 className="h-4 w-4"/>}</button></>}</div>}
          {matches.length > 0 && <div className="mb-3 flex gap-2 overflow-x-auto pb-1">{matches.map((place) => { const saved = getBookmarkedPlaceIds().includes(place.id); return <div key={place.id} className="flex min-w-[210px] items-center gap-2 rounded-2xl bg-white/[.07] p-2.5"><button type="button" onClick={() => { close(); onSelectBusiness(place); }} className="min-w-0 flex-1 text-left"><span className="block truncate text-xs font-bold text-white">{place.name}</span><span className="mt-0.5 block truncate text-[10px] text-white/50">{place.category} · {place.location}</span></button><button type="button" aria-label={saved ? `Quitar ${place.name} de guardados` : `Guardar ${place.name}`} onClick={() => { const ids = getBookmarkedPlaceIds(); setBookmarkedPlaceIds(saved ? ids.filter((id) => id !== place.id) : [...ids, place.id]); }} className="shrink-0 rounded-full bg-white/10 px-2.5 py-2 text-[10px] font-semibold text-white/80">{saved ? 'Guardado' : 'Guardar'}</button></div>; })}</div>}
          {!answer && !busy && <div className="mb-2 flex gap-2 overflow-x-auto pb-1">{promptIdeas.map((idea) => <button type="button" key={idea} onClick={() => void ask(idea)} className="shrink-0 rounded-full bg-white/[.08] px-3 py-2 text-[11px] font-medium text-white/75">{idea}</button>)}</div>}
          <div className="flex items-center justify-center gap-3">
            <button type="button" aria-label={pointMode ? 'Cancelar selección' : 'Seleccionar objeto con la cámara'} onClick={() => { setPointMode((value) => !value); setSelection(null); }} disabled={!cameraEnabled} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full disabled:opacity-40 ${pointMode || selection ? 'bg-white text-black' : 'bg-white/[.10] text-white/85'}`}><Scan className="h-[19px] w-[19px]"/></button>
            <button type="button" aria-label={listening ? 'Detener escucha' : 'Hablar con Nochi'} onClick={toggleListening} disabled={busy} className="flex h-12 min-w-36 items-center justify-center gap-2 rounded-full !bg-white px-5 font-semibold !text-[#17181a] shadow-[0_2px_12px_rgba(255,255,255,.14)] transition-transform active:scale-[.98] disabled:!bg-white disabled:!text-[#17181a] disabled:opacity-100">{listening ? <MicOff className="h-[18px] w-[18px]"/> : <Mic className="h-[18px] w-[18px]"/>}<span className="text-sm">{busy ? 'Buscando…' : listening ? 'Escuchando' : 'Hablar'}</span></button>
            <button type="button" aria-label={speaking ? 'Detener lectura' : 'Leer respuesta'} onClick={toggleSpeech} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${speaking ? 'bg-blue-500 text-white' : 'bg-white/[.10] text-white/85'}`}>{speaking ? <VolumeX className="h-[19px] w-[19px]"/> : <Volume2 className="h-[19px] w-[19px]"/>}</button>
          </div>
          <p className="mt-2 text-center text-[10px] text-white/35">La cámara solo se envía cuando haces una pregunta.</p>
        </div>
      </motion.section>
    </>}
  </AnimatePresence>;
}
