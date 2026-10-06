const fs = require('fs');
let code = fs.readFileSync('src/components/BusinessDetailSheet.tsx', 'utf8');

const oldPhoneBtn = `<button 
                onClick={() => setShowPhoneModal(true)}
                className="shrink-0 flex flex-col items-center justify-center gap-1 bg-[#f1f3f4] text-[#1a73e8] rounded-xl py-2 px-5 min-w-[76px] snap-start hover:bg-[#e8eaed] transition-colors"
              >
                <Phone className="w-[22px] h-[22px]" strokeWidth={2} />
                <span className="text-[11px] font-bold leading-none">Llamar</span>
              </button>`;

const newPhoneBtn = `<button 
                onClick={() => setShowPhoneModal(true)}
                disabled={!place.phone}
                className={\`shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-5 min-w-[76px] snap-start transition-colors \${
                  place.phone ? 'bg-[#f1f3f4] text-[#1a73e8] hover:bg-[#e8eaed]' : 'bg-[#f5f5f5] text-[#b0b0b0]'
                }\`}
              >
                <Phone className="w-[22px] h-[22px]" strokeWidth={2} />
                <span className="text-[11px] font-bold leading-none">Llamar</span>
              </button>`;

code = code.replace(oldPhoneBtn, newPhoneBtn);

const oldPhoneModal = `<a 
                  href="tel:+524671234567"
                  className="w-full bg-[#f1f3f4] text-neutral-900 font-bold text-[16px] py-4 rounded-full flex items-center justify-center active:bg-[#e8eaed] transition-colors"
                >
                  <Phone className="w-5 h-5 mr-2" strokeWidth={2} />
                  +52 467 123 4567
                </a>`;

const newPhoneModal = `<a 
                  href={\`tel:\${place.phone}\`}
                  className="w-full bg-[#f1f3f4] text-neutral-900 font-bold text-[16px] py-4 rounded-full flex items-center justify-center active:bg-[#e8eaed] transition-colors"
                >
                  <Phone className="w-5 h-5 mr-2" strokeWidth={2} />
                  {place.phone}
                </a>`;

code = code.replace(oldPhoneModal, newPhoneModal);

fs.writeFileSync('src/components/BusinessDetailSheet.tsx', code);
console.log('Fixed Phone button to use INEGI phone numbers');
