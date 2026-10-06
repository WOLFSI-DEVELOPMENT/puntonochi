const fs = require('fs');

// BusinessDetailSheet
let code = fs.readFileSync('src/components/BusinessDetailSheet.tsx', 'utf8');
code = code.replace(/import CornerKit from '@cornerkit\/core';\n/, '');
code = code.replace(/  useEffect\(\(\) => \{\n    const timer = setTimeout\(\(\) => \{\n      const ck = new CornerKit\(\);\n      document\.querySelectorAll\('\.ck-apply'\)\.forEach\(el => \{\n        try \{\n          ck\.apply\(el, \{ radius: 23, smoothing: 1 \}\);\n        \} catch \(e\) \{\}\n      \}\);\n    \}, 150\);\n    return \(\) => clearTimeout\(timer\);\n  \}, \[place\]\);\n/, '');

code = code.replace(/className="ck-apply /g, 'className="squircle rounded-[23px] ');
code = code.replace(/className=\{`ck-apply /g, 'className={`squircle rounded-[23px] ');
fs.writeFileSync('src/components/BusinessDetailSheet.tsx', code);

// DestacadosPage
code = fs.readFileSync('src/components/DestacadosPage.tsx', 'utf8');
code = code.replace(/import CornerKit from '@cornerkit\/core';\n/, '');
code = code.replace(/  useEffect\(\(\) => \{\n    const timer = setTimeout\(\(\) => \{\n      const ck = new CornerKit\(\);\n      document\.querySelectorAll\('\.ck-card'\)\.forEach\(el => \{\n        try \{ ck\.apply\(el, \{ radius: 23, smoothing: 1 \}\); \} catch \(e\) \{\}\n      \}\);\n      document\.querySelectorAll\('\.ck-card-inner'\)\.forEach\(el => \{\n        try \{ ck\.apply\(el, \{ radius: 18, smoothing: 1 \}\); \} catch \(e\) \{\}\n      \}\);\n    \}, 500\);\n    return \(\) => clearTimeout\(timer\);\n  \}, \[places\]\);\n/, '');

code = code.replace(/className="ck-card /g, 'className="squircle rounded-[23px] ');
code = code.replace(/className="ck-card-inner /g, 'className="squircle rounded-[18px] ');
fs.writeFileSync('src/components/DestacadosPage.tsx', code);

console.log('BusinessDetailSheet and DestacadosPage updated for hyperellipse');
