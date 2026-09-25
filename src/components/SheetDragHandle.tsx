import { useDragControls } from 'motion/react';
import type { PanInfo } from 'motion/react';

export function useSheetDrag(onDismiss: () => void) {
  const controls = useDragControls();
  return {
    dragControls: controls,
    drag: 'y' as const,
    dragListener: false,
    dragConstraints: { top: 0, bottom: 0 },
    dragElastic: { top: 0, bottom: 0.14 },
    dragMomentum: false,
    dragTransition: { bounceStiffness: 520, bounceDamping: 42 },
    onDragEnd: (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y > 115 || (info.offset.y > 12 && info.velocity.y > 780)) onDismiss();
    },
  };
}

export function SheetDragHandle({ controls, tone = 'light', className = '' }: { controls: ReturnType<typeof useDragControls>; tone?: 'light' | 'dark'; className?: string }) {
  return <div aria-hidden="true" onPointerDown={(event) => controls.start(event)} className={`flex h-8 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing ${className}`}><div className={`h-1.5 w-12 rounded-full ${tone === 'dark' ? 'bg-black/20' : 'bg-white/25'}`} /></div>;
}
