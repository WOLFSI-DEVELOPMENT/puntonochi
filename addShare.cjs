const fs = require('fs');
let code = fs.readFileSync('src/components/BusinessDetailSheet.tsx', 'utf8');

// Add state
code = code.replace(
  /const \[showMapSelector, setShowMapSelector\] = useState\(false\);/,
  'const [showMapSelector, setShowMapSelector] = useState(false);\n  const [showShareModal, setShowShareModal] = useState(false);'
);

// Add icons to import
code = code.replace(
  /import { X, Share, Phone, Globe, ShoppingBag, MoreHorizontal, Navigation, BookOpen } from 'lucide-react';/,
  "import { X, Share, Phone, Globe, ShoppingBag, MoreHorizontal, Navigation, BookOpen, Link, MessageCircle, Twitter, Facebook } from 'lucide-react';"
);

// Add click handler to button
code = code.replace(
  /<button className="w-9 h-9 rounded-full bg-black\/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black\/50 transition-colors">\s*<Share className="w-5 h-5" strokeWidth=\{1\.5\} \/>/,
  `<button onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }} className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-colors">\n                <Share className="w-5 h-5" strokeWidth={1.5} />`
);

// Add modal HTML at the very end before </>
const modalCode = `
      <AnimatePresence>
        {showShareModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
              onClick={() => setShowShareModal(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-[81] bg-white rounded-t-3xl p-6 shadow-2xl flex flex-col pb-safe"
              drag="y"
              dragConstraints={{ top: 0 }}
              onDragEnd={(e, info) => {
                if (info.offset.y > 50) setShowShareModal(false);
              }}
            >
              <div className="w-12 h-1.5 bg-neutral-200 rounded-full mx-auto mb-6" />
              <h3 className="font-bold text-xl text-neutral-900 mb-6 px-2 text-center">Compartir</h3>
              
              <div className="flex justify-around mb-8 px-2">
                <button onClick={() => { navigator.clipboard.writeText(window.location.href); setShowShareModal(false); alert('Enlace copiado!'); }} className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700 group-hover:bg-neutral-200 transition-colors">
                    <Link className="w-6 h-6" />
                  </div>
                  <span className="text-[12px] font-medium text-neutral-600">Copiar</span>
                </button>
                <button className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366] group-hover:bg-[#25D366]/20 transition-colors">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <span className="text-[12px] font-medium text-neutral-600">WhatsApp</span>
                </button>
                <button className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2] group-hover:bg-[#1877F2]/20 transition-colors">
                    <Facebook className="w-6 h-6" />
                  </div>
                  <span className="text-[12px] font-medium text-neutral-600">Facebook</span>
                </button>
                <button className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-[#1DA1F2]/10 flex items-center justify-center text-[#1DA1F2] group-hover:bg-[#1DA1F2]/20 transition-colors">
                    <Twitter className="w-6 h-6" />
                  </div>
                  <span className="text-[12px] font-medium text-neutral-600">Twitter</span>
                </button>
              </div>

              <button 
                onClick={() => setShowShareModal(false)}
                className="w-full bg-neutral-100 text-neutral-900 font-bold py-4 rounded-xl hover:bg-neutral-200 transition-colors"
              >
                Cancelar
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
`;

code = code.replace(/<\/>\s*$/, modalCode);

fs.writeFileSync('src/components/BusinessDetailSheet.tsx', code);
console.log('Added Share Modal!');
