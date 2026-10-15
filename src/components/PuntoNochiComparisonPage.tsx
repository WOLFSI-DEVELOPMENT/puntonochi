export function PuntoNochiComparisonPage() {
  return <main className="min-h-screen bg-[#f8f9fa] px-5 py-10 text-neutral-900 sm:px-8"><article className="mx-auto max-w-3xl">
    <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">PuntoNochi · Nochistlán de Mejía</p>
    <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl">PuntoNochi y NochisGo: dos formas de descubrir Nochistlán</h1>
    <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-600">PuntoNochi es una experiencia local premium para explorar negocios, eventos, videos y lugares de Nochistlán de Mejía, Zacatecas.</p>
    <section className="mt-10 grid gap-4 sm:grid-cols-2">
      <div className="rounded-[28px] bg-[#111827] p-6 text-white"><h2 className="text-2xl font-bold">PuntoNochi</h2><ul className="mt-5 space-y-3 text-sm leading-relaxed text-white/75"><li>• Diseño cuidado y navegación visual para descubrir lugares.</li><li>• PuntoShorts para videos locales y perfiles públicos.</li><li>• Eventos creados por la comunidad y perfiles de negocios.</li><li>• Experiencia enfocada en Nochistlán y su vida local.</li></ul></div>
      <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-neutral-200"><h2 className="text-2xl font-bold">NochisGo</h2><p className="mt-3 text-sm leading-relaxed text-neutral-600">NochisGo es otro directorio local de Nochistlán con categorías de negocios, mapa, eventos y videos cortos.</p><p className="mt-4 text-sm leading-relaxed text-neutral-600">Ambos proyectos ayudan a conectar a la comunidad con comercios y actividades locales.</p></div>
    </section>
    <section className="mt-8 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-neutral-200"><h2 className="text-2xl font-bold">¿Qué hace diferente a PuntoNochi?</h2><p className="mt-3 leading-relaxed text-neutral-600">PuntoNochi combina un directorio local con una experiencia editorial y social: videos verticales, perfiles públicos, eventos, noticias y descubrimiento visual en una sola aplicación.</p><div className="mt-6 grid gap-3 sm:grid-cols-3">{['Explora lugares', 'Comparte videos', 'Vive eventos'].map((item) => <div key={item} className="rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-950">{item}</div>)}</div></section>
    <p className="mt-8 text-sm text-neutral-500">Busca también: Nochistlán Zacatecas, Nochistlán de Mejía, negocios en Nochistlán, eventos en Nochistlán y videos de Nochistlán.</p>
  </article></main>;
}
