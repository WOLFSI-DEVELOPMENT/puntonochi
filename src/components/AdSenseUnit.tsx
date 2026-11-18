import { useEffect, useRef } from 'react';

const PUBLISHER_ID = 'ca-pub-7029279570287128';
const AD_SLOT_ID = '6524123196';

type AdsQueue = Array<Record<string, never>>;

export function AdSenseUnit({ placement }: { placement: 'search-bottom' | 'business-detail-bottom' }) {
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    const ins = insRef.current;
    if (!ins) return undefined;
    let requested = false;
    const request = () => {
      if (requested || ins.getAttribute('data-adsbygoogle-status')) return;
      requested = true;
      // Standard AdSense queue: works even before adsbygoogle.js has finished loading.
      const w = window as Window & { adsbygoogle?: AdsQueue };
      try { (w.adsbygoogle = w.adsbygoogle || []).push({}); } catch { /* AdSense can reject a slot when inventory is unavailable. */ }
    };
    // Only request the ad when it is about to scroll into view: faster first load
    // and better viewability, which AdSense rewards.
    if (typeof IntersectionObserver === 'undefined') { request(); return undefined; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { request(); observer.disconnect(); }
    }, { rootMargin: '400px 0px' });
    observer.observe(ins);
    return () => observer.disconnect();
  }, [placement]);

  // Reserved height prevents layout shift (CLS) when the ad fills.
  return <aside aria-label="Anuncio" data-adsense-placement={placement} className="mx-auto my-5 w-full max-w-[728px] overflow-hidden rounded-2xl px-1">
    <span className="mb-1 block text-center text-[9px] font-medium uppercase tracking-[.14em] text-white/40">Anuncio</span>
    <ins
      ref={insRef}
      className="adsbygoogle block min-h-[100px] w-full"
      style={{ display: 'block' }}
      data-ad-client={PUBLISHER_ID}
      data-ad-slot={AD_SLOT_ID}
      data-ad-format="auto"
      data-full-width-responsive="true"
      data-puntonochi-placement={placement}
    />
  </aside>;
}
