import { useRef, useState, useCallback, useEffect } from 'react';

const ZOOM_LEVELS = [1, 1.5, 2, 3, 4];

export default function ImagePositionPicker({ imageUrl, value, onChange, aspectRatio = '21/9', maxHeight }) {
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [scrollPos, setScrollPos] = useState({ left: 0, top: 0 });

  // Track scroll position so crosshair moves correctly when panning
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => setScrollPos({ left: el.scrollLeft, top: el.scrollTop });
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [imageUrl]);

  // Parse aspect ratio string like "21/9" → [21, 9]
  const [ratioW, ratioH] = aspectRatio.split('/').map(Number);
  const hasFixedSize = Boolean(maxHeight);
  const baseHeight = hasFixedSize ? maxHeight : null;
  const baseWidth = baseHeight ? Math.round(baseHeight * ratioW / ratioH) : null;

  // When zoomed, the image inside gets larger, but the container stays at base size
  const effectiveImageWidth = baseWidth ? Math.round(baseWidth * zoom) : null;
  const effectiveImageHeight = baseHeight ? Math.round(baseHeight * zoom) : null;

  // Parse current value: "50% 50%" → { x: 50, y: 50 }
  const pos = (value || '50% 50%').split(' ').map((v) => parseFloat(v));
  const x = isNaN(pos[0]) ? 50 : pos[0];
  const y = isNaN(pos[1]) ? 50 : pos[1];

  // Crosshair position in pixels relative to the image
  const crosshairImgX = effectiveImageWidth ? (effectiveImageWidth * x / 100) : null;
  const crosshairImgY = effectiveImageHeight ? (effectiveImageHeight * y / 100) : null;

  const getPositionFromEvent = useCallback((e) => {
    const el = containerRef.current;
    if (!el) return { x: 50, y: 50 };
    const rect = el.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    // Click position relative to the visible container
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;
    // Account for scroll when zoomed – position within the full image
    const imgX = el.scrollLeft + clickX;
    const imgY = el.scrollTop + clickY;
    // Convert to percentage of the effective (zoomed) image dimensions
    let px = effectiveImageWidth ? (imgX / effectiveImageWidth) * 100 : (clickX / rect.width) * 100;
    let py = effectiveImageHeight ? (imgY / effectiveImageHeight) * 100 : (clickY / rect.height) * 100;
    px = Math.max(0, Math.min(100, Math.round(px)));
    py = Math.max(0, Math.min(100, Math.round(py)));
    return { x: px, y: py };
  }, [effectiveImageWidth, effectiveImageHeight]);

  const handleMouseDown = useCallback((e) => {
    const { x: nx, y: ny } = getPositionFromEvent(e);
    onChange(`${nx}% ${ny}%`);
    setDragging(true);
  }, [getPositionFromEvent, onChange]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    const { x: nx, y: ny } = getPositionFromEvent(e);
    onChange(`${nx}% ${ny}%`);
  }, [dragging, getPositionFromEvent, onChange]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const zoomIn = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[idx + 1]);
  };

  const zoomOut = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx > 0) setZoom(ZOOM_LEVELS[idx - 1]);
  };

  if (!imageUrl) {
    return (
      <div style={{
        padding: 'var(--sp-4)',
        background: 'var(--surface)',
        border: '1px dashed var(--border)',
        borderRadius: 'var(--radius-sm)',
        textAlign: 'center',
        fontSize: 'var(--fs-sm)',
        color: 'var(--text-muted)',
      }}>
        Add an image URL above to adjust the focus point
      </div>
    );
  }

  const isZoomed = hasFixedSize && zoom > 1;

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--sp-2)',
        flexWrap: 'wrap',
        gap: 'var(--sp-2)',
      }}>
        <label className="form-label" style={{ fontSize: 'var(--fs-xs)', marginBottom: 0 }}>
          Image Focus Point — <span style={{ fontWeight: 400, fontFamily: 'monospace' }}>{value || '50% 50%'}</span>
        </label>

        {hasFixedSize && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-1)' }}>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginRight: 'var(--sp-1)' }}>
              Zoom:
            </span>
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoom === ZOOM_LEVELS[0]}
              title="Zoom out"
              style={{
                width: 28, height: 28,
                borderRadius: 4,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                cursor: zoom === ZOOM_LEVELS[0] ? 'not-allowed' : 'pointer',
                opacity: zoom === ZOOM_LEVELS[0] ? 0.4 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'var(--fs-sm)', fontWeight: 700,
              }}
            >
              −
            </button>
            <span style={{
              minWidth: 36, textAlign: 'center',
              fontSize: 'var(--fs-xs)', fontWeight: 600,
              color: 'var(--text)', fontFamily: 'monospace',
            }}>
              {zoom}×
            </span>
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
              title="Zoom in"
              style={{
                width: 28, height: 28,
                borderRadius: 4,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                cursor: zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1] ? 'not-allowed' : 'pointer',
                opacity: zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1] ? 0.4 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'var(--fs-sm)', fontWeight: 700,
              }}
            >
              +
            </button>
          </div>
        )}
      </div>

      <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}>
        Click or drag to set the crop focus. {hasFixedSize && 'Use zoom to see details, then scroll to pan.'}
      </p>

      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          position: 'relative',
          width: baseWidth || '100%',
          height: baseHeight || 'auto',
          aspectRatio: baseHeight ? 'none' : aspectRatio,
          overflow: isZoomed ? 'auto' : 'hidden',
          borderRadius: 'var(--radius-sm)',
          border: dragging ? '2px solid var(--accent)' : '1px solid var(--border)',
          cursor: 'crosshair',
          userSelect: 'none',
          transition: 'border-color 0.15s ease',
        }}
      >
        <img
          src={imageUrl}
          alt="Adjust focus point"
          draggable={false}
          style={{
            width: effectiveImageWidth || '100%',
            height: effectiveImageHeight || '100%',
            objectFit: isZoomed ? 'none' : 'cover',
            objectPosition: isZoomed ? '0 0' : `${x}% ${y}%`,
            pointerEvents: 'none',
            display: 'block',
          }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />

        {/* Rule-of-thirds grid overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: isZoomed ? `${baseWidth / 3}px ${baseHeight / 3}px` : '33.33% 33.33%',
          pointerEvents: 'none',
        }} />

        {/* Crosshair at focus point — computed position for both zoomed and unzoomed */}
        <div style={{
          position: 'absolute',
          left: isZoomed && crosshairImgX !== null ? crosshairImgX - scrollPos.left : `${x}%`,
          top: isZoomed && crosshairImgY !== null ? crosshairImgY - scrollPos.top : `${y}%`,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 0 8px rgba(0,0,0,0.5)',
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 6, height: 6,
            borderRadius: '50%',
            background: 'var(--cp-accent)',
            boxShadow: '0 0 4px rgba(0,0,0,0.6)',
          }} />
        </div>
      </div>
    </div>
  );
}
