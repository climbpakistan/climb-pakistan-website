import { useState, useEffect } from 'react';
import { getRecordsPage, updateRecordsPage } from '../api';

export default function RecordsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [heroTitle, setHeroTitle] = useState('National');
  const [heroTitleAccent, setHeroTitleAccent] = useState('Records');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    getRecordsPage()
      .then((settings) => {
        if (settings.heroTitle) setHeroTitle(settings.heroTitle);
        if (settings.heroTitleAccent) setHeroTitleAccent(settings.heroTitleAccent);
        if (settings.heroSubtitle) setHeroSubtitle(settings.heroSubtitle);
        if (settings.seoTitle) setSeoTitle(settings.seoTitle);
        if (settings.seoDescription) setSeoDescription(settings.seoDescription);
        if (settings.seoKeywords) setSeoKeywords(settings.seoKeywords);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleReset = () => {
    setHeroTitle('National');
    setHeroTitleAccent('Records');
    setHeroSubtitle("Pakistan's fastest speed climbing times — men's and women's national records tracked from sanctioned competitions.");
    setSeoTitle('National Records — Speed Climbing');
    setSeoDescription("Pakistan national speed climbing records — men's and women's current records and historical progression.");
    setSeoKeywords('Pakistan speed climbing records, national records Pakistan climbing, speed climbing national record, Pakistan climbing records men women');
    showToast('Reset to defaults.');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRecordsPage({
        heroTitle,
        heroTitleAccent,
        heroSubtitle,
        seoTitle,
        seoDescription,
        seoKeywords,
      });
      showToast('Records page settings saved successfully!');
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ padding: 'var(--sp-6)' }}>Loading records page settings...</p>;

  return (
    <>
      <div className="page-header">
        <h1>Records Page</h1>
        <p>Manage the hero banner, subtitle, and SEO settings for the public /records page.</p>
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
            <label className="form-label">Hero Title (normal)</label>
            <input className="form-input" value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} placeholder="National" />
          </div>
          <div className="form-group">
            <label className="form-label">Hero Title (accent color)</label>
            <input className="form-input" value={heroTitleAccent} onChange={(e) => setHeroTitleAccent(e.target.value)} placeholder="Records" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Hero Subtitle</label>
            <textarea className="form-input" rows={3} value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} placeholder="Pakistan's fastest speed climbing times..." />
          </div>
        </div>
      </div>

      {/* ═══════ SEO SECTION ═══════ */}
      <div className="card" style={{ marginBottom: 'var(--sp-6)' }}>
        <div className="card-header"><h3 className="card-title">SEO Settings</h3></div>
        <div className="form-group">
          <label className="form-label">SEO Title (browser tab / Google snippet)</label>
          <input className="form-input" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="National Records — Speed Climbing" />
        </div>
        <div className="form-group">
          <label className="form-label">SEO Description (meta description)</label>
          <textarea className="form-input" rows={2} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="Pakistan national speed climbing records..." />
        </div>
        <div className="form-group">
          <label className="form-label">SEO Keywords (meta keywords)</label>
          <textarea className="form-input" rows={2} value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} placeholder="Pakistan speed climbing records, national records..." />
        </div>
      </div>

      {/* ═══════ ACTIONS ═══════ */}
      <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
        <button className="btn btn-primary" type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button className="btn btn-outline" type="button" onClick={handleReset}>Reset to Defaults</button>
      </div>

      {/* ═══════ PREVIEW ═══════ */}
      <div className="card" style={{ marginTop: 'var(--sp-6)', background: 'var(--cp-bg-alt)', border: '1px dashed var(--cp-border)' }}>
        <div className="card-header"><h3 className="card-title">Live Preview</h3></div>
        <div style={{ textAlign: 'center', padding: 'var(--sp-6)' }}>
          <h2 style={{ fontFamily: 'Oswald, sans-serif', fontSize: 'clamp(2rem, 5vw, 3.5rem)', textTransform: 'uppercase', color: '#f3f7f3', marginBottom: 'var(--sp-3)' }}>
            {heroTitle} <span style={{ color: '#3fbf6a' }}>{heroTitleAccent}</span>
          </h2>
          {heroSubtitle && (
            <p style={{ color: '#8ba090', fontSize: '1.125rem', maxWidth: '56ch', margin: '0 auto' }}>
              {heroSubtitle}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
