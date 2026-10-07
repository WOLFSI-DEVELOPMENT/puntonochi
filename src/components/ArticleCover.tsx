import { useEffect, useState } from 'react';
import { articleImages } from '../data/article-images';

export function ArticleCover({ id, className = '', sizes }: { id: number; className?: string; sizes?: string }) {
  const image = articleImages[id];
  const [current, setCurrent] = useState({ id, src: image?.src });
  useEffect(() => setCurrent({ id, src: image?.src }), [id, image?.src]);
  const src = current.id === id ? current.src : image?.src;
  if (!image || !src) return null;
  return <img src={src} alt={image.alt} sizes={sizes} loading="lazy" onError={() => {
    if (src !== image.fallback) setCurrent({ id, src: image.fallback });
    else setCurrent({ id, src: undefined });
  }} className={className}/>;
}
