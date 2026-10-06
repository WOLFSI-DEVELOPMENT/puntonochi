const fs = require('fs');

// 1. Update BusinessOnboarding.tsx nextStep function
let onboardingCode = fs.readFileSync('src/components/BusinessOnboarding.tsx', 'utf8');
const oldNextStep = `const nextStep = () => {
    if (step < 4) setStep(step + 1);
  };`;
const newNextStep = `const nextStep = () => {
    if (step === 3) {
      localStorage.setItem('myBusinessName', name);
      localStorage.setItem('hasRegisteredBusiness', 'true');
      window.dispatchEvent(new Event('businessRegistered'));
    }
    if (step < 4) setStep(step + 1);
  };`;
onboardingCode = onboardingCode.replace(oldNextStep, newNextStep);
fs.writeFileSync('src/components/BusinessOnboarding.tsx', onboardingCode);

// 2. Update ProfilePage.tsx to listen to businessRegistered and show dashboard
let profileCode = fs.readFileSync('src/components/ProfilePage.tsx', 'utf8');

// Add hasRegisteredBusiness state
const stateHook = `const [hasRegisteredBusiness, setHasRegisteredBusiness] = useState(() => localStorage.getItem('hasRegisteredBusiness') === 'true');
  const [myBusinessName, setMyBusinessName] = useState(() => localStorage.getItem('myBusinessName') || '');
  
  useEffect(() => {
    const handler = () => {
      setHasRegisteredBusiness(localStorage.getItem('hasRegisteredBusiness') === 'true');
      setMyBusinessName(localStorage.getItem('myBusinessName') || '');
    };
    window.addEventListener('businessRegistered', handler);
    return () => window.removeEventListener('businessRegistered', handler);
  }, []);`;
  
profileCode = profileCode.replace(
  /const \[isBusinessAccount, setIsBusinessAccount\] = useState\(\(\) => localStorage\.getItem\('isBusiness'\) === 'true'\);/,
  `const [isBusinessAccount, setIsBusinessAccount] = useState(() => localStorage.getItem('isBusiness') === 'true');\n  ${stateHook}`
);

// Replace the setup UI with conditional UI for business dashboard
const oldSetupUI = `<div className="px-6 py-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <Store className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-[22px] font-bold text-neutral-900 mb-2">Registra tu Negocio</h2>
                <p className="text-[15px] text-neutral-500 mb-8 max-w-[280px]">Únete al directorio de Nochistlán y conecta con miles de clientes locales. Es 100% gratis.</p>
                
                <button onClick={() => setShowOnboarding(true)} className="w-full bg-[#1a73e8] text-white font-bold py-4 rounded-xl active:scale-[0.98] transition-transform">
                  Comenzar Registro
                </button>
              </div>`;

const newBusinessUI = `hasRegisteredBusiness ? (
              <div className="flex flex-col w-full">
                <div className="flex border-b border-neutral-100 px-2">
                  <button className="flex-1 py-3 text-[14px] font-bold border-b-2 transition-colors border-[#1a73e8] text-[#1a73e8]">Panel</button>
                  <button className="flex-1 py-3 text-[14px] font-bold border-b-2 transition-colors border-transparent text-neutral-500">Configurar</button>
                  <button className="flex-1 py-3 text-[14px] font-bold border-b-2 transition-colors border-transparent text-neutral-500">Estadísticas</button>
                </div>
                <div className="p-6">
                  <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-5 mb-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xl">
                        {myBusinessName.charAt(0) || 'N'}
                      </div>
                      <div>
                        <h3 className="text-[18px] font-bold text-neutral-900">{myBusinessName}</h3>
                        <p className="text-[13px] text-neutral-500">Tu negocio está activo y visible</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-neutral-50 rounded-xl p-4">
                        <p className="text-[12px] text-neutral-500 font-medium mb-1">Vistas hoy</p>
                        <p className="text-[20px] font-bold text-neutral-900">124</p>
                      </div>
                      <div className="bg-neutral-50 rounded-xl p-4">
                        <p className="text-[12px] text-neutral-500 font-medium mb-1">Visitas al local</p>
                        <p className="text-[20px] font-bold text-neutral-900">42</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-6 py-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <Store className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-[22px] font-bold text-neutral-900 mb-2">Registra tu Negocio</h2>
                <p className="text-[15px] text-neutral-500 mb-8 max-w-[280px]">Únete al directorio de Nochistlán y conecta con miles de clientes locales. Es 100% gratis.</p>
                
                <button onClick={() => setShowOnboarding(true)} className="w-full bg-[#1a73e8] text-white font-bold py-4 rounded-xl active:scale-[0.98] transition-transform">
                  Comenzar Registro
                </button>
              </div>
            )`;

profileCode = profileCode.replace(oldSetupUI, newBusinessUI);
fs.writeFileSync('src/components/ProfilePage.tsx', profileCode);
console.log('Fixed post-registration UI');
