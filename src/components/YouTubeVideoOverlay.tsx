import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ExternalLink, Play, X } from 'lucide-react';

export type PlayableVideo = {
  id: string;
  title: string;
  creator: string;
  isShort: boolean;
  thumbnail?: string;
};

type Props = {
  video: PlayableVideo | null;
  onClose: () => void;
};

export function YouTubeVideoOverlay({ video, onClose }: Props) {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  useEffect(() => {
    if (!video) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [video, onClose]);

  useEffect(() => {
    setActiveVideoId(null);
  }, [video?.id]);

  return (
    <AnimatePresence>
      {video && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/60 px-4 py-8 backdrop-blur-2xl sm:px-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="youtube-video-title"
            className={`relative w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#1c1c1f]/80 p-3 shadow-2xl backdrop-blur-2xl sm:p-4 ${video.isShort ? 'max-w-[420px]' : 'max-w-5xl'}`}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
          >
            <div className="mb-3 flex items-start gap-3 px-1 pt-1">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white/50">{video.creator} · {video.isShort ? 'Short' : 'Video'}</p>
                <h2 id="youtube-video-title" className="mt-1 line-clamp-2 text-sm font-semibold sm:text-base">{video.title}</h2>
              </div>
              <button type="button" onClick={onClose} aria-label="Cerrar video" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div
              className={`relative mx-auto overflow-hidden rounded-[20px] bg-black ${video.isShort ? '' : 'aspect-video w-full'}`}
              style={video.isShort ? { width: 'min(100%, calc(min(72dvh, 720px) * 9 / 16))', aspectRatio: '9 / 16' } : undefined}
            >
              {activeVideoId === video.id ? (
                <iframe
                  src={`https://www.youtube.com/embed/${encodeURIComponent(video.id)}?autoplay=1&playsinline=1&rel=0&controls=1`}
                  title={video.title}
                  className="absolute inset-0 h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              ) : (
                <button type="button" onClick={() => setActiveVideoId(video.id)} aria-label={`Reproducir: ${video.title}`} className="group absolute inset-0 flex h-full w-full items-center justify-center">
                  {video.thumbnail && <img src={video.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                  <span className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/35" />
                  <span className="relative grid h-16 w-16 place-items-center rounded-full bg-white text-black shadow-xl transition-transform group-hover:scale-105">
                    <Play className="ml-1 h-7 w-7 fill-current" />
                  </span>
                </button>
              )}
            </div>
            <a href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/15">
              <Play className="h-3.5 w-3.5 fill-current" /> Reproducir en YouTube <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
