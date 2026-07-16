import { useState, useEffect } from 'react';
import { getNews, createNews, updateNews, deleteNews } from '../api';

const tagOptions = ['Competitions', 'Announcements', 'Athletes'];

const LAYOUT_OPTIONS = [
  { value: 'image-left', label: 'Image Left + Text Right' },
  { value: 'image-center', label: 'Title & Image Center + Text Below' },
  { value: 'text-only', label: 'Text Only' },
];

function emptySection() {
  return { layout: 'text-only', heading: '', imageUrl: '', text: '' };
}

export default function LatestNews() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSlug, setEditingSlug] = useState(null);
  const [form, setForm] = useState({
    slug: '', title: '', tag: 'Competitions', date: '', excerpt: '', imageUrl: '',
    contentSections: [emptySection()],
    status: 'Draft',
  });

  useEffect(() => {
    getNews().then(setArticles).finally(() => setLoading(false));
  }, []);

  const openNew = () => {
    setEditingSlug('__new__');
    setForm({
      slug: '', title: '', tag: 'Competitions', date: new Date().toISOString().slice(0, 10),
      excerpt: '', imageUrl: '',
      contentSections: [emptySection()],
      status: 'Draft',
    });
  };

  const openEdit = (article) => {
    setEditingSlug(article.slug);

    // Convert old body array to sections if needed
    let contentSections = article.sections?.length
      ? article.sections.map((s) => ({
          layout: s.layout || 'text-only',
          heading: s.heading || '',
          imageUrl: s.imageUrl || '',
          text: s.text || '',
        }))
      : [emptySection()];

    // If old body format exists and no sections, convert body paragraphs to text-only sections
    if ((!article.sections || !article.sections.length) && article.body?.length) {
      contentSections = article.body.map((para) => ({
        layout: 'text-only',
        heading: '',
        imageUrl: '',
        text: para,
      }));
    }

    setForm({
      slug: article.slug,
      title: article.title,
      tag: article.tag,
      date: article.date,
      excerpt: article.excerpt || '',
      imageUrl: article.imageUrl || '',
      contentSections,
      status: article.status,
    });
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

  const saveArticle = async () => {
    if (!form.title.trim()) return;
    const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Clean up empty text sections
    const sections = form.contentSections.filter((s) => s.text.trim() || s.layout !== 'text-only');

    const article = {
      slug,
      title: form.title,
      tag: form.tag,
      date: form.date,
      excerpt: form.excerpt,
      imageUrl: form.imageUrl,
      body: sections.map((s) => s.text),  // Keep body array for backward compat
      sections,
      status: form.status,
    };

    try {
      if (editingSlug === '__new__') {
        await createNews(article);
      } else {
        await updateNews(editingSlug, article);
      }
      const updated = await getNews();
      setArticles(updated);
      setEditingSlug(null);
    } catch (err) {
      alert('Failed to save article: ' + err.message);
    }
  };

  const handleDelete = async (slug) => {
    if (!confirm('Delete this article?')) return;
    try {
      await deleteNews(slug);
      setArticles(articles.filter((a) => a.slug !== slug));
      if (editingSlug === slug) setEditingSlug(null);
    } catch (err) {
      alert('Failed to delete article: ' + err.message);
    }
  };

  if (loading) return <p style={{ padding: 'var(--sp-6)' }}>Loading articles...</p>;

  return (
    <>
      <div className="page-header">
        <h1>Latest News</h1>
        <p>Manage news articles published on the platform.</p>
      </div>

      <div style={{ marginBottom: 'var(--sp-6)', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" type="button" onClick={openNew}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New Article
        </button>
      </div>

      {editingSlug !== null && (
        <div className="card" style={{ marginBottom: 'var(--sp-6)' }}>
          <div className="card-header">
            <h3 className="card-title">{editingSlug === '__new__' ? 'New Article' : 'Edit Article'}</h3>
            <button className="btn btn-outline" type="button" onClick={cancelEdit}>Cancel</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Article title" />
            </div>
            <div className="form-group">
              <label className="form-label">Slug</label>
              <input className="form-input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated if empty" />
            </div>
            <div className="form-group">
              <label className="form-label">Tag</label>
              <select className="form-input" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })}>
                {tagOptions.map((t) => (<option key={t}>{t}</option>))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Featured Image URL</label>
              <input className="form-input" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://example.com/news-image.jpg" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Excerpt</label>
              <textarea className="form-input" rows={4} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Short preview shown on the news cards. Supports **bold**." />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" style={{ width: 200 }} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option>Draft</option>
                <option>Published</option>
              </select>
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
              Each section is a separate content block. Choose a layout, add a heading, an image (optional), and write your text. Supports <strong>**bold**</strong>.
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

                {/* Live preview hint */}
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

          <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
            <button className="btn btn-primary" type="button" onClick={saveArticle}>Save Article</button>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Tag</th>
              <th>Date</th>
              <th>Status</th>
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <tr key={article.slug}>
                <td style={{ fontWeight: 500 }}>{article.title}</td>
                <td><span className="badge badge-info">{article.tag}</span></td>
                <td>{new Date(article.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td><span className={article.status === 'Published' ? 'badge badge-success' : 'badge badge-warning'}>{article.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                    <button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)' }} onClick={() => openEdit(article)}>Edit</button>
                    <button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)', color: 'var(--error)' }} onClick={() => handleDelete(article.slug)}>Delete</button>
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
