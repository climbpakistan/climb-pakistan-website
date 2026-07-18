import { useState, useEffect } from 'react';
import { getAbout, updateAbout } from '../api';

export default function About() {
  const [loading, setLoading] = useState(true);
  const [intro, setIntro] = useState('');
  const [mission, setMission] = useState('');
  const [closing, setClosing] = useState('');
  const [stats, setStats] = useState([{ label: '', value: '' }]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    getAbout()
      .then((content) => {
        setIntro(content.intro || '');
        setMission(content.mission || '');
        setClosing(content.closing || '');
        setStats(content.stats?.length ? content.stats : [{ label: '', value: '' }]);
        setTags(content.tags || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateStat = (i, field, value) => {
    const updated = [...stats];
    updated[i] = { ...updated[i], [field]: value };
    setStats(updated);
  };

  const addTag = (tag) => {
    const t = tag.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const removeTag = (tag) => setTags(tags.filter((t) => t !== tag));

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const handleSave = async () => {
    try {
      await updateAbout({ intro, mission, closing, tags, stats: stats.filter((s) => s.label.trim()) });
      alert('About page saved successfully!');
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  const handleReset = () => {
    setIntro('');
    setMission('');
    setClosing('');
    setTags([]);
    setStats([{ label: '', value: '' }]);
  };

  if (loading) return <p style={{ padding: 'var(--sp-6)' }}>Loading about content...</p>;

  return (
    <>
      <div className="page-header">
        <h1>About</h1>
        <p>Manage the About page content.</p>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        <div className="card-header">
          <h3 className="card-title">Page Content</h3>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="about-intro">Intro Paragraph</label>
          <textarea className="form-input" id="about-intro" rows={4} value={intro}
            onChange={(e) => setIntro(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="about-mission">Mission Statement</label>
          <textarea className="form-input" id="about-mission" rows={5} value={mission}
            onChange={(e) => setMission(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="about-closing">Closing Text</label>
          <textarea className="form-input" id="about-closing" rows={4} value={closing}
            onChange={(e) => setClosing(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Featured Stats <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(shown on the About page)</span></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
            {stats.map((stat, i) => (
              <div key={i} style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', padding: 'var(--sp-2)', border: '1px solid var(--card-border)', borderRadius: 8 }}>
                <input className="form-input" value={stat.label} onChange={(e) => updateStat(i, 'label', e.target.value)} style={{ flex: 1 }} placeholder="Label" />
                <input className="form-input" value={stat.value} onChange={(e) => updateStat(i, 'value', e.target.value)} style={{ width: 80, textAlign: 'center' }} placeholder="Value" />
                <button className="btn btn-outline" type="button" onClick={() => {
                  if (stats.length <= 1) return;
                  setStats(stats.filter((_, idx) => idx !== i));
                }} style={{ flexShrink: 0, color: 'var(--error)', borderColor: 'transparent', fontSize: 'var(--fs-sm)' }}>✕</button>
              </div>
            ))}
            <button className="btn btn-outline" type="button" onClick={() => setStats([...stats, { label: '', value: '' }])} style={{ fontSize: 'var(--fs-xs)', justifySelf: 'start' }}>+ Add Stat</button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">SEO Tags <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 400 }}>(hidden — used in structured data)</span></label>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
            {tags.map((t) => (
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

        <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
          <button className="btn btn-primary" type="button" onClick={handleSave}>Save Changes</button>
          <button className="btn btn-outline" type="button" onClick={handleReset}>Reset</button>
        </div>
      </div>
    </>
  );
}
