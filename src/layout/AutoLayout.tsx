import { useEffect, useState, type CSSProperties, type HTMLAttributes } from 'react';

export type AutoLayoutMode = 'compact' | 'medium' | 'wide';
type ViewportLayout = { width: number; height: number; mode: AutoLayoutMode; orientation: 'portrait' | 'landscape' };

function measureViewport(): ViewportLayout {
  const width = Math.round(document.documentElement.clientWidth || window.innerWidth);
  const height = Math.round(window.visualViewport?.height || window.innerHeight);
  return {
    width,
    height,
    mode: width < 640 ? 'compact' : width < 1024 ? 'medium' : 'wide',
    orientation: width > height ? 'landscape' : 'portrait',
  };
}

export function useAutoLayout() {
  const [layout, setLayout] = useState<ViewportLayout>(() => measureViewport());
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setLayout((current) => {
        const next = measureViewport();
        return current.width === next.width && current.height === next.height && current.mode === next.mode && current.orientation === next.orientation ? current : next;
      }));
    };
    const observer = new ResizeObserver(update);
    observer.observe(document.documentElement);
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    window.visualViewport?.addEventListener('resize', update, { passive: true });
    window.visualViewport?.addEventListener('scroll', update, { passive: true });
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, []);
  return layout;
}

export function AutoLayoutRoot({ style, ...props }: HTMLAttributes<HTMLDivElement>) {
  const viewport = useAutoLayout();
  const autoLayoutStyle = {
    '--auto-layout-gutter': viewport.mode === 'compact' ? '16px' : viewport.mode === 'medium' ? '24px' : 'clamp(32px, 5vw, 72px)',
    '--auto-layout-content-max': viewport.mode === 'wide' ? '1440px' : '100%',
    '--auto-layout-viewport-height': `${viewport.height}px`,
    ...style,
  } as CSSProperties;
  return <div {...props} style={autoLayoutStyle} data-layout-mode={viewport.mode} data-layout-orientation={viewport.orientation} />;
}

export function AutoLayoutFrame({ maxWidth = '1200px', className = '', ...props }: HTMLAttributes<HTMLDivElement> & { maxWidth?: string }) {
  return <div {...props} className={`auto-layout-frame ${className}`} style={{ '--auto-layout-frame-max': maxWidth, ...props.style } as CSSProperties} />;
}

export function AutoLayoutGrid({ minItemWidth = '260px', gap = '16px', className = '', ...props }: HTMLAttributes<HTMLDivElement> & { minItemWidth?: string; gap?: string }) {
  return <div {...props} className={`auto-layout-grid ${className}`} style={{ '--auto-layout-grid-min': minItemWidth, '--auto-layout-grid-gap': gap, ...props.style } as CSSProperties} />;
}
