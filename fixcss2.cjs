const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');
code = code.replace('.dark [class*="bg-white"]', '.dark [class*="bg-[#f8f9fa]"], .dark [class*="bg-white"]');
code = code.replace('@layer base {\n  html, body, * {', '@layer base {\n  html, body { scroll-behavior: smooth; }\n  html, body, * {');
fs.writeFileSync('src/index.css', code);
console.log('Fixed CSS gap and smooth scrolling');
