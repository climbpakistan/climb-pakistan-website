import { useRef, useState, useCallback } from 'react';

export default function ImagePositionPicker({ imageUrl, value, onChange, aspectRatio = '21/9', maxHeight }) {
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  // Parse aspect ratio string like "21/9" → [21, 9]
  const [ratioW, ratioH] = aspectRatio.split('/').map(Number);
  const hasFixedSize = Boolean(maxHeight);
  const containerWidth = hasFixedSize ? `${Math.round(maxHeight * ratioW / ratioH)}px` : '100%';
  const containerHeight = hasFixedSize ? `${maxHeight}px` : 'auto';

  // Parse current value: "50% 50%" → { x: 50, y: 50 }
  const pos = (value || '50% 50%').split(' ').map((v) => parseFloat(v));
  const x = isNaN(pos[0]) ? 50 : pos[0];
  const y = isNaN(pos[1]) ? 50 : pos[1];

  const getPositionFromEvent = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    let px = ((clientX - rect.left) / rect.width) * 100;
    let py = ((clientY - rect.top) / rect.height) * 100;
    px = Math.max(0, Math.min(100, Math.round(px)));
    py = Math.max(0, Math.min(100, Math.round(py)));
    return { x: px, y: py };
  }, []);

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

  return (
    <div>
      <label className="form-label" style={{ fontSize: 'var(--fs-xs)', marginBottom: 'var(--sp-2)' }}>
        Image Focus Point — <span style={{ fontWeight: 400, fontFamily: 'monospace' }}>{value || '50% 50%'}</span>
      </label>
      <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}>
        Click or drag on the image to set the crop focus.
      </p>
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          position: 'relative',
          width: containerWidth,
          height: containerHeight,
          aspectRatio: hasFixedSize ? 'none' : aspectRatio,
          overflow: 'hidden',
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
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: `${x}% ${y}%`,
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
          backgroundSize: '33.33% 33.33%',
          pointerEvents: 'none',
        }} />

        {/* Crosshair at focus point */}
        <div style={{
          position: 'absolute',
          left: `${x}%`,
          top: `${y}%`,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 0 8px rgba(0,0,0,0.5)',
          }} />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--cp-accent)',
            boxShadow: '0 0 4px rgba(0,0,0,0.6)',
          }} />
        </div>
      </div>
    </div>
  );
}
