import { useState, useEffect, useMemo } from 'react';
import { getRankings, updateRankings, getTeamRankings, updateTeamRankings, getAthletes, getTeams, importRankingsExcel, importTeamRankingsExcel } from '../api';

const disciplines = ['Speed', 'Lead', 'Boulder'];
const genders = ['Men', 'Women'];
const TABS = ['Individual Rankings', 'Team Rankings'];

/** Extract unique years from flattened individual rankings keys (Gender|Discipline|Year) */
function extractIndividualYears(entries) {
  const years = new Set();
  for (const [key, value] of Object.entries(entries)) {
    const parts = key.split('|');
    if (parts[2] && Array.isArray(value) && value.length > 0) {
      years.add(parts[2]);
    }
  }
  return [...years].sort((a, b) => Number(b) - Number(a));
}

/** Extract unique years from team rankings object keys */
function extractTeamYears(entries) {
  return Object.keys(entries).filter((y) => y).sort((a, b) => Number(b) - Number(a));
}

// ── Individual Rankings helpers ──
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

// ── Team Rankings helpers ──
function flattenTeam(backend) {
  if (!backend || typeof backend !== 'object') return {};
  const flat = {};
  for (const year of Object.keys(backend)) {
    flat[year] = backend[year] || [];
  }
  return flat;
}

function nestTeam(flat) {
  const nested = {};
  for (const [year, entries] of Object.entries(flat)) {
    if (entries && entries.length > 0) nested[year] = entries;
  }
  return nested;
}

export default function Rankings() {
  const [tab, setTab] = useState('Individual Rankings');

  // ── Individual state ──
  const [gender, setGender] = useState('Men');
  const [discipline, setDiscipline] = useState('Speed');
  const [individualYear, setIndividualYear] = useState('');
  const [individualEntries, setIndividualEntries] = useState({});
  const [athletes, setAthletes] = useState([]);
  const [individualLoading, setIndividualLoading] = useState(true);
  const [editingIndex, setEditingIndex] = useState(null);
  const [inputMode, setInputMode] = useState('slug');
  const [editRow, setEditRow] = useState({ slug: '', name: '', team: '', photoUrl: '', points: 0 });
  const [slugSuggestions, setSlugSuggestions] = useState([]);
  const [individualImporting, setIndividualImporting] = useState(false);
  const [individualImportResult, setIndividualImportResult] = useState(null);

  // ── Team state ──
  const [teamYear, setTeamYear] = useState('');
  const [teamEntries, setTeamEntries] = useState({});
  const [teams, setTeams] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamEditingIndex, setTeamEditingIndex] = useState(null);
  const [teamInputMode, setTeamInputMode] = useState('slug');
  const [teamEditRow, setTeamEditRow] = useState({ teamSlug: '', teamName: '', menPoints: 0, womenPoints: 0 });
  const [teamSlugSuggestions, setTeamSlugSuggestions] = useState([]);
  const [teamImporting, setTeamImporting] = useState(false);
  const [teamImportResult, setTeamImportResult] = useState(null);

  // ── Data loading ──
  useEffect(() => {
    Promise.all([
      getRankings().then((data) => {
        const flat = flatten(data);
        setIndividualEntries(flat);
        // Default to most recent year with data
        const yrs = extractIndividualYears(flat);
        if (yrs.length > 0) setIndividualYear((prev) => prev || yrs[0]);
      }),
      getAthletes().then(setAthletes),
    ]).finally(() => setIndividualLoading(false));
  }, []);

  useEffect(() => {
    Promise.all([
      getTeamRankings().then((data) => {
        const flat = flattenTeam(data);
        setTeamEntries(flat);
        // Default to most recent year with data
        const yrs = extractTeamYears(flat);
        if (yrs.length > 0) setTeamYear((prev) => prev || yrs[0]);
      }),
      getTeams().then(setTeams),
    ]).finally(() => setTeamLoading(false));
  }, []);

  // ── Derived available years from loaded data ──
  const availableIndividualYears = useMemo(() => extractIndividualYears(individualEntries), [individualEntries]);
  const availableTeamYears = useMemo(() => extractTeamYears(teamEntries), [teamEntries]);

  // ── Individual helpers ──
  const individualKey = `${gender}|${discipline}|${individualYear}`;
  const currentIndividualEntries = individualEntries[individualKey] || [];

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
    if (entry.slug) {
      const a = resolveAthlete(entry.slug);
      return a ? a.team || '—' : '—';
    }
    return entry.team || '—';
  }

  function entryDisplayPhoto(entry) {
    if (entry.slug) {
      const a = resolveAthlete(entry.slug);
      return a?.photoUrl || '';
    }
    return entry.photoUrl || '';
  }

  function handleSlugInput(value) {
    const athlete = resolveAthlete(value);
    setEditRow((prev) => ({ ...prev, slug: value }));
    if (athlete) {
      setSlugSuggestions([]);
    } else if (value.trim()) {
      const matches = athletes.filter((a) => a.slug.toLowerCase().includes(value.toLowerCase()) || a.name.toLowerCase().includes(value.toLowerCase())).slice(0, 6);
      setSlugSuggestions(matches);
    } else {
      setSlugSuggestions([]);
    }
  }

  function selectSuggestion(athlete) {
    setEditRow((prev) => ({ ...prev, slug: athlete.slug }));
    setSlugSuggestions([]);
  }

  // ── Individual import ──
  const handleIndividualFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIndividualImporting(true);
    setIndividualImportResult(null);
    try {
      const result = await importRankingsExcel(file);
      setIndividualImportResult(result);
      // Refresh data
      const data = await getRankings();
      setIndividualEntries(flatten(data));
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      setIndividualImporting(false);
      e.target.value = '';
    }
  };

  // ── Individual row operations ──
  const addIndividualEntry = () => {
    const newEntry = { rank: currentIndividualEntries.length + 1, slug: '', points: 0 };
    setIndividualEntries({ ...individualEntries, [individualKey]: [...currentIndividualEntries, newEntry] });
    setEditingIndex(currentIndividualEntries.length);
    setEditRow({ ...newEntry, name: '', team: '', photoUrl: '' });
    setInputMode('slug');
    setSlugSuggestions([]);
  };

  const startIndividualEdit = (index) => {
    setEditingIndex(index);
    const entry = currentIndividualEntries[index];
    if (entry.slug) {
      setInputMode('slug');
      setEditRow({ slug: entry.slug, points: entry.points, name: '', team: '', photoUrl: '' });
    } else {
      setInputMode('manual');
      setEditRow({ slug: '', name: entry.name || '', team: entry.team || '', photoUrl: entry.photoUrl || '', points: entry.points });
    }
    setSlugSuggestions([]);
  };

  const saveIndividualEdit = () => {
    if (inputMode === 'slug' && !editRow.slug.trim()) { alert('Please enter an athlete slug or switch to Manual mode.'); return; }
    const updated = [...currentIndividualEntries];
    let savedEntry;
    if (inputMode === 'slug') {
      savedEntry = { rank: editingIndex + 1, slug: editRow.slug.trim(), points: editRow.points };
    } else {
      savedEntry = { rank: editingIndex + 1, name: editRow.name || 'Unknown', team: editRow.team || '', points: editRow.points };
      if (editRow.photoUrl) savedEntry.photoUrl = editRow.photoUrl;
    }
    updated[editingIndex] = savedEntry;
    setIndividualEntries({ ...individualEntries, [individualKey]: updated });
    setEditingIndex(null);
    setSlugSuggestions([]);
  };

  const deleteIndividualEntry = (index) => {
    if (!confirm('Delete this entry?')) return;
    const updated = currentIndividualEntries.filter((_, i) => i !== index).map((e, i) => ({ ...e, rank: i + 1 }));
    setIndividualEntries({ ...individualEntries, [individualKey]: updated });
    if (editingIndex === index) setEditingIndex(null);
  };

  const saveIndividualRankings = async () => {
    try { await updateRankings(nest(individualEntries)); alert('Individual rankings saved successfully!'); } catch (err) { alert('Failed to save: ' + err.message); }
  };

  // ── Team helpers ──
  const currentTeamEntries = teamEntries[teamYear] || [];

  function resolveTeam(slug) {
    return teams?.find((t) => t.slug === slug);
  }

  // ── Team row operations ──
  const addTeamEntry = () => {
    const newEntry = { rank: currentTeamEntries.length + 1, teamSlug: '', teamName: '', menPoints: 0, womenPoints: 0, totalPoints: 0 };
    setTeamEntries({ ...teamEntries, [teamYear]: [...currentTeamEntries, newEntry] });
    setTeamEditingIndex(currentTeamEntries.length);
    setTeamEditRow({ teamSlug: '', teamName: '', menPoints: 0, womenPoints: 0 });
    setTeamInputMode('slug');
    setTeamSlugSuggestions([]);
  };

  const startTeamEdit = (index) => {
    setTeamEditingIndex(index);
    const entry = currentTeamEntries[index];
    if (entry.teamSlug) {
      setTeamInputMode('slug');
      setTeamEditRow({ teamSlug: entry.teamSlug, teamName: '', menPoints: entry.menPoints || 0, womenPoints: entry.womenPoints || 0 });
    } else {
      setTeamInputMode('manual');
      setTeamEditRow({ teamSlug: '', teamName: entry.teamName || '', menPoints: entry.menPoints || 0, womenPoints: entry.womenPoints || 0 });
    }
    setTeamSlugSuggestions([]);
  };

  function handleTeamSlugInput(value) {
    const team = resolveTeam(value);
    setTeamEditRow((prev) => ({ ...prev, teamSlug: value }));
    if (team) {
      setTeamSlugSuggestions([]);
    } else if (value.trim()) {
      const matches = teams.filter((t) => t.slug.toLowerCase().includes(value.toLowerCase()) || t.name.toLowerCase().includes(value.toLowerCase())).slice(0, 6);
      setTeamSlugSuggestions(matches);
    } else {
      setTeamSlugSuggestions([]);
    }
  }

  function selectTeamSuggestion(team) {
    setTeamEditRow((prev) => ({ ...prev, teamSlug: team.slug }));
    setTeamSlugSuggestions([]);
  }

  const saveTeamEdit = () => {
    if (teamInputMode === 'slug' && !teamEditRow.teamSlug.trim()) { alert('Please select a team slug or switch to Manual mode.'); return; }
    if (teamInputMode === 'manual' && !teamEditRow.teamName.trim()) { alert('Please enter a team name.'); return; }
    const updated = [...currentTeamEntries];
    const total = Number(teamEditRow.menPoints) + Number(teamEditRow.womenPoints);
    let savedEntry;
    if (teamInputMode === 'slug') {
      const team = resolveTeam(teamEditRow.teamSlug.trim());
      savedEntry = {
        rank: teamEditingIndex + 1,
        teamSlug: teamEditRow.teamSlug.trim(),
        teamName: team ? team.name : teamEditRow.teamSlug.trim(),
        menPoints: Number(teamEditRow.menPoints) || 0,
        womenPoints: Number(teamEditRow.womenPoints) || 0,
        totalPoints: total,
      };
    } else {
      savedEntry = {
        rank: teamEditingIndex + 1,
        teamName: teamEditRow.teamName.trim(),
        menPoints: Number(teamEditRow.menPoints) || 0,
        womenPoints: Number(teamEditRow.womenPoints) || 0,
        totalPoints: total,
      };
    }
    updated[teamEditingIndex] = savedEntry;
    setTeamEntries({ ...teamEntries, [teamYear]: updated });
    setTeamEditingIndex(null);
    setTeamSlugSuggestions([]);
  };

  const deleteTeamEntry = (index) => {
    if (!confirm('Delete this team entry?')) return;
    const updated = currentTeamEntries.filter((_, i) => i !== index).map((e, i) => ({ ...e, rank: i + 1 }));
    setTeamEntries({ ...teamEntries, [teamYear]: updated });
    if (teamEditingIndex === index) setTeamEditingIndex(null);
  };

  const handleTeamFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTeamImporting(true);
    setTeamImportResult(null);
    try {
      const result = await importTeamRankingsExcel(file);
      setTeamImportResult(result);
      // Refresh data
      const teamData = await getTeamRankings();
      setTeamEntries(flattenTeam(teamData));
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      setTeamImporting(false);
      e.target.value = '';
    }
  };

  const saveTeamRankings = async () => {
    try { await updateTeamRankings(nestTeam(teamEntries)); alert('Team rankings saved successfully!'); } catch (err) { alert('Failed to save: ' + err.message); }
  };

  if (individualLoading && teamLoading) return <p style={{ padding: 'var(--sp-6)' }}>Loading rankings...</p>;

  return (
    <>
      <div className="page-header"><h1>Rankings</h1><p>Manage national rankings — individual athlete rankings and team rankings.</p></div>

      {/* Tab toggle */}
      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-6)', borderBottom: '1px solid var(--card-border)', paddingBottom: 'var(--sp-3)' }}>
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            style={{ padding: 'var(--sp-2) var(--sp-5)', borderRadius: 6, border: 'none', fontSize: 'var(--fs-sm)', fontWeight: 600, background: tab === t ? 'var(--accent)' : 'transparent', color: tab === t ? '#ffffff' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s ease' }}>{t}</button>
        ))}
      </div>

      {/* ═══════ INDIVIDUAL RANKINGS ═══════ */}
      {tab === 'Individual Rankings' && (
        <>
          <div style={{ display: 'flex', gap: 'var(--sp-3)', marginBottom: 'var(--sp-6)', flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="form-input" style={{ width: 'auto' }} value={gender} onChange={(e) => setGender(e.target.value)}>{genders.map((o) => <option key={o}>{o}</option>)}</select>
            <select className="form-input" style={{ width: 'auto' }} value={discipline} onChange={(e) => setDiscipline(e.target.value)}>{disciplines.map((o) => <option key={o}>{o}</option>)}</select>
            <input
              type="text"
              className="form-input"
              style={{ width: 100 }}
              value={individualYear}
              onChange={(e) => {
                const val = e.target.value;
                // Only allow up to 4 digits
                if (/^\d{0,4}$/.test(val)) setIndividualYear(val);
              }}
              onBlur={() => {
                // Validate on blur — must be 4 digits in 1900–2100
                if (individualYear.length === 4) {
                  const n = Number(individualYear);
                  if (n < 1900 || n > 2100) {
                    alert('Year must be between 1900 and 2100.');
                    setIndividualYear('');
                  }
                }
              }}
              placeholder="Year"
              list="individual-year-list"
              title="Enter a 4-digit year (e.g. 2025)"
            />
            <datalist id="individual-year-list">
              {availableIndividualYears.map((y) => <option key={y} value={y} />)}
            </datalist>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
              <button className="btn btn-primary" type="button" onClick={addIndividualEntry}>+ Add Entry</button>
              <label className="btn btn-outline" style={{ cursor: individualImporting ? 'not-allowed' : 'pointer', opacity: individualImporting ? 0.6 : 1, fontSize: 'var(--fs-sm)' }}>
                {individualImporting ? (
                  <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> Importing...</>
                ) : (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    Import Excel</>
                )}
                <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} disabled={individualImporting} onChange={handleIndividualFileUpload} />
              </label>
              <button className="btn btn-primary" type="button" onClick={saveIndividualRankings} style={{ background: 'var(--success)', borderColor: 'var(--success)' }}>Save All Rankings</button>
            </div>
          </div>

          {/* Import result card */}
          {individualImportResult && (
            <div className="card" style={{ marginBottom: 'var(--sp-6)', borderLeft: '3px solid var(--success)' }}>
              <div className="card-header">
                <h3 className="card-title">Import Results</h3>
                <button className="btn btn-outline" type="button" onClick={() => setIndividualImportResult(null)}>Dismiss</button>
              </div>
              <div style={{ padding: 'var(--sp-4)' }}>
                <div style={{ display: 'flex', gap: 'var(--sp-4)', marginBottom: 'var(--sp-3)', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center', padding: 'var(--sp-3)', background: 'var(--accent-light)', borderRadius: 8, minWidth: 80 }}>
                    <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, color: 'var(--accent)' }}>{individualImportResult.summary.totalEntries}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Total Entries</div>
                  </div>
                </div>
                {individualImportResult.summary.groups?.length > 0 && (
                  <details>
                    <summary style={{ cursor: 'pointer', fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>Show breakdown by category</summary>
                    <div style={{ marginTop: 'var(--sp-2)', display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                      {individualImportResult.summary.groups.map((g) => (
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

          <div className="table-container"><table><thead><tr><th style={{ width: 60 }}>Rank</th><th>Athlete</th><th>Team</th><th style={{ width: 100 }}>Points</th><th style={{ width: 130 }}>Actions</th></tr></thead><tbody>
            {currentIndividualEntries.length === 0 && (<tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--sp-8)' }}>No entries yet for {gender} {discipline} {individualYear}. Click &quot;Add Entry&quot; to begin.</td></tr>)}
            {currentIndividualEntries.map((entry, i) => (<tr key={i}>
              {editingIndex === i ? (<>
                <td><strong>#{i + 1}</strong></td>
                <td>
                  <div style={{ marginBottom: 'var(--sp-2)', display: 'flex', gap: 'var(--sp-1)' }}>
                    <button type="button" onClick={() => { setInputMode('slug'); setEditRow((prev) => ({ ...prev, slug: '', name: '', team: '', photoUrl: '' })); }}
                      style={{ fontSize: 'var(--fs-xs)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--card-border)', background: inputMode === 'slug' ? 'var(--accent)' : 'transparent', color: inputMode === 'slug' ? '#ffffff' : 'var(--text-secondary)', cursor: 'pointer' }}>Select by Slug</button>
                    <button type="button" onClick={() => { setInputMode('manual'); setEditRow((prev) => ({ ...prev, slug: '' })); }}
                      style={{ fontSize: 'var(--fs-xs)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--card-border)', background: inputMode === 'manual' ? 'var(--accent)' : 'transparent', color: inputMode === 'manual' ? '#ffffff' : 'var(--text-secondary)', cursor: 'pointer' }}>Manual</button>
                  </div>
                  {inputMode === 'slug' ? (
                    <div style={{ position: 'relative' }}>
                      <input className="form-input" value={editRow.slug} onChange={(e) => handleSlugInput(e.target.value)} placeholder="athlete-slug" style={{ fontSize: 'var(--fs-sm)', fontFamily: 'monospace' }} />
                      {editRow.slug && resolveAthlete(editRow.slug) && (<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginTop: 4, paddingLeft: 2 }}>
                        {resolveAthlete(editRow.slug).photoUrl ? <img src={resolveAthlete(editRow.slug).photoUrl} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} /> :
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--accent)' }}>{(resolveAthlete(editRow.slug).name || '?')[0]}</div>}
                        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>{resolveAthlete(editRow.slug).name}{resolveAthlete(editRow.slug).team && <span style={{ color: 'var(--text-muted)' }}> · {resolveAthlete(editRow.slug).team}</span>}</span>
                      </div>)}
                      {slugSuggestions.length > 0 && (<div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', maxHeight: 220, overflowY: 'auto', marginTop: 2 }}>
                        {slugSuggestions.map((a) => (<div key={a.slug} onClick={() => selectSuggestion(a)} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 'var(--fs-sm)', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-light)'} onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                          <span style={{ fontWeight: 500 }}>{a.name}</span><span style={{ fontFamily: 'monospace', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{a.slug}</span></div>))}
                      </div>)}
                    </div>
                  ) : (<><input className="form-input" value={editRow.name} onChange={(e) => setEditRow((prev) => ({ ...prev, name: e.target.value }))} placeholder="Athlete name" style={{ fontSize: 'var(--fs-sm)' }} /><input className="form-input" value={editRow.photoUrl} onChange={(e) => setEditRow((prev) => ({ ...prev, photoUrl: e.target.value }))} placeholder="Photo URL (optional)" style={{ fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-2)' }} /></>)}
                </td>
                <td>{inputMode === 'slug' ? <input className="form-input" value={editRow.slug ? (resolveAthlete(editRow.slug)?.team || '') : ''} disabled placeholder="Auto-resolved" style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }} /> :
                  <input className="form-input" value={editRow.team} onChange={(e) => setEditRow((prev) => ({ ...prev, team: e.target.value }))} placeholder="Team name" style={{ fontSize: 'var(--fs-sm)' }} />}</td>
                <td><input className="form-input" type="number" min="0" value={editRow.points} onChange={(e) => setEditRow((prev) => ({ ...prev, points: Number(e.target.value) }))} style={{ width: 80, fontSize: 'var(--fs-sm)' }} /></td>
                <td><div style={{ display: 'flex', gap: 'var(--sp-2)' }}><button className="btn btn-primary" type="button" style={{ fontSize: 'var(--fs-xs)' }} onClick={saveIndividualEdit}>Save</button><button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)' }} onClick={() => { setEditingIndex(null); setSlugSuggestions([]); }}>Cancel</button></div></td>
              </>) : (<>
                <td><strong>{entry.rank}</strong></td>
                <td style={{ fontWeight: 500 }}><div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  {entryDisplayPhoto(entry) && <img src={entryDisplayPhoto(entry)} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />}
                  <span>{entryDisplayName(entry)}</span>{entry.slug && <span style={{ fontSize: 'var(--fs-xs)', fontFamily: 'monospace', color: 'var(--text-muted)' }}>@{entry.slug}</span>}</div></td>
                <td>{entryDisplayTeam(entry)}</td><td>{entry.points}</td>
                <td><div style={{ display: 'flex', gap: 'var(--sp-2)' }}><button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)' }} onClick={() => startIndividualEdit(i)}>Edit</button><button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)', color: 'var(--error)' }} onClick={() => deleteIndividualEntry(i)}>Delete</button></div></td>
              </>)}
            </tr>))}
          </tbody></table></div>
        </>
      )}

      {/* ═══════ TEAM RANKINGS ═══════ */}
      {tab === 'Team Rankings' && (
        <>
          <div style={{ display: 'flex', gap: 'var(--sp-3)', marginBottom: 'var(--sp-6)', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              style={{ width: 100 }}
              value={teamYear}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d{0,4}$/.test(val)) setTeamYear(val);
              }}
              onBlur={() => {
                if (teamYear.length === 4) {
                  const n = Number(teamYear);
                  if (n < 1900 || n > 2100) {
                    alert('Year must be between 1900 and 2100.');
                    setTeamYear('');
                  }
                }
              }}
              placeholder="Year"
              list="team-year-list"
              title="Enter a 4-digit year (e.g. 2025)"
            />
            <datalist id="team-year-list">
              {availableTeamYears.map((y) => <option key={y} value={y} />)}
            </datalist>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
              <button className="btn btn-primary" type="button" onClick={addTeamEntry}>+ Add Entry</button>
              <label className="btn btn-outline" style={{ cursor: teamImporting ? 'not-allowed' : 'pointer', opacity: teamImporting ? 0.6 : 1, fontSize: 'var(--fs-sm)' }}>
                {teamImporting ? (
                  <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> Importing...</>
                ) : (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    Import Excel</>
                )}
                <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} disabled={teamImporting} onChange={handleTeamFileUpload} />
              </label>
              <button className="btn btn-primary" type="button" onClick={saveTeamRankings} style={{ background: 'var(--success)', borderColor: 'var(--success)' }}>Save All Rankings</button>
            </div>
          </div>

          {/* Import result card */}
          {teamImportResult && (
            <div className="card" style={{ marginBottom: 'var(--sp-6)', borderLeft: '3px solid var(--success)' }}>
              <div className="card-header">
                <h3 className="card-title">Import Results</h3>
                <button className="btn btn-outline" type="button" onClick={() => setTeamImportResult(null)}>Dismiss</button>
              </div>
              <div style={{ display: 'flex', gap: 'var(--sp-6)', padding: 'var(--sp-4)' }}>
                {teamImportResult.summary.yearsImported?.map((year) => (
                  <div key={year} style={{ textAlign: 'center', padding: 'var(--sp-3)', background: 'var(--accent-light)', borderRadius: 8, minWidth: 80 }}>
                    <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, color: 'var(--accent)' }}>{year}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Imported</div>
                  </div>
                ))}
                <div style={{ textAlign: 'center', padding: 'var(--sp-3)', background: 'var(--surface-2)', borderRadius: 8, minWidth: 80 }}>
                  <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>{teamImportResult.summary.totalEntries}</div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Total Entries</div>
                </div>
              </div>
            </div>
          )}
          <div className="table-container"><table><thead><tr><th style={{ width: 60 }}>Rank</th><th>Team</th><th style={{ width: 110 }}>Men&apos;s Points</th><th style={{ width: 120 }}>Women&apos;s Points</th><th style={{ width: 110 }}>Total Points</th><th style={{ width: 130 }}>Actions</th></tr></thead><tbody>
            {currentTeamEntries.length === 0 && (<tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--sp-8)' }}>No team entries yet for {teamYear}. Click &quot;Add Entry&quot; to begin.</td></tr>)}
            {currentTeamEntries.map((entry, i) => (
              <tr key={i}>
                {teamEditingIndex === i ? (<>
                  <td><strong>#{i + 1}</strong></td>
                  <td>
                    <div style={{ marginBottom: 'var(--sp-2)', display: 'flex', gap: 'var(--sp-1)' }}>
                      <button type="button" onClick={() => { setTeamInputMode('slug'); setTeamEditRow((prev) => ({ ...prev, teamSlug: '', teamName: '' })); }}
                        style={{ fontSize: 'var(--fs-xs)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--card-border)', background: teamInputMode === 'slug' ? 'var(--accent)' : 'transparent', color: teamInputMode === 'slug' ? '#ffffff' : 'var(--text-secondary)', cursor: 'pointer' }}>Select by Slug</button>
                      <button type="button" onClick={() => { setTeamInputMode('manual'); setTeamEditRow((prev) => ({ ...prev, teamSlug: '' })); }}
                        style={{ fontSize: 'var(--fs-xs)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--card-border)', background: teamInputMode === 'manual' ? 'var(--accent)' : 'transparent', color: teamInputMode === 'manual' ? '#ffffff' : 'var(--text-secondary)', cursor: 'pointer' }}>Manual</button>
                    </div>
                    {teamInputMode === 'slug' ? (
                      <div style={{ position: 'relative' }}>
                        <input className="form-input" value={teamEditRow.teamSlug} onChange={(e) => handleTeamSlugInput(e.target.value)} placeholder="team-slug" style={{ fontSize: 'var(--fs-sm)', fontFamily: 'monospace' }} />
                        {teamEditRow.teamSlug && resolveTeam(teamEditRow.teamSlug) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginTop: 4, paddingLeft: 2 }}>
                            {resolveTeam(teamEditRow.teamSlug).logoUrl ? <img src={resolveTeam(teamEditRow.teamSlug).logoUrl} alt="" style={{ width: 22, height: 22, objectFit: 'contain', borderRadius: 4 }} /> : null}
                            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>{resolveTeam(teamEditRow.teamSlug).name}</span>
                          </div>)}
                        {teamSlugSuggestions.length > 0 && (<div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', maxHeight: 220, overflowY: 'auto', marginTop: 2 }}>
                          {teamSlugSuggestions.map((t) => (<div key={t.slug} onClick={() => selectTeamSuggestion(t)} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 'var(--fs-sm)', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-light)'} onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                            {t.logoUrl ? <img src={t.logoUrl} alt="" style={{ width: 20, height: 20, objectFit: 'contain', borderRadius: 2 }} /> : null}
                            <span style={{ fontWeight: 500 }}>{t.name}</span><span style={{ fontFamily: 'monospace', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{t.slug}</span></div>))}
                        </div>)}
                      </div>
                    ) : (<input className="form-input" value={teamEditRow.teamName} onChange={(e) => setTeamEditRow((prev) => ({ ...prev, teamName: e.target.value }))} placeholder="Team name" style={{ fontSize: 'var(--fs-sm)' }} />)}
                  </td>
                  <td><input className="form-input" type="number" min="0" value={teamEditRow.menPoints} onChange={(e) => setTeamEditRow((prev) => ({ ...prev, menPoints: Number(e.target.value) }))} style={{ width: 90, fontSize: 'var(--fs-sm)' }} /></td>
                  <td><input className="form-input" type="number" min="0" value={teamEditRow.womenPoints} onChange={(e) => setTeamEditRow((prev) => ({ ...prev, womenPoints: Number(e.target.value) }))} style={{ width: 90, fontSize: 'var(--fs-sm)' }} /></td>
                  <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{Number(teamEditRow.menPoints) + Number(teamEditRow.womenPoints)}</td>
                  <td><div style={{ display: 'flex', gap: 'var(--sp-2)' }}><button className="btn btn-primary" type="button" style={{ fontSize: 'var(--fs-xs)' }} onClick={saveTeamEdit}>Save</button><button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)' }} onClick={() => { setTeamEditingIndex(null); setTeamSlugSuggestions([]); }}>Cancel</button></div></td>
                </>) : (<>
                  <td><strong>{entry.rank}</strong></td>
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                      {entry.teamSlug && resolveTeam(entry.teamSlug)?.logoUrl ? <img src={resolveTeam(entry.teamSlug).logoUrl} alt="" style={{ width: 24, height: 24, objectFit: 'contain', flexShrink: 0 }} /> : null}
                      <span>{entry.teamName}</span>
                      {entry.teamSlug && <span style={{ fontSize: 'var(--fs-xs)', fontFamily: 'monospace', color: 'var(--text-muted)' }}>@{entry.teamSlug}</span>}
                    </div>
                  </td>
                  <td>{entry.menPoints}</td><td>{entry.womenPoints}</td><td style={{ fontWeight: 600, color: 'var(--accent)' }}>{entry.totalPoints}</td>
                  <td><div style={{ display: 'flex', gap: 'var(--sp-2)' }}><button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)' }} onClick={() => startTeamEdit(i)}>Edit</button><button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)', color: 'var(--error)' }} onClick={() => deleteTeamEntry(i)}>Delete</button></div></td>
                </>)}
              </tr>
            ))}
          </tbody></table></div>
        </>
      )}
    </>
  );
}
