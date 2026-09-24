const fs = require('fs');
let code = fs.readFileSync('src/components/BusinessDetailSheet.tsx', 'utf8');

// Add CornerKit import
code = code.replace(/import \{ motion, AnimatePresence \} from 'motion\/react';/, "import { motion, AnimatePresence } from 'motion/react';\nimport CornerKit from '@cornerkit/core';");

// Add useEffect for CornerKit
const effect = `  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const ck = new CornerKit();
        ck.apply('.ck-apply', { radius: 23, smoothing: 1 });
      }, 100);
    }
  }, [isOpen, place]);
`;
code = code.replace(/  const \[viewerIndex, setViewerIndex\] = useState\(0\);\n/, '  const [viewerIndex, setViewerIndex] = useState(0);\n' + effect);

// Add ck-apply to action buttons (remove rounded-xl)
code = code.replace(/className="shrink-0 flex flex-col items-center justify-center gap-1 bg-\[#1a73e8\] text-white rounded-xl py-2 px-5/g, 'className="ck-apply shrink-0 flex flex-col items-center justify-center gap-1 bg-[#1a73e8] text-white py-2 px-5');
code = code.replace(/className=\{`shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-5/g, 'className={`ck-apply shrink-0 flex flex-col items-center justify-center gap-1 py-2 px-5');
code = code.replace(/className=\{`shrink-0 flex flex-col items-center justify-center gap-1 bg-\[#f1f3f4\] rounded-xl py-2 px-5/g, 'className={`ck-apply shrink-0 flex flex-col items-center justify-center gap-1 bg-[#f1f3f4] py-2 px-5');
code = code.replace(/className="shrink-0 flex flex-col items-center justify-center gap-1 bg-\[#f1f3f4\] text-\[#1a73e8\] rounded-xl py-2 px-5/g, 'className="ck-apply shrink-0 flex flex-col items-center justify-center gap-1 bg-[#f1f3f4] text-[#1a73e8] py-2 px-5');

// Add ck-apply to photo containers (remove rounded-[16px])
code = code.replace(/className="w-\[180px\] h-\[240px\] rounded-\[16px\] overflow-hidden/g, 'className="ck-apply w-[180px] h-[240px] overflow-hidden');

fs.writeFileSync('src/components/BusinessDetailSheet.tsx', code);
console.log('Applied CornerKit script generated');
