import { useState, useEffect, useRef, useMemo } from 'react';
import { getPhotos, createPhoto, updatePhoto, deletePhoto, uploadPhoto } from '../api';

const CATEGORIES = [
  { value: 'athletes', label: 'Athletes' },
  { value: 'news', label: 'News' },
  { value: 'competitions', label: 'Competitions' },
  { value: 'learn-climbing', label: 'Learn Climbing' },
  { value: 'teams', label: 'Teams' },
];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Photos() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');

  // ── Form state (used for both add and edit) ──
  const [formMode, setFormMode] = useState(null); // null | 'add' | { _id, ... }
  const [form, setForm] = useState({ name: '', url: '', category: 'athletes' });
  const [uploading, setUploading] = useState(false);
  const [uploadedPhotoId, setUploadedPhotoId] = useState(null); // _id from upload (to avoid duplicates)
  const fileInputRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    setLoading(true);
    getPhotos(categoryFilter)
      .then(setPhotos)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [categoryFilter]);

  // ── Open add form ──
  const openAdd = () => {
    setFormMode('add');
    setForm({ name: '', url: '', category: 'athletes' });
    setUploadedPhotoId(null);
    setError('');
  };

  // ── Open edit form ──
  const openEdit = (photo) => {
    setFormMode({ _id: photo._id });
    setForm({ name: photo.name || '', url: photo.url || '', category: photo.category || 'athletes' });
    setUploadedPhotoId(null);
    setError('');
  };

  const cancelForm = () => {
    setFormMode(null);
    setUploadedPhotoId(null);
    setError('');
  };

  // ── Handle file upload ──
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = form.name.trim() || file.name.replace(/\.[^.]+$/, '');

    setUploading(true);
    setError('');

    try {
      const saved = await uploadPhoto(file, name, form.category);
      setForm((prev) => ({ ...prev, url: saved.url, name: saved.name }));
      setUploadedPhotoId(saved._id); // Track the record created by upload
      showToast('Image uploaded to Cloudinary! Save the form to store it.');
    } catch (err) {
      setError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Save (create or update) ──
  const handleSave = async () => {
    setError('');

    if (!form.name.trim()) { setError('Image name is required.'); return; }
    if (!form.url.trim()) { setError('Please upload an image or enter a URL.'); return; }

    try {
      if (formMode === 'add') {
        if (uploadedPhotoId) {
          // Upload already created the DB record; update it with final name/category
          const updated = await updatePhoto(uploadedPhotoId, {
            name: form.name.trim(),
            url: form.url.trim(),
            category: form.category,
          });
          setPhotos([updated, ...photos]);
        } else {
          // No upload — create a new record (manual URL entry)
          const saved = await createPhoto({
            name: form.name.trim(),
            url: form.url.trim(),
            category: form.category,
          });
          setPhotos([saved, ...photos]);
        }
        showToast('Photo added successfully!');
      } else {
        const updated = await updatePhoto(formMode._id, {
          name: form.name.trim(),
          url: form.url.trim(),
          category: form.category,
        });
        setPhotos(photos.map((p) => (p._id === formMode._id ? updated : p)));
        showToast('Photo updated successfully!');
      }
      setFormMode(null);
      setUploadedPhotoId(null);
    } catch (err) {
      setError('Failed to save: ' + err.message);
    }
  };

  // ── Delete ──
  const handleDelete = async (id) => {
    if (!confirm('Delete this image? This will remove it from the database and Cloudinary.')) return;
    try {
      await deletePhoto(id);
      setPhotos(photos.filter((p) => p._id !== id));
      if (formMode && formMode._id === id) setFormMode(null);
      showToast('Photo deleted.');
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  // ── Copy URL ──
  const copyUrl = (url) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => showToast('URL copied to clipboard!'));
    } else {
      prompt('Copy this URL:', url);
    }
  };

  // ── Filtered photos (also filtered client-side for immediate response) ──
  const filteredPhotos = useMemo(() => {
    if (categoryFilter === 'all') return photos;
    return photos.filter((p) => p.category === categoryFilter);
  }, [photos, categoryFilter]);

  return (
    <>
      <div className="page-header">
        <h1>Photos</h1>
        <p>Central image library. Manage all website images — upload from your device or paste a URL.</p>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: 'var(--accent)', color: '#fff', padding: 'var(--sp-2) var(--sp-4)',
          borderRadius: 8, fontSize: 'var(--fs-sm)', fontWeight: 500,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}>
          {toast}
        </div>
      )}

      {/* ── Category Filter + Add Button ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-6)', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <label style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Category</label>
          <select
            className="form-input"
            style={{ width: 'auto', fontSize: 'var(--fs-sm)' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
            {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button className="btn btn-primary" type="button" onClick={openAdd} disabled={formMode !== null}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Photo
        </button>
      </div>

      {/* ── Add / Edit Form ── */}
      {formMode !== null && (
        <div className="card" style={{ marginBottom: 'var(--sp-6)' }}>
          <div className="card-header">
            <h3 className="card-title">{formMode === 'add' ? 'Add New Photo' : 'Edit Photo'}</h3>
            <button className="btn btn-outline" type="button" onClick={cancelForm}>Cancel</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
            <div className="form-group">
              <label className="form-label">Image Name *</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. National Championship Opening Ceremony"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Upload Image from Device *</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
                style={{
                  display: 'block', width: '100%', padding: 'var(--sp-4)',
                  border: '2px dashed var(--card-border)', borderRadius: 8,
                  background: 'var(--bg-secondary)', cursor: 'pointer',
                  fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)',
                }}
              />
              {uploading && (
                <p style={{ color: 'var(--accent)', fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-2)' }}>
                  Uploading to Cloudinary...
                </p>
              )}
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Cloudinary URL (auto-populated after upload, or paste manually)</label>
              <input
                className="form-input"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://res.cloudinary.com/..."
                style={{ fontFamily: 'monospace', fontSize: 'var(--fs-sm)' }}
              />
            </div>
            {form.url && (
              <div style={{ gridColumn: '1 / -1', marginBottom: 'var(--sp-2)' }}>
                <img
                  src={form.url}
                  alt="Preview"
                  style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 8, background: 'var(--bg-secondary)' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            )}
          </div>

          {error && <p style={{ color: 'var(--error)', fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-2)' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
            <button className="btn btn-primary" type="button" onClick={handleSave} disabled={uploading}>
              {formMode === 'add' ? 'Save Photo' : 'Update Photo'}
            </button>
          </div>
        </div>
      )}

      {/* ── Photo Grid ── */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: 'var(--sp-8)', textAlign: 'center' }}>Loading photos...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--sp-4)' }}>
          {filteredPhotos.length === 0 && (
            <p style={{ color: 'var(--text-muted)', gridColumn: '1 / -1', padding: 'var(--sp-8)', textAlign: 'center' }}>
              {categoryFilter === 'all'
                ? 'No photos yet. Click "Add Photo" to get started.'
                : `No photos in the "${CATEGORIES.find((c) => c.value === categoryFilter)?.label}" category.`}
            </p>
          )}
          {filteredPhotos.map((photo) => (
            <div key={photo._id} className="card" style={{ overflow: 'hidden' }}>
              <div style={{ width: '100%', height: 180, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <img
                  src={photo.url}
                  alt={photo.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = document.createElement('span');
                    fallback.style.cssText = 'color:var(--text-muted);font-size:var(--fs-sm)';
                    fallback.textContent = 'Image failed to load';
                    e.target.parentNode.appendChild(fallback);
                  }}
                />
              </div>
              <div style={{ padding: 'var(--sp-3)' }}>
                <p style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-1)' }}>{photo.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-1)' }}>
                  <span className="badge badge-info" style={{ fontSize: 'var(--fs-xs)' }}>
                    {CATEGORIES.find((c) => c.value === photo.category)?.label || photo.category}
                  </span>
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{formatDate(photo.createdAt)}</span>
                </div>
                <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', wordBreak: 'break-all', marginBottom: 'var(--sp-2)' }}>{photo.url}</p>
                <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                  <button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)' }} onClick={() => copyUrl(photo.url)}>
                    Copy URL
                  </button>
                  <button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)' }} onClick={() => openEdit(photo)}>
                    Edit
                  </button>
                  <button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)', color: 'var(--error)' }} onClick={() => handleDelete(photo._id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
