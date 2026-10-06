const fs = require('fs');

let code = fs.readFileSync('src/components/BusinessOnboarding.tsx', 'utf8');

// 1. Update imports
code = code.replace(
  /import \{ ChevronLeft, Store, MapPin, Tag, CheckCircle \} from 'lucide-react';/,
  `import { ChevronLeft, Store, MapPin, Tag, CheckCircle, Search, Loader2 } from 'lucide-react';`
);

// 2. Add state inside component
const stateRegex = /const \[category, setCategory\] = useState\(''\);/;
code = code.replace(stateRegex, 
  `const [category, setCategory] = useState('');
  
  // Address autocomplete state
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [coords, setCoords] = useState<[number, number]>([-102.8456, 21.3653]);
  const [selectedLocationStr, setSelectedLocationStr] = useState('Centro de Nochistlán, Zac.');
  
  const searchAddress = async (query: string) => {
    setAddress(query);
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(\`https://photon.komoot.io/api/?q=\${encodeURIComponent(query)}&lat=21.3653&lon=-102.8456&limit=5\`);
      const data = await res.json();
      setSuggestions(data.features || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };
  
  const selectAddress = (feature: any) => {
    const lon = feature.geometry.coordinates[0];
    const lat = feature.geometry.coordinates[1];
    setCoords([lon, lat]);
    const nameStr = [feature.properties.name, feature.properties.street, feature.properties.city, feature.properties.state].filter(Boolean).join(', ');
    setAddress(nameStr);
    setSelectedLocationStr(nameStr);
    setSuggestions([]);
  };`
);

// 3. Replace step 3
const step3Regex = /case 3:\s*return \(\s*<motion\.div[\s\S]*?<OnboardingMap \/>\s*<p className="text-sm font-medium text-neutral-900 text-center">Centro de Nochistlán, Zac\.<\/p>\s*<\/motion\.div>\s*\);/;

const newStep3 = `case 3:
        return (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-full"
          >
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
              <MapPin className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">¿Dónde te encuentras?</h2>
            <p className="text-neutral-500 mb-6">Busca la dirección o verifica la ubicación en el mapa.</p>
            
            <div className="relative mb-6">
              <div className="relative flex items-center">
                <Search className="w-5 h-5 text-neutral-400 absolute left-4" />
                <input 
                  type="text"
                  value={address}
                  onChange={(e) => searchAddress(e.target.value)}
                  placeholder="Buscar calle, colonia, ciudad..."
                  className="w-full bg-neutral-100 border-none rounded-xl pl-11 pr-4 py-3.5 text-[15px] font-medium text-neutral-900 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                />
                {isSearching && (
                  <Loader2 className="w-5 h-5 text-blue-500 absolute right-4 animate-spin" />
                )}
              </div>
              
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-black/5 overflow-hidden z-20">
                  {suggestions.map((s, i) => (
                    <div 
                      key={i} 
                      onClick={() => selectAddress(s)}
                      className="px-4 py-3 hover:bg-neutral-50 border-b border-black/5 last:border-0 cursor-pointer flex items-center gap-3"
                    >
                      <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
                      <div>
                        <p className="text-[14px] font-bold text-neutral-900">{s.properties.name || s.properties.street || s.properties.city}</p>
                        <p className="text-[12px] text-neutral-500">{[s.properties.city, s.properties.state, s.properties.country].filter(Boolean).join(', ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <OnboardingMap center={coords} />
            <p className="text-sm font-medium text-neutral-900 text-center">{selectedLocationStr}</p>
          </motion.div>
        );`;

code = code.replace(step3Regex, newStep3);

fs.writeFileSync('src/components/BusinessOnboarding.tsx', code);
console.log('Added Autocomplete');
