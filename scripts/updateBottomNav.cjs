const fs = require('fs');
let code = fs.readFileSync('src/components/BottomNav.tsx', 'utf8');

code = code.replace(/import CornerKit from '@cornerkit\/core';\n/, '');

// Remove CornerKit useEffect inside NavTab
code = code.replace(/  useEffect\(\(\) => \{\n    if \(active\) \{\n      const timer = setTimeout\(\(\) => \{\n        const ck = new CornerKit\(\);\n        document\.querySelectorAll\('\.ck-nav-indicator'\)\.forEach\(el => \{\n          try \{ ck\.apply\(el, \{ radius: 22, smoothing: 1 \}\); \} catch\(e\) \{\}\n        \}\);\n      \}, 50\);\n      return \(\) => clearTimeout\(timer\);\n    \}\n  \}, \[active\]\);\n/, '');

// Apply squircle class to indicator and set radius
code = code.replace(/className="ck-nav-indicator absolute inset-0 bg-\[#ffffff\]\/15 -z-10 shadow-\[inset_0_1px_1px_rgba\(255,255,255,0\.1\)\]"/g, 'className="absolute inset-0 bg-[#ffffff]/15 -z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-[22px] squircle"');

fs.writeFileSync('src/components/BottomNav.tsx', code);
console.log('BottomNav.tsx updated for hyperellipse');
