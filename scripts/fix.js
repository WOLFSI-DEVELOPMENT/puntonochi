import fs from 'fs';
let code = fs.readFileSync('imageWaterfall.js', 'utf8');
code = code.replaceAll('\\`', '`').replaceAll('\\$', '$');
fs.writeFileSync('imageWaterfall.js', code);
console.log('Fixed syntax!');
