import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export function FlipText({ children, className = '' }: { children: ReactNode; className?: string }) {
  const [hovered, setHovered] = useState(false);
  const reduceMotion = useReducedMotion();
  const text = typeof children === 'string' ? children : null;

  if (!text) return <span className={className}>{children}</span>;

  return <motion.span className={`inline-block ${className}`} onHoverStart={() => setHovered(true)} onHoverEnd={() => setHovered(false)} onFocus={() => setHovered(true)} onBlur={() => setHovered(false)} aria-label={text}>
    <span aria-hidden="true" className="inline-flex">
      {Array.from(text).map((character, index) => <motion.span key={`${index}-${character}`} className="inline-block" style={{ transformOrigin: '50% 55%' }} animate={{ rotateX: hovered && !reduceMotion ? 360 : 0, y: hovered && !reduceMotion ? -1 : 0 }} transition={{ duration: .55, delay: hovered && !reduceMotion ? index * .025 : 0, ease: [0.22, 1, 0.36, 1] }}>{character === ' ' ? '\u00a0' : character}</motion.span>)}
    </span>
  </motion.span>;
}
