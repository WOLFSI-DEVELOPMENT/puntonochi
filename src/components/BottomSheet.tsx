import { motion } from 'motion/react';
import { X } from 'lucide-react';
import React, { useEffect } from 'react';
import { cn } from '../utils';

interface BottomSheetProps {
  children: React.ReactNode;
  onClose: () => void;
  fullHeight?: boolean;
}

export function BottomSheet({ children, onClose, fullHeight = false }: BottomSheetProps) {
  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
      />
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, { offset, velocity }) => {
          if (offset.y > 100 || velocity.y > 500) {
            onClose();
          }
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 bg-white squircle overflow-hidden flex flex-col shadow-2xl",
          fullHeight ? "h-[90vh]" : "max-h-[90vh]"
        )}
        style={{
           // Apply squircle only to the top, but since Hyperellipse processes --corner-shape, 
           // we might need to just use a standard rounded-t-[32px] if it doesn't support distinct corners well.
           // Actually, hyperellipse works on standard border-radius. We can set border-radius explicitly.
           borderTopLeftRadius: '32px',
           borderTopRightRadius: '32px'
        }}
      >
        <div className="absolute top-4 right-4 z-20">
          <button 
            onClick={onClose}
            className="w-8 h-8 bg-black/5 backdrop-blur-md squircle flex items-center justify-center text-neutral-600 hover:bg-black/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="sticky top-0 w-full pt-3 pb-2 flex justify-center z-10 shrink-0 touch-none">
          <div className="w-12 h-1.5 bg-neutral-300 rounded-full" />
        </div>

        <div className="flex-1 overflow-y-auto pb-8 scrollbar-hide">
          {children}
        </div>
      </motion.div>
    </>
  );
}
