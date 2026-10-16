import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ImagePlus, RefreshCcw, Type, X } from 'lucide-react';
import CornerKit from '@cornerkit/core';

const RECORDING_LENGTHS = [15, 30, 60, 90];
const RECORDING_DELAYS = [0, 3, 10];
type LibraryVideo = { id: string; file: File; url: string; duration: number; loading: boolean };
type BrowserSpeechRecognition = new () => { continuous: boolean; interimResults: boolean; lang: string; onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void };

export function ReelCreatorPage({ onClose }: { onClose: () => void }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const delayIntervalRef = useRef<number | null>(null);
  const audioEnabledRef = useRef(true);
  const startTimeRef = useRef(0);
  const [cameraSide, setCameraSide] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [preCountdown, setPreCountdown] = useState<number | null>(null);
  const [lengthIndex, setLengthIndex] = useState(0);
  const [delayIndex, setDelayIndex] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState('');
  const [postMessage, setPostMessage] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [textToolOpen, setTextToolOpen] = useState(false);
  const [textDraft, setTextDraft] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textStroke, setTextStroke] = useState<'none' | 'outline' | 'shadow'>('outline');
  const [textWeight, setTextWeight] = useState<'normal' | 'bold'>('bold');
  const [textPosition, setTextPosition] = useState({ x: 50, y: 42 });
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryVideos, setLibraryVideos] = useState<LibraryVideo[]>([]);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<InstanceType<BrowserSpeechRecognition> | null>(null);
  const [captions, setCaptions] = useState('');
  const [captionsProgress, setCaptionsProgress] = useState(0);
  const [captionsCreating, setCaptionsCreating] = useState(false);
  const [captionPositionY, setCaptionPositionY] = useState(72);
  const selectedLength = RECORDING_LENGTHS[lengthIndex];
  const selectedDelay = RECORDING_DELAYS[delayIndex];
  const selectedLibraryVideos = libraryVideos.filter((video) => selectedLibraryIds.includes(video.id));
  const textShadow = textStroke === 'outline' ? '2px 0 #111, -2px 0 #111, 0 2px #111, 0 -2px #111' : textStroke === 'shadow' ? '0 3px 8px rgba(0,0,0,.85)' : 'none';

  const toggleAutoCaptions = () => {
    if (captionsCreating) { speechRecognitionRef.current?.stop(); return; }
    const SpeechRecognition = (window as Window & { SpeechRecognition?: BrowserSpeechRecognition; webkitSpeechRecognition?: BrowserSpeechRecognition }).SpeechRecognition || (window as Window & { webkitSpeechRecognition?: BrowserSpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognition) { setPostMessage('Este navegador no ofrece reconocimiento de voz local.'); return; }
    const recognition = new SpeechRecognition();
    speechRecognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'es-MX';
    setCaptions(''); setCaptionsProgress(8); setCaptionsCreating(true);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript || '').join(' ').trim();
      if (transcript) setCaptions(transcript);
      setCaptionsProgress((value) => Math.min(92, value + 14));
    };
    recognition.onerror = () => { setCaptionsCreating(false); setPostMessage('No se pudo crear subtítulos con el reconocimiento del navegador.'); };
    recognition.onend = () => { setCaptionsCreating(false); setCaptionsProgress(100); speechRecognitionRef.current = null; };
    try { recognition.start(); } catch { setCaptionsCreating(false); setPostMessage('No se pudo iniciar el reconocimiento de voz.'); }
  };

  const publishShort = async () => {
    if (!recordedUrl || publishing) return;
    setPublishing(true); setPostMessage('Subiendo video…');
    try {
      const blob = await (await fetch(recordedUrl)).blob();
      const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] || ''); reader.onerror = () => reject(new Error('No se pudo preparar el video.')); reader.readAsDataURL(blob); });
      const title = textDraft.trim().split('\n')[0].slice(0, 90) || 'Un momento de Nochistlán';
      const description = captions.trim() || 'Un video compartido en PuntoNochi.';
      const response = await fetch('/api/shorts/publish', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base64, mimeType: blob.type || 'video/webm', title, description }) });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) { setPostMessage('Inicia sesión para publicar tu PuntoShort.'); return; }
      if (!response.ok) throw new Error(result.error || 'No se pudo publicar el video.');
      window.dispatchEvent(new CustomEvent('puntonochi:short-published'));
      setPostMessage('Publicado en tu perfil público.');
    } catch (error) { setPostMessage(error instanceof Error ? error.message : 'No se pudo publicar el video.'); }
    finally { setPublishing(false); }
  };

  const addLibraryVideos = (files: FileList | null) => {
    const incoming = Array.from(files || []).filter((file) => file.type.startsWith('video/'));
    if (!incoming.length) return;
    const next = incoming.map((file, index) => ({ id: `${file.name}-${file.size}-${file.lastModified}-${index}`, file, url: URL.createObjectURL(file), duration: 0, loading: true }));
    setLibraryVideos((current) => [...current, ...next]);
    next.forEach((video) => {
      const probe = document.createElement('video');
      probe.preload = 'metadata';
      probe.onloadedmetadata = () => updateLibraryVideoDuration(video.id, probe.duration);
      probe.ondurationchange = () => updateLibraryVideoDuration(video.id, probe.duration);
      probe.onerror = () => { setLibraryVideos((current) => current.map((item) => item.id === video.id ? { ...item, loading: false, duration: -1 } : item)); };
      probe.src = video.url;
    });
  };

  const updateLibraryVideoDuration = (id: string, duration: number) => {
    setLibraryVideos((current) => current.map((item) => item.id === id ? { ...item, duration: Number.isFinite(duration) ? duration : -1, loading: false } : item));
  };

  const toggleLibraryVideo = (video: LibraryVideo) => {
    if (video.loading || video.duration < 0) return;
    if (selectedLibraryIds.includes(video.id)) { setSelectedLibraryIds((current) => current.filter((id) => id !== video.id)); return; }
    const selected = selectedLibraryVideos;
    const canSelect = selected.length === 0 ? video.duration <= 60 : selected.length < 3 && selected.every((item) => item.duration <= 20) && video.duration <= 20;
    if (canSelect) setSelectedLibraryIds((current) => [...current, video.id]);
    else setPostMessage('Elige hasta 3 videos de 20 segundos o menos, o un solo video de hasta 60 segundos.');
  };

  useEffect(() => {
    let cancelled = false;
    setCameraReady(false);
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Este dispositivo no permite abrir la cámara desde el navegador.');
      return;
    }
    const videoConstraints = { facingMode: { ideal: cameraSide }, width: { ideal: 1080 }, height: { ideal: 1920 } };
    void navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: { echoCancellation: true, noiseSuppression: true } })
      .catch(async () => {
        const videoOnlyStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
        setAudioEnabled(false);
        audioEnabledRef.current = false;
        setAudioAvailable(false);
        return videoOnlyStream;
      })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        const audioTracks = stream.getAudioTracks();
        setAudioAvailable(audioTracks.length > 0);
        audioTracks.forEach((track) => { track.enabled = audioEnabledRef.current; });
        if (cameraRef.current) {
          cameraRef.current.srcObject = stream;
          void cameraRef.current.play().then(() => setCameraReady(true)).catch(() => setCameraReady(true));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setCameraError(error instanceof Error && error.name === 'NotAllowedError' ? 'Permite el acceso a la cámara para crear un video.' : 'No se pudo iniciar la cámara. Revisa que esté disponible e inténtalo otra vez.');
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [cameraSide]);

  useEffect(() => {
    if (recordedUrl || !cameraRef.current || !streamRef.current) return;
    cameraRef.current.srcObject = streamRef.current;
    void cameraRef.current.play().then(() => setCameraReady(true)).catch(() => setCameraReady(true));
  }, [recordedUrl]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const cornerKit = new CornerKit();
    const config = { radius: 30, smoothing: 1 };
    let animationFrame = 0;
    const apply = () => cornerKit.apply(frame, config);
    const schedule = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(apply);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(frame);
    const contentObserver = new MutationObserver(schedule);
    contentObserver.observe(frame, { childList: true, subtree: true });
    // CornerKit needs the element to have its final layout. Retry during the
    // opening transition as well as on later size/content changes.
    schedule();
    const retries = [50, 180, 420].map((delay) => window.setTimeout(schedule, delay));
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      retries.forEach(window.clearTimeout);
      observer.disconnect();
      contentObserver.disconnect();
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
    };
  }, []);

  const cleanupRecordingTimers = () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    if (delayIntervalRef.current !== null) window.clearInterval(delayIntervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
    delayIntervalRef.current = null;
  };

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state !== 'recording') return;
    try { recorder.requestData(); } catch { /* Some browsers flush the pending data when stopped. */ }
    recorder.stop();
  }, []);

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream || !cameraReady || typeof MediaRecorder === 'undefined') {
      setCameraError(!stream || !cameraReady ? 'Espera a que la cámara esté lista.' : 'La grabación no está disponible en este navegador.');
      return;
    }
    try {
      const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        cleanupRecordingTimers();
        setIsRecording(false);
        const recordedChunks = chunksRef.current;
        const recordedType = recordedChunks.find((chunk) => chunk.type)?.type || recorder.mimeType || 'video/webm';
        const recordedBlob = new Blob(recordedChunks, { type: recordedType });
        if (recordedBlob.size > 0) {
          // Detach the live camera before switching the video element to the saved clip.
          if (cameraRef.current) {
            cameraRef.current.pause();
            cameraRef.current.srcObject = null;
          }
          const nextUrl = URL.createObjectURL(recordedBlob);
          setRecordedUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return nextUrl; });
        } else setCameraError('No se pudo guardar la grabación. Inténtalo otra vez.');
      };
      recorder.start(200);
      setRecordedUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return ''; });
      setPostMessage('');
      setElapsed(0);
      setIsRecording(true);
      startTimeRef.current = Date.now();
      intervalRef.current = window.setInterval(() => setElapsed((Date.now() - startTimeRef.current) / 1000), 100);
      timeoutRef.current = window.setTimeout(stopRecording, selectedLength * 1000);
    } catch {
      setCameraError('No se pudo iniciar la grabación. Inténtalo de nuevo.');
    }
  };

  const handleRecordButton = () => {
    if (isRecording) { stopRecording(); return; }
    if (preCountdown !== null) {
      if (delayIntervalRef.current !== null) window.clearInterval(delayIntervalRef.current);
      delayIntervalRef.current = null;
      setPreCountdown(null);
      return;
    }
    if (!selectedDelay) { startRecording(); return; }
    let secondsLeft = selectedDelay;
    setPreCountdown(secondsLeft);
    delayIntervalRef.current = window.setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        if (delayIntervalRef.current !== null) window.clearInterval(delayIntervalRef.current);
        delayIntervalRef.current = null;
        setPreCountdown(null);
        startRecording();
      } else setPreCountdown(secondsLeft);
    }, 1000);
  };

  const toggleAudio = () => {
    const next = !audioEnabled;
    audioEnabledRef.current = next;
    setAudioEnabled(next);
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = next; });
  };

  useEffect(() => () => {
    cleanupRecordingTimers();
    if (recorderRef.current?.state === 'recording') { recorderRef.current.onstop = null; recorderRef.current.stop(); }
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);
  useEffect(() => () => { if (recordedUrl) URL.revokeObjectURL(recordedUrl); }, [recordedUrl]);

  const cycleLength = () => setLengthIndex((current) => (current + 1) % RECORDING_LENGTHS.length);
  const formatTime = (value: number) => `${Math.floor(value / 60)}:${Math.floor(value % 60).toString().padStart(2, '0')}`;

  return <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .2 }} className="fixed inset-0 z-[110] bg-black p-[5px] text-white">
    <div ref={frameRef} className="relative h-full w-full overflow-hidden rounded-[30px] bg-[#08090b] [corner-shape:squircle]">
      {recordedUrl ? <video src={recordedUrl} autoPlay muted playsInline className="absolute inset-0 h-full w-full bg-black object-cover"/> : <video ref={cameraRef} autoPlay muted playsInline className="absolute inset-0 h-full w-full bg-black object-cover"/>}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/40 to-transparent"/>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 via-black/20 to-transparent"/>

      <div className="absolute inset-x-0 top-[max(10px,env(safe-area-inset-top))] z-10 flex items-center justify-between px-3">
        <button type="button" onClick={onClose} aria-label="Cerrar creador" className="flex h-10 w-10 items-center justify-center rounded-full text-white active:scale-90"><X className="h-6 w-6"/></button>
        <span className="text-[13px] font-semibold text-white">Crear PuntoShort</span>
        <span aria-hidden="true" className="h-10 w-10" />
      </div>

      {!cameraReady && !cameraError && !recordedUrl && <div className="absolute inset-0 z-[5] flex items-center justify-center bg-black/20 text-sm text-white/70">Iniciando cámara…</div>}
      {cameraError && !recordedUrl && <div className="absolute inset-x-8 top-1/2 z-10 -translate-y-1/2 text-center"><p className="text-sm text-white/85">{cameraError}</p><button type="button" onClick={() => { setCameraError(''); setCameraSide((side) => side === 'user' ? 'environment' : 'user'); }} className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black">Volver a intentar</button></div>}

      {textDraft && <div className="absolute z-20 max-w-[82%] -translate-x-1/2 -translate-y-1/2 cursor-move select-none touch-none text-center text-3xl leading-tight" style={{ left: `${textPosition.x}%`, top: `${textPosition.y}%`, color: textColor, fontWeight: textWeight === 'bold' ? 800 : 500, textShadow, touchAction: 'none' }} onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); const rect = event.currentTarget.parentElement?.getBoundingClientRect(); if (!rect) return; let frame = 0; const move = (moveEvent: PointerEvent) => { window.cancelAnimationFrame(frame); frame = window.requestAnimationFrame(() => setTextPosition({ x: Math.max(10, Math.min(90, (moveEvent.clientX - rect.left) / rect.width * 100)), y: Math.max(12, Math.min(82, (moveEvent.clientY - rect.top) / rect.height * 100)) })); }; const stop = () => { window.cancelAnimationFrame(frame); event.currentTarget.removeEventListener('pointermove', move); event.currentTarget.removeEventListener('pointerup', stop); event.currentTarget.removeEventListener('pointercancel', stop); }; event.currentTarget.addEventListener('pointermove', move); event.currentTarget.addEventListener('pointerup', stop); event.currentTarget.addEventListener('pointercancel', stop); }}>{textDraft}</div>}
      {captions && <div className="absolute z-20 max-w-[82%] -translate-x-1/2 -translate-y-1/2 cursor-move select-none touch-none text-center text-xl font-bold leading-tight text-white" style={{ left: '50%', top: `${captionPositionY}%`, textShadow: '0 3px 8px rgba(0,0,0,.85)', touchAction: 'none' }} onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); const rect = event.currentTarget.parentElement?.getBoundingClientRect(); if (!rect) return; let frame = 0; const move = (moveEvent: PointerEvent) => { window.cancelAnimationFrame(frame); frame = window.requestAnimationFrame(() => setCaptionPositionY(Math.max(15, Math.min(88, (moveEvent.clientY - rect.top) / rect.height * 100)))); }; const stop = () => { window.cancelAnimationFrame(frame); event.currentTarget.removeEventListener('pointermove', move); event.currentTarget.removeEventListener('pointerup', stop); event.currentTarget.removeEventListener('pointercancel', stop); }; event.currentTarget.addEventListener('pointermove', move); event.currentTarget.addEventListener('pointerup', stop); event.currentTarget.addEventListener('pointercancel', stop); }}>{captions}</div>}
      {recordedUrl && <button type="button" onClick={() => { setTextToolOpen(true); window.setTimeout(() => document.querySelector<HTMLTextAreaElement>('[data-reel-text-input]')?.focus(), 0); }} aria-label="Agregar texto al video" className="absolute bottom-[31%] right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"><Type className="h-[19px] w-[19px]"/></button>}

      {(isRecording || preCountdown !== null) && <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"><span className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-black/30 text-[34px] font-semibold tabular-nums text-white backdrop-blur-sm">{preCountdown !== null ? preCountdown : formatTime(Math.max(0, Math.ceil(selectedLength - elapsed)))}</span></div>}
      {postMessage && recordedUrl && <div role="status" className="absolute bottom-[calc(max(20px,env(safe-area-inset-bottom))+86px)] inset-x-5 z-30 rounded-full bg-black/50 px-4 py-2.5 text-center text-xs font-medium text-white backdrop-blur-xl">{postMessage}</div>}

      <div className={`absolute inset-x-0 bottom-[max(20px,env(safe-area-inset-bottom))] z-20 flex items-center px-4 ${recordedUrl ? 'justify-center gap-3' : 'justify-between'}`}>
        {!recordedUrl && <button type="button" onClick={() => setLibraryOpen(true)} aria-label="Elegir videos de la biblioteca" className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-violet-500 to-fuchsia-500 [corner-shape:squircle]"><ImagePlus className="h-5 w-5"/></button>}
        {recordedUrl ? <><button type="button" disabled={publishing} onClick={() => { setPostMessage(''); setRecordedUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return ''; }); }} className="flex h-12 flex-1 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white backdrop-blur-xl disabled:opacity-50">Cancelar</button><button type="button" disabled={publishing} onClick={() => void publishShort()} className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#fe2c55] text-sm font-bold text-white disabled:opacity-60">{publishing ? 'Publicando…' : 'Publicar'}</button></> : <button type="button" onClick={handleRecordButton} aria-label={isRecording ? 'Terminar grabación' : preCountdown !== null ? 'Cancelar cuenta regresiva' : 'Iniciar grabación'} disabled={!cameraReady} style={{ opacity: 1 }} className={`reel-record-button relative flex h-[70px] w-[70px] items-center justify-center rounded-full border-[3px] transition-[transform,background-color,box-shadow] duration-200 !opacity-100 disabled:!opacity-100 disabled:cursor-wait active:scale-95 ${isRecording ? 'border-[#ff453a] bg-[#ff453a] shadow-[0_0_0_5px_rgba(255,69,58,.28)]' : 'border-white bg-transparent shadow-[0_0_0_5px_rgba(255,255,255,.22)]'}`}><span className={`block transition-all ${isRecording ? 'h-7 w-7 rounded-[7px] bg-white' : 'h-[54px] w-[54px] rounded-full bg-white'}`}/></button>}
        {!recordedUrl && <div className="flex flex-col items-center gap-4"><button type="button" onClick={cycleLength} disabled={isRecording || preCountdown !== null} aria-label={`Duración máxima: ${selectedLength} segundos. Cambiar duración`} title="Duración del video" className="flex flex-col items-center gap-1 text-white drop-shadow-md disabled:opacity-45"><span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 text-[10px] font-bold">{selectedLength}s</span><span className="text-[9px]">Duración</span></button><button type="button" onClick={() => { if (!isRecording && preCountdown === null) { setRecordedUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return ''; }); setCameraReady(false); setCameraSide((side) => side === 'user' ? 'environment' : 'user'); } }} disabled={isRecording || preCountdown !== null} aria-label="Cambiar cámara" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md disabled:opacity-40"><RefreshCcw className="h-[19px] w-[19px]"/></button></div>}
      </div>
    </div>
    {textToolOpen && <div className="fixed inset-x-4 bottom-24 z-[115] mx-auto max-w-lg rounded-[22px] bg-black/75 p-3 text-white backdrop-blur-xl"><div className="mb-2 flex items-center gap-2 overflow-x-auto"><span className="mr-1 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-white/50">Estilo</span>{(['none', 'outline', 'shadow'] as const).map((style) => <button key={style} type="button" onClick={() => setTextStroke(style)} className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold ${textStroke === style ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>{style === 'none' ? 'Limpio' : style === 'outline' ? 'Borde' : 'Sombra'}</button>)}{['#ffffff', '#ffd60a', '#ff375f', '#64d2ff', '#30d158'].map((color) => <button key={color} type="button" onClick={() => setTextColor(color)} aria-label={`Color ${color}`} className="h-6 w-6 shrink-0 rounded-full border-2 border-white/70" style={{ backgroundColor: color, boxShadow: textColor === color ? '0 0 0 2px #fff' : 'none' }}/>)}</div><div className="flex items-end gap-2"><textarea data-reel-text-input autoFocus value={textDraft} onChange={(event) => setTextDraft(event.target.value)} rows={1} placeholder="Escribe tu texto…" className="min-h-11 min-w-0 flex-1 resize-none rounded-[15px] bg-white/[.12] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/45"/><button type="button" onClick={() => setTextWeight((weight) => weight === 'bold' ? 'normal' : 'bold')} className={`h-11 w-11 rounded-[15px] text-lg font-bold ${textWeight === 'bold' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>B</button><button type="button" onClick={() => setTextToolOpen(false)} className="h-11 rounded-[15px] bg-white px-4 text-xs font-bold text-black">Listo</button></div><button type="button" onClick={toggleAutoCaptions} className="mt-2 flex h-10 w-full items-center justify-center rounded-[15px] bg-white/[.12] text-xs font-semibold text-white">{captionsCreating ? `Creando subtítulos… ${captionsProgress}%` : captionsProgress === 100 ? 'Subtítulos creados · volver a crear' : 'Crear subtítulos automáticos'} </button></div>}
    {libraryOpen && <>
      <button type="button" aria-label="Cerrar biblioteca de videos" onClick={() => setLibraryOpen(false)} className="fixed inset-0 z-[120] bg-black/55" />
      <section role="dialog" aria-modal="true" aria-label="Elegir videos" className="fixed inset-x-3 bottom-3 z-[121] mx-auto max-h-[58dvh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto rounded-[28px] border border-white/[.08] bg-[#202124] px-4 pb-5 pt-4 text-white shadow-[0_24px_80px_rgba(0,0,0,.65)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Tus videos</h2><p className="mt-1 text-xs text-white/50">Selecciona hasta 3 videos de 20 s o uno de hasta 60 s.</p></div><label className="flex h-10 cursor-pointer items-center rounded-full !bg-white px-4 text-xs font-bold !text-black">Agregar videos<input ref={libraryInputRef} type="file" accept="video/*" multiple className="sr-only" onChange={(event) => { addLibraryVideos(event.target.files); event.currentTarget.value = ''; }} /></label></div>
        {!libraryVideos.length ? <label className="mt-5 flex h-32 cursor-pointer items-center justify-center rounded-[20px] border border-dashed border-white/15 bg-white/[.04] text-sm text-white/55">Toca “Agregar videos” para comenzar<input type="file" accept="video/*" multiple className="sr-only" onChange={(event) => { addLibraryVideos(event.target.files); event.currentTarget.value = ''; }} /></label> : <div className="mt-5 grid grid-cols-3 gap-2">{libraryVideos.map((video) => <button key={video.id} type="button" onClick={() => toggleLibraryVideo(video)} aria-label={`${video.file.name}${video.loading ? ', cargando duración' : video.duration < 0 ? ', no se pudo leer' : `, duración ${Math.ceil(video.duration)} segundos`}${selectedLibraryIds.includes(video.id) ? ', seleccionado' : ''}`} className={`relative aspect-[9/14] overflow-hidden rounded-[16px] bg-[#2b2d31] text-left transition-shadow ${selectedLibraryIds.includes(video.id) ? 'ring-2 ring-white ring-offset-2 ring-offset-[#202124]' : ''}`}>{video.loading ? <div className="h-full w-full animate-pulse bg-gradient-to-br from-white/[.08] via-white/[.15] to-white/[.05]"/> : video.duration < 0 ? <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-[10px] text-white/55">No se pudo leer</span> : <><video src={video.url} muted playsInline preload="metadata" onLoadedMetadata={(event) => updateLibraryVideoDuration(video.id, event.currentTarget.duration)} onDurationChange={(event) => updateLibraryVideoDuration(video.id, event.currentTarget.duration)} className="h-full w-full object-cover"/><span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold">{Math.ceil(video.duration)}s</span>{selectedLibraryIds.includes(video.id) && <span className="absolute inset-x-2 top-2 rounded-full bg-white px-2 py-1 text-center text-[9px] font-bold text-black">Seleccionado</span>}</>}</button>)}</div>}
        {selectedLibraryVideos.length > 0 && <button type="button" onClick={() => { setLibraryOpen(false); setPostMessage(''); setRecordedUrl(selectedLibraryVideos[0].url); }} className="mt-5 h-12 w-full rounded-full !bg-white text-sm font-bold !text-black">Usar {selectedLibraryVideos.length} video{selectedLibraryVideos.length === 1 ? '' : 's'} en el editor</button>}
      </section>
    </>}
  </motion.main>;
}

