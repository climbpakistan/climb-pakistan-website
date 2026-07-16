import { useRef, useState, useEffect } from 'react';
import { getLearnSections, createLearnSection, updateLearnSection, deleteLearnSection } from '../api';

// ── Formatting toolbar helpers ──
function insertFormat(textarea, before, after = '') {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end);
  const replacement = `${before}${selected || 'text'}${after}`;
  const newVal = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
  return { newVal, cursorPos: start + before.length + (selected ? selected.length : 4) + after.length };
}

export default function LearnClimbing() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSlug, setEditingSlug] = useState(null);
  const [form, setForm] = useState({
    slug: '', title: '', subtitle: '', image: '',
    content: '',
    gallery: [{ label: '', caption: '', imageUrl: '' }],
    status: 'Draft',
  });
  const bodyRef = useRef(null);

  useEffect(() => {
    getLearnSections().then(setSections).finally(() => setLoading(false));
  }, []);

  const openNew = () => {
    setEditingSlug('__new__');
    setForm({
      slug: '', title: '', subtitle: '', image: '',
      content: '',
      gallery: [{ label: '', caption: '', imageUrl: '' }],
      status: 'Draft',
    });
  };

  const openEdit = (section) => {
    setEditingSlug(section.slug);
    // Merge body (intro) + details into one content string
    const bodyText = section.body || '';
    const detailsText = section.details?.length ? section.details.join('\n\n') : '';
    const merged = detailsText ? bodyText + '\n\n' + detailsText : bodyText;

    const existingGallery = section.gallery && section.gallery.length > 0
      ? section.gallery.map((g) => ({ label: g.label || '', caption: g.caption || '', imageUrl: g.imageUrl || '' }))
      : [{ label: '', caption: '', imageUrl: '' }];

    setForm({
      ...section,
      content: merged,
      gallery: existingGallery,
    });
  };

  const cancelEdit = () => setEditingSlug(null);

  const save = async () => {
    if (!form.title.trim()) return;
    const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Store everything in `body`, clear `details` for the new format
    const section = {
      slug,
      title: form.title,
      subtitle: form.subtitle,
      image: form.image,
      body: form.content,
      details: [],
      gallery: form.gallery.filter((g) => g.imageUrl?.trim()),
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
  setForm({ ...form, content: result.newVal });
  // Restore cursor position after React re-render
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(result.cursorPos, result.cursorPos);
  });
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
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" style={{ width: 200 }} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option>Draft</option>
                <option>Published</option>
              </select>
            </div>
          </div>

          {/* ── Unified editor with formatting toolbar ── */}
          <div className="form-group" style={{ marginTop: 'var(--sp-4)' }}>
            <label className="form-label" style={{ marginBottom: 'var(--sp-2)' }}>Article Content</label>

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
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder={`Write your article here...

Use # Heading for large titles
Use ## Subheading for medium titles
Use **bold** for emphasis
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
              <code>[s1]text[/s1]</code> to <code>[s4]text[/s4]</code> — font size 1 (small) to 4 (extra large) &nbsp;|&nbsp;
              <code>![caption](url)</code> — inline image &nbsp;|&nbsp;
              Blank line = new paragraph
            </p>
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
              Optional — for inline images inside the article text, use <code>![caption](url)</code> in the content editor above.
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
