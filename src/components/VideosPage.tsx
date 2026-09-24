import { Play, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import CornerKit from '@cornerkit/core';
import { YouTubeVideoOverlay, type PlayableVideo } from './YouTubeVideoOverlay';

const shorts = [
  { id: 'kqtwWJmdxh4', url: 'https://www.youtube.com/shorts/kqtwWJmdxh4', title: 'Un rico “Revuelto” en nieves Barrón en Nochistlán, Zacatecas 🤠🍦', creator: 'Bien Chulo Zacatecas' },
  { id: '2gYS0FCom_M', url: 'https://www.youtube.com/shorts/2gYS0FCom_M', title: 'Nochistlán Zacatecas México #nochistlán #méxico #caminando #pueblomágico #zacatecas #nochis', creator: 'YC7' },
  { id: 'pv-zJxgpCVk', url: 'https://www.youtube.com/shorts/pv-zJxgpCVk', title: 'Nochistlan zacatecas RIQUÍSIMOS churros', creator: 'Silvia Jimenez' },
  { id: '-wmyGbLzqbo', url: 'https://www.youtube.com/shorts/-wmyGbLzqbo', title: 'Nochistlán, Zacatecas: Tesoros Culturales y Naturales #pueblomágico #drone #pueblosmagicos', creator: 'Volando Magico' },
  { id: 'for2kroWgDE', url: 'https://www.youtube.com/shorts/for2kroWgDE', title: 'Zoológico de Nochistlán, Zacatecas 💯💢💥 #zacatecas #impresionante #mipueblo #miranchito #lugares', creator: 'Santiago Sigala' },
];

const longVideos = [
  { id: 'H-Mgook9SW4', url: 'https://youtu.be/H-Mgook9SW4', title: 'Nochistlan zacatecas caminador parian jardin', creator: 'Nochistlan magico' },
  { id: 'BwXv76YoDws', url: 'https://youtu.be/BwXv76YoDws', title: 'Llegamos hasta Nochistlán | ZACATECAS Encontramos algo SORPRENDENTE!', creator: 'La Vida Del Rancho' },
  { id: 'zZUUbCcN0S4', url: 'https://youtu.be/zZUUbCcN0S4', title: 'Nochistlan Zacatecas, pueblo mágico | Los Altos de Jalisco 14', creator: 'puebleando' },
  { id: 'HlpSNiv5FCY', url: 'https://youtu.be/HlpSNiv5FCY', title: 'LA PRIMERA GUADALAJARA: NOCHISTLÁN DE MEJÍA, ZACATECAS!! ✨📍', creator: 'Bien Paseados' },
];

export function VideosPage() {
  const [query, setQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<PlayableVideo | null>(null);
  useEffect(() => {
    const corners = new CornerKit();
    corners.applyAll('.ck-video-card', { radius: 24, smoothing: 1 });
    corners.applyAll('.ck-video-card-media', { radius: 19, smoothing: 1 });
  }, []);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleShorts = shorts.filter((video) => `${video.title} ${video.creator}`.toLocaleLowerCase().includes(normalizedQuery));
  const visibleLongVideos = longVideos.filter((video) => `${video.title} ${video.creator}`.toLocaleLowerCase().includes(normalizedQuery));

  return (
    <main className="min-h-screen bg-[#111111] px-5 pb-36 pt-8 text-white">
      <h1 className="text-2xl font-bold tracking-tight">Videos</h1>
      <label className="mt-5 flex h-12 items-center gap-3 rounded-full bg-[#292929] px-4">
        <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-white/55" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar videos"
          aria-label="Buscar videos"
          style={{ backgroundColor: 'transparent', background: 'transparent' }}
          className="!min-w-0 !flex-1 !bg-transparent text-sm text-white outline-none placeholder:text-white/50 focus:!bg-transparent focus:outline-none focus:ring-0"
        />
      </label>
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Shorts</h2>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
          {visibleShorts.map((short) => (
            <article key={short.id} className="ck-video-card w-[min(50vw,200px)] shrink-0 rounded-[24px] bg-[#292929] p-[5px] sm:w-[min(38vw,270px)]">
              <button type="button" onClick={() => setSelectedVideo({ ...short, isShort: true, thumbnail: `https://i.ytimg.com/vi/${short.id}/hqdefault.jpg` })} aria-label={`Reproducir: ${short.title}`} className="ck-video-card-media group relative block aspect-[4/5] w-full overflow-hidden rounded-[19px] bg-black sm:aspect-[9/16]">
                <img src={`https://i.ytimg.com/vi/${short.id}/hqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/35">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/65 text-white"><Play className="ml-0.5 h-5 w-5 fill-current" /></span>
                </span>
              </button>
              <div className="px-3 pb-3 pt-3">
                <h3 className="line-clamp-2 min-h-10 text-sm font-semibold">{short.title}</h3>
                <p className="mt-1 truncate text-xs text-white/55">{short.creator} · YouTube Shorts</p>
                <a href={short.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-medium text-white/75 hover:text-white">Ver en YouTube</a>
              </div>
            </article>
          ))}
          {!visibleShorts.length && <p className="rounded-[20px] bg-[#202124] p-4 text-sm text-white/55">No hay Shorts que coincidan.</p>}
        </div>
      </section>
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Videos largos</h2>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
          {visibleLongVideos.map((video) => (
            <article key={video.id} className="ck-video-card w-[min(84vw,380px)] shrink-0 rounded-[24px] bg-[#292929] p-[5px]">
              <button type="button" onClick={() => setSelectedVideo({ ...video, isShort: false, thumbnail: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` })} aria-label={`Reproducir: ${video.title}`} className="ck-video-card-media group relative block aspect-video w-full overflow-hidden rounded-[19px] bg-black">
                <img src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/35">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/65 text-white"><Play className="ml-0.5 h-5 w-5 fill-current" /></span>
                </span>
              </button>
              <div className="px-3 pb-3 pt-3">
                <h3 className="line-clamp-2 text-sm font-semibold">{video.title}</h3>
                <p className="mt-1 truncate text-xs text-white/55">{video.creator} · YouTube</p>
                <a href={video.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-medium text-white/75 hover:text-white">Ver en YouTube</a>
              </div>
            </article>
          ))}
          {!visibleLongVideos.length && <p className="rounded-[20px] bg-[#202124] p-4 text-sm text-white/55">No hay videos largos que coincidan.</p>}
        </div>
      </section>
      <YouTubeVideoOverlay video={selectedVideo} onClose={() => setSelectedVideo(null)} />
    </main>
  );
}
