import { useEffect } from 'react';

const PUBLISHER_ID = 'ca-pub-7029279570287128';
const AD_SLOT_ID = '6524123196';

export function AdSenseUnit({ placement }: { placement: 'search-bottom' | 'business-detail-bottom' }) {
  useEffect(() => {
    const ads = (window as Window & { adsbygoogle?: { push: (value: Record<string, never>) => unknown } }).adsbygoogle;
    if (!ads) return;
    try { ads.push({}); } catch { /* AdSense can reject a slot when inventory is unavailable. */ }
  }, [placement]);

  return <aside aria-label="Anuncio" data-adsense-placement={placement} className="mx-auto my-5 w-full max-w-[728px] overflow-hidden rounded-2xl px-1">
    <span className="mb-1 block text-center text-[9px] font-medium uppercase tracking-[.14em] text-white/40">Anuncio</span>
    <ins
      className="adsbygoogle block min-h-[90px] w-full"
      style={{ display: 'block' }}
      data-ad-client={PUBLISHER_ID}
      data-ad-slot={AD_SLOT_ID}
      data-ad-format="auto"
      data-full-width-responsive="true"
      data-puntonochi-placement={placement}
    />
  </aside>;
}
