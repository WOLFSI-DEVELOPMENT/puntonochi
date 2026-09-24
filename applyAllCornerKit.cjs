const fs = require('fs');

// App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/document\.querySelectorAll\('\.ck-app-card'\)\.forEach\(el => \{\n\s*try \{ ck\.apply\(el, \{ radius: 26, smoothing: 1 \}\); \} catch\(e\) \{\}\n\s*\}\);/, "ck.applyAll('.ck-app-card', { radius: 26, smoothing: 1 });");
app = app.replace(/document\.querySelectorAll\('\.ck-app-card-inner'\)\.forEach\(el => \{\n\s*try \{ ck\.apply\(el, \{ radius: 21, smoothing: 1 \}\); \} catch\(e\) \{\}\n\s*\}\);/, "ck.applyAll('.ck-app-card-inner', { radius: 21, smoothing: 1 });");
fs.writeFileSync('src/App.tsx', app);

// DestacadosPage.tsx
let dest = fs.readFileSync('src/components/DestacadosPage.tsx', 'utf8');
dest = dest.replace(/document\.querySelectorAll\('\.ck-card'\)\.forEach\(el => \{\n\s*try \{ ck\.apply\(el, \{ radius: 23, smoothing: 1 \}\); \} catch \(e\) \{\}\n\s*\}\);/, "ck.applyAll('.ck-card', { radius: 23, smoothing: 1 });");
dest = dest.replace(/document\.querySelectorAll\('\.ck-card-inner'\)\.forEach\(el => \{\n\s*try \{ ck\.apply\(el, \{ radius: 18, smoothing: 1 \}\); \} catch \(e\) \{\}\n\s*\}\);/, "ck.applyAll('.ck-card-inner', { radius: 18, smoothing: 1 });");
dest = dest.replace(/500/, "600"); // increase timeout
fs.writeFileSync('src/components/DestacadosPage.tsx', dest);

// BusinessDetailSheet.tsx
let sheet = fs.readFileSync('src/components/BusinessDetailSheet.tsx', 'utf8');
sheet = sheet.replace(/document\.querySelectorAll\('\.ck-apply'\)\.forEach\(el => \{\n\s*try \{ ck\.apply\(el, \{ radius: 23, smoothing: 1 \}\); \} catch \(e\) \{\}\n\s*\}\);/, "ck.applyAll('.ck-apply', { radius: 23, smoothing: 1 });");
sheet = sheet.replace(/150/, "300"); // increase timeout slightly
fs.writeFileSync('src/components/BusinessDetailSheet.tsx', sheet);

console.log('Fixed CornerKit iteration with applyAll');
