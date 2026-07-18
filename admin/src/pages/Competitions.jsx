import { useState, useEffect, useMemo } from 'react';
import { getCompetitions, createCompetition, updateCompetition, deleteCompetition, getNews } from '../api';

const disciplineOpts = ['Speed', 'Lead', 'Boulder'];
const statusOpts = ['Completed', 'Upcoming', 'Ongoing'];
const genders = ['Men', 'Women'];

// Normalize legacy string-format images to { url, title } objects
function normalizeImage(img) {
  return typeof img === 'string' ? { url: img, title: '' } : { url: img.url || '', title: img.title || '' };
}

function emptyResults() {
  return { Speed: { Men: [], Women: [] }, Lead: { Men: [], Women: [] }, Boulder: { Men: [], Women: [] } };
}

export default function Competitions() {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSlug, setEditingSlug] = useState(null);
  const [form, setForm] = useState({ slug: '', name: '', location: '', startDate: '', endDate: '', status: 'Upcoming', disciplines: [], overview: '', imageUrl: '', images: [{ url: '', title: '' }], newsSlugs: [], tags: [], results: emptyResults() });
  const [tagInput, setTagInput] = useState('');
  const [resultTabDisc, setResultTabDisc] = useState('Speed');
  const [resultTabGender, setResultTabGender] = useState('Men');
  const [editingResultIdx, setEditingResultIdx] = useState(null);
  const [resultEditRow, setResultEditRow] = useState({ name: '', team: '', mark: '' });
  const [yearFilter, setYearFilter] = useState('all');
  const [allNews, setAllNews] = useState([]);

  useEffect(() => {
    getCompetitions().then(setCompetitions).finally(() => setLoading(false));
    getNews().then(setAllNews).catch(() => {});
  }, []);

  // Auto-generate year options from competition data
  const yearOptions = useMemo(() => {
    const years = new Set();
    competitions.forEach((c) => {
      if (c.startDate) {
        const y = new Date(c.startDate).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
    });
    return ['all', ...Array.from(years).sort((a, b) => b - a)];
  }, [competitions]);

  // Filter competitions by selected year
  const filteredCompetitions = useMemo(() => {
    if (yearFilter === 'all') return competitions;
    return competitions.filter((c) => {
      if (!c.startDate) return false;
      return new Date(c.startDate).getFullYear() === Number(yearFilter);
    });
  }, [competitions, yearFilter]);

  const openNew = () => {
    setEditingSlug('__new__');
    setForm({ slug: '', name: '', location: '', startDate: '', endDate: '', status: 'Upcoming', disciplines: [], overview: '', imageUrl: '', images: [{ url: '', title: '' }], newsSlugs: [], tags: [], results: emptyResults() });
    setTagInput('');
    setResultTabDisc('Speed');
    setResultTabGender('Men');
    setEditingResultIdx(null);
  };

  const openEdit = (comp) => {
    setEditingSlug(comp.slug);
    setForm({
      ...comp,
      images: comp.images?.length > 0 ? comp.images.map(normalizeImage) : [{ url: '', title: '' }],
      tags: comp.tags || [],
      results: comp.results || emptyResults(),
    });
    setTagInput('');
    const firstDisc = comp.disciplines?.[0] || 'Speed';
    setResultTabDisc(firstDisc);
    setResultTabGender('Men');
    setEditingResultIdx(null);
  };

  const cancelEdit = () => setEditingSlug(null);

  const toggleDisc = (d) => {
    setForm((f) => ({
      ...f,
      disciplines: f.disciplines.includes(d)
        ? f.disciplines.filter((x) => x !== d)
        : [...f.disciplines, d],
    }));
  };

  useEffect(() => {
    const checked = form.disciplines;
    if (checked.length > 0 && !checked.includes(resultTabDisc)) {
      setResultTabDisc(checked[0]);
    }
  }, [form.disciplines, resultTabDisc]);

  const markLabel = resultTabDisc === 'Speed' ? 'Time' : 'Points';
  const markPlaceholder = resultTabDisc === 'Speed' ? 'e.g. 5.91s' : resultTabDisc === 'Lead' ? 'e.g. Top' : 'e.g. 4 tops';

  const getResultEntries = () => form.results?.[resultTabDisc]?.[resultTabGender] || [];

  const addResultEntry = () => {
    const entries = getResultEntries();
    const newEntry = { rank: entries.length + 1, name: '', team: '', mark: '' };
    const updated = { ...form };
    updated.results[resultTabDisc][resultTabGender] = [...entries, newEntry];
    setForm(updated);
    setEditingResultIdx(entries.length);
    setResultEditRow(newEntry);
  };

  const startEditResult = (idx) => {
    setEditingResultIdx(idx);
    setResultEditRow({ ...getResultEntries()[idx] });
  };

  const saveResultEdit = () => {
    const entries = [...getResultEntries()];
    entries[editingResultIdx] = { ...resultEditRow, rank: editingResultIdx + 1 };
    const updated = { ...form };
    updated.results[resultTabDisc][resultTabGender] = entries;
    setForm(updated);
    setEditingResultIdx(null);
  };

  const deleteResultEntry = (idx) => {
    if (!confirm('Delete this entry?')) return;
    const entries = getResultEntries().filter((_, i) => i !== idx).map((e, i) => ({ ...e, rank: i + 1 }));
    const updated = { ...form };
    updated.results[resultTabDisc][resultTabGender] = entries;
    setForm(updated);
    if (editingResultIdx === idx) setEditingResultIdx(null);
  };

  // ── Image Links handlers ──
  const addImageField = () => {
    setForm((f) => ({ ...f, images: [...f.images, { url: '', title: '' }] }));
  };

  const updateImageUrl = (idx, value) => {
    setForm((f) => {
      const updated = f.images.map((img, i) =>
        i === idx ? { ...normalizeImage(img), url: value } : img
      );
      return { ...f, images: updated };
    });
  };

  const updateImageTitle = (idx, value) => {
    setForm((f) => {
      const updated = f.images.map((img, i) =>
        i === idx ? { ...normalizeImage(img), title: value } : img
      );
      return { ...f, images: updated };
    });
  };

  const removeImageField = (idx) => {
    setForm((f) => ({
      ...f,
      images: f.images.filter((_, i) => i !== idx),
    }));
  };

  const toggleNewsSlug = (slug) => {
    setForm((f) => ({
      ...f,
      newsSlugs: f.newsSlugs.includes(slug)
        ? f.newsSlugs.filter((s) => s !== slug)
        : [...f.newsSlugs, slug],
    }));
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
    if (!form.name.trim()) return;
    const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const comp = {
      ...form,
      slug,
      tags: form.tags,
      images: form.images.filter((img) => (typeof img === 'string' ? img : img.url).trim() !== '').map(normalizeImage),
    };

    try {
      if (editingSlug === '__new__') {
        await createCompetition(comp);
      } else {
        await updateCompetition(editingSlug, comp);
      }
      const updated = await getCompetitions();
      setCompetitions(updated);
      setEditingSlug(null);
    } catch (err) {
      alert('Failed to save competition: ' + err.message);
    }
  };

  const handleDelete = async (slug) => {
    if (!confirm('Delete this competition?')) return;
    try {
      await deleteCompetition(slug);
      setCompetitions(competitions.filter((c) => c.slug !== slug));
      if (editingSlug === slug) setEditingSlug(null);
    } catch (err) {
      alert('Failed to delete competition: ' + err.message);
    }
  };

  if (loading) return <p style={{ padding: 'var(--sp-6)' }}>Loading competitions...</p>;

  return (
    <>
      <div className="page-header">
        <h1>Competitions</h1>
        <p>Manage competitions, results, and gallery content.</p>
      </div>

      <div style={{ marginBottom: 'var(--sp-6)', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" type="button" onClick={openNew}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Competition
        </button>
      </div>

      {editingSlug !== null && (
        <div className="card" style={{ marginBottom: 'var(--sp-6)' }}>
          <div className="card-header">
            <h3 className="card-title">{editingSlug === '__new__' ? 'New Competition' : 'Edit Competition'}</h3>
            <button className="btn btn-outline" type="button" onClick={cancelEdit}>Cancel</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Slug</label>
              <input className="form-input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Location</label>
              <input className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input className="form-input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input className="form-input" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {statusOpts.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Disciplines</label>
              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                {disciplineOpts.map((d) => (
                  <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-1)', cursor: 'pointer', padding: 'var(--sp-1) var(--sp-2)', borderRadius: 6, background: form.disciplines.includes(d) ? 'var(--accent-light)' : 'transparent' }}>
                    <input type="checkbox" checked={form.disciplines.includes(d)} onChange={() => toggleDisc(d)} style={{ accentColor: 'var(--accent)' }} />
                    <span style={{ fontSize: 'var(--fs-sm)' }}>{d}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Featured Image URL</label>
              <input className="form-input" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://example.com/competition-photo.jpg" />
            </div>
            {/* Image Gallery Section */}
            <div className="form-group" style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--card-border)', paddingTop: 'var(--sp-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
                <label className="form-label" style={{ marginBottom: 0, fontSize: 'var(--fs-base)' }}>Gallery Images</label>
                <button className="btn btn-outline" type="button" onClick={addImageField} style={{ fontSize: 'var(--fs-xs)', display: 'flex', alignItems: 'center', gap: 'var(--sp-1)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  Add Image
                </button>
              </div>
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}>Each gallery image has a URL and an optional title shown below the image.</p>
              {form.images.length === 0 && (
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', margin: 0 }}>No images added yet. Click "Add Image" to add gallery images.</p>
              )}
              {form.images.map((img, i) => {
                const normalized = normalizeImage(img);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
                    <input
                      className="form-input"
                      value={normalized.url}
                      onChange={(e) => updateImageUrl(i, e.target.value)}
                      placeholder={`Image URL ${i + 1}`}
                      style={{ fontSize: 'var(--fs-sm)', flex: 2 }}
                    />
                    <input
                      className="form-input"
                      value={normalized.title}
                      onChange={(e) => updateImageTitle(i, e.target.value)}
                      placeholder={`Title ${i + 1}`}
                      style={{ fontSize: 'var(--fs-sm)', flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImageField(i)}
                      style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '4px 6px', borderRadius: 4 }}
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {form.images.length > 0 && form.images.some((img) => (typeof img === 'string' ? img : img.url).trim()) && (
                <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)', flexWrap: 'wrap' }}>
                  {form.images.map((img, i) => {
                    const normalized = normalizeImage(img);
                    if (!normalized.url.trim()) return null;
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-1)' }}>
                        <div style={{ width: 60, height: 60, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                          <img src={normalized.url} alt={normalized.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        </div>
                        {normalized.title && (
                          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', maxWidth: 60, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{normalized.title}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Linked News Section */}
            <div className="form-group" style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--card-border)', paddingTop: 'var(--sp-4)' }}>
              <label className="form-label" style={{ fontSize: 'var(--fs-base)' }}>Linked News</label>
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}>Select news articles to show on the competition's News tab.</p>
              {allNews.length === 0 ? (
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>No news articles available yet. Create news articles first, then link them here.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                  {allNews.map((article) => {
                    const selected = form.newsSlugs?.includes(article.slug);
                    return (
                      <label
                        key={article.slug}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 'var(--sp-1)', cursor: 'pointer',
                          padding: 'var(--sp-1) var(--sp-2)', borderRadius: 6,
                          fontSize: 'var(--fs-sm)',
                          background: selected ? 'var(--accent-light)' : 'transparent',
                          border: selected ? '1px solid var(--accent)' : '1px solid var(--card-border)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleNewsSlug(article.slug)}
                          style={{ accentColor: 'var(--accent)' }}
                        />
                        <span style={{ fontWeight: selected ? 600 : 400 }}>{article.title}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Overview</label>
              <textarea className="form-input" rows={8} value={form.overview} onChange={(e) => setForm({ ...form, overview: e.target.value })} placeholder="Use **bold** text and enter/paste text here. Double line breaks create new paragraphs." />
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 'var(--sp-1)' }}>
                Supports **bold** and paragraph breaks (blank line between paragraphs).
              </p>
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

          {/* Results Editor */}
          <div style={{ marginTop: 'var(--sp-6)', borderTop: '1px solid var(--card-border)', paddingTop: 'var(--sp-6)' }}>
            <div className="card-header">
              <h3 className="card-title">Results</h3>
            </div>

            <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
              {disciplineOpts.map((d) => (
                <button key={d} className={form.disciplines.includes(d) ? 'btn btn-primary' : 'btn btn-outline'} type="button"
                  style={{ fontSize: 'var(--fs-sm)', opacity: form.disciplines.includes(d) ? 1 : 0.4, cursor: form.disciplines.includes(d) ? 'pointer' : 'not-allowed' }}
                  onClick={() => form.disciplines.includes(d) && setResultTabDisc(d)}>
                  {d}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
              {genders.map((g) => (
                <button key={g} type="button"
                  style={{
                    padding: 'var(--sp-1) var(--sp-3)', borderRadius: 6, fontSize: 'var(--fs-sm)', fontWeight: 600,
                    background: resultTabGender === g ? 'var(--accent)' : 'transparent',
                    color: resultTabGender === g ? '#ffffff' : 'var(--text-secondary)',
                    border: resultTabGender === g ? 'none' : '1px solid var(--card-border)',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => setResultTabGender(g)}>
                  {g}
                </button>
              ))}
              <button className="btn btn-primary" type="button" onClick={addResultEntry} style={{ marginLeft: 'auto', fontSize: 'var(--fs-xs)' }}>
                + Add {resultTabGender} Result
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>Rank</th>
                    <th>Name</th>
                    <th>Team</th>
                    <th style={{ width: 120 }}>{markLabel}</th>
                    <th style={{ width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getResultEntries().length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--sp-8)' }}>
                      No results yet for {resultTabDisc} ({resultTabGender}). Click "Add {resultTabGender} Result" to begin.
                    </td></tr>
                  )}
                  {getResultEntries().map((entry, i) => (
                    <tr key={i}>
                      {editingResultIdx === i ? (
                        <>
                          <td><strong>#{i + 1}</strong></td>
                          <td><input className="form-input" value={resultEditRow.name} onChange={(e) => setResultEditRow({ ...resultEditRow, name: e.target.value })} style={{ fontSize: 'var(--fs-sm)' }} /></td>
                          <td><input className="form-input" value={resultEditRow.team} onChange={(e) => setResultEditRow({ ...resultEditRow, team: e.target.value })} style={{ fontSize: 'var(--fs-sm)' }} /></td>
                          <td><input className="form-input" value={resultEditRow.mark} onChange={(e) => setResultEditRow({ ...resultEditRow, mark: e.target.value })} style={{ fontSize: 'var(--fs-sm)' }} placeholder={markPlaceholder} /></td>
                          <td>
                            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                              <button className="btn btn-primary" type="button" style={{ fontSize: 'var(--fs-xs)' }} onClick={saveResultEdit}>Save</button>
                              <button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)' }} onClick={() => setEditingResultIdx(null)}>Cancel</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td><strong>{entry.rank}</strong></td>
                          <td style={{ fontWeight: 500 }}>{entry.name}</td>
                          <td>{entry.team}</td>
                          <td><span className="badge badge-info">{entry.mark}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                              <button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)' }} onClick={() => startEditResult(i)}>Edit</button>
                              <button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)', color: 'var(--error)' }} onClick={() => deleteResultEntry(i)}>Delete</button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-6)' }}>
            <button className="btn btn-primary" type="button" onClick={save}>Save Competition</button>
          </div>
        </div>
      )}

      {/* Year Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
        <label style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Year</label>
        <select
          className="form-input"
          style={{ width: 'auto', fontSize: 'var(--fs-sm)' }}
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        >
          <option value="all">All Years</option>
          {yearOptions.filter((y) => y !== 'all').map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
          {yearFilter === 'all' ? `${competitions.length} competitions` : `${filteredCompetitions.length} competition${filteredCompetitions.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Dates</th>
              <th>Disciplines</th>
              <th>Results</th>
              <th>Images</th>
              <th>Status</th>
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCompetitions.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--sp-8)' }}>
                {yearFilter === 'all' ? 'No competitions yet. Click "Add Competition" to create one.' : 'No competitions found for this year.'}
              </td></tr>
            )}
            {filteredCompetitions.map((comp) => {
              const totalResults = [comp.results?.Speed?.Men?.length || 0, comp.results?.Speed?.Women?.length || 0,
                comp.results?.Lead?.Men?.length || 0, comp.results?.Lead?.Women?.length || 0,
                comp.results?.Boulder?.Men?.length || 0, comp.results?.Boulder?.Women?.length || 0]
                .reduce((a, b) => a + b, 0);
              const imageCount = comp.images?.length || 0;
              return (
                <tr key={comp.slug}>
                  <td style={{ fontWeight: 500 }}>{comp.name}</td>
                  <td style={{ fontSize: 'var(--fs-sm)' }}>{comp.location}</td>
                  <td style={{ fontSize: 'var(--fs-sm)' }}>{new Date(comp.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(comp.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td>{comp.disciplines?.join(', ')}</td>
                  <td><span className="badge badge-info">{totalResults} entries</span></td>
                  <td><span className="badge badge-info">{imageCount} image{imageCount !== 1 ? 's' : ''}</span></td>
                  <td><span className={comp.status === 'Completed' ? 'badge badge-success' : comp.status === 'Upcoming' ? 'badge badge-warning' : 'badge badge-info'}>{comp.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                      <button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)' }} onClick={() => openEdit(comp)}>Edit</button>
                      <button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)', color: 'var(--error)' }} onClick={() => handleDelete(comp.slug)}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
