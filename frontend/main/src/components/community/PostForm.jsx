import { useRef, useState } from 'react';
import { postCategories, postTypes, pollDurations, MIN_POLL_OPTIONS, MAX_POLL_OPTIONS } from '../../data/communityData';
import {
  MAX_POST_TITLE_LENGTH,
  MAX_POST_BODY_LENGTH,
  validateImageFile,
  validateExternalUrl,
} from '../../utils/communityPosts';

/**
 * PostForm — shared composer used by /community/create (new posts) and
 * /community/post/:id/edit (editing an existing post).
 *
 * Supports Text, Image, Link, and Poll post types. Video uploads are NOT
 * supported by design.
 */
export default function PostForm({ initial, onSubmit, onCancel, submitLabel = 'Publish' }) {
  const [type, setType] = useState(initial?.type || 'text');
  const [title, setTitle] = useState(initial?.title || '');
  const [body, setBody] = useState(initial?.body || '');
  const [category, setCategory] = useState(initial?.category || '');
  const [externalUrl, setExternalUrl] = useState(initial?.externalUrl || '');
  // Up to 3 images. `images` holds newly chosen files; `imagePreviews` shows
  // both existing gallery urls (when editing) and local previews of new files.
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState(() =>
    Array.isArray(initial?.images) && initial.images.length > 0
      ? initial.images
      : (initial?.imageUrl ? [initial.imageUrl] : [])
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const MAX_IMAGES = 3;

  // ── Poll state ──
  const [pollOptions, setPollOptions] = useState(() =>
    Array.isArray(initial?.poll?.options) && initial.poll.options.length > 0
      ? initial.poll.options.map((o) => o.text)
      : ['', '']
  );
  const [pollDuration, setPollDuration] = useState(24); // default: 1 day

  function pickType(next) {
    setType(next);
    setError('');
    if (next !== 'image') {
      setImages([]);
      setImagePreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleImagesChange(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const allowed = [];
    for (const file of files) {
      const check = validateImageFile(file);
      if (!check.ok) { setError(check.error); return; }
      allowed.push(file);
    }
    if (allowed.length + images.length > MAX_IMAGES) {
      setError(`Image posts can have at most ${MAX_IMAGES} images.`);
      return;
    }
    setError('');
    setImages((prev) => [...prev, ...allowed]);
    setImagePreviews((prev) => [
      ...prev,
      ...allowed.map((f) => URL.createObjectURL(f)),
    ]);
  }

  function removeImage(index) {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function addPollOption() {
    if (pollOptions.length >= MAX_POLL_OPTIONS) return;
    setPollOptions((o) => [...o, '']);
  }

  function removePollOption(i) {
    setPollOptions((o) => o.filter((_, idx) => idx !== i));
  }

  function updatePollOption(i, value) {
    setPollOptions((o) => o.map((opt, idx) => (idx === i ? value : opt)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // ── Client-side validation (backend re-validates everything) ──
    const cleanTitle = title.trim();
    if (!cleanTitle) return setError('Please enter a title.');
    if (cleanTitle.length > MAX_POST_TITLE_LENGTH) {
      return setError(`Title must be ${MAX_POST_TITLE_LENGTH} characters or fewer.`);
    }
    if (!postCategories.includes(category)) return setError('Please choose a category.');
    if (body.length > MAX_POST_BODY_LENGTH) {
      return setError(`Body must be ${MAX_POST_BODY_LENGTH} characters or fewer.`);
    }
    if (type === 'image' && images.length === 0 && imagePreviews.length === 0) {
      return setError('Image posts need an image (JPG, PNG, or WebP).');
    }
    if (type === 'link') {
      const urlCheck = validateExternalUrl(externalUrl);
      if (!urlCheck.ok) return setError(urlCheck.error);
      if (!urlCheck.url) return setError('Link posts need a URL.');
    }
    if (type === 'poll') {
      const clean = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (clean.length < MIN_POLL_OPTIONS) {
        return setError(`Polls need at least ${MIN_POLL_OPTIONS} options.`);
      }
      if (new Set(clean).size !== clean.length) {
        return setError('Poll options must be unique.');
      }
      if (pollDuration === undefined || pollDuration === null) {
        return setError('Please choose a poll duration.');
      }
      setSubmitting(true);
      try {
        await onSubmit({
          type,
          title: cleanTitle,
          body: body.trim(),
          category,
          externalUrl: '',
          images: [],
          pollOptions: clean,
          pollDuration,
        });
      } catch (err) {
        setError(err.message || 'Something went wrong. Please try again.');
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        type,
        title: cleanTitle,
        body: body.trim(),
        category,
        externalUrl: type === 'link' ? externalUrl.trim() : '',
        images,
      });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <form className="community-form community-post-form" onSubmit={handleSubmit} noValidate>
      <div className="form-row">
        <label htmlFor="post-type">Post type</label>
        <div className="community-type-tabs" role="tablist" aria-label="Post type">
          {postTypes.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={type === t.value}
              className={`community-type-tab${type === t.value ? ' is-active' : ''}`}
              onClick={() => pickType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-row">
        <label htmlFor="post-title">
          Title <span className="community-char-count">{title.length}/{MAX_POST_TITLE_LENGTH}</span>
        </label>
        <input
          id="post-title"
          type="text"
          value={title}
          maxLength={MAX_POST_TITLE_LENGTH}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your post a clear title"
          required
        />
      </div>

      <div className="form-row">
        <label htmlFor="post-category">Category</label>
        <select
          id="post-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="" disabled>Choose a category…</option>
          {postCategories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label htmlFor="post-body">Description <span className="community-char-count">{body.length}/{MAX_POST_BODY_LENGTH}</span></label>
        <textarea
          id="post-body"
          rows={6}
          value={body}
          maxLength={MAX_POST_BODY_LENGTH}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share the details… (optional)"
        />
      </div>


      {type === 'image' && (
        <div className="form-row">
          <label htmlFor="post-image">Images (JPG, PNG, or WebP — max 5 MB each, up to 3)</label>
          <input
            id="post-image"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleImagesChange}
          />
          {imagePreviews.length > 0 && (
            <div className="community-image-preview-grid">
              {imagePreviews.map((src, i) => (
                <div key={`${src}-${i}`} className="community-image-preview-item">
                  <img
                    src={src}
                    alt={`Upload preview ${i + 1}`}
                    className="community-image-preview"
                    loading="lazy"
                    decoding="async"
                  />
                  <button
                    type="button"
                    className="community-image-preview-remove"
                    aria-label="Remove image"
                    onClick={() => removeImage(i)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {type === 'link' && (
        <div className="form-row">
          <label htmlFor="post-url">External URL</label>
          <input
            id="post-url"
            type="url"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
      )}

      {type === 'poll' && (
        <div className="form-row">
          <label>Poll options <span className="community-char-count">{pollOptions.filter((o) => o.trim()).length}/{MAX_POLL_OPTIONS}</span></label>
          <div className="community-poll-form-options">
            {pollOptions.map((opt, i) => (
              <div key={i} className="community-poll-form-option">
                <input
                  type="text"
                  value={opt}
                  maxLength={120}
                  placeholder={`Option ${i + 1}`}
                  onChange={(e) => updatePollOption(i, e.target.value)}
                />
                {pollOptions.length > MIN_POLL_OPTIONS && (
                  <button
                    type="button"
                    className="community-poll-form-remove"
                    aria-label="Remove option"
                    onClick={() => removePollOption(i)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {pollOptions.length < MAX_POLL_OPTIONS && (
            <button type="button" className="btn btn-outline community-poll-form-add" onClick={addPollOption}>
              + Add option
            </button>
          )}
        </div>
      )}

      {type === 'poll' && (
        <div className="form-row">
          <label htmlFor="poll-duration">Poll duration</label>
          <select
            id="poll-duration"
            value={pollDuration === undefined || pollDuration === null ? '' : String(pollDuration)}
            onChange={(e) => {
              const val = e.target.value;
              setPollDuration(val === '' ? null : Number(val));
            }}
          >
            {pollDurations.map((d) => (
              <option key={d.value === null ? 'none' : d.value} value={d.value === null ? '' : d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="community-form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Publishing…' : submitLabel}
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}

