const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsPage.tsx', 'utf8');

const bannerRegex = /<section className=\"mb-6\">\s*<div[\s\S]*?<\/div>\s*<\/section>/;
code = code.replace(bannerRegex, '');

const oldBusinessRow = `<div className="bg-[#f5f5f5] rounded-[24px] overflow-hidden flex flex-col cursor-pointer active:bg-black/[0.03] transition-colors">`;
const newBusinessRow = `<div onClick={() => setShowSwitchModal(true)} className="bg-[#f5f5f5] rounded-[24px] overflow-hidden flex flex-col cursor-pointer active:bg-black/[0.03] transition-colors">`;
code = code.replace(oldBusinessRow, newBusinessRow);

const oldBusinessText = `<span className="font-bold text-neutral-900 text-[15px] block">Cambiar a Cuenta de Negocios</span>`;
const newBusinessText = `<span className="font-bold text-neutral-900 text-[15px] block">{isBusinessAccount ? 'Cuenta de Negocio Activa' : 'Cambiar a Cuenta de Negocios'}</span>`;
code = code.replace(oldBusinessText, newBusinessText);

fs.writeFileSync('src/components/SettingsPage.tsx', code);
