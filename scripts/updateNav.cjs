const fs = require('fs');
let code = fs.readFileSync('src/components/BottomNav.tsx', 'utf8');

// Remove SVG components
code = code.replace(/const HouseFillIcon[\s\S]*?\);\n/g, '');
code = code.replace(/const CompassFillIcon[\s\S]*?\);\n/g, '');
code = code.replace(/const MapFillIcon[\s\S]*?\);\n/g, '');
code = code.replace(/const PersonFillIcon[\s\S]*?\);\n/g, '');

// Update NavTabs
code = code.replace(
  /<NavTab id="inicio" icon={<HouseFillIcon className="w-\[24px\] h-\[24px\]" \/>} /g,
  '<NavTab id="inicio" icon={<span className="material-symbols-rounded text-[26px]">home</span>} '
);
code = code.replace(
  /<NavTab id="explorar" icon={<CompassFillIcon className="w-\[24px\] h-\[24px\]" \/>} /g,
  '<NavTab id="explorar" icon={<span className="material-symbols-rounded text-[26px]">explore</span>} '
);
code = code.replace(
  /<NavTab id="mapa" icon={<MapFillIcon className="w-\[24px\] h-\[24px\]" \/>} /g,
  '<NavTab id="mapa" icon={<span className="material-symbols-rounded text-[26px]">map</span>} '
);
code = code.replace(
  /<NavTab id="perfil" icon={<PersonFillIcon className="w-\[24px\] h-\[24px\]" \/>} /g,
  '<NavTab id="perfil" icon={<span className="material-symbols-rounded text-[26px]">person</span>} '
);
code = code.replace(
  /<NavTab id="buscar" icon={<Search className="w-\[24px\] h-\[24px\]" strokeWidth={2\.5} \/>} /g,
  '<NavTab id="buscar" icon={<span className="material-symbols-rounded text-[26px]">search</span>} '
);

fs.writeFileSync('src/components/BottomNav.tsx', code);
console.log('Updated BottomNav to use Material Symbols');
