const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/import \{ MapPage \} from '\.\/components\/MapPage';/, "import { MapPage } from './components/MapPage';\nimport CornerKit from '@cornerkit/core';");

const effect = `
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

code = code.replace(/  const \[destacadosState, setDestacadosState\] = useState\(\{ index: 0, direction: 0 \}\);\n/, '  const [destacadosState, setDestacadosState] = useState({ index: 0, direction: 0 });\n' + effect);

code = code.replace(/className="absolute w-\[85%\] h-full squircle-32 bg-white cursor-pointer p-\[5px\]"/g, 'className="ck-app-card absolute w-[85%] h-full bg-white cursor-pointer p-[5px]"');
code = code.replace(/className="relative w-full h-full rounded-\[24px\] overflow-hidden"/g, 'className="ck-app-card-inner relative w-full h-full overflow-hidden"');
code = code.replace(/className="w-\[85%\] h-full squircle-32 bg-neutral-200 animate-pulse shadow-sm"/g, 'className="ck-app-card w-[85%] h-full bg-neutral-200 animate-pulse shadow-sm"');

fs.writeFileSync('src/App.tsx', code);
console.log('Applied CornerKit to App.tsx carousel');
