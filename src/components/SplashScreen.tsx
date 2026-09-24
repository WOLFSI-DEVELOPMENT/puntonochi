import { motion } from 'motion/react';

interface SplashScreenProps {
  onFinish?: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black select-none cursor-default"
    >
      <motion.h1
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="text-[38px] md:text-[44px] font-bold text-white tracking-tight font-sans text-center"
      >
        PuntoNochi
      </motion.h1>
    </motion.div>
  );
}
