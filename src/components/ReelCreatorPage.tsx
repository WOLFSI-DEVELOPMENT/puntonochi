import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ImagePlus, LayoutGrid, Mic, MicOff, RefreshCcw, Settings2, Sparkles, Timer, X } from 'lucide-react';
import CornerKit from '@cornerkit/core';

const RECORDING_LENGTHS = [15, 30, 60, 90];
const RECORDING_DELAYS = [0, 3, 10];

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
  const selectedLength = RECORDING_LENGTHS[lengthIndex];
  const selectedDelay = RECORDING_DELAYS[delayIndex];

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
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
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
        if (chunksRef.current.length) {
          const nextUrl = URL.createObjectURL(new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' }));
          setRecordedUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return nextUrl; });
        }
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
        <button type="button" aria-label="Ajustes de cámara" className="flex h-10 w-10 items-center justify-center rounded-full text-white"><Settings2 className="h-5 w-5"/></button>
      </div>

      {!cameraReady && !cameraError && !recordedUrl && <div className="absolute inset-0 z-[5] flex items-center justify-center bg-black/20 text-sm text-white/70">Iniciando cámara…</div>}
      {cameraError && !recordedUrl && <div className="absolute inset-x-8 top-1/2 z-10 -translate-y-1/2 text-center"><p className="text-sm text-white/85">{cameraError}</p><button type="button" onClick={() => { setCameraError(''); setCameraSide((side) => side === 'user' ? 'environment' : 'user'); }} className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black">Volver a intentar</button></div>}

      <div className="absolute bottom-[26%] right-3 z-10 flex flex-col items-center gap-5">
        <button type="button" onClick={toggleAudio} disabled={!audioAvailable} aria-label={audioAvailable ? (audioEnabled ? 'Silenciar micrófono' : 'Activar micrófono') : 'Micrófono no disponible'} title={audioAvailable ? 'Micrófono' : 'Micrófono no disponible'} className="flex flex-col items-center gap-1 text-white drop-shadow-md disabled:opacity-40">{audioEnabled ? <Mic className="h-5 w-5"/> : <MicOff className="h-5 w-5"/>}<span className="text-[9px]">Audio</span></button>
        <button type="button" onClick={cycleLength} disabled={isRecording || preCountdown !== null} aria-label={`Duración máxima: ${selectedLength} segundos. Cambiar duración`} title="Duración del video" className="flex flex-col items-center gap-1 text-white drop-shadow-md disabled:opacity-45"><span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 text-[10px] font-bold">{selectedLength}s</span><span className="text-[9px]">Duración</span></button>
        <button type="button" aria-label="Efectos" title="Efectos" className="text-white drop-shadow-md"><Sparkles className="h-5 w-5"/></button>
        <button type="button" aria-label="Diseño" title="Diseño" className="text-white drop-shadow-md"><LayoutGrid className="h-5 w-5"/></button>
        <button type="button" onClick={() => setDelayIndex((current) => (current + 1) % RECORDING_DELAYS.length)} disabled={isRecording || preCountdown !== null} aria-label={`Temporizador: ${selectedDelay ? `${selectedDelay} segundos` : 'desactivado'}`} title="Cambiar temporizador" className="flex flex-col items-center gap-1 text-white drop-shadow-md disabled:opacity-45"><Timer className="h-5 w-5"/><span className="text-[9px]">{selectedDelay ? `${selectedDelay}s` : 'Off'}</span></button>
      </div>

      {(isRecording || preCountdown !== null) && <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"><span className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-black/30 text-[34px] font-semibold tabular-nums text-white backdrop-blur-sm">{preCountdown !== null ? preCountdown : formatTime(Math.max(0, Math.ceil(selectedLength - elapsed)))}</span></div>}
      {postMessage && recordedUrl && <div role="status" className="absolute bottom-[calc(max(20px,env(safe-area-inset-bottom))+86px)] inset-x-5 z-30 rounded-full bg-black/50 px-4 py-2.5 text-center text-xs font-medium text-white backdrop-blur-xl">{postMessage}</div>}

      <div className={`absolute inset-x-0 bottom-[max(20px,env(safe-area-inset-bottom))] z-20 flex items-center px-4 ${recordedUrl ? 'justify-center gap-3' : 'justify-between'}`}>
        {!recordedUrl && <button type="button" aria-label="Elegir de la biblioteca" aria-disabled="true" className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-violet-500 to-fuchsia-500 opacity-90 [corner-shape:squircle]"><ImagePlus className="h-5 w-5"/></button>}
        {recordedUrl ? <><button type="button" onClick={() => { setPostMessage(''); setRecordedUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return ''; }); }} className="flex h-12 flex-1 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white backdrop-blur-xl">Cancelar</button><button type="button" onClick={() => setPostMessage('La publicación de videos estará disponible pronto.')} className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#fe2c55] text-sm font-bold text-white">Publicar</button></> : <button type="button" onClick={handleRecordButton} aria-label={isRecording ? 'Terminar grabación' : preCountdown !== null ? 'Cancelar cuenta regresiva' : 'Iniciar grabación'} disabled={!cameraReady} style={{ opacity: 1 }} className={`relative flex h-[70px] w-[70px] items-center justify-center rounded-full border-[3px] transition-[transform,background-color,box-shadow] duration-200 disabled:cursor-wait active:scale-95 ${isRecording ? 'border-[#ff453a] bg-[#ff453a] shadow-[0_0_0_5px_rgba(255,69,58,.28)]' : 'border-white bg-transparent shadow-[0_0_0_5px_rgba(255,255,255,.22)]'}`}><span className={`block transition-all ${isRecording ? 'h-7 w-7 rounded-[7px] bg-white' : 'h-[54px] w-[54px] rounded-full bg-white'}`}/></button>}
        {!recordedUrl && <button type="button" onClick={() => { if (!isRecording && preCountdown === null) { setRecordedUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return ''; }); setCameraReady(false); setCameraSide((side) => side === 'user' ? 'environment' : 'user'); } }} disabled={isRecording || preCountdown !== null} aria-label="Cambiar cámara" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md disabled:opacity-40"><RefreshCcw className="h-[19px] w-[19px]"/></button>}
      </div>
    </div>
  </motion.main>;
}
