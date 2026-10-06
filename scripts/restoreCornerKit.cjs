const fs = require('fs');

// 1. Remove .squircle from index.css
let css = fs.readFileSync('src/index.css', 'utf8');
css = css.replace(/\/\* Hyperellipse squircle utility \*\/[\s\S]*?\.squircle \{ --corner-shape: squircle; \}/, '');
fs.writeFileSync('src/index.css', css);

// 2. Restore App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/import \{ registerHyperellipse \} from 'hyperellipse';/, "import CornerKit from '@cornerkit/core';");
app = app.replace(/    registerHyperellipse\(\);\n/, '');

const effectApp = `
  useEffect(() => {
    if (activeTab === 'inicio') {
      const timer = setTimeout(() => {
        const ck = new CornerKit();
        document.querySelectorAll('.ck-app-card').forEach(el => {
          try { ck.apply(el, { radius: 26, smoothing: 1 }); } catch(e) {}
        });
        document.querySelectorAll('.ck-app-card-inner').forEach(el => {
          try { ck.apply(el, { radius: 21, smoothing: 1 }); } catch(e) {}
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab, destacadosState.index]);
`;
app = app.replace(/  const \[destacadosState, setDestacadosState\] = useState\(\{ index: 0, direction: 0 \}\);\n/, '  const [destacadosState, setDestacadosState] = useState({ index: 0, direction: 0 });\n' + effectApp);
app = app.replace(/className="absolute w-\[85%\] h-full bg-white cursor-pointer p-\[5px\] rounded-\[26px\] squircle"/g, 'className="ck-app-card absolute w-[85%] h-full bg-white cursor-pointer p-[5px]"');
app = app.replace(/className="relative w-full h-full overflow-hidden rounded-\[21px\] squircle"/g, 'className="ck-app-card-inner relative w-full h-full overflow-hidden"');
app = app.replace(/className="w-\[85%\] h-full bg-neutral-200 animate-pulse shadow-sm rounded-\[26px\] squircle"/g, 'className="ck-app-card w-[85%] h-full bg-neutral-200 animate-pulse shadow-sm"');
fs.writeFileSync('src/App.tsx', app);

// 3. Restore BottomNav.tsx
let nav = fs.readFileSync('src/components/BottomNav.tsx', 'utf8');
nav = nav.replace(/import \{ Search, X \} from 'lucide-react';/, "import { Search, X } from 'lucide-react';\nimport CornerKit from '@cornerkit/core';");

const effectNav = `  useEffect(() => {
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
nav = nav.replace(/function NavTab\(\{ id, icon, label, active, onClick \}: \{ id: string, icon: any, label: string, active: boolean, onClick: \(\) => void \}\) \{\n  return \(/, "function NavTab({ id, icon, label, active, onClick }: { id: string, icon: any, label: string, active: boolean, onClick: () => void }) {\n" + effectNav + "  return (");
nav = nav.replace(/className="absolute inset-0 bg-\[#ffffff\]\/15 -z-10 shadow-\[inset_0_1px_1px_rgba\(255,255,255,0\.1\)\] rounded-full"/g, 'className="ck-nav-indicator absolute inset-0 bg-[#ffffff]/15 -z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"');
fs.writeFileSync('src/components/BottomNav.tsx', nav);

// 4. Restore BusinessDetailSheet.tsx
let sheet = fs.readFileSync('src/components/BusinessDetailSheet.tsx', 'utf8');
sheet = sheet.replace(/import \{ Place \} from '\.\.\/types';/, "import { Place } from '../types';\nimport CornerKit from '@cornerkit/core';");
const effectSheet = `  useEffect(() => {
    const timer = setTimeout(() => {
      const ck = new CornerKit();
      document.querySelectorAll('.ck-apply').forEach(el => {
        try { ck.apply(el, { radius: 23, smoothing: 1 }); } catch (e) {}
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [place, isOpen]);
`;
sheet = sheet.replace(/  const openViewer = \(index: number\) => setViewerState\(\{ index, direction: 0 \}\);/, effectSheet + '  const openViewer = (index: number) => setViewerState({ index, direction: 0 });');
sheet = sheet.replace(/className="squircle rounded-\[23px\] /g, 'className="ck-apply ');
sheet = sheet.replace(/className=\{`squircle rounded-\[23px\] /g, 'className={`ck-apply ');
fs.writeFileSync('src/components/BusinessDetailSheet.tsx', sheet);

// 5. Restore DestacadosPage.tsx
let dest = fs.readFileSync('src/components/DestacadosPage.tsx', 'utf8');
dest = dest.replace(/import React, \{ useEffect \} from 'react';/, "import React, { useEffect } from 'react';\nimport CornerKit from '@cornerkit/core';");
const effectDest = `  useEffect(() => {
    const timer = setTimeout(() => {
      const ck = new CornerKit();
      document.querySelectorAll('.ck-card').forEach(el => {
        try { ck.apply(el, { radius: 23, smoothing: 1 }); } catch (e) {}
      });
      document.querySelectorAll('.ck-card-inner').forEach(el => {
        try { ck.apply(el, { radius: 18, smoothing: 1 }); } catch (e) {}
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [places]);
`;
dest = dest.replace(/  const places = React\.useMemo\(\(\) => \{\n    return mockPlaces\.filter\(p => p\.images && p\.images\.length > 0\);\n  \}, \[\]\);\n/, '  const places = React.useMemo(() => {\n    return mockPlaces.filter(p => p.images && p.images.length > 0);\n  }, []);\n' + effectDest);
dest = dest.replace(/className="squircle rounded-\[23px\] /g, 'className="ck-card ');
dest = dest.replace(/className="squircle rounded-\[18px\] /g, 'className="ck-card-inner ');
fs.writeFileSync('src/components/DestacadosPage.tsx', dest);

console.log('Restored CornerKit everywhere!');
