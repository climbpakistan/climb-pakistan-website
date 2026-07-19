import { useState, useEffect } from 'react';
import { getNationalRecords, createNationalRecord, updateNationalRecord, deleteNationalRecord } from '../api';

/* ── Default form states ── */
const CURRENT_EMPTY = {
  gender: 'Men',
  athleteName: '',
  athleteImageUrl: '',
  athleteSlug: '',
  recordTime: '',
  competition: '',
  venue: '',
  date: '',
  status: 'Active',
};

const PREVIOUS_ROW_EMPTY = {
  athleteName: '',
  recordTime: '',
  competition: '',
  year: '',
};

export default function NationalRecords() {
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Current record form state ── */
  const [currentForm, setCurrentForm] = useState(CURRENT_EMPTY);
  const [editingCurrentId, setEditingCurrentId] = useState(null);
  const [showCurrentForm, setShowCurrentForm] = useState(false);

  /* ── Previous records — inline rows ── */
  const [previousRows, setPreviousRows] = useState([]);
  const [previousGender, setPreviousGender] = useState('Men');
  const [showPreviousEditor, setShowPreviousEditor] = useState(false);

  /* ── Filters ── */
  const [filterGender, setFilterGender] = useState('All');

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const res = await getNationalRecords();
      const flat = [];
      for (const gender of ['Men', 'Women']) {
        for (const type of ['current', 'previous']) {
          if (res[gender]?.[type]) {
            flat.push(...res[gender][type]);
          }
        }
      }
      setAllRecords(flat);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  /* ── Current record helpers ── */
  const openNewCurrent = () => {
    setEditingCurrentId('__new__');
    setCurrentForm(CURRENT_EMPTY);
    setShowCurrentForm(true);
  };

  const openEditCurrent = (rec) => {
    setEditingCurrentId(rec._id);
    setCurrentForm({
      gender: rec.gender,
      athleteName: rec.athleteName,
      athleteImageUrl: rec.athleteImageUrl || '',
      athleteSlug: rec.athleteSlug || '',
      recordTime: rec.recordTime,
      competition: rec.competition || '',
      venue: rec.venue || '',
      date: rec.date || '',
      status: rec.status,
    });
    setShowCurrentForm(true);
  };

  const cancelCurrent = () => {
    setShowCurrentForm(false);
    setEditingCurrentId(null);
  };

  const saveCurrent = async () => {
    if (!currentForm.athleteName.trim() || !currentForm.recordTime.trim()) {
      alert('Athlete name and record time are required.');
      return;
    }
    try {
      const payload = { ...currentForm, recordType: 'current' };
      if (editingCurrentId === '__new__') {
        await createNationalRecord(payload);
      } else {
        await updateNationalRecord(editingCurrentId, payload);
      }
      await loadRecords();
      cancelCurrent();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  /* ── Previous records — inline row helpers ── */
  const [editingPreviousId, setEditingPreviousId] = useState(null);

  const openPreviousEditor = () => {
    setEditingPreviousId(null);
    setPreviousRows([
      { _tempId: Date.now(), ...PREVIOUS_ROW_EMPTY },
    ]);
    setShowPreviousEditor(true);
  };

  const addPreviousRow = () => {
    setPreviousRows([
      ...previousRows,
      { _tempId: Date.now() + Math.random(), ...PREVIOUS_ROW_EMPTY },
    ]);
  };

  const removePreviousRow = (_tempId) => {
    setPreviousRows(previousRows.filter((r) => r._tempId !== _tempId));
  };

  const updatePreviousRow = (_tempId, field, value) => {
    setPreviousRows(previousRows.map((r) =>
      r._tempId === _tempId ? { ...r, [field]: value } : r
    ));
  };

  const cancelPreviousEditor = () => {
    setShowPreviousEditor(false);
    setPreviousRows([]);
    setEditingPreviousId(null);
  };

  const saveAllPrevious = async () => {
    const validRows = previousRows.filter(
      (r) => r.athleteName.trim() && r.recordTime.trim()
    );
    if (validRows.length === 0) {
      alert('Add at least one row with athlete name and record time.');
      return;
    }
    try {
      for (const row of validRows) {
        const payload = {
          gender: previousGender,
          athleteName: row.athleteName,
          recordTime: row.recordTime,
          competition: row.competition,
          date: row.year ? new Date(parseInt(row.year), 0, 1).toISOString() : '',
          recordType: 'previous',
          status: 'Historical',
        };
        if (row._existingId) {
          await updateNationalRecord(row._existingId, payload);
        } else {
          await createNationalRecord(payload);
        }
      }
      await loadRecords();
      cancelPreviousEditor();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  const openEditPrevious = (rec) => {
    setEditingPreviousId(rec._id);
    setPreviousGender(rec.gender);
    setPreviousRows([
      {
        _tempId: Date.now(),
        _existingId: rec._id,
        athleteName: rec.athleteName,
        recordTime: rec.recordTime,
        competition: rec.competition || '',
        year: rec.date ? new Date(rec.date).getFullYear().toString() : '',
      },
    ]);
    setShowPreviousEditor(true);
  };

  /* ── Delete ── */
  const handleDelete = async (id) => {
    if (!confirm('Delete this record?')) return;
    try {
      await deleteNationalRecord(id);
      setAllRecords(allRecords.filter((r) => r._id !== id));
      if (editingCurrentId === id) { cancelCurrent(); }
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const filtered = filterGender === 'All'
    ? allRecords
    : allRecords.filter((r) => r.gender === filterGender);

  if (loading) return <p style={{ padding: 'var(--sp-6)' }}>Loading records...</p>;

  return (
    <>
      <div className="page-header">
        <h1>National Records</h1>
        <p>Manage Pakistan speed climbing national records — current records and historical progression.</p>
      </div>

      {/* ── Filter bar ── */}
      <div style={{
        marginBottom: 'var(--sp-6)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 'var(--sp-3)',
      }}>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          {['All', 'Men', 'Women'].map((g) => (
            <button
              key={g}
              className={`filter-chip${filterGender === g ? ' is-active' : ''}`}
              onClick={() => setFilterGender(g)}
            >
              {g}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
          <button className="btn btn-primary" type="button" onClick={openNewCurrent}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Current Record
          </button>
          <button className="btn btn-outline" type="button" onClick={openPreviousEditor}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Previous Records
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════
         FORM 1 — CURRENT NATIONAL RECORD
         ════════════════════════════════════════════ */}
      {showCurrentForm && (
        <div className="card" style={{ marginBottom: 'var(--sp-6)', borderLeft: '4px solid var(--accent)' }}>
          <div className="card-header">
            <h3 className="card-title">
              {editingCurrentId === '__new__' ? 'New Current Record' : 'Edit Current Record'}
            </h3>
            <button className="btn btn-outline" type="button" onClick={cancelCurrent}>Cancel</button>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-4)' }}>
            Fields marked * are required.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
            <div className="form-group">
              <label className="form-label">Gender *</label>
              <select
                className="form-input"
                value={currentForm.gender}
                onChange={(e) => setCurrentForm({ ...currentForm, gender: e.target.value })}
              >
                <option>Men</option><option>Women</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Athlete Name *</label>
              <input
                className="form-input"
                value={currentForm.athleteName}
                onChange={(e) => setCurrentForm({ ...currentForm, athleteName: e.target.value })}
                placeholder="e.g. Mir Abu Zar Faiz"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Record Time *</label>
              <input
                className="form-input"
                value={currentForm.recordTime}
                onChange={(e) => setCurrentForm({ ...currentForm, recordTime: e.target.value })}
                placeholder="e.g. 6.07"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={currentForm.status}
                onChange={(e) => setCurrentForm({ ...currentForm, status: e.target.value })}
              >
                <option>Active</option><option>Historical</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Athlete Image URL</label>
              <input
                className="form-input"
                value={currentForm.athleteImageUrl}
                onChange={(e) => setCurrentForm({ ...currentForm, athleteImageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Athlete Slug (for linking)</label>
              <input
                className="form-input"
                value={currentForm.athleteSlug}
                onChange={(e) => setCurrentForm({ ...currentForm, athleteSlug: e.target.value })}
                placeholder="mir-abu-zar-faiz"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Competition</label>
              <input
                className="form-input"
                value={currentForm.competition}
                onChange={(e) => setCurrentForm({ ...currentForm, competition: e.target.value })}
                placeholder="e.g. National Azadi Cup 2024"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Venue</label>
              <input
                className="form-input"
                value={currentForm.venue}
                onChange={(e) => setCurrentForm({ ...currentForm, venue: e.target.value })}
                placeholder="e.g. Sports Complex, Islamabad"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                className="form-input"
                type="date"
                value={currentForm.date}
                onChange={(e) => setCurrentForm({ ...currentForm, date: e.target.value })}
              />
            </div>
          </div>
          <div style={{ marginTop: 'var(--sp-4)' }}>
            <button className="btn btn-primary" type="button" onClick={saveCurrent}>
              {editingCurrentId === '__new__' ? 'Create Record' : 'Update Record'}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
         FORM 2 — PREVIOUS NATIONAL RECORDS (inline rows)
         ════════════════════════════════════════════ */}
      {showPreviousEditor && (
        <div className="card" style={{ marginBottom: 'var(--sp-6)', borderLeft: '4px solid var(--warning)' }}>
          <div className="card-header">
            <h3 className="card-title">
              {editingPreviousId ? 'Edit Previous Record' : 'Add Previous Records'}
            </h3>
            <button className="btn btn-outline" type="button" onClick={cancelPreviousEditor}>Cancel</button>
          </div>

          {/* Gender selector */}
          <div style={{ marginBottom: 'var(--sp-4)' }}>
            <label className="form-label">Gender</label>
            <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-1)' }}>
              {['Men', 'Women'].map((g) => (
                <button
                  key={g}
                  className={`filter-chip${previousGender === g ? ' is-active' : ''}`}
                  onClick={() => setPreviousGender(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Inline rows */}
          <div className="table-container" style={{ marginBottom: 'var(--sp-4)' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 140 }}>Time</th>
                  <th>Athlete</th>
                  <th>Competition</th>
                  <th style={{ width: 100 }}>Year</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {previousRows.map((row, idx) => (
                  <tr key={row._tempId}>
                    <td>
                      <input
                        className="form-input"
                        value={row.recordTime}
                        onChange={(e) => updatePreviousRow(row._tempId, 'recordTime', e.target.value)}
                        placeholder="e.g. 6.54"
                        style={{ width: '100%', minWidth: 0 }}
                      />
                    </td>
                    <td>
                      <input
                        className="form-input"
                        value={row.athleteName}
                        onChange={(e) => updatePreviousRow(row._tempId, 'athleteName', e.target.value)}
                        placeholder="Athlete name"
                        style={{ width: '100%', minWidth: 0 }}
                      />
                    </td>
                    <td>
                      <input
                        className="form-input"
                        value={row.competition}
                        onChange={(e) => updatePreviousRow(row._tempId, 'competition', e.target.value)}
                        placeholder="Competition"
                        style={{ width: '100%', minWidth: 0 }}
                      />
                    </td>
                    <td>
                      <input
                        className="form-input"
                        value={row.year}
                        onChange={(e) => updatePreviousRow(row._tempId, 'year', e.target.value)}
                        placeholder="2024"
                        type="number"
                        style={{ width: '100%', minWidth: 0 }}
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-outline"
                        style={{
                          fontSize: 'var(--fs-xs)',
                          padding: 'var(--sp-1) var(--sp-2)',
                          color: 'var(--error)',
                          lineHeight: 1,
                        }}
                        onClick={() => removePreviousRow(row._tempId)}
                        title="Remove row"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
            <button className="btn btn-outline" type="button" onClick={addPreviousRow}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 'var(--sp-1)' }}>
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Row
            </button>
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
            <button className="btn btn-primary" type="button" onClick={saveAllPrevious}>
              Save {previousRows.filter((r) => r.athleteName.trim() && r.recordTime.trim()).length} Records
            </button>
            <button className="btn btn-outline" type="button" onClick={cancelPreviousEditor}>Cancel</button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
         TABLE — ALL RECORDS
         ════════════════════════════════════════════ */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Gender</th>
              <th>Type</th>
              <th>Athlete</th>
              <th>Time</th>
              <th>Competition</th>
              <th>Date</th>
              <th>Status</th>
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--sp-8)' }}>
                  No records yet.
                </td>
              </tr>
            )}
            {filtered.map((rec) => (
              <tr key={rec._id}>
                <td>
                  <span className="badge badge-info">{rec.gender}</span>
                </td>
                <td>
                  <span className={`badge ${rec.recordType === 'current' ? 'badge-success' : 'badge-warning'}`}>
                    {rec.recordType === 'current' ? 'Current' : 'Previous'}
                  </span>
                </td>
                <td style={{ fontWeight: 500 }}>{rec.athleteName}</td>
                <td style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 'var(--fs-md)' }}>{rec.recordTime}</td>
                <td>{rec.competition || '—'}</td>
                <td>{rec.date ? new Date(rec.date).toLocaleDateString() : '—'}</td>
                <td>
                  <span className={`badge ${rec.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                    {rec.status}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                    <button
                      className="btn btn-outline"
                      style={{ fontSize: 'var(--fs-xs)' }}
                      onClick={() => rec.recordType === 'current' ? openEditCurrent(rec) : openEditPrevious(rec)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-outline"
                      style={{ fontSize: 'var(--fs-xs)', color: 'var(--error)' }}
                      onClick={() => handleDelete(rec._id)}
                    >
                      Delete
                    </button>
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
