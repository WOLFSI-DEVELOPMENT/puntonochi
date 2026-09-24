const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

code = code.replace(/<script type="module">[\s\S]*?<\/script>/, '');
fs.writeFileSync('index.html', code);
console.log('Removed LiquidGlass CDN from index.html');
