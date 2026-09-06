import { useEffect } from 'react';

/**
 * PostLightbox — fullscreen image preview with a close (✕) button.
 * `index` is controlled by the parent; Esc / backdrop / ✕ close it,
 * arrow keys and the ‹ › buttons navigate multi-image albums.
 */
export default function PostLightbox({ images, index = 0, alt = '', onClose, onIndexChange }) {
  const list = (Array.isArray(images) ? images : [images]).filter(Boolean);
  const count = list.length;

  useEffect(() => {
    if (count === 0) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onIndexChange((i) => (i - 1 + count) % count);
      if (e.key === 'ArrowRight') onIndexChange((i) => (i + 1) % count);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [count, onClose, onIndexChange]);

  if (count === 0) return null;

  return (
    <div
      className="community-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      onClick={onClose}
    >
      <button
        type="button"
        className="community-lightbox-close"
        aria-label="Close image"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      {count > 1 && (
        <>
          <button
            type="button"
            className="community-lightbox-nav community-lightbox-nav--prev"
            aria-label="Previous image"
            onClick={(e) => { e.stopPropagation(); onIndexChange((i) => (i - 1 + count) % count); }}
          >
            ‹
          </button>
          <button
            type="button"
            className="community-lightbox-nav community-lightbox-nav--next"
            aria-label="Next image"
            onClick={(e) => { e.stopPropagation(); onIndexChange((i) => (i + 1) % count); }}
          >
            ›
          </button>
        </>
      )}
      <img className="community-lightbox-img" src={list[index]} alt={alt} onClick={(e) => e.stopPropagation()} />
      {count > 1 && (
        <span className="community-lightbox-count">
          {index + 1} / {count}
        </span>
      )}
    </div>
  );
}