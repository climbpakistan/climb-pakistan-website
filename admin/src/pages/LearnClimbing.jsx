import { useState, useEffect } from 'react';
import { getLearnSections, createLearnSection, updateLearnSection, deleteLearnSection } from '../api';
import ImagePositionPicker from '../components/ImagePositionPicker';

const LAYOUT_OPTIONS = [
  { value: 'image-left', label: 'Image Left + Text Right' },
  { value: 'image-center', label: 'Title & Image Center + Text Below' },
  { value: 'text-only', label: 'Text Only' },
];

function emptySection() {
  return { layout: 'text-only', heading: '', imageUrl: '', text: '' };
}

export default function LearnClimbing() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSlug, setEditingSlug] = useState(null);
  const [form, setForm] = useState({
    slug: '', title: '', subtitle: '', image: '', imagePosition: '50% 50%',
    contentSections: [emptySection()],
    gallery: [{ label: '', caption: '', imageUrl: '' }],
    tags: [],
    recommendations: [],
    status: 'Draft',
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    getLearnSections().then(setSections).finally(() => setLoading(false));
  }, []);

  const openNew = () => {
    setEditingSlug('__new__');
    setForm({
      slug: '', title: '', subtitle: '', image: '', imagePosition: '50% 50%',
      contentSections: [emptySection()],
      gallery: [{ label: '', caption: '', imageUrl: '' }],
      tags: [],
      recommendations: [],
      status: 'Draft',
    });
    setTagInput('');
  };

  const openEdit = (section) => {
    setEditingSlug(section.slug);
    // Convert old format to sections if needed
    let contentSections = section.sections?.length
      ? section.sections.map((s) => ({
          layout: s.layout || 'text-only',
          heading: s.heading || '',
          imageUrl: s.imageUrl || '',
          text: s.text || '',
        }))
      : [emptySection()];

    // If there's old body/details, add them as text-only sections
    if ((!section.sections || !section.sections.length) && (section.body || section.details?.length)) {
      contentSections = [];
      if (section.body) {
        contentSections.push({ layout: 'text-only', heading: '', imageUrl: '', text: section.body });
      }
      if (section.details?.length) {
        section.details.forEach((para) => {
          contentSections.push({ layout: 'text-only', heading: '', imageUrl: '', text: para });
        });
      }
    }

    const existingGallery = section.gallery && section.gallery.length > 0
      ? section.gallery.map((g) => ({ label: g.label || '', caption: g.caption || '', imageUrl: g.imageUrl || '' }))
      : [{ label: '', caption: '', imageUrl: '' }];

    setForm({
      slug: section.slug,
      title: section.title,
      subtitle: section.subtitle || '',
      image: section.image || '',
      imagePosition: section.imagePosition || '50% 50%',
      contentSections,
      gallery: existingGallery,
      tags: section.tags || [],
      recommendations: section.recommendations || [],
      status: section.status,
    });
    setTagInput('');
  };

  const cancelEdit = () => setEditingSlug(null);

  const updateSection = (index, field, value) => {
    const updated = [...form.contentSections];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, contentSections: updated });
  };

  const addSection = () => {
    setForm({ ...form, contentSections: [...form.contentSections, emptySection()] });
  };

  const removeSection = (index) => {
    if (form.contentSections.length <= 1) return;
    setForm({ ...form, contentSections: form.contentSections.filter((_, i) => i !== index) });
  };

  const moveSection = (index, direction) => {
    const items = [...form.contentSections];
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    setForm({ ...form, contentSections: items });
  };

  const addTag = (tag) => {
    const t = tag.trim().toLowerCase();
    if (t && !form.tags.includes(t)) {
      setForm({ ...form, tags: [...form.tags, t] });
    }
    setTagInput('');
  };

  const removeTag = (tag) => {
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const save = async () => {
    if (!form.title.trim()) return;
    const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Clean up empty text sections
    const sections = form.contentSections.filter((s) => s.text.trim() || s.layout !== 'text-only');

    const section = {
      slug,
      title: form.title,
      subtitle: form.subtitle,
      image: form.image,
      imagePosition: form.imagePosition,
      body: '',  // Clear old fields
      details: [],
      sections,
      gallery: form.gallery.filter((g) => g.imageUrl?.trim()),
      tags: form.tags,
      recommendations: form.recommendations.filter((r) => r.title?.trim() && r.url?.trim()),
      status: form.status,
    };

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
            </div>
            {form.image && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <ImagePositionPicker
                  imageUrl={form.image}
                  value={form.imagePosition}
                  onChange={(pos) => setForm({ ...form, imagePosition: pos })}
                  aspectRatio="21/9"
                  maxHeight={480}
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" style={{ width: 200 }} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option>Draft</option>
                <option>Published</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">SEO Tags <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 400 }}>(hidden — used in structured data)</span></label>
              <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
                {form.tags.map((t) => (
                  <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, background: 'var(--accent-light)', fontSize: 'var(--fs-xs)', fontWeight: 500 }}>
                    {t}
                    <button type="button" onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                <input
                  className="form-input"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Type a tag and press Enter..."
                  style={{ flex: 1, maxWidth: 300, fontSize: 'var(--fs-sm)' }}
                />
                <button type="button" className="btn btn-outline" style={{ fontSize: 'var(--fs-xs)' }} onClick={() => addTag(tagInput)}>Add</button>
              </div>
            </div>
          </div>

          {/* ── Section Editor ── */}
          <div className="form-group" style={{ marginTop: 'var(--sp-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
              <label className="form-label" style={{ marginBottom: 0, fontSize: 'var(--fs-md)' }}>Content Sections</label>
              <button className="btn btn-primary" type="button" onClick={addSection} style={{ fontSize: 'var(--fs-xs)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Add Section
              </button>
            </div>

            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 'var(--sp-3)' }}>
              Each section is a separate content block. Choose a layout, add an image (optional), and write your text. Supports <strong>**bold**</strong>.
            </p>

            {form.contentSections.map((section, i) => (
              <div key={i} style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--sp-4)',
                marginBottom: 'var(--sp-3)',
                background: 'var(--surface-2)',
                position: 'relative',
              }}>
                {/* Section header with reorder buttons */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--sp-3)',
                  paddingBottom: 'var(--sp-2)',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: '#071009',
                      fontWeight: 700,
                      fontSize: 'var(--fs-xs)',
                    }}>{i + 1}</span>
                    <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', color: 'var(--text)' }}>
                      {LAYOUT_OPTIONS.find((o) => o.value === section.layout)?.label || 'Section'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--sp-1)' }}>
                    <button type="button" onClick={() => moveSection(i, -1)} disabled={i === 0}
                      style={{ padding: 'var(--sp-1) var(--sp-2)', borderRadius: 4, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', opacity: i === 0 ? 0.3 : 1, fontSize: 'var(--fs-xs)' }}>
                      ↑
                    </button>
                    <button type="button" onClick={() => moveSection(i, 1)} disabled={i === form.contentSections.length - 1}
                      style={{ padding: 'var(--sp-1) var(--sp-2)', borderRadius: 4, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', opacity: i === form.contentSections.length - 1 ? 0.3 : 1, fontSize: 'var(--fs-xs)' }}>
                      ↓
                    </button>
                    <button type="button" onClick={() => removeSection(i)}
                      style={{ padding: 'var(--sp-1) var(--sp-2)', borderRadius: 4, cursor: 'pointer', background: 'transparent', border: '1px solid transparent', color: 'var(--error)', fontSize: 'var(--fs-xs)' }}>
                      ✕ Remove
                    </button>
                  </div>
                </div>

                {/* Heading */}
                <div className="form-group" style={{ marginBottom: 'var(--sp-3)' }}>
                  <label className="form-label" style={{ fontSize: 'var(--fs-xs)' }}>Heading</label>
                  <input
                    className="form-input"
                    value={section.heading}
                    onChange={(e) => updateSection(i, 'heading', e.target.value)}
                    placeholder="Optional paragraph heading..."
                    style={{ fontWeight: 600 }}
                  />
                </div>

                {/* Layout picker */}
                <div className="form-group" style={{ marginBottom: 'var(--sp-3)' }}>
                  <label className="form-label" style={{ fontSize: 'var(--fs-xs)' }}>Layout</label>
                  <select className="form-input" value={section.layout} onChange={(e) => updateSection(i, 'layout', e.target.value)} style={{ width: '100%' }}>
                    {LAYOUT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Image URL - only for image-left and image-center */}
                {section.layout !== 'text-only' && (
                  <div className="form-group" style={{ marginBottom: 'var(--sp-3)' }}>
                    <label className="form-label" style={{ fontSize: 'var(--fs-xs)' }}>Image URL</label>
                    <input
                      className="form-input"
                      value={section.imageUrl}
                      onChange={(e) => updateSection(i, 'imageUrl', e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                    {section.imageUrl && (
                      <div style={{ marginTop: 'var(--sp-2)', maxHeight: 100, overflow: 'hidden', borderRadius: 'var(--radius-sm)' }}>
                        <img src={section.imageUrl} alt="" style={{ width: 'auto', maxHeight: 100, objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none' }} />
                      </div>
                    )}
                  </div>
                )}

                {/* Text content */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 'var(--fs-xs)' }}>Text Content</label>
                  <textarea
                    className="form-input"
                    rows={6}
                    value={section.text}
                    onChange={(e) => updateSection(i, 'text', e.target.value)}
                    placeholder="Write your content here... **bold** for emphasis"
                    style={{ fontFamily: 'monospace', fontSize: 'var(--fs-sm)', lineHeight: 1.6 }}
                  />
                </div>

                {/* Live preview of the layout */}
                {section.layout !== 'text-only' && section.imageUrl && (
                  <div style={{
                    marginTop: 'var(--sp-2)',
                    padding: 'var(--sp-3)',
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--border)',
                    fontSize: 'var(--fs-xs)',
                    color: 'var(--text-muted)',
                  }}>
                    <strong>Preview:</strong>{' '}
                    {section.layout === 'image-left' ? '🖼 Image on left, text on right' : '📷 Title + image centered, text below'}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Gallery section ── */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Gallery Images (shown at bottom of article)</label>
              <button className="btn btn-outline" type="button" onClick={() => setForm({ ...form, gallery: [...form.gallery, { label: '', caption: '', imageUrl: '' }] })} style={{ fontSize: 'var(--fs-xs)' }}>
                + Add Image
              </button>
            </div>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}>
              Optional bottom gallery. For inline images inside sections, use the Image URL field in each section above.
            </p>
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

          {/* ── Recommendations ── */}
          <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: 'var(--sp-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Recommended Guides <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 400 }}>(shown at the bottom of the guide)</span></label>
              <button className="btn btn-outline" type="button" onClick={() => setForm({ ...form, recommendations: [...form.recommendations, { title: '', reason: '', imageUrl: '', url: '', type: 'learn' }] })} style={{ fontSize: 'var(--fs-xs)' }}>
                + Add Recommendation
              </button>
            </div>
            {form.recommendations.length === 0 && (
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}>
                No recommendations yet. Add links to related guides, news articles, or external pages.
              </p>
            )}
            {form.recommendations.map((rec, i) => (
              <div key={i} style={{
                border: '1px solid var(--card-border)',
                borderRadius: 8,
                padding: 'var(--sp-3)',
                marginBottom: 'var(--sp-2)',
                background: 'var(--bg)',
              }}>
                <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-muted)', width: 20 }}>#{i + 1}</span>
                  <select className="form-input" value={rec.type || 'learn'} onChange={(e) => {
                    const r = [...form.recommendations]; r[i] = { ...r[i], type: e.target.value }; setForm({ ...form, recommendations: r });
                  }} style={{ width: 130, fontSize: 'var(--fs-xs)' }}>
                    <option value="learn">Learn Guide</option>
                    <option value="news">News Article</option>
                    <option value="external">External Link</option>
                  </select>
                  <button className="btn btn-outline" type="button" onClick={() => {
                    setForm({ ...form, recommendations: form.recommendations.filter((_, idx) => idx !== i) });
                  }} style={{ flexShrink: 0, color: 'var(--error)', borderColor: 'transparent', fontSize: 'var(--fs-sm)', marginLeft: 'auto' }}>✕ Remove</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)' }}>
                  <input className="form-input" value={rec.title} onChange={(e) => {
                    const r = [...form.recommendations]; r[i] = { ...r[i], title: e.target.value }; setForm({ ...form, recommendations: r });
                  }} placeholder="Guide / page title" style={{ fontSize: 'var(--fs-sm)' }} />
                  <input className="form-input" value={rec.url} onChange={(e) => {
                    const r = [...form.recommendations]; r[i] = { ...r[i], url: e.target.value }; setForm({ ...form, recommendations: r });
                  }} placeholder={rec.type === 'external' ? 'https://...' : '/learn/some-guide or /news/some-article'} style={{ fontSize: 'var(--fs-sm)' }} />
                  <input className="form-input" value={rec.reason} onChange={(e) => {
                    const r = [...form.recommendations]; r[i] = { ...r[i], reason: e.target.value }; setForm({ ...form, recommendations: r });
                  }} placeholder="Why should they read this? (e.g. 'Deep dive into technique')" style={{ fontSize: 'var(--fs-sm)' }} />
                  <input className="form-input" value={rec.imageUrl} onChange={(e) => {
                    const r = [...form.recommendations]; r[i] = { ...r[i], imageUrl: e.target.value }; setForm({ ...form, recommendations: r });
                  }} placeholder="Image URL (optional)" style={{ fontSize: 'var(--fs-sm)' }} />
                </div>
                {rec.imageUrl && (
                  <div style={{ marginTop: 'var(--sp-1)', maxHeight: 60, overflow: 'hidden', borderRadius: 4 }}>
                    <img src={rec.imageUrl} alt="" style={{ width: 'auto', maxHeight: 60, objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none' }} />
                  </div>
                )}
              </div>
            ))}
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
