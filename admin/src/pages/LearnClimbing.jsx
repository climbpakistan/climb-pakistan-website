import { useState, useEffect } from 'react';
import { getLearnSections, createLearnSection, updateLearnSection, deleteLearnSection } from '../api';

export default function LearnClimbing() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSlug, setEditingSlug] = useState(null);
  const [form, setForm] = useState({ slug: '', title: '', subtitle: '', image: '', body: '', detailsText: '', gallery: [{ label: '', caption: '', imageUrl: '' }], status: 'Draft' });

  useEffect(() => {
    getLearnSections().then(setSections).finally(() => setLoading(false));
  }, []);

  const openNew = () => {
    setEditingSlug('__new__');
    setForm({ slug: '', title: '', subtitle: '', image: '', body: '', detailsText: '', gallery: [{ label: '', caption: '', imageUrl: '' }], status: 'Draft' });
  };

  const openEdit = (section) => {
    setEditingSlug(section.slug);
    const existingGallery = section.gallery && section.gallery.length > 0
      ? section.gallery.map((g) => ({ label: g.label || '', caption: g.caption || '', imageUrl: g.imageUrl || '' }))
      : [{ label: '', caption: '', imageUrl: '' }];
    setForm({ ...section, detailsText: section.details ? section.details.join('\n\n') : '', gallery: existingGallery });
  };

  const cancelEdit = () => setEditingSlug(null);

  const save = async () => {
    if (!form.title.trim()) return;
    const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { detailsText, ...rest } = form;
    const details = detailsText.split('\n\n').filter((p) => p.trim());
    const section = { ...rest, slug, details };

    try {
      if (editingSlug === '__new__') {
        await createLearnSection(section);
      } else {
        await updateLearnSection(editingSlug, section);
      }
      const updated = await getLearnSections();
      setSections(updated);
      setEditingSlug(null);
    } catch (err) {
      alert('Failed to save section: ' + err.message);
    }
  };

  const handleDelete = async (slug) => {
    if (!confirm('Delete this section?')) return;
    try {
      await deleteLearnSection(slug);
      setSections(sections.filter((s) => s.slug !== slug));
      if (editingSlug === slug) setEditingSlug(null);
    } catch (err) {
      alert('Failed to delete section: ' + err.message);
    }
  };

  if (loading) return <p style={{ padding: 'var(--sp-6)' }}>Loading sections...</p>;

  return (
    <>
      <div className="page-header">
        <h1>Learn Climbing</h1>
        <p>Manage educational content and guides.</p>
      </div>

      <div style={{ marginBottom: 'var(--sp-6)', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" type="button" onClick={openNew}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New Section
        </button>
      </div>

      {editingSlug !== null && (
        <div className="card" style={{ marginBottom: 'var(--sp-6)' }}>
          <div className="card-header">
            <h3 className="card-title">{editingSlug === '__new__' ? 'New Section' : 'Edit Section'}</h3>
            <button className="btn btn-outline" type="button" onClick={cancelEdit}>Cancel</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Slug</label>
              <input className="form-input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Subtitle</label>
              <input className="form-input" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Hero Image URL</label>
              <input className="form-input" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://example.com/section-image.jpg" />
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 'var(--sp-1)' }}>
                For inline images inside the body/details text, use <strong>![caption](image-url)</strong> syntax.
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" style={{ width: 200 }} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option>Draft</option>
                <option>Published</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Body (intro paragraph)</label>
              <textarea className="form-input" rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Use **bold**, ![alt](url) for images, Enter for line breaks" />
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 'var(--sp-1)' }}>
                Supports <strong>**bold**</strong> text, line breaks, and inline images with <strong>![caption](image-url)</strong>.
              </p>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Details (one paragraph per blank line)</label>
              <textarea className="form-input" rows={12} value={form.detailsText} onChange={(e) => setForm({ ...form, detailsText: e.target.value })} placeholder="Each paragraph separated by a blank line. Use **bold**, ![alt](url) for images." />
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 'var(--sp-1)' }}>
                Blank lines create new paragraphs. Supports <strong>**bold**</strong>, inline images with <strong>![caption](image-url)</strong>, and line breaks.
              </p>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Gallery Images</label>
                <button className="btn btn-outline" type="button" onClick={() => setForm({ ...form, gallery: [...form.gallery, { label: '', caption: '', imageUrl: '' }] })} style={{ fontSize: 'var(--fs-xs)' }}>
                  + Add Image
                </button>
              </div>
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}>Each gallery item has an image URL, label and caption.</p>
              {form.gallery.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)', alignItems: 'center' }}>
                  <input className="form-input" value={item.imageUrl} onChange={(e) => {
                    const g = [...form.gallery]; g[i] = { ...g[i], imageUrl: e.target.value }; setForm({ ...form, gallery: g });
                  }} placeholder="Image URL" style={{ flex: 2 }} />
                  <input className="form-input" value={item.label} onChange={(e) => {
                    const g = [...form.gallery]; g[i] = { ...g[i], label: e.target.value }; setForm({ ...form, gallery: g });
                  }} placeholder="Label" style={{ flex: 1 }} />
                  <input className="form-input" value={item.caption} onChange={(e) => {
                    const g = [...form.gallery]; g[i] = { ...g[i], caption: e.target.value }; setForm({ ...form, gallery: g });
                  }} placeholder="Caption" style={{ flex: 2 }} />
                  <button className="btn btn-outline" type="button" onClick={() => {
                    setForm({ ...form, gallery: form.gallery.filter((_, idx) => idx !== i) });
                  }} style={{ flexShrink: 0, color: 'var(--error)', borderColor: 'transparent', fontSize: 'var(--fs-sm)' }}>✕</button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
            <button className="btn btn-primary" type="button" onClick={save}>Save Section</button>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Subtitle</th>
              <th>Status</th>
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((s) => (
              <tr key={s.slug}>
                <td style={{ fontWeight: 500 }}>{s.title}</td>
                <td style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>{s.subtitle}</td>
                <td><span className={s.status === 'Published' ? 'badge badge-success' : 'badge badge-warning'}>{s.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                    <button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)' }} onClick={() => openEdit(s)}>Edit</button>
                    <button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)', color: 'var(--error)' }} onClick={() => handleDelete(s.slug)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
