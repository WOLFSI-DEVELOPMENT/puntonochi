const channels = [
  { name: 'N+ (NMás)', handle: '@nmas' },
  { name: 'Milenio', handle: '@MILENIO' },
  { name: 'El Universal', handle: '@ElUniversal' },
  { name: 'Azteca Noticias', handle: '@AztecaNoticias' },
  { name: 'Grupo Fórmula', handle: '@grupoformula-rf' },
  { name: 'Latinus', channelId: 'UC-FVhfqCwhzpJ4DTJOMMofA' },
];

function mexicoDate(date) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${value.year}-${value.month}-${value.day}`;
}

async function youtube(path, params, key) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [name, value] of Object.entries({ ...params, key })) url.searchParams.set(name, value);
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || 'YouTube API request failed.');
  return body;
}

function durationInSeconds(value = '') {
  const [, hours = '0', minutes = '0', seconds = '0'] = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/) || [];
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return res.status(503).json({ error: 'YouTube API is not configured on the server.' });

  try {
    const uploads = await Promise.allSettled(channels.map(async (channel) => {
      const result = await youtube('channels', {
        part: 'contentDetails,snippet',
        ...(channel.channelId ? { id: channel.channelId } : { forHandle: channel.handle }),
      }, key);
      const item = result.items?.[0];
      if (!item) return [];
      const playlist = await youtube('playlistItems', {
        part: 'snippet,contentDetails', playlistId: item.contentDetails.relatedPlaylists.uploads, maxResults: '50',
      }, key);
      return (playlist.items || []).map((video) => ({
        id: video.contentDetails?.videoId,
        title: video.snippet?.title || '',
        channel: channel.name,
        publishedAt: video.contentDetails?.videoPublishedAt || video.snippet?.publishedAt || '',
        thumbnail: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url || '',
      })).filter((video) => video.id);
    }));

    const today = mexicoDate(new Date());
    const latestVideos = uploads.flatMap((result) => result.status === 'fulfilled' ? result.value : [])
      .filter((video) => mexicoDate(new Date(video.publishedAt)) === today)
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
      .slice(0, 20);

    let videos = latestVideos;
    if (latestVideos.length) {
      const details = await youtube('videos', { part: 'contentDetails', id: latestVideos.map((video) => video.id).join(',') }, key);
      const durationById = new Map((details.items || []).map((video) => [video.id, durationInSeconds(video.contentDetails?.duration)]));
      videos = latestVideos.map((video) => ({ ...video, isShort: (durationById.get(video.id) ?? 0) <= 180 }));
    }

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json({ date: today, videos });
  } catch (error) {
    console.error('YouTube news request failed:', error);
    return res.status(502).json({ error: 'No se pudieron cargar los videos de noticias de YouTube.' });
  }
}
