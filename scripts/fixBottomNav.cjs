const fs = require('fs');
let code = fs.readFileSync('src/components/BottomNav.tsx', 'utf8');

code = code.replace(/import \{ motion, AnimatePresence \} from 'motion\/react';/, "import { motion, AnimatePresence } from 'motion/react';\nimport CornerKit from '@cornerkit/core';\nimport { useEffect } from 'react';");

const effect = `  useEffect(() => {
    if (active) {
      const timer = setTimeout(() => {
        const ck = new CornerKit();
        document.querySelectorAll('.ck-nav-indicator').forEach(el => {
          try { ck.apply(el, { radius: 22, smoothing: 1 }); } catch(e) {}
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [active]);
`;

code = code.replace(/function NavTab\(\{ id, icon, label, active, onClick \}: \{ id: string, icon: any, label: string, active: boolean, onClick: \(\) => void \}\) \{\n  return \(/, "function NavTab({ id, icon, label, active, onClick }: { id: string, icon: any, label: string, active: boolean, onClick: () => void }) {\n" + effect + "  return (");

// update indicator class and remove rounded-full
code = code.replace(/className="absolute inset-0 bg-\[#ffffff\]\/15 rounded-full -z-10 shadow-\[inset_0_1px_1px_rgba\(255,255,255,0\.1\)\]"/, 'className="ck-nav-indicator absolute inset-0 bg-[#ffffff]/15 -z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"');

// fix icon/text alignment
code = code.replace(/className=\{cn\(\n\s*"relative flex flex-col items-center justify-center w-\[68px\] h-\[54px\] rounded-full transition-colors z-10 text-white\/60",/g, 'className={cn(\n        "relative flex flex-col items-center justify-center gap-0.5 w-[68px] h-[54px] rounded-[24px] transition-colors z-10 text-white/60",');
code = code.replace(/<div className="flex items-center justify-center mt-\[-2px\]">/g, '<div className="flex items-center justify-center">');
code = code.replace(/<span className="text-\[10px\] font-semibold tracking-wide mt-\[2px\] leading-none">/g, '<span className="text-[10px] font-semibold tracking-wide leading-none">');

fs.writeFileSync('src/components/BottomNav.tsx', code);
console.log('Fixed BottomNav alignment and indicator squircle');
