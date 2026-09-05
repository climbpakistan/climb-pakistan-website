/**
 * PostGallery — renders a post's images: a single image as-is, or 2–3 images
 * in a grid. Accepts either an array of urls (post.images) or a single url.
 */
export default function PostGallery({ images, alt = '' }) {
  const list = (Array.isArray(images) ? images : [images]).filter(Boolean);
  if (list.length === 0) return null;

  if (list.length === 1) {
    return (
      <img
        src={list[0]}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="community-post-image"
      />
    );
  }

  return (
    <div className={`community-post-gallery community-post-gallery--${list.length}`}>
      {list.map((src, i) => (
        <img
          key={`${src}-${i}`}
          src={src}
          alt={`${alt} ${i + 1}`}
          loading="lazy"
          decoding="async"
        />
      ))}
    </div>
  );
}