import { useState, useEffect } from 'react';
import { getAthletes, createAthlete, updateAthlete, deleteAthlete, importAthletesExcel } from '../api';

const disciplineOptions = ['Speed Climbing', 'Lead Climbing', 'Boulder'];
const medalOptions = ['Gold', 'Silver', 'Bronze'];

export default function Athletes() {
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSlug, setEditingSlug] = useState(null);
  const [form, setForm] = useState({
    slug: '', name: '', gender: 'Male', mainDiscipline: '', disciplines: [], team: '', rank: 1, hometown: '',
    age: '', startedClimbing: '', instagram: '', worldClimbingUrl: '', internationalParticipation: 0,
    isChampion: false, championTitle: '', photoUrl: '', about: '', medals: [{ competition: '', discipline: 'Speed', medal: 'Gold' }],
  });
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    getAthletes().then(setAthletes).finally(() => setLoading(false));
  }, []);

  const openNew = () => {
    setEditingSlug('__new__');
    setForm({
      slug: '', name: '', gender: 'Male', mainDiscipline: '', disciplines: [], team: '', rank: 1, hometown: '',
      age: '', startedClimbing: '', instagram: '', worldClimbingUrl: '', internationalParticipation: 0,
      isChampion: false, championTitle: '', photoUrl: '', about: '', medals: [{ competition: '', discipline: 'Speed', medal: 'Gold' }],
    });
  };

  const openEdit = (athlete) => {
    setEditingSlug(athlete.slug);
    setForm({ ...athlete, medals: athlete.medals?.length ? athlete.medals : [{ competition: '', discipline: 'Speed', medal: 'Gold' }] });
  };

  const cancelEdit = () => setEditingSlug(null);

  const toggleDiscipline = (d) => {
    setForm((f) => ({
      ...f,
      disciplines: f.disciplines.includes(d) ? f.disciplines.filter((x) => x !== d) : [...f.disciplines, d],
    }));
  };

  const updateMedal = (index, field, value) => {
    const medals = [...form.medals];
    medals[index] = { ...medals[index], [field]: value };
    setForm({ ...form, medals });
  };

  const addMedal = () => setForm({ ...form, medals: [...form.medals, { competition: '', discipline: 'Speed', medal: 'Gold' }] });
  const removeMedal = (i) => { if (form.medals.length > 1) setForm({ ...form, medals: form.medals.filter((_, idx) => idx !== i) }); };

  const save = async () => {
    if (!form.name.trim()) return;
    const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const athlete = { ...form, slug, medals: form.medals.filter((m) => m.competition.trim()) };

    try {
      if (editingSlug === '__new__') {
        await createAthlete(athlete);
      } else {
        await updateAthlete(editingSlug, athlete);
      }
      const updated = await getAthletes();
      setAthletes(updated);
      setEditingSlug(null);
    } catch (err) {
      alert('Failed to save athlete: ' + err.message);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importAthletesExcel(file);
      setImportResult(result);
      const updated = await getAthletes();
      setAthletes(updated);
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (slug) => {
    if (!confirm('Delete this athlete?')) return;
    try {
      await deleteAthlete(slug);
      setAthletes(athletes.filter((a) => a.slug !== slug));
      if (editingSlug === slug) setEditingSlug(null);
    } catch (err) {
      alert('Failed to delete athlete: ' + err.message);
    }
  };

  if (loading) return <p style={{ padding: 'var(--sp-6)' }}>Loading athletes...</p>;

  return (
    <>
      <div className="page-header">
        <h1>Athletes</h1>
        <p>Manage athlete profiles, medals, and champion status.</p>
      </div>

      <div style={{ marginBottom: 'var(--sp-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
          <button className="btn btn-primary" type="button" onClick={openNew}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Athlete
          </button>
        </div>
        <label className="btn btn-outline" style={{ cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.6 : 1 }}>
          {importing ? (
            <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> Importing...</>
          ) : (
            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Import from Excel</>
          )}
          <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} disabled={importing} onChange={handleFileUpload} />
        </label>
      </div>

      {/* Import result modal */}
      {importResult && (
        <div className="card" style={{ marginBottom: 'var(--sp-6)', borderLeft: '3px solid var(--success)' }}>
          <div className="card-header">
            <h3 className="card-title">Import Results</h3>
            <button className="btn btn-outline" type="button" onClick={() => setImportResult(null)}>Dismiss</button>
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-6)', padding: 'var(--sp-4)' }}>
            <div style={{ textAlign: 'center', padding: 'var(--sp-3)', background: 'var(--accent-light)', borderRadius: 8, minWidth: 80 }}>
              <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, color: 'var(--success)' }}>{importResult.summary.created}</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Created</div>
            </div>
            <div style={{ textAlign: 'center', padding: 'var(--sp-3)', background: 'var(--accent-light)', borderRadius: 8, minWidth: 80 }}>
              <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, color: 'var(--accent)' }}>{importResult.summary.updated}</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Updated</div>
            </div>
            <div style={{ textAlign: 'center', padding: 'var(--sp-3)', background: 'rgba(248,113,113,0.1)', borderRadius: 8, minWidth: 80 }}>
              <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, color: 'var(--error)' }}>{importResult.summary.errors}</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Errors</div>
            </div>
            <div style={{ textAlign: 'center', padding: 'var(--sp-3)', background: 'var(--surface-2)', borderRadius: 8, minWidth: 80 }}>
              <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>{importResult.summary.total}</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Total</div>
            </div>
          </div>
          {importResult.errors?.length > 0 && (
            <details style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
              <summary style={{ cursor: 'pointer', fontSize: 'var(--fs-sm)', color: 'var(--error)' }}>Show {importResult.errors.length} error(s)</summary>
              <ul style={{ marginTop: 'var(--sp-2)', paddingLeft: 'var(--sp-4)' }}>
                {importResult.errors.map((e, i) => (
                  <li key={i} style={{ fontSize: 'var(--fs-xs)', color: 'var(--error)', marginBottom: 'var(--sp-1)' }}>
                    <strong>{e.name}</strong> ({e.slug}): {e.error}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {editingSlug !== null && (
        <div className="card" style={{ marginBottom: 'var(--sp-6)' }}>
          <div className="card-header">
            <h3 className="card-title">{editingSlug === '__new__' ? 'New Athlete' : 'Edit Athlete'}</h3>
            <button className="btn btn-outline" type="button" onClick={cancelEdit}>Cancel</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-4)' }}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Slug</label>
              <input className="form-input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option>Male</option><option>Female</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Team</label>
              <input className="form-input" value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Rank</label>
              <input className="form-input" type="number" min="1" value={form.rank} onChange={(e) => setForm({ ...form, rank: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="form-label">Hometown</label>
              <input className="form-input" value={form.hometown} onChange={(e) => setForm({ ...form, hometown: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Age</label>
              <input className="form-input" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="form-label">Started Climbing</label>
              <input className="form-input" value={form.startedClimbing} onChange={(e) => setForm({ ...form, startedClimbing: e.target.value })} placeholder="e.g. 2016" />
            </div>
            <div className="form-group">
              <label className="form-label">Instagram</label>
              <input className="form-input" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="username (no @)" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">
                World Climbing Profile URL
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginLeft: 'var(--sp-2)' }}>— only for international athletes</span>
              </label>
              <input className="form-input" value={form.worldClimbingUrl} onChange={(e) => setForm({ ...form, worldClimbingUrl: e.target.value })} placeholder="https://www.ifsc-climbing.org/athletes/..." />
            </div>
            <div className="form-group">
              <label className="form-label">International Participation</label>
              <input className="form-input" type="number" min="0" value={form.internationalParticipation} onChange={(e) => setForm({ ...form, internationalParticipation: Number(e.target.value) })} />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 'var(--sp-2)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isChampion} onChange={(e) => setForm({ ...form, isChampion: e.target.checked })} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
                <span className="form-label" style={{ marginBottom: 0 }}>National Champion</span>
              </label>
            </div>
          </div>

          {form.isChampion && (
            <div className="form-group">
              <label className="form-label">Champion Title</label>
              <input className="form-input" value={form.championTitle} onChange={(e) => setForm({ ...form, championTitle: e.target.value })} placeholder="e.g. Speed Climbing — Senior Men" />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Main Discipline</label>
            <select className="form-input" style={{ width: 220 }} value={form.mainDiscipline} onChange={(e) => setForm({ ...form, mainDiscipline: e.target.value })}>
              <option value="">— Select —</option>
              {disciplineOptions.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">All Disciplines</label>
            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
              {disciplineOptions.map((d) => (
                <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-1)', cursor: 'pointer', padding: 'var(--sp-1) var(--sp-2)', borderRadius: 6, background: form.disciplines.includes(d) ? 'var(--accent-light)' : 'transparent' }}>
                  <input type="checkbox" checked={form.disciplines.includes(d)} onChange={() => toggleDiscipline(d)} style={{ accentColor: 'var(--accent)' }} />
                  <span style={{ fontSize: 'var(--fs-sm)' }}>{d}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Photo URL</label>
            <input className="form-input" value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} placeholder="https://example.com/athlete-photo.jpg" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">About</label>
            <textarea className="form-input" rows={3} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
          </div>

          {/* Medals */}
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Medals</label>
              <button className="btn btn-outline" type="button" onClick={addMedal} style={{ fontSize: 'var(--fs-xs)' }}>+ Add Medal</button>
            </div>
            {form.medals.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)', alignItems: 'center' }}>
                <input className="form-input" value={m.competition} onChange={(e) => updateMedal(i, 'competition', e.target.value)} placeholder="Competition name" style={{ flex: 2 }} />
                <select className="form-input" style={{ width: 140 }} value={m.discipline} onChange={(e) => updateMedal(i, 'discipline', e.target.value)}>
                  {disciplineOptions.map((d) => <option key={d}>{d.replace(' Climbing', '')}</option>)}
                </select>
                <select className="form-input" style={{ width: 100 }} value={m.medal} onChange={(e) => updateMedal(i, 'medal', e.target.value)}>
                  {medalOptions.map((mo) => <option key={mo}>{mo}</option>)}
                </select>
                <button className="btn btn-outline" type="button" onClick={() => removeMedal(i)} style={{ flexShrink: 0, color: 'var(--error)', borderColor: 'transparent' }}>✕</button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
            <button className="btn btn-primary" type="button" onClick={save}>Save Athlete</button>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Disciplines</th>
              <th>Team</th>
              <th>Rank</th>
              <th>Champion</th>
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map((a) => (
              <tr key={a.slug}>
                <td style={{ fontWeight: 500 }}>{a.name}</td>
                <td>{a.disciplines?.join(', ')}</td>
                <td>{a.team}</td>
                <td>#{a.rank}</td>
                <td>{a.isChampion ? <span className="badge badge-success">Champion</span> : <span className="badge badge-warning">—</span>}</td>
                <td>
                  <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                    <button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)' }} onClick={() => openEdit(a)}>Edit</button>
                    <button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)', color: 'var(--error)' }} onClick={() => handleDelete(a.slug)}>Delete</button>
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
