import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const INTRO_VIDEO = 'https://res.cloudinary.com/dwthgcx5j/video/upload/v1790279115/Earth_zoomed_from_space_20260924134241_jkhbtw.mp4';
const INTRO_FALLBACK_MS = 12_000;
const BRAND_SPLASH_MS = 2_200;

interface SplashScreenProps {
  onFinish?: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [showBrand, setShowBrand] = useState(false);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (showBrand) {
      const timer = window.setTimeout(() => onFinishRef.current?.(), BRAND_SPLASH_MS);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => setShowBrand(true), INTRO_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [showBrand]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black select-none cursor-default"
    >
      <AnimatePresence mode="wait" initial={false}>
        {!showBrand ? (
          <motion.video
            key="earth-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            src={INTRO_VIDEO}
            autoPlay
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            controlsList="nodownload noremoteplayback"
            onEnded={() => setShowBrand(true)}
            onError={() => setShowBrand(true)}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <motion.h1
            key="brand-splash"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="text-center font-sans text-[38px] font-bold tracking-tight text-white md:text-[44px]"
          >
            PuntoNochi
          </motion.h1>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
