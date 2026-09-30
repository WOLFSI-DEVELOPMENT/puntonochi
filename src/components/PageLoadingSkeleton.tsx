type PageLoadingSkeletonProps = {
  page: 'explore' | 'market' | 'create' | 'news';
};

const pageLabels = {
  explore: 'Explorar',
  market: 'Mercado',
  create: 'Crear',
  news: 'Noticias',
} as const;

function Block({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-[18px] bg-white/[0.08] ${className}`} />;
}

export function PageLoadingSkeleton({ page }: PageLoadingSkeletonProps) {
  return (
    <main role="status" aria-label={`Cargando ${pageLabels[page]}`} className="min-h-[calc(100dvh-72px)] bg-[#111214] px-4 pb-28 pt-8 text-white sm:px-6">
      <span className="sr-only">Cargando {pageLabels[page]}</span>
      <div className="mx-auto max-w-3xl">
        <div className="mb-7 flex items-center justify-between gap-4">
          <div className="flex-1 space-y-3">
            <Block className="h-8 w-44 rounded-full" />
            <Block className="h-4 w-60 max-w-full rounded-full" />
          </div>
          <Block className="h-10 w-10 shrink-0 rounded-full" />
        </div>
        <Block className="mb-6 h-12 w-full rounded-full" />
        <div className="mb-7 flex gap-2 overflow-hidden">
          {[0, 1, 2, 3].map((item) => <Block key={item} className="h-10 w-24 shrink-0 rounded-full" />)}
        </div>
        {page === 'create' ? <>
          <div className="mb-8 flex gap-3 overflow-hidden">
            {[0, 1, 2, 3].map((item) => <Block key={item} className="aspect-square w-[76px] shrink-0 rounded-[24px]" />)}
          </div>
          <Block className="mb-6 h-14 w-full rounded-full" />
          <div className="mb-7 space-y-3"><Block className="h-6 w-32 rounded-full" /><Block className="h-40 w-full rounded-[24px]" /></div>
          <div className="space-y-3"><Block className="h-6 w-44 rounded-full" />{[0, 1].map((item) => <Block key={item} className="h-[84px] w-full rounded-[22px]" />)}</div>
        </> : page === 'news' ? <>
          <div className="mb-7 flex items-end justify-between"><div className="space-y-2"><Block className="h-6 w-40 rounded-full" /><Block className="h-3.5 w-52 rounded-full" /></div><Block className="h-4 w-12 rounded-full" /></div>
          <Block className="mb-7 h-44 w-full rounded-[24px]" />
          <div className="space-y-3">{[0, 1, 2, 3].map((item) => <div key={item} className="flex gap-3 rounded-[22px] bg-white/[0.045] p-3"><Block className="h-20 w-24 shrink-0 rounded-[17px]" /><div className="flex-1 space-y-3 py-2"><Block className="h-4 w-4/5 rounded-full" /><Block className="h-3 w-3/5 rounded-full" /><Block className="h-3 w-2/5 rounded-full" /></div></div>)}</div>
        </> : <>
          <div className="mb-7 flex items-end justify-between"><div className="space-y-2"><Block className="h-6 w-40 rounded-full" /><Block className="h-3.5 w-52 rounded-full" /></div><Block className="h-4 w-12 rounded-full" /></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => <article key={item} className="overflow-hidden rounded-[24px] bg-white/[0.045] p-2">
              <Block className="aspect-[1.08] w-full rounded-[18px]" />
              <div className="space-y-2 px-1 pb-2 pt-3"><Block className="h-4 w-4/5 rounded-full" /><Block className="h-3 w-3/5 rounded-full" /></div>
            </article>)}
          </div>
        </>}
      </div>
    </main>
  );
}
