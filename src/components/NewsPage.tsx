import { ArrowLeft, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, ExternalLink, LoaderCircle, Newspaper, Play, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import CornerKit, { type SquircleConfig } from '@cornerkit/core';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { YouTubeVideoOverlay } from './YouTubeVideoOverlay';

const cornerKit = new CornerKit();
const newsCardCorners: SquircleConfig = { radius: 24, smoothing: 1 };

type Article = { title: string; description: string; content: string; url: string; image: string; publishedAt: string; source: string };
type WeatherDay = { date: string; weatherCode: number; high: number | null; low: number | null; precipitationChance: number | null };
type NewsVideo = { id: string; title: string; channel: string; publishedAt: string; thumbnail: string; isShort: boolean };

function weatherIcon(code: number): LucideIcon {
  if (code === 0) return Sun;
  if (code <= 3) return CloudSun;
  if (code === 45 || code === 48) return CloudFog;
  if (code <= 57) return CloudDrizzle;
  if (code <= 67 || (code >= 80 && code <= 82)) return CloudRain;
  if (code <= 77 || code === 85 || code === 86) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

function dayName(value: string) {
  return new Intl.DateTimeFormat('es-MX', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`)).replace('.', '');
}

function dateLabel(value: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value));
}

function WeatherSkeleton() {
  return <section aria-label="Cargando pronóstico" role="status" className="rounded-[26px] bg-[#202124] p-4"><div className="mb-4 h-4 w-44 animate-pulse rounded-full bg-[#3b3d40]" /><div className="flex gap-2 overflow-hidden">{Array.from({ length: 7 }, (_, index) => <div key={index} className="h-24 min-w-16 flex-1 animate-pulse rounded-[18px] bg-[#303134]" />)}</div></section>;
}

export function NewsPage() {
  const [weather, setWeather] = useState<WeatherDay[]>([]);
  const [weatherError, setWeatherError] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [videos, setVideos] = useState<NewsVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [videosError, setVideosError] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<NewsVideo | null>(null);
  const reduceMotion = useReducedMotion();

  const loadWeather = () => {
    setWeatherError('');
    void fetch('/api/weather')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo cargar el pronóstico.');
        setWeather(result.days || []);
      })
      .catch((error) => setWeatherError(error instanceof Error ? error.message : 'No se pudo cargar el pronóstico.'));
  };

  const loadNews = () => {
    setNewsLoading(true);
    setNewsError('');
    void fetch('/api/gnews')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudieron cargar las noticias.');
        setArticles(result.articles || []);
      })
      .catch((error) => setNewsError(error instanceof Error ? error.message : 'No se pudieron cargar las noticias.'))
      .finally(() => setNewsLoading(false));
  };

  const loadVideos = () => {
    setVideosLoading(true);
    setVideosError('');
    void fetch('/api/youtube-news')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudieron cargar los videos.');
        setVideos(result.videos || []);
      })
      .catch((error) => setVideosError(error instanceof Error ? error.message : 'No se pudieron cargar los videos.'))
      .finally(() => setVideosLoading(false));
  };

  useEffect(() => {
    loadWeather();
    loadNews();
    loadVideos();
  }, []);

  useEffect(() => {
    cornerKit.applyAll('[data-news-squircle]', newsCardCorners);
  }, [articles, newsLoading, newsError, selectedArticle, weather, weatherError, videos, videosLoading, videosError]);

  if (selectedArticle) {
    return (
      <main className="min-h-screen bg-[#111111] px-5 pb-36 pt-6 text-white">
        <div className="mx-auto max-w-3xl">
          <button type="button" onClick={() => setSelectedArticle(null)} className="mb-5 flex items-center gap-2 rounded-full bg-[#292929] px-4 py-2.5 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />Volver a noticias</button>
          {selectedArticle.image && <img data-news-squircle src={selectedArticle.image} alt="" className="mb-6 aspect-[16/10] w-full rounded-[26px] object-cover" />}
          <p className="text-sm font-medium text-white/50">{selectedArticle.source} · {dateLabel(selectedArticle.publishedAt)}</p>
          <h1 className="mt-3 text-2xl font-bold leading-tight sm:text-4xl">{selectedArticle.title}</h1>
          <p className="mt-5 text-base leading-7 text-white/75">{selectedArticle.description || selectedArticle.content}</p>
          <a href={selectedArticle.url} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black">Leer artículo completo <ExternalLink className="h-4 w-4" /></a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#111111] px-5 pb-36 pt-8 text-white">
      <div className="mx-auto max-w-3xl">
        {weather.length ? (
          <section data-news-squircle aria-label="Pronóstico semanal de Nochistlán" className="rounded-[26px] bg-[#202124] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h2 className="text-sm font-semibold">Pronóstico semanal</h2><p className="mt-1 text-xs text-white/50">Nochistlán, Zacatecas</p></div>
              <span className="text-xs text-white/45">7 días</span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {weather.map((day) => {
                const Icon = weatherIcon(day.weatherCode);
                return <div data-news-squircle key={day.date} className="flex min-w-[62px] flex-1 flex-col items-center gap-2 rounded-[18px] bg-[#292a2d] px-2 py-3 text-center">
                  <span className="text-[11px] font-semibold capitalize text-white/60">{dayName(day.date)}</span>
                  <Icon className="h-5 w-5 text-white/80" strokeWidth={1.8} />
                  <span className="whitespace-nowrap text-xs font-semibold">{day.high === null ? '—' : `${Math.round(day.high)}°`} <span className="font-normal text-white/45">{day.low === null ? '—' : `${Math.round(day.low)}°`}</span></span>
                  {day.precipitationChance !== null && <span className="text-[10px] text-sky-200/70">{day.precipitationChance}% lluvia</span>}
                </div>;
              })}
            </div>
          </section>
        ) : weatherError ? (
          <section className="rounded-[26px] bg-[#202124] p-4"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Pronóstico semanal</h2><p role="alert" className="mt-1 text-xs text-white/50">{weatherError}</p></div><button type="button" onClick={loadWeather} className="text-xs font-semibold text-white/75">Reintentar</button></div></section>
        ) : <WeatherSkeleton />}

        <section aria-label="Videos de noticias de hoy" className="mt-6 overflow-hidden">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div><h2 className="text-lg font-semibold">Noticias en video</h2><p className="mt-1 text-xs text-white/45">Últimos videos de hoy · México</p></div>
            <span className="text-xs text-white/40">YouTube</span>
          </div>
          {videosLoading ? (
            <div className="flex gap-3 overflow-hidden" role="status" aria-label="Cargando videos">
              {[0, 1, 2].map((item) => <div key={item} className="h-56 w-[78vw] max-w-[270px] shrink-0 animate-pulse rounded-[24px] bg-[#202124]" />)}
            </div>
          ) : videosError ? (
            <div className="rounded-[24px] bg-[#202124] p-4"><p role="alert" className="text-sm text-white/65">{videosError}</p><button type="button" onClick={loadVideos} className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">Reintentar</button></div>
          ) : videos.length ? (
            <div className="relative overflow-hidden" style={{ perspective: 1100 }}>
              <motion.div
                className="flex w-max py-1"
                animate={reduceMotion ? undefined : { x: ['0%', '-50%'] }}
                transition={reduceMotion ? undefined : { duration: Math.max(38, videos.length * 5), ease: 'linear', repeat: Infinity }}
              >
                {[0, 1].map((copy) => (
                  <div aria-hidden={copy === 1} key={`set-${copy}`} className="flex shrink-0 gap-3 pr-3">
                    {videos.map((video, index) => (
                      <motion.button
                        data-news-squircle
                        key={`${video.id}-${copy}-${index}`}
                        type="button"
                        onClick={() => setSelectedVideo(video)}
                        aria-label={`${video.title} · ${video.channel}`}
                        className="group w-[78vw] max-w-[270px] shrink-0 overflow-hidden rounded-[24px] bg-[#202124] p-2.5 text-left"
                        style={{ transformStyle: 'preserve-3d' }}
                        whileHover={{ rotateY: -5, scale: 1.025, z: 18 }}
                        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
                      >
                        <div data-news-squircle className="relative aspect-video overflow-hidden rounded-[18px] bg-[#303134]">
                          {video.thumbnail && <img src={video.thumbnail} alt="" loading={index < 4 ? 'eager' : 'lazy'} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                          <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/35"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/65 text-white"><Play aria-hidden="true" className="ml-0.5 h-5 w-5 fill-current" /></span></span>
                        </div>
                        <p className="mt-2 truncate text-[11px] font-medium text-white/45">{video.channel} · {dateLabel(video.publishedAt)}</p>
                        <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">{video.title}</h3>
                      </motion.button>
                    ))}
                  </div>
                ))}
              </motion.div>
            </div>
          ) : (
            <div className="rounded-[24px] bg-[#202124] p-4 text-sm text-white/55">No hay videos publicados hoy por estos medios.</div>
          )}
        </section>

        <h1 className="mb-2 mt-7 text-2xl font-bold tracking-tight">Noticias</h1>
        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">México hoy</h2><p className="mt-1 text-xs text-white/45">Noticias en español · GNews</p></div></div>
          {newsLoading ? (
            <div role="status" aria-label="Cargando noticias" className="space-y-3">{[0, 1, 2].map((item) => <div key={item} className="flex animate-pulse gap-3 rounded-[24px] bg-[#202124] p-3"><div className="h-24 w-28 shrink-0 rounded-[18px] bg-[#303134]" /><div className="flex flex-1 flex-col justify-center gap-3"><div className="h-3 w-20 rounded-full bg-[#3b3d40]" /><div className="h-4 w-full rounded-full bg-[#3b3d40]" /><div className="h-3 w-3/5 rounded-full bg-[#303134]" /></div></div>)}</div>
          ) : newsError ? (
            <div className="rounded-[24px] bg-[#202124] p-5"><p role="alert" className="text-sm text-white/70">{newsError}</p><button type="button" onClick={loadNews} className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">Reintentar</button></div>
          ) : articles.length ? (
            <div className="space-y-3">
              {articles.map((article, index) => <button data-news-squircle key={`${article.url}-${index}`} type="button" onClick={() => { setSelectedArticle(article); window.scrollTo({ top: 0, behavior: 'instant' }); }} className="flex w-full gap-3 rounded-[24px] bg-[#202124] p-3 text-left transition-colors hover:bg-[#292a2d]">
                {article.image ? <img data-news-squircle src={article.image} alt="" loading={index < 3 ? 'eager' : 'lazy'} className="h-24 w-28 shrink-0 rounded-[18px] object-cover sm:h-28 sm:w-36" /> : <div data-news-squircle className="flex h-24 w-28 shrink-0 items-center justify-center rounded-[18px] bg-[#303134] text-white/35"><Newspaper className="h-7 w-7" /></div>}
                <span className="flex min-w-0 flex-1 flex-col justify-center">
                  <span className="mb-1 truncate text-xs font-medium text-white/45">{article.source} · {dateLabel(article.publishedAt)}</span>
                  <span className="line-clamp-3 text-sm font-semibold leading-snug">{article.title}</span>
                  <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/55">{article.description}</span>
                </span>
              </button>)}
            </div>
          ) : <p className="rounded-[24px] bg-[#202124] p-5 text-sm text-white/60">No hay noticias disponibles ahora.</p>}
          {newsLoading && <LoaderCircle className="mx-auto mt-5 h-5 w-5 animate-spin text-white/50" />}
        </section>
      </div>
      <YouTubeVideoOverlay
        video={selectedVideo ? {
          id: selectedVideo.id,
          title: selectedVideo.title,
          creator: selectedVideo.channel,
          isShort: selectedVideo.isShort,
          thumbnail: selectedVideo.thumbnail,
        } : null}
        onClose={() => setSelectedVideo(null)}
      />
    </main>
  );
}
