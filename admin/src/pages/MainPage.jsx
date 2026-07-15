import { useState, useEffect } from 'react';
import { getMainPage, updateMainPage } from '../api';

const DEFAULT_COVERAGE = [
  { number: 1, title: 'Rankings', description: 'National standings for senior men and senior women, by discipline and by year.', link: '/rankings' },
  { number: 2, title: 'Competitions', description: 'Results and coverage from national championships and climbing events.', link: '/competitions' },
  { number: 3, title: 'Athletes', description: 'Profiles, achievements and stats for the climbers building Pakistan\'s scene.', link: '/athletes' },
  { number: 4, title: 'Learn Climbing', description: 'Guides and explainers for anyone curious about the sport.', link: '/learn' },
];

export default function MainPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Hero Section ──
  const [heroTitleLine1, setHeroTitleLine1] = useState('Your Source For');
  const [heroTitleLine2, setHeroTitleLine2] = useState('Climbing in Pakistan');
  const [heroSubtitle, setHeroSubtitle] = useState('News, rankings, athlete stories and competition coverage from the community pushing the sport forward.');
  const [heroCtaText, setHeroCtaText] = useState('Read the Latest');
  const [heroCtaLink, setHeroCtaLink] = useState('/news');
  const [heroCta2Text, setHeroCta2Text] = useState('Meet the Athletes');
  const [heroCta2Link, setHeroCta2Link] = useState('/athletes');

  // ── Featured Champions ──
  const [champions, setChampions] = useState([
    { slug: 'mir-abu-zar-faiz', title: 'Speed Climbing Champion', rank: 1, points: 1200 },
    { slug: 'saif-ud-din', title: 'Lead Climbing Champion', rank: 1, points: 980 },
    { slug: 'amani-jannat', title: 'Speed Climbing Champion', rank: 1, points: 1050 },
  ]);

  // ── Latest News ──
  const [latestNewsCount, setLatestNewsCount] = useState(3);

  // ── Coverage Sections ──
  const [coverageSections, setCoverageSections] = useState(DEFAULT_COVERAGE);

  // ── Follow CTA ──
  const [ctaText, setCtaText] = useState('#ClimbPakistan');
  const [ctaSubtext, setCtaSubtext] = useState('Stories, athletes and updates from Pakistan\'s climbing community — every week.');
  const [ctaInstagramHandle, setCtaInstagramHandle] = useState('climb_pakistan');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    getMainPage()
      .then((settings) => {
        // Hero (heroTitle stored as "line1<br />line2")
        if (settings.heroTitle) {
          const parts = settings.heroTitle.split('<br />');
          setHeroTitleLine1(parts[0] || '');
          setHeroTitleLine2(parts[1] || '');
        }
        if (settings.heroSubtitle) setHeroSubtitle(settings.heroSubtitle);
        if (settings.heroCtaText) setHeroCtaText(settings.heroCtaText);
        if (settings.heroCtaLink) setHeroCtaLink(settings.heroCtaLink);
        if (settings.heroCta2Text) setHeroCta2Text(settings.heroCta2Text);
        if (settings.heroCta2Link) setHeroCta2Link(settings.heroCta2Link);

        // Champions
        if (settings.champions?.length >= 3) {
          setChampions(settings.champions.map((c) => ({
            slug: c.slug || '',
            title: c.title || '',
            rank: c.rank ?? 0,
            points: c.points ?? 0,
          })));
        } else if (settings.championSlugs?.length >= 3) {
          setChampions(settings.championSlugs.map((s) => ({
            slug: typeof s === 'object' ? (s.slug || '') : (s || ''),
            title: typeof s === 'object' ? (s.title || '') : '',
            rank: 0, points: 0,
          })));
        }

        // Latest News
        if (settings.latestNewsCount) setLatestNewsCount(settings.latestNewsCount);

        // Coverage Sections
        if (settings.coverageSections?.length >= 4) {
          setCoverageSections(settings.coverageSections.map((s) => ({
            number: s.number,
            title: s.title || '',
            description: s.description || '',
            link: s.link || '',
          })));
        }

        // CTA
        if (settings.ctaText) setCtaText(settings.ctaText);
        if (settings.ctaSubtext) setCtaSubtext(settings.ctaSubtext);
        if (settings.ctaInstagramHandle) setCtaInstagramHandle(settings.ctaInstagramHandle);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateChampion = (index, field, value) => {
    const updated = [...champions];
    updated[index] = { ...updated[index], [field]: value };
    setChampions(updated);
  };

  const updateCoverage = (index, field, value) => {
    const updated = [...coverageSections];
    updated[index] = { ...updated[index], [field]: value };
    setCoverageSections(updated);
  };

  const handleReset = () => {
    setHeroTitleLine1('Your Source For');
    setHeroTitleLine2('Climbing in Pakistan');
    setHeroSubtitle('News, rankings, athlete stories and competition coverage from the community pushing the sport forward.');
    setHeroCtaText('Read the Latest');
    setHeroCtaLink('/news');
    setHeroCta2Text('Meet the Athletes');
    setHeroCta2Link('/athletes');
    setChampions([
      { slug: 'mir-abu-zar-faiz', title: 'Speed Climbing Champion', rank: 1, points: 1200 },
      { slug: 'saif-ud-din', title: 'Lead Climbing Champion', rank: 1, points: 980 },
      { slug: 'amani-jannat', title: 'Speed Climbing Champion', rank: 1, points: 1050 },
    ]);
    setLatestNewsCount(3);
    setCoverageSections(DEFAULT_COVERAGE);
    setCtaText('#ClimbPakistan');
    setCtaSubtext('Stories, athletes and updates from Pakistan\'s climbing community — every week.');
    setCtaInstagramHandle('climb_pakistan');
    showToast('Reset to defaults.');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMainPage({
        heroTitle: `${heroTitleLine1}<br />${heroTitleLine2}`,
        heroSubtitle,
        heroCtaText,
        heroCtaLink,
        heroCta2Text,
        heroCta2Link,
        champions: champions.filter((c) => c.slug.trim()).map((c) => ({
          slug: c.slug.trim(),
          title: c.title.trim(),
          rank: Number(c.rank) || 0,
          points: Number(c.points) || 0,
        })),
        latestNewsCount: Number(latestNewsCount) || 3,
        coverageSections: coverageSections.map((s) => ({
          number: s.number,
          title: s.title.trim(),
          description: s.description.trim(),
          link: s.link.trim(),
        })),
        ctaText,
        ctaSubtext,
        ctaInstagramHandle,
      });
      showToast('Homepage settings saved successfully!');
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ padding: 'var(--sp-6)' }}>Loading homepage settings...</p>;

  return (
    <>
      <div className="page-header">
        <h1>Homepage</h1>
        <p>Manage all content displayed on the public home page. Changes take effect immediately after saving.</p>
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

      {/* ═══════ HERO SECTION ═══════ */}
      <div className="card" style={{ marginBottom: 'var(--sp-6)' }}>
        <div className="card-header"><h3 className="card-title">Hero Banner</h3></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
          <div className="form-group">
            <label className="form-label">Hero Title Line 1</label>
            <input className="form-input" value={heroTitleLine1} onChange={(e) => setHeroTitleLine1(e.target.value)} placeholder="Your Source For" />
          </div>
          <div className="form-group">
            <label className="form-label">Hero Title Line 2 (accent color)</label>
            <input className="form-input" value={heroTitleLine2} onChange={(e) => setHeroTitleLine2(e.target.value)} placeholder="Climbing in Pakistan" />
          </div>
          <div className="form-group">
            <label className="form-label">Hero Subtitle</label>
            <textarea className="form-input" rows={2} value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} placeholder="News, rankings, athlete stories..." />
          </div>
          <div className="form-group">
            <label className="form-label">CTA Button Text</label>
            <input className="form-input" value={heroCtaText} onChange={(e) => setHeroCtaText(e.target.value)} placeholder="Read the Latest" />
          </div>
          <div className="form-group">
            <label className="form-label">Primary CTA Button Link</label>
            <select className="form-input" value={heroCtaLink} onChange={(e) => setHeroCtaLink(e.target.value)}>
              <option value="/news">/news — Latest News</option>
              <option value="/athletes">/athletes — Meet the Athletes</option>
              <option value="/rankings">/rankings — View Rankings</option>
              <option value="/competitions">/competitions — See Competitions</option>
              <option value="/learn">/learn — Learn Climbing</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Secondary CTA Button Text</label>
            <input className="form-input" value={heroCta2Text} onChange={(e) => setHeroCta2Text(e.target.value)} placeholder="Meet the Athletes" />
          </div>
          <div className="form-group">
            <label className="form-label">Secondary CTA Button Link</label>
            <select className="form-input" value={heroCta2Link} onChange={(e) => setHeroCta2Link(e.target.value)}>
              <option value="/athletes">/athletes — Meet the Athletes</option>
              <option value="/news">/news — Latest News</option>
              <option value="/rankings">/rankings — View Rankings</option>
              <option value="/competitions">/competitions — See Competitions</option>
              <option value="/learn">/learn — Learn Climbing</option>
            </select>
          </div>
        </div>
      </div>

      {/* ═══════ FEATURED CHAMPIONS ═══════ */}
      <div className="card" style={{ marginBottom: 'var(--sp-6)' }}>
        <div className="card-header">
          <h3 className="card-title">Featured Champions</h3>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Configure the 3 featured athlete preview cards on the homepage</span>
        </div>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-4)' }}>
          Enter each athlete's <strong>slug</strong> (e.g. <code style={{ background: 'var(--accent-light)', padding: '1px 6px', borderRadius: 4, fontSize: 'var(--fs-xs)' }}>mir-abu-zar-faiz</code>),
          their discipline title (e.g. <code style={{ background: 'var(--accent-light)', padding: '1px 6px', borderRadius: 4, fontSize: 'var(--fs-xs)' }}>Speed Climbing Champion</code>),
          rank and points.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'flex-end', padding: 'var(--sp-3)', border: '1px solid var(--card-border)', borderRadius: 8 }}>
              <div className="form-group" style={{ flex: 1.2, marginBottom: 0 }}>
                <label className="form-label">Slug {i + 1}</label>
                <input className="form-input" value={champions[i]?.slug || ''} onChange={(e) => updateChampion(i, 'slug', e.target.value)} placeholder="athlete-slug" />
              </div>
              <div className="form-group" style={{ flex: 1.5, marginBottom: 0 }}>
                <label className="form-label">Discipline Title</label>
                <input className="form-input" value={champions[i]?.title || ''} onChange={(e) => updateChampion(i, 'title', e.target.value)} placeholder="Speed Climbing Champion" />
              </div>
              <div className="form-group" style={{ width: 70, marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 'var(--fs-xs)' }}>Rank</label>
                <input className="form-input" type="number" min="0" value={champions[i]?.rank ?? 0} onChange={(e) => updateChampion(i, 'rank', e.target.value)} />
              </div>
              <div className="form-group" style={{ width: 70, marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 'var(--fs-xs)' }}>Points</label>
                <input className="form-input" type="number" min="0" value={champions[i]?.points ?? 0} onChange={(e) => updateChampion(i, 'points', e.target.value)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ LATEST NEWS ═══════ */}
      <div className="card" style={{ marginBottom: 'var(--sp-6)' }}>
        <div className="card-header"><h3 className="card-title">Latest News Section</h3></div>
        <div className="form-group" style={{ maxWidth: 300 }}>
          <label className="form-label">Number of News Articles to Show</label>
          <input className="form-input" type="number" min="1" max="20" value={latestNewsCount} onChange={(e) => setLatestNewsCount(e.target.value)} />
        </div>
      </div>

      {/* ═══════ COVERAGE SECTIONS ═══════ */}
      <div className="card" style={{ marginBottom: 'var(--sp-6)' }}>
        <div className="card-header">
          <h3 className="card-title">Coverage Sections</h3>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>The 4 featured cards shown below the news strip</span>
        </div>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-4)' }}>
          Each card has a title, description, and link. Edit the content below.
        </p>
        {coverageSections.map((section, i) => (
          <div key={i} style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)', padding: 'var(--sp-3)', border: '1px solid var(--card-border)', borderRadius: 8, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, fontSize: 'var(--fs-xl)', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', borderRadius: 8, flexShrink: 0 }}>
              0{section.number}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Title</label>
                  <input className="form-input" value={section.title} onChange={(e) => updateCoverage(i, 'title', e.target.value)} />
                </div>
                <div className="form-group" style={{ width: 200, marginBottom: 0 }}>
                  <label className="form-label">Link</label>
                  <select className="form-input" value={section.link} onChange={(e) => updateCoverage(i, 'link', e.target.value)}>
                    <option value="/rankings">/rankings</option>
                    <option value="/competitions">/competitions</option>
                    <option value="/athletes">/athletes</option>
                    <option value="/learn">/learn</option>
                    <option value="/news">/news</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} value={section.description} onChange={(e) => updateCoverage(i, 'description', e.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════ FOLLOW CTA ═══════ */}
      <div className="card" style={{ marginBottom: 'var(--sp-6)' }}>
        <div className="card-header"><h3 className="card-title">Follow CTA Section</h3></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
          <div className="form-group">
            <label className="form-label">CTA Title</label>
            <input className="form-input" value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="#ClimbPakistan" />
          </div>
          <div className="form-group">
            <label className="form-label">Instagram Handle</label>
            <input className="form-input" value={ctaInstagramHandle} onChange={(e) => setCtaInstagramHandle(e.target.value)} placeholder="climb_pakistan" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">CTA Subtitle</label>
            <textarea className="form-input" rows={2} value={ctaSubtext} onChange={(e) => setCtaSubtext(e.target.value)} placeholder="Stories, athletes and updates..." />
          </div>
        </div>
      </div>

      {/* ═══════ ACTIONS ═══════ */}
      <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
        <button className="btn btn-primary" type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button className="btn btn-outline" type="button" onClick={handleReset}>Reset to Defaults</button>
      </div>
    </>
  );
}
