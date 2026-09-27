import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

const INTRO_VIDEO = 'https://res.cloudinary.com/dwthgcx5j/video/upload/v1790552765/Animate_text_for_splash_screen_20260927174416_uvxvzz.mp4';

interface SplashScreenProps {
  onFinish?: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black select-none cursor-default"
    >
      <motion.video
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        src={INTRO_VIDEO}
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        controlsList="nodownload noremoteplayback"
        onEnded={() => onFinishRef.current?.()}
        onError={() => onFinishRef.current?.()}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
    </motion.div>
  );
}
