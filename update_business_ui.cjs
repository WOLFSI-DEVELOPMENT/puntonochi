const fs = require('fs');

// UPDATE SETTINGS PAGE
let settingsCode = fs.readFileSync('src/components/SettingsPage.tsx', 'utf8');
// replace useState(false) for isBusinessAccount with localStorage init
settingsCode = settingsCode.replace(
  /const \[isBusinessAccount, setIsBusinessAccount\] = useState\(false\);/,
  `const [isBusinessAccount, setIsBusinessAccount] = useState(() => localStorage.getItem('isBusiness') === 'true');`
);
// replace the setIsBusinessAccount call inside SwipeToSwitch to also update localStorage
settingsCode = settingsCode.replace(
  /setIsBusinessAccount\(!isBusinessAccount\);/,
  `const newValue = !isBusinessAccount;
                setIsBusinessAccount(newValue);
                localStorage.setItem('isBusiness', newValue.toString());
                window.dispatchEvent(new Event('businessModeChanged'));`
);
fs.writeFileSync('src/components/SettingsPage.tsx', settingsCode);

// UPDATE PROFILE PAGE
let profileCode = fs.readFileSync('src/components/ProfilePage.tsx', 'utf8');
profileCode = profileCode.replace(
  /import \{ useState \} from 'react';/,
  `import { useState, useEffect } from 'react';`
);
profileCode = profileCode.replace(
  /const isBusinessAccount = false;/,
  `const [isBusinessAccount, setIsBusinessAccount] = useState(() => localStorage.getItem('isBusiness') === 'true');
  useEffect(() => {
    const handler = () => setIsBusinessAccount(localStorage.getItem('isBusiness') === 'true');
    window.addEventListener('businessModeChanged', handler);
    return () => window.removeEventListener('businessModeChanged', handler);
  }, []);`
);

// We need to change the content for isBusinessAccount in ProfilePage to be a Business Setup UI.
// Currently it renders the user profile header, then XP points (if not business), then tabs.
// If it's a business account, we can replace the entire bottom section with a "Set up your business" UI.
const oldTabsRegex = /\{isBusinessAccount \? \([\s\S]*?Aún no hay datos[\s\S]*?aparecerán aquí\.[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

const newBusinessUI = `{isBusinessAccount ? (
              <div className="px-6 py-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <Store className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-[22px] font-bold text-neutral-900 mb-2">Registra tu Negocio</h2>
                <p className="text-[15px] text-neutral-500 mb-8 max-w-[280px]">Únete al directorio de Nochistlán y conecta con miles de clientes locales. Es 100% gratis.</p>
                
                <button className="w-full bg-[#1a73e8] text-white font-bold py-4 rounded-xl active:scale-[0.98] transition-transform">
                  Comenzar Registro
                </button>
              </div>
            ) : (
              <>
                <div className="flex border-b border-neutral-100 px-2">
                  <button 
                    onClick={() => setActiveTab('reviews')}
                    className={\`flex-1 py-3 text-[14px] font-bold border-b-2 transition-colors \${activeTab === 'reviews' ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-neutral-500'}\`}
                  >
                    Reseñas
                  </button>
                  <button 
                    onClick={() => setActiveTab('images')}
                    className={\`flex-1 py-3 text-[14px] font-bold border-b-2 transition-colors \${activeTab === 'images' ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-neutral-500'}\`}
                  >
                    Fotos
                  </button>
                  <button 
                    onClick={() => setActiveTab('edits')}
                    className={\`flex-1 py-3 text-[14px] font-bold border-b-2 transition-colors \${activeTab === 'edits' ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-neutral-500'}\`}
                  >
                    Ediciones
                  </button>
                </div>
                
                <div className="py-16 flex flex-col items-center justify-center text-center px-6">
                  <div className="w-20 h-20 bg-[#f1f3f4] rounded-full flex items-center justify-center mb-5">
                    <Star className="w-8 h-8 text-neutral-400" />
                  </div>
                  <h3 className="text-[20px] font-bold text-neutral-900">Aún no hay datos</h3>
                  <p className="text-[14px] font-medium text-neutral-500 mt-2 max-w-[260px] leading-relaxed">
                    Cuando agregues {activeTab === 'reviews' ? 'reseñas' : activeTab === 'images' ? 'fotos' : 'ediciones'}, aparecerán aquí.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>`;

profileCode = profileCode.replace(oldTabsRegex, newBusinessUI);
fs.writeFileSync('src/components/ProfilePage.tsx', profileCode);
console.log('Fixed Business UI and state syncing');
