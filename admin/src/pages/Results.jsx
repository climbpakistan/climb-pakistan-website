import { useState, useEffect, useMemo } from 'react';
import { getResults, updateResults, getAthletes, importResultsExcel } from '../api';

const disciplines = ['Speed', 'Lead', 'Boulder'];
const genders = ['Men', 'Women'];

/** Extract unique years from flattened results keys (Gender|Discipline|Year) */
function extractYears(entries) {
  const years = new Set();
  for (const [key, value] of Object.entries(entries)) {
    const parts = key.split('|');
    if (parts[2] && Array.isArray(value) && value.length > 0) {
      years.add(parts[2]);
    }
  }
  return [...years].sort((a, b) => Number(b) - Number(a));
}

function flatten(backend) {
  const flat = {};
  for (const gender of genders) {
    for (const discipline of disciplines) {
      const yearData = backend?.[gender]?.[discipline] || {};
      for (const year of Object.keys(yearData)) {
        const key = `${gender}|${discipline}|${year}`;
        flat[key] = yearData[year];
      }
    }
  }
  return flat;
}

function nest(flat) {
  const nested = { Men: {}, Women: {} };
  for (const [key, entries] of Object.entries(flat)) {
    const [gender, discipline, year] = key.split('|');
    if (!nested[gender][discipline]) nested[gender][discipline] = {};
    nested[gender][discipline][year] = entries;
  }
  return nested;
}

export default function Results() {
  const [gender, setGender] = useState('Men');
  const [discipline, setDiscipline] = useState('Speed');
  const [year, setYear] = useState('');
  const [entries, setEntries] = useState({});
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingIndex, setEditingIndex] = useState(null);
  const [inputMode, setInputMode] = useState('slug');
  const [editRow, setEditRow] = useState({ slug: '', name: '', team: '' });
  const [slugSuggestions, setSlugSuggestions] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [formTags, setFormTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    Promise.all([
      getResults().then((res) => {
        const resultsData = res.data !== undefined ? res.data : res;
        const flat = flatten(resultsData);
        setEntries(flat);
        if (res.tags) setFormTags(res.tags);
        const yrs = extractYears(flat);
        if (yrs.length > 0) setYear((prev) => prev || yrs[0]);
      }),
      getAthletes().then(setAthletes),
    ]).finally(() => setLoading(false));
  }, []);

  const availableYears = useMemo(() => extractYears(entries), [entries]);

  const currentKey = `${gender}|${discipline}|${year}`;
  const currentEntries = useMemo(() => {
    const raw = entries[currentKey] || [];
    // Deduplicate by slug+rank or name+team+rank to prevent accidental duplicates
    const seen = new Set();
    return raw.filter((e) => {
      const key = e.slug ? `${e.slug}|${e.rank}` : `${e.name || ''}|${e.team || ''}|${e.rank}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [entries, currentKey]);

  function resolveAthlete(slug) {
    return athletes?.find((a) => a.slug === slug);
  }

  function entryDisplayName(entry) {
    if (entry.slug) {
      const a = resolveAthlete(entry.slug);
      return a ? a.name : `@${entry.slug}`;
    }
    return entry.name || '—';
  }

  function entryDisplayTeam(entry) {
    // Team ALWAYS comes from the entry (Excel column / manual edit), NEVER from athlete profile.
    // Athletes switch teams over the years, so the team stored with the result is the source of truth.
    return entry.team || '—';
  }

  function handleSlugInput(value) {
    const athlete = resolveAthlete(value);
    setEditRow((prev) => ({ ...prev, slug: value }));
    if (athlete) {
      setSlugSuggestions([]);
    } else if (value.trim()) {
      const matches = athletes.filter((a) =>
        a.slug.toLowerCase().includes(value.toLowerCase()) ||
        a.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 6);
      setSlugSuggestions(matches);
    } else {
      setSlugSuggestions([]);
    }
  }

  function selectSuggestion(athlete) {
    setEditRow((prev) => ({ ...prev, slug: athlete.slug }));
    setSlugSuggestions([]);
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importResultsExcel(file);
      setImportResult(result);
      const res = await getResults();
      const data = res.data !== undefined ? res.data : res;
      setEntries(flatten(data));
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const addEntry = () => {
    const newEntry = { rank: currentEntries.length + 1, slug: '' };
    setEntries({ ...entries, [currentKey]: [...currentEntries, newEntry] });
    setEditingIndex(currentEntries.length);
    setEditRow({ ...newEntry, name: '', team: '' });
    setInputMode('slug');
    setSlugSuggestions([]);
  };

  const startEdit = (index) => {
    setEditingIndex(index);
    const entry = currentEntries[index];
    setInputMode(entry.slug ? 'slug' : 'manual');
    setEditRow({
      slug: entry.slug || '',
      name: entry.name || '',
      team: entry.team || '',
    });
    setSlugSuggestions([]);
  };

  const saveEdit = () => {
    if (inputMode === 'slug' && !editRow.slug.trim()) {
      alert('Please enter an athlete slug or switch to Manual mode.');
      return;
    }
    const updated = [...currentEntries];
    const savedEntry = {
      rank: editingIndex + 1,
    };
    if (inputMode === 'slug') {
      savedEntry.slug = editRow.slug.trim();
      savedEntry.team = editRow.team;
    } else {
      savedEntry.name = editRow.name || 'Unknown';
      savedEntry.team = editRow.team;
    }
    updated[editingIndex] = savedEntry;
    setEntries({ ...entries, [currentKey]: updated });
    setEditingIndex(null);
    setSlugSuggestions([]);
  };

  const deleteEntry = (index) => {
    if (!confirm('Delete this entry?')) return;
    const updated = currentEntries.filter((_, i) => i !== index).map((e, i) => ({ ...e, rank: i + 1 }));
    setEntries({ ...entries, [currentKey]: updated });
    if (editingIndex === index) setEditingIndex(null);
  };

  const saveAll = async () => {
    try {
      await updateResults({ data: nest(entries), tags: formTags });
      alert('Results saved successfully!');
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  if (loading) return <p style={{ padding: 'var(--sp-6)' }}>Loading results...</p>;

  return (
    <>
      <div className="page-header">
        <h1>Championship Results</h1>
        <p>Manage national championship results — Senior Men &amp; Women across Speed, Lead, and Boulder disciplines. Import via Excel or add entries manually.</p>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 'var(--sp-3)', marginBottom: 'var(--sp-6)', flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="form-input" style={{ width: 'auto' }} value={gender} onChange={(e) => setGender(e.target.value)}>
          {genders.map((o) => <option key={o}>{o}</option>)}
        </select>
        <select className="form-input" style={{ width: 'auto' }} value={discipline} onChange={(e) => setDiscipline(e.target.value)}>
          {disciplines.map((o) => <option key={o}>{o}</option>)}
        </select>
        <input
          type="text"
          className="form-input"
          style={{ width: 100 }}
          value={year}
          onChange={(e) => { const val = e.target.value; if (/^\d{0,4}$/.test(val)) setYear(val); }}
          onBlur={() => {
            if (year.length === 4) { const n = Number(year); if (n < 1900 || n > 2100) { alert('Year must be between 1900 and 2100.'); setYear(''); } }
          }}
          placeholder="Year"
          list="results-year-list"
        />
        <datalist id="results-year-list">
          {availableYears.map((y) => <option key={y} value={y} />)}
        </datalist>

        {/* Tags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>SEO Tags</label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {formTags.map((t) => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '1px 6px', borderRadius: 3, background: 'var(--accent-light)', fontSize: 'var(--fs-xs)', fontWeight: 500 }}>
                {t}
                <button type="button" onClick={() => setFormTags(formTags.filter((x) => x !== t))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: 0, lineHeight: 1 }}>×</button>
              </span>
            ))}
            <input
              className="form-input"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const t = tagInput.trim().toLowerCase();
                  if (t && !formTags.includes(t)) setFormTags([...formTags, t]);
                  setTagInput('');
                }
              }}
              placeholder="Add tag..."
              style={{ width: 100, fontSize: 'var(--fs-xs)', padding: '2px 6px' }}
            />
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
          <button className="btn btn-primary" type="button" onClick={addEntry}>+ Add Entry</button>
          <label className="btn btn-outline" style={{ cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.6 : 1, fontSize: 'var(--fs-sm)' }}>
            {importing ? (
              <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> Importing...</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Import Excel</>
            )}
            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} disabled={importing} onChange={handleFileUpload} />
          </label>
          <button className="btn btn-primary" type="button" onClick={saveAll} style={{ background: 'var(--success)', borderColor: 'var(--success)' }}>Save All Results</button>
        </div>
      </div>

      {/* Import result card */}
      {importResult && (
        <div className="card" style={{ marginBottom: 'var(--sp-6)', borderLeft: '3px solid var(--success)' }}>
          <div className="card-header">
            <h3 className="card-title">Import Results</h3>
            <button className="btn btn-outline" type="button" onClick={() => setImportResult(null)}>Dismiss</button>
          </div>
          <div style={{ padding: 'var(--sp-4)' }}>
            <div style={{ display: 'flex', gap: 'var(--sp-4)', marginBottom: 'var(--sp-3)', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center', padding: 'var(--sp-3)', background: 'var(--accent-light)', borderRadius: 8, minWidth: 80 }}>
                <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, color: 'var(--accent)' }}>{importResult.summary.totalEntries}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Total Entries</div>
              </div>
            </div>
            {importResult.summary.groups?.length > 0 && (
              <details>
                <summary style={{ cursor: 'pointer', fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>Show breakdown by category</summary>
                <div style={{ marginTop: 'var(--sp-2)', display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                  {importResult.summary.groups.map((g) => (
                    <div key={g.group} style={{ padding: 'var(--sp-2) var(--sp-3)', background: 'var(--surface-2)', borderRadius: 6, fontSize: 'var(--fs-xs)' }}>
                      <strong>{g.group}</strong>: {g.entries} entries
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      )}

      {/* Data table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: 60 }}>Position</th>
              <th>Athlete</th>
              <th>Team</th>
              <th style={{ width: 130 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentEntries.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--sp-8)' }}>
                  No results yet for {gender} {discipline} {year}. Click "Add Entry" to begin, or import an Excel file.
                </td>
              </tr>
            )}
            {currentEntries.map((entry, i) => (
              <tr key={i}>
                {editingIndex === i ? (
                  <>
                    <td><strong>#{i + 1}</strong></td>
                    <td>
                      <div style={{ marginBottom: 'var(--sp-2)', display: 'flex', gap: 'var(--sp-1)' }}>
                        <button type="button" onClick={() => { setInputMode('slug'); setEditRow((prev) => ({ ...prev, slug: '', name: '', team: '' })); }}
                          style={{ fontSize: 'var(--fs-xs)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--card-border)', background: inputMode === 'slug' ? 'var(--accent)' : 'transparent', color: inputMode === 'slug' ? '#ffffff' : 'var(--text-secondary)', cursor: 'pointer' }}>Select by Slug</button>
                        <button type="button" onClick={() => { setInputMode('manual'); setEditRow((prev) => ({ ...prev, slug: '' })); }}
                          style={{ fontSize: 'var(--fs-xs)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--card-border)', background: inputMode === 'manual' ? 'var(--accent)' : 'transparent', color: inputMode === 'manual' ? '#ffffff' : 'var(--text-secondary)', cursor: 'pointer' }}>Manual</button>
                      </div>
                      {inputMode === 'slug' ? (
                        <div style={{ position: 'relative' }}>
                          <input className="form-input" value={editRow.slug} onChange={(e) => handleSlugInput(e.target.value)} placeholder="athlete-slug" style={{ fontSize: 'var(--fs-sm)', fontFamily: 'monospace' }} />
                          {editRow.slug && resolveAthlete(editRow.slug) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginTop: 4 }}>
                              {resolveAthlete(editRow.slug).photoUrl ? <img src={resolveAthlete(editRow.slug).photoUrl} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} /> :
                                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--accent)' }}>{(resolveAthlete(editRow.slug).name || '?')[0]}</div>}
                              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>{resolveAthlete(editRow.slug).name}{resolveAthlete(editRow.slug).team && <span style={{ color: 'var(--text-muted)' }}> · {resolveAthlete(editRow.slug).team}</span>}</span>
                            </div>
                          )}
                          {slugSuggestions.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', maxHeight: 220, overflowY: 'auto', marginTop: 2 }}>
                              {slugSuggestions.map((a) => (
                                <div key={a.slug} onClick={() => selectSuggestion(a)}
                                  style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 'var(--fs-sm)', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-light)'} onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                                  <span style={{ fontWeight: 500 }}>{a.name}</span><span style={{ fontFamily: 'monospace', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{a.slug}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <input className="form-input" value={editRow.name} onChange={(e) => setEditRow((prev) => ({ ...prev, name: e.target.value }))} placeholder="Athlete name" style={{ fontSize: 'var(--fs-sm)' }} />
                          <input className="form-input" value={editRow.team} onChange={(e) => setEditRow((prev) => ({ ...prev, team: e.target.value }))} placeholder="Team (optional)" style={{ fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-2)' }} />
                        </>
                      )}
                    </td>
                    <td>
                      <input className="form-input" value={editRow.team} onChange={(e) => setEditRow((prev) => ({ ...prev, team: e.target.value }))} placeholder="Team from Excel" style={{ fontSize: 'var(--fs-sm)' }} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                        <button className="btn btn-primary" type="button" style={{ fontSize: 'var(--fs-xs)' }} onClick={saveEdit}>Save</button>
                        <button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)' }} onClick={() => { setEditingIndex(null); setSlugSuggestions([]); }}>Cancel</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td><strong>{entry.rank}</strong></td>
                    <td style={{ fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                        {entry.slug && resolveAthlete(entry.slug)?.photoUrl && (
                          <img src={resolveAthlete(entry.slug).photoUrl} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        )}
                        <span>{entryDisplayName(entry)}</span>
                        {entry.slug && <span style={{ fontSize: 'var(--fs-xs)', fontFamily: 'monospace', color: 'var(--text-muted)' }}>@{entry.slug}</span>}
                      </div>
                    </td>
                    <td>{entryDisplayTeam(entry)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                        <button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)' }} onClick={() => startEdit(i)}>Edit</button>
                        <button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)', color: 'var(--error)' }} onClick={() => deleteEntry(i)}>Delete</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
