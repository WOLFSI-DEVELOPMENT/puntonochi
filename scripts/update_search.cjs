const fs = require('fs');
let code = fs.readFileSync('src/components/BottomNav.tsx', 'utf8');

code = code.replace(/const handleTabClick = \\(tab: string\\) => \\{[\\s\\S]*?\\};/, 'const handleTabClick = (tab: string) => {\n    setIsSearching(false);\n    if (onChangeTab) onChangeTab(tab);\n  };');

const navTabsBlock = `          <div className="relative z-10 flex items-center">
            <div className="flex items-center gap-0.5">
              <NavTab id="inicio" icon={<HouseFillIcon className="w-[22px] h-[22px]" />} label="Inicio" active={activeTab === 'inicio'} onClick={() => handleTabClick('inicio')} />
              <NavTab id="explorar" icon={<CompassFillIcon className="w-[22px] h-[22px]" />} label="Explorar" active={activeTab === 'explorar'} onClick={() => handleTabClick('explorar')} />
              <NavTab id="mapa" icon={<MapFillIcon className="w-[22px] h-[22px]" />} label="Mapa" active={activeTab === 'mapa'} onClick={() => handleTabClick('mapa')} />
              <NavTab id="perfil" icon={<PersonFillIcon className="w-[22px] h-[22px]" />} label="Perfil" active={activeTab === 'perfil'} onClick={() => handleTabClick('perfil')} />
            </div>
          </div>`;

const newTabsBlock = `          <div className="relative z-10 flex items-center">
            <AnimatePresence mode="popLayout" initial={false}>
              {(!isSearching || activeTab === 'explorar') ? (
                <motion.div 
                  key="nav"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-0.5"
                >
                  <NavTab id="inicio" icon={<HouseFillIcon className="w-[22px] h-[22px]" />} label="Inicio" active={activeTab === 'inicio'} onClick={() => handleTabClick('inicio')} />
                  <NavTab id="explorar" icon={<CompassFillIcon className="w-[22px] h-[22px]" />} label="Explorar" active={activeTab === 'explorar'} onClick={() => handleTabClick('explorar')} />
                  <NavTab id="mapa" icon={<MapFillIcon className="w-[22px] h-[22px]" />} label="Mapa" active={activeTab === 'mapa'} onClick={() => handleTabClick('mapa')} />
                  <NavTab id="perfil" icon={<PersonFillIcon className="w-[22px] h-[22px]" />} label="Perfil" active={activeTab === 'perfil'} onClick={() => handleTabClick('perfil')} />
                </motion.div>
              ) : (
                <motion.div 
                  key="search"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center h-11 px-4 w-[240px] sm:w-[320px]"
                >
                  <Search className="w-[20px] h-[20px] text-neutral-500 shrink-0 mr-2" strokeWidth={1.5} />
                  <input 
                    ref={inputRef}
                    type="text" 
                    placeholder="Buscar lugares..." 
                    className="bg-transparent outline-none w-full text-black placeholder:text-neutral-500 text-[14px] font-medium"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>`;

code = code.replace(navTabsBlock, newTabsBlock);
fs.writeFileSync('src/components/BottomNav.tsx', code);
console.log('Restored inline search');
