import { motion, useAnimation, PanInfo } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { useRef, useState } from 'react';

interface SwipeToSwitchProps {
  label: string;
  onSwitch: () => void;
}

export function SwipeToSwitch({ label, onSwitch }: SwipeToSwitchProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const [isSwiped, setIsSwiped] = useState(false);

  const handleDragEnd = async (e: any, info: PanInfo) => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const threshold = containerWidth * 0.55;

    if (info.offset.x > threshold) {
      setIsSwiped(true);
      await controls.start({ x: containerWidth - 56 }); // 56 is the width of the thumb
      onSwitch();
    } else {
      controls.start({ x: 0 });
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-14 bg-white/10 rounded-full overflow-hidden flex items-center"
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-white/50 text-sm font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      
      <motion.div
        drag="x"
        dragConstraints={containerRef}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        className="absolute left-1 w-12 h-12 bg-white rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg"
      >
        <ChevronRight className="w-6 h-6 text-neutral-900" />
      </motion.div>
    </div>
  );
}
