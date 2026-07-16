import { useRef, useState, useEffect } from 'react';
import { getNews, createNews, updateNews, deleteNews } from '../api';

const tagOptions = ['Competitions', 'Announcements', 'Athletes'];

// ── Formatting toolbar helpers ──
function insertFormat(textarea, before, after = '') {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end);
  const replacement = `${before}${selected || 'text'}${after}`;
  const newVal = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
  return { newVal, cursorPos: start + before.length + (selected ? selected.length : 4) + after.length };
}

export default function LatestNews() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSlug, setEditingSlug] = useState(null);
  const [editForm, setEditForm] = useState({
    slug: '', title: '', tag: 'Competitions', date: '', excerpt: '', imageUrl: '',
    content: '', // single textarea — blank lines = new paragraphs
    status: 'Draft',
  });
  const bodyRef = useRef(null);

  useEffect(() => {
    getNews().then(setArticles).finally(() => setLoading(false));
  }, []);

  const openNew = () => {
    setEditingSlug('__new__');
    setEditForm({
      slug: '', title: '', tag: 'Competitions', date: new Date().toISOString().slice(0, 10),
      excerpt: '', imageUrl: '', content: '', status: 'Draft',
    });
  };

  const openEdit = (article) => {
    setEditingSlug(article.slug);
    // Merge body array into a single text (blank lines = paragraph breaks)
    const merged = (article.body || ['']).join('\n\n');
    setEditForm({
      slug: article.slug,
      title: article.title,
      tag: article.tag,
      date: article.date,
      excerpt: article.excerpt || '',
      imageUrl: article.imageUrl || '',
      content: merged,
      status: article.status,
    });
  };

  const cancelEdit = () => setEditingSlug(null);

  const saveArticle = async () => {
    if (!editForm.title.trim()) return;
    const slug = editForm.slug || editForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    // Split content by blank lines into body array
    const body = editForm.content.split(/\n{2,}/).filter((p) => p.trim());

    const article = {
      slug,
      title: editForm.title,
      tag: editForm.tag,
      date: editForm.date,
      excerpt: editForm.excerpt,
      imageUrl: editForm.imageUrl,
      body,
      status: editForm.status,
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

  const handleFormat = (type) => {
    const textarea = bodyRef.current;
    if (!textarea) return;
    let result;
    switch (type) {
      case 'bold':
        result = insertFormat(textarea, '**', '**');
        break;
      case 'size1':
        result = insertFormat(textarea, '[s1]', '[/s1]');
        break;
      case 'size2':
        result = insertFormat(textarea, '[s2]', '[/s2]');
        break;
      case 'size3':
        result = insertFormat(textarea, '[s3]', '[/s3]');
        break;
      case 'size4':
        result = insertFormat(textarea, '[s4]', '[/s4]');
        break;
      case 'image':
        result = insertFormat(textarea, '![caption](', ')');
        break;
      default:
        return;
    }
    setEditForm({ ...editForm, content: result.newVal });
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.cursorPos, result.cursorPos);
    });
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
              <textarea className="form-input" rows={4} value={editForm.excerpt} onChange={(e) => setEditForm({ ...editForm, excerpt: e.target.value })} placeholder="Short preview shown on the news cards. Supports **bold**." />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Status</label>
              <select className="form-input" style={{ width: 200 }} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option>Draft</option>
                <option>Published</option>
              </select>
            </div>
          </div>

          {/* ── Unified editor with formatting toolbar ── */}
          <div className="form-group" style={{ marginTop: 'var(--sp-4)' }}>
            <label className="form-label" style={{ marginBottom: 'var(--sp-2)' }}>Article Body</label>

            {/* Formatting toolbar */}
            <div style={{
              display: 'flex',
              gap: 'var(--sp-1)',
              marginBottom: 'var(--sp-2)',
              padding: 'var(--sp-2) var(--sp-3)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              borderBottom: 0,
              flexWrap: 'wrap',
            }}>
              <button type="button" onClick={() => handleFormat('bold')} title="Bold"
                style={{ padding: 'var(--sp-1) var(--sp-2)', borderRadius: 4, fontWeight: 700, fontSize: 'var(--fs-sm)', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }}>
                <strong>B</strong>
              </button>
              <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 var(--sp-1)' }} />
              <button type="button" onClick={() => handleFormat('size1')} title="Font size 1 - small"
                style={{ padding: 'var(--sp-1) var(--sp-2)', borderRadius: 4, fontWeight: 600, fontSize: '0.625rem', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }}>
                S
              </button>
              <button type="button" onClick={() => handleFormat('size2')} title="Font size 2 - normal"
                style={{ padding: 'var(--sp-1) var(--sp-2)', borderRadius: 4, fontWeight: 600, fontSize: 'var(--fs-sm)', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }}>
                M
              </button>
              <button type="button" onClick={() => handleFormat('size3')} title="Font size 3 - large"
                style={{ padding: 'var(--sp-1) var(--sp-2)', borderRadius: 4, fontWeight: 600, fontSize: 'var(--fs-md)', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }}>
                L
              </button>
              <button type="button" onClick={() => handleFormat('size4')} title="Font size 4 - extra large"
                style={{ padding: 'var(--sp-1) var(--sp-2)', borderRadius: 4, fontWeight: 600, fontSize: 'var(--fs-lg)', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }}>
                XL
              </button>
              <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 var(--sp-1)' }} />
              <button type="button" onClick={() => handleFormat('image')} title="Insert image"
                style={{ padding: 'var(--sp-1) var(--sp-2)', borderRadius: 4, fontSize: 'var(--fs-sm)', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }}>
                🖼 Image
              </button>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', alignSelf: 'center' }}>
                Blank lines = new paragraphs
              </span>
            </div>

            <textarea
              ref={bodyRef}
              className="form-input"
              rows={20}
              value={editForm.content}
              onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
              placeholder={`Write your article here...

Use **bold** for emphasis
Use [s3]text[/s3] for larger text, [s4]text[/s4] for headings
Use ![caption](image-url) for inline images

Blank lines separate paragraphs.`}
              style={{
                fontFamily: 'monospace',
                fontSize: 'var(--fs-sm)',
                lineHeight: 1.7,
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
              }}
            />
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 'var(--sp-1)' }}>
              <strong>Formatting guide:</strong> {' '}
              <code>**bold**</code> — bold &nbsp;|&nbsp;
              <code>[s1]text[/s1]</code> to <code>[s4]text[/s4]</code> — font size 1 to 4 &nbsp;|&nbsp;
              <code>![caption](url)</code> — inline image &nbsp;|&nbsp;
              Blank line = new paragraph
            </p>
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
