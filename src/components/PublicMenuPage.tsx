import { useEffect, useState } from 'react';
import { MapPin, QrCode } from 'lucide-react';

type MenuEntry = { name: string; description: string; price: string };
type MenuSection = { name: string; items: MenuEntry[] };
type PublicMenu = { id: string; menu: { businessName: string; description: string; sections: MenuSection[] }; createdAt: string };
const menuCardStyles = [
  { card: 'bg-[#ff5b2e] text-white', art: 'bg-[#151515]/90', pill: 'bg-white/20 text-white' },
  { card: 'bg-[#d6f43e] text-[#153d31]', art: 'bg-[#183a2f]', pill: 'bg-[#153d31]/10 text-[#153d31]' },
  { card: 'bg-[#be43bf] text-white', art: 'bg-[#351238]', pill: 'bg-white/20 text-white' },
  { card: 'bg-[#ffdc2e] text-[#173d37]', art: 'bg-[#183d35]', pill: 'bg-[#173d37]/10 text-[#173d37]' },
  { card: 'bg-[#f2a9d7] text-[#39253d]', art: 'bg-[#593657]', pill: 'bg-white/35 text-[#39253d]' },
  { card: 'bg-[#246f61] text-white', art: 'bg-[#173e36]', pill: 'bg-white/20 text-white' },
];

function foodEmoji(item: MenuEntry, sectionName: string) {
  const text = `${item.name} ${sectionName}`.toLocaleLowerCase('es-MX');
  if (/burge|hamburg|torta|sandwich/.test(text)) return '🍔';
  if (/pasta|espagu|fideo|macarr/.test(text)) return '🍝';
  if (/pizza/.test(text)) return '🍕';
  if (/hot.?dog|perro caliente/.test(text)) return '🌭';
  if (/coctel|cocktail|margarita|bebida|limonada|jugo/.test(text)) return '🍹';
  if (/taco|quesadilla|burrito/.test(text)) return '🌮';
  if (/ensalada/.test(text)) return '🥗';
  if (/pollo/.test(text)) return '🍗';
  if (/sushi|pescado|marisco/.test(text)) return '🍣';
  if (/postre|pastel|pan|galleta|helado/.test(text)) return '🍰';
  if (/cafe|café|capuchino/.test(text)) return '☕';
  if (/desayun|huevo/.test(text)) return '🍳';
  return '🍽️';
}

export function PublicMenuPage({ id }: { id: string }) {
  const [data, setData] = useState<PublicMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(`/api/menus/${encodeURIComponent(id)}`, { cache: 'no-store' }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error('menu');
      if (active) setData(result as PublicMenu);
    }).catch(() => { if (active) setNotFound(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (data?.menu?.businessName) document.title = `Menú de ${data.menu.businessName} | PuntoNochi`;
    else document.title = 'Menú digital | PuntoNochi';
  }, [data]);

  return <main className="public-menu-page min-h-[100dvh] bg-[#f7f5ef] px-3 py-5 text-[#171717] sm:px-5 sm:py-9">
    {loading ? <div className="mx-auto flex min-h-[60dvh] max-w-lg items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-[#ee4b2d]"/></div> : notFound || !data ? <section className="mx-auto mt-20 max-w-sm text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#ee4b2d] shadow-sm"><QrCode className="h-7 w-7"/></span><h1 className="mt-4 text-xl font-bold">No encontramos este menú</h1><p className="mt-2 text-sm text-black/55">Revisa el código QR o vuelve a escanearlo.</p><a href="/" className="mt-5 inline-flex h-11 items-center rounded-full bg-[#171717] px-5 text-sm font-semibold text-white">Ir a PuntoNochi</a></section> : <article className="mx-auto max-w-3xl">
      <header className="relative overflow-hidden rounded-[27px] bg-[#fdfbf6] px-4 py-4 [corner-shape:squircle] sm:px-6 sm:py-5"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-black/40"><MapPin className="h-3.5 w-3.5 text-[#ee4b2d]"/>PuntoNochi · Menú digital</div><h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">{data.menu.businessName}</h1>{data.menu.description && <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-black/55 sm:text-sm">{data.menu.description}</p>}</header>
      <div className="mb-3 mt-5 flex items-end justify-between px-1"><div><h2 className="text-lg font-extrabold">Todo el menú</h2><p className="mt-0.5 text-[11px] text-black/45">Explora los platillos y precios</p></div><span className="text-[10px] font-semibold text-black/40">{data.menu.sections.reduce((count, section) => count + section.items.length, 0)} opciones</span></div>
      <div className="grid grid-cols-2 items-start gap-2.5 sm:gap-4">{data.menu.sections.flatMap((section, sectionIndex) => section.items.map((item, itemIndex) => {
        const index = data.menu.sections.slice(0, sectionIndex).reduce((count, current) => count + current.items.length, 0) + itemIndex;
        const style = menuCardStyles[index % menuCardStyles.length];
        return <article key={`${section.name}-${sectionIndex}-${item.name}-${itemIndex}`} className={`overflow-hidden rounded-[21px] p-2 [corner-shape:squircle] sm:rounded-[25px] sm:p-2.5 ${style.card}`}>
          <div className="mb-2 flex min-w-0 items-center justify-between gap-1 px-0.5 pt-0.5"><span className={`truncate rounded-full px-2 py-1 text-[9px] font-semibold ${style.pill}`}>{section.name}</span>{item.price && <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${style.pill}`}>{item.price}</span>}</div>
          <div className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-[15px] sm:rounded-[19px] ${style.art}`}><span aria-hidden="true" className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/[.08] blur-2xl"/><span aria-hidden="true" className="relative drop-shadow-[0_8px_12px_rgba(0,0,0,.22)] text-[74px] leading-none sm:text-[100px]">{foodEmoji(item, section.name)}</span></div>
          <div className="px-1 pb-1 pt-2"><h3 className="text-[17px] font-extrabold leading-[1.05] sm:text-[21px]">{item.name}</h3>{item.description && <p className="mt-1.5 text-[10px] leading-snug opacity-75 sm:text-xs">{item.description}</p>}</div>
        </article>;
      }))}</div>
      <footer className="py-7 text-center text-[11px] text-black/35">Menú creado con <a href="/" className="font-semibold text-[#d63c23]">PuntoNochi</a></footer>
    </article>}
  </main>;
}
