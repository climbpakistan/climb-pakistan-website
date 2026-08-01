import { useState, useEffect } from 'react';
import { getAbout, updateAbout } from '../api';

// Default structured About content (matches backend seed). Shown when the
// saved document has no sections yet, and restored by "Reset".
const DEFAULT_SECTIONS = [
  {
    heading: "Pakistan's Sport Climbing Magazine & Digital Platform",
    paragraphs: [
      "Climb Pakistan is Pakistan's dedicated independent sport climbing magazine and digital platform, created to document, promote and support the growth of sport climbing in Pakistan.",
      "Our mission is to bring together athletes, competitions, rankings, records and climbing news in one place. Whether you're an athlete, coach, climbing gym or fan, Climb Pakistan is your trusted source for competitive climbing in Pakistan.",
    ],
    listItems: [],
  },
  {
    heading: "What You'll Find",
    paragraphs: [
      'At Climb Pakistan, we publish reliable and up-to-date information, including:',
      'Our goal is to preserve the history of sport climbing in Pakistan while making accurate information accessible to everyone.',
    ],
    listItems: [
      'Athlete profiles and achievements',
      'National Sport Climbing Championship results',
      'Pakistan Sport Climbing Rankings',
      'National Speed Climbing Records',
      'Competition news and event coverage',
      'Sport climbing statistics and historical records',
      'Educational content about Speed, Lead and Bouldering',
    ],
  },
  {
    heading: 'Growing the Sport',
    paragraphs: [
      'As sport climbing continues to grow in Pakistan and around the world, Climb Pakistan aims to document the achievements of Pakistani climbers, celebrate the climbing community and inspire the next generation of athletes.',
    ],
    listItems: [],
  },
];

const DEFAULT_CLOSING = 'Join the movement. #ClimbPakistan';

export default function About() {
  const [loading, setLoading] = useState(true);
  const [intro, setIntro] = useState('');
  const [mission, setMission] = useState('');
  const [closing, setClosing] = useState('');
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [stats, setStats] = useState([{ label: '', value: '' }]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    getAbout()
      .then((content) => {
        setIntro(content.intro || '');
        setMission(content.mission || '');
        setClosing(content.closing || '');
        setSections(content.sections?.length ? content.sections : DEFAULT_SECTIONS);
        setStats(content.stats?.length ? content.stats : [{ label: '', value: '' }]);
        setTags(content.tags || []);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Section helpers ──
  const updateSection = (i, patch) => {
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const updateSectionParagraph = (si, pi, value) => {
    updateSection(si, {
      paragraphs: sections[si].paragraphs.map((p, idx) => (idx === pi ? value : p)),
    });
  };

  const updateSectionListItem = (si, li, value) => {
    updateSection(si, {
      listItems: sections[si].listItems.map((it, idx) => (idx === li ? value : it)),
    });
  };

  // ── Stat helpers ──
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
      const cleanSections = sections
        .map((s) => ({
          heading: (s.heading || '').trim(),
          paragraphs: (s.paragraphs || []).map((p) => p.trim()).filter(Boolean),
          listItems: (s.listItems || []).map((it) => it.trim()).filter(Boolean),
        }))
        .filter((s) => s.heading || s.paragraphs.length || s.listItems.length);

      await updateAbout({
        intro,
        mission,
        closing,
        sections: cleanSections,
        tags,
        stats: stats.filter((s) => s.label.trim()),
      });
      alert('About page saved successfully!');
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  const handleReset = () => {
    setIntro('');
    setMission('');
    setClosing(DEFAULT_CLOSING);
    setSections(DEFAULT_SECTIONS);
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

      <div className="card" style={{ maxWidth: '820px' }}>
        <div className="card-header">
          <h3 className="card-title">Page Content</h3>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="about-intro">Intro Paragraph <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 400 }}>(legacy — only shown if no sections exist)</span></label>
          <textarea className="form-input" id="about-intro" rows={3} value={intro}
            onChange={(e) => setIntro(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="about-mission">Mission Statement <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 400 }}>(legacy — only shown if no sections exist)</span></label>
          <textarea className="form-input" id="about-mission" rows={4} value={mission}
            onChange={(e) => setMission(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="about-closing">Closing Text</label>
          <textarea className="form-input" id="about-closing" rows={2} value={closing}
            onChange={(e) => setClosing(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Content Sections <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 400 }}>(rendered on the public page — each section has an H2 heading, paragraphs and an optional bullet list)</span></label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            {sections.map((section, si) => (
              <div key={si} style={{ border: '1px solid var(--card-border)', borderRadius: 10, padding: 'var(--sp-4)', background: 'var(--bg-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
                  <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-muted)' }}>Section {si + 1}</span>
                  <button className="btn btn-outline" type="button" onClick={() => setSections(sections.filter((_, idx) => idx !== si))}
                    style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--error)', borderColor: 'transparent', fontSize: 'var(--fs-sm)' }}>Remove Section</button>
                </div>

                <div style={{ marginBottom: 'var(--sp-3)' }}>
                  <label className="form-label" style={{ fontSize: 'var(--fs-xs)' }} htmlFor={`section-heading-${si}`}>Heading (H2)</label>
                  <input className="form-input" id={`section-heading-${si}`} value={section.heading || ''}
                    onChange={(e) => updateSection(si, { heading: e.target.value })} placeholder="Section heading" />
                </div>

                <div style={{ marginBottom: 'var(--sp-3)' }}>
                  <label className="form-label" style={{ fontSize: 'var(--fs-xs)' }}>Paragraphs</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                    {(section.paragraphs || ['']).map((p, pi) => (
                      <div key={pi} style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'flex-start' }}>
                        <textarea className="form-input" rows={2} value={p}
                          onChange={(e) => updateSectionParagraph(si, pi, e.target.value)} placeholder="Paragraph text" style={{ flex: 1 }} />
                        <button className="btn btn-outline" type="button" onClick={() => updateSection(si, { paragraphs: section.paragraphs.filter((_, idx) => idx !== pi) })}
                          style={{ flexShrink: 0, color: 'var(--error)', borderColor: 'transparent', fontSize: 'var(--fs-sm)', paddingTop: 'var(--sp-2)' }}>✕</button>
                      </div>
                    ))}
                    <button className="btn btn-outline" type="button" onClick={() => updateSection(si, { paragraphs: [...(section.paragraphs || []), ''] })}
                      style={{ fontSize: 'var(--fs-xs)', justifySelf: 'start' }}>+ Add Paragraph</button>
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: 'var(--fs-xs)' }}>Bullet List Items <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                    {(section.listItems || []).map((item, li) => (
                      <div key={li} style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
                        <span style={{ color: 'var(--accent)', fontSize: 'var(--fs-md)', lineHeight: 1 }}>•</span>
                        <input className="form-input" value={item}
                          onChange={(e) => updateSectionListItem(si, li, e.target.value)} placeholder="List item" style={{ flex: 1 }} />
                        <button className="btn btn-outline" type="button" onClick={() => updateSection(si, { listItems: section.listItems.filter((_, idx) => idx !== li) })}
                          style={{ flexShrink: 0, color: 'var(--error)', borderColor: 'transparent', fontSize: 'var(--fs-sm)' }}>✕</button>
                      </div>
                    ))}
                    <button className="btn btn-outline" type="button" onClick={() => updateSection(si, { listItems: [...(section.listItems || []), ''] })}
                      style={{ fontSize: 'var(--fs-xs)', justifySelf: 'start' }}>+ Add List Item</button>
                  </div>
                </div>
              </div>
            ))}
            <button className="btn btn-outline" type="button" onClick={() => setSections([...sections, { heading: '', paragraphs: [''], listItems: [] }])}
              style={{ justifySelf: 'start' }}>+ Add Section</button>
          </div>
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
