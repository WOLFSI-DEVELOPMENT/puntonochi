const fs = require('fs');
let code = fs.readFileSync('src/components/DestacadosPage.tsx', 'utf8');

// Add CornerKit import
code = code.replace(/import React from 'react';/, "import React, { useEffect } from 'react';\nimport CornerKit from '@cornerkit/core';");

// Add useEffect
const effect = `
  useEffect(() => {
    const timer = setTimeout(() => {
      const ck = new CornerKit();
      document.querySelectorAll('.ck-card').forEach(el => {
        try { ck.apply(el, { radius: 23, smoothing: 1 }); } catch (e) {}
      });
      document.querySelectorAll('.ck-card-inner').forEach(el => {
        try { ck.apply(el, { radius: 18, smoothing: 1 }); } catch (e) {}
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [places]);
`;

code = code.replace(/  const places = React\.useMemo\(\(\) => \{\n    return mockPlaces\.filter\(p => p\.images && p\.images\.length > 0\);\n  \}, \[\]\);/, '  const places = React.useMemo(() => {\n    return mockPlaces.filter(p => p.images && p.images.length > 0);\n  }, []);\n' + effect);

// Update classes
code = code.replace(/className="bg-white rounded-3xl flex flex-col cursor-pointer active:scale-95 transition-transform p-\[5px\]"/g, 'className="ck-card bg-white flex flex-col cursor-pointer active:scale-95 transition-transform p-[5px]"');
code = code.replace(/className="aspect-square relative bg-neutral-100 rounded-2xl overflow-hidden"/g, 'className="ck-card-inner aspect-square relative bg-neutral-100 overflow-hidden"');

fs.writeFileSync('src/components/DestacadosPage.tsx', code);
console.log('Applied CornerKit to DestacadosPage');
