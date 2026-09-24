const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

// Remove old dark rules
const lines = code.split('\n');
const newLines = lines.filter(l => !l.startsWith('.dark'));
code = newLines.join('\n');

code += `
.dark {
  background-color: #121212 !important;
  color: #e8eaed !important;
  color-scheme: dark;
}
.dark [class*="bg-white"], .dark .bg-white { background-color: #1e1e1e !important; }
.dark [class*="bg-neutral-50"], .dark .bg-neutral-50 { background-color: #202124 !important; }
.dark [class*="bg-neutral-100"], .dark .bg-neutral-100 { background-color: #2d2f31 !important; color: #ffffff !important; }
.dark [class*="bg-neutral-200"], .dark .bg-neutral-200 { background-color: #3c4043 !important; }
.dark [class*="bg-[#f1f3f4]"] { background-color: #2d2f31 !important; }
.dark [class*="bg-[#e5e5e5]"] { background-color: #121212 !important; }
.dark [class*="text-neutral-900"], .dark .text-neutral-900 { color: #ffffff !important; }
.dark [class*="text-neutral-800"], .dark .text-neutral-800 { color: #e8eaed !important; }
.dark [class*="text-neutral-700"], .dark .text-neutral-700 { color: #dadce0 !important; }
.dark [class*="text-neutral-600"], .dark .text-neutral-600 { color: #9aa0a6 !important; }
.dark [class*="text-neutral-500"], .dark .text-neutral-500 { color: #9aa0a6 !important; }
.dark [class*="text-[#1a73e8]"] { color: #8ab4f8 !important; }
.dark [class*="border-neutral-100"], .dark .border-neutral-100 { border-color: #3c4043 !important; }
.dark [class*="border-neutral-200"], .dark .border-neutral-200 { border-color: #5f6368 !important; }
.dark [class*="border-white"] { border-color: #3c4043 !important; }
.dark input { background-color: #202124 !important; color: #fff !important; }
`;
fs.writeFileSync('src/index.css', code);
console.log('Applied aggressive dark theme CSS');
