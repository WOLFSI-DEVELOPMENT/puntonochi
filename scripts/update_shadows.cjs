const fs = require('fs');
let code = fs.readFileSync('src/components/BottomNav.tsx', 'utf8');
const oldShadow = "boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -2px 6px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.5)'";
const newShadow = "boxShadow: 'inset 0 1px 1px rgba(255,255,255,1), inset 0 0 0 1.5px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(255,255,255,0.4), inset 0 6px 12px rgba(255,255,255,0.3)'";
code = code.split(oldShadow).join(newShadow);
fs.writeFileSync('src/components/BottomNav.tsx', code);
console.log('Replaced inner shadows');
