import { motion } from 'motion/react';
import { X } from 'lucide-react';
import React, { useEffect } from 'react';
import { cn } from '../utils';
import { SheetDragHandle, useSheetDrag } from './SheetDragHandle';

interface BottomSheetProps {
  children: React.ReactNode;
  onClose: () => void;
  fullHeight?: boolean;
}

export function BottomSheet({ children, onClose, fullHeight = false }: BottomSheetProps) {
  const sheetDrag = useSheetDrag(onClose);
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
        {...sheetDrag}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 360, mass: 0.82 }}
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

        <SheetDragHandle controls={sheetDrag.dragControls} tone="dark" className="sticky top-0 z-10 w-full bg-white" />

        <div className="flex-1 overflow-y-auto pb-8 scrollbar-hide">
          {children}
        </div>
      </motion.div>
    </>
  );
}
