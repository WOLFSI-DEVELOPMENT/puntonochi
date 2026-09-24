const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/import CornerKit from '@cornerkit\/core';/, "import { registerHyperellipse } from 'hyperellipse';");

// Remove CornerKit useEffect
code = code.replace(/  useEffect\(\(\) => \{\n    if \(activeTab === 'inicio'\) \{\n      const timer = setTimeout\(\(\) => \{\n        const ck = new CornerKit\(\);\n        document\.querySelectorAll\('\.ck-app-card'\)\.forEach\(el => \{\n          try \{ ck\.apply\(el, \{ radius: 26, smoothing: 1 \}\); \} catch\(e\) \{\}\n        \}\);\n        document\.querySelectorAll\('\.ck-app-card-inner'\)\.forEach\(el => \{\n          try \{ ck\.apply\(el, \{ radius: 21, smoothing: 1 \}\); \} catch\(e\) \{\}\n        \}\);\n      \}, 300\);\n      return \(\) => clearTimeout\(timer\);\n    \}\n  \}, \[activeTab, destacadosState\.index\]\);\n/, '');

// Add registerHyperellipse to global init
code = code.replace(/  useEffect\(\(\) => \{\n    document\.documentElement\.classList\.add\('dark'\);\n  \}, \[\]\);/, "  useEffect(() => {\n    document.documentElement.classList.add('dark');\n    registerHyperellipse();\n  }, []);");

// Replace classes
code = code.replace(/className="ck-app-card absolute w-\[85%\] h-full bg-white cursor-pointer p-\[5px\]"/g, 'className="absolute w-[85%] h-full bg-white cursor-pointer p-[5px] rounded-[26px] squircle"');
code = code.replace(/className="ck-app-card-inner relative w-full h-full overflow-hidden"/g, 'className="relative w-full h-full overflow-hidden rounded-[21px] squircle"');
code = code.replace(/className="ck-app-card w-\[85%\] h-full bg-neutral-200 animate-pulse shadow-sm"/g, 'className="w-[85%] h-full bg-neutral-200 animate-pulse shadow-sm rounded-[26px] squircle"');

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx updated for hyperellipse');
