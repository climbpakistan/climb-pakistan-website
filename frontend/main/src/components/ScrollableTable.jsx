import { useEffect, useRef, useState } from 'react';

// Wraps a wide table so the whole table can be swiped horizontally on touch
// devices (native overflow-x pan). Shows a thin progress "slider" track below
// the table only when the table actually overflows its container. Column-hiding
// mobile rules never apply inside it — every column stays visible.
export default function ScrollableTable({ children }) {
  const viewportRef = useRef(null);
  const [overflowing, setOverflowing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const hasOverflow = viewport.scrollWidth > viewport.clientWidth + 1;
        setOverflowing(hasOverflow);
        if (!hasOverflow) setProgress(0);
      });
    };

    const onScroll = () => {
      const max = viewport.scrollWidth - viewport.clientWidth;
      setProgress(max > 0 ? viewport.scrollLeft / max : 0);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(viewport);
    viewport.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      viewport.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <div className="table-scroll">
      <div className="table-scroll-viewport" ref={viewportRef}>
        {children}
      </div>
      <div className={`table-scroll-progress${overflowing ? ' is-active' : ''}`} aria-hidden={!overflowing}>
        <div className="table-scroll-track">
          <div className="table-scroll-bar" style={{ transform: `scaleX(${progress})` }} />
        </div>
        <span className="table-scroll-hint">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Swipe to see all columns
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </div>
    </div>
  );
}