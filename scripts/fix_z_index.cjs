const fs = require('fs');
let code = fs.readFileSync('src/components/BusinessDetailSheet.tsx', 'utf8');

// The main sheet is z-[61].
// We must make all modals inside it > z-[61]

code = code.split('className="fixed inset-0 z-[60] bg-black/90').join('className="fixed inset-0 z-[80] bg-black/90');
code = code.split('z-[65]').join('z-[85]');

fs.writeFileSync('src/components/BusinessDetailSheet.tsx', code);
console.log('Fixed photo viewer z-index');
