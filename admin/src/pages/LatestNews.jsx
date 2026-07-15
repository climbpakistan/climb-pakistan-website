import { useState, useEffect } from 'react';
import { getNews, createNews, updateNews, deleteNews } from '../api';

const tagOptions = ['Competitions', 'Announcements', 'Athletes'];

export default function LatestNews() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSlug, setEditingSlug] = useState(null);
  const [editForm, setEditForm] = useState({ slug: '', title: '', tag: 'Competitions', date: '', excerpt: '', imageUrl: '', body: [''], status: 'Draft' });

  useEffect(() => {
    getNews().then(setArticles).finally(() => setLoading(false));
  }, []);

  const openNew = () => {
    setEditingSlug('__new__');
    setEditForm({ slug: '', title: '', tag: 'Competitions', date: new Date().toISOString().slice(0, 10), excerpt: '', imageUrl: '', body: [''], status: 'Draft' });
  };

  const openEdit = (article) => {
    setEditingSlug(article.slug);
    setEditForm({ ...article, body: article.body?.length ? article.body : [''] });
  };

  const cancelEdit = () => setEditingSlug(null);

  const updateBody = (index, value) => {
    const newBody = [...editForm.body];
    newBody[index] = value;
    setEditForm({ ...editForm, body: newBody });
  };

  const addBodyParagraph = () => setEditForm({ ...editForm, body: [...editForm.body, ''] });
  const removeBodyParagraph = (index) => {
    if (editForm.body.length <= 1) return;
    setEditForm({ ...editForm, body: editForm.body.filter((_, i) => i !== index) });
  };

  const saveArticle = async () => {
    if (!editForm.title.trim()) return;
    const slug = editForm.slug || editForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const article = { ...editForm, slug, body: editForm.body.filter((p) => p.trim()) };

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
              <input className="form-input" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Article title" />
            </div>
            <div className="form-group">
              <label className="form-label">Slug</label>
              <input className="form-input" value={editForm.slug} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })} placeholder="auto-generated if empty" />
            </div>
            <div className="form-group">
              <label className="form-label">Tag</label>
              <select className="form-input" value={editForm.tag} onChange={(e) => setEditForm({ ...editForm, tag: e.target.value })}>
                {tagOptions.map((t) => (<option key={t}>{t}</option>))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Featured Image URL</label>
              <input className="form-input" value={editForm.imageUrl} onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} placeholder="https://example.com/news-image.jpg" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Excerpt</label>
              <textarea className="form-input" rows={6} value={editForm.excerpt} onChange={(e) => setEditForm({ ...editForm, excerpt: e.target.value })} placeholder="Short preview shown on the news cards. Use **bold** for emphasis." />
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 'var(--sp-1)' }}>
                Supports **bold** text. This appears as the preview text on the news listing page.
              </p>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Status</label>
              <select className="form-input" style={{ width: 200 }} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option>Draft</option>
                <option>Published</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Body Paragraphs</label>
              <button className="btn btn-outline" type="button" onClick={addBodyParagraph} style={{ fontSize: 'var(--fs-xs)' }}>+ Add Paragraph</button>
            </div>
            {editForm.body.map((para, i) => (
              <div key={i} style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
                <textarea className="form-input" rows={10} value={para} onChange={(e) => updateBody(i, e.target.value)} placeholder={`Paragraph ${i + 1} — use **bold** for emphasis, Enter for line breaks`} />
                <button className="btn btn-outline" type="button" onClick={() => removeBodyParagraph(i)} style={{ flexShrink: 0, color: 'var(--error)', borderColor: 'transparent' }} title="Remove paragraph">✕</button>
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
