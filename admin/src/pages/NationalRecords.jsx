import { useState, useEffect } from 'react';
import { getNationalRecords, createNationalRecord, updateNationalRecord, deleteNationalRecord } from '../api';

const EMPTY = {
  gender: 'Men',
  recordType: 'current',
  athleteName: '',
  athleteImageUrl: '',
  athleteSlug: '',
  recordTime: '',
  competition: '',
  venue: '',
  date: '',
  status: 'Active',
};

export default function NationalRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [filterGender, setFilterGender] = useState('All');

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const res = await getNationalRecords();
      // Flatten grouped data into array
      const flat = [];
      for (const gender of ['Men', 'Women']) {
        for (const type of ['current', 'previous']) {
          if (res[gender]?.[type]) {
            flat.push(...res[gender][type]);
          }
        }
      }
      setRecords(flat);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditingId('__new__');
    setForm(EMPTY);
  };

  const openEdit = (rec) => {
    setEditingId(rec._id);
    setForm({
      gender: rec.gender,
      recordType: rec.recordType,
      athleteName: rec.athleteName,
      athleteImageUrl: rec.athleteImageUrl || '',
      athleteSlug: rec.athleteSlug || '',
      recordTime: rec.recordTime,
      competition: rec.competition || '',
      venue: rec.venue || '',
      date: rec.date || '',
      status: rec.status,
    });
  };

  const cancelEdit = () => setEditingId(null);

  const save = async () => {
    if (!form.athleteName.trim() || !form.recordTime.trim()) {
      alert('Athlete name and record time are required.');
      return;
    }
    try {
      if (editingId === '__new__') {
        await createNationalRecord(form);
      } else {
        await updateNationalRecord(editingId, form);
      }
      await loadRecords();
      setEditingId(null);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this record?')) return;
    try {
      await deleteNationalRecord(id);
      setRecords(records.filter((r) => r._id !== id));
      if (editingId === id) setEditingId(null);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const filtered = filterGender === 'All' ? records : records.filter((r) => r.gender === filterGender);

  if (loading) return <p style={{ padding: 'var(--sp-6)' }}>Loading records...</p>;

  return (
    <>
      <div className="page-header">
        <h1>National Records</h1>
        <p>Manage Pakistan speed climbing national records for men and women.</p>
      </div>

      <div style={{ marginBottom: 'var(--sp-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          {['All', 'Men', 'Women'].map((g) => (
            <button key={g} className={`filter-chip${filterGender === g ? ' is-active' : ''}`} onClick={() => setFilterGender(g)}>{g}</button>
          ))}
        </div>
        <button className="btn btn-primary" type="button" onClick={openNew}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New Record
        </button>
      </div>

      {editingId !== null && (
        <div className="card" style={{ marginBottom: 'var(--sp-6)' }}>
          <div className="card-header">
            <h3 className="card-title">{editingId === '__new__' ? 'New National Record' : 'Edit Record'}</h3>
            <button className="btn btn-outline" type="button" onClick={cancelEdit}>Cancel</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option>Men</option><option>Women</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Record Type</label>
              <select className="form-input" value={form.recordType} onChange={(e) => setForm({ ...form, recordType: e.target.value })}>
                <option value="current">Current Record</option>
                <option value="previous">Previous Record</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Athlete Name</label>
              <input className="form-input" value={form.athleteName} onChange={(e) => setForm({ ...form, athleteName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Record Time</label>
              <input className="form-input" value={form.recordTime} onChange={(e) => setForm({ ...form, recordTime: e.target.value })} placeholder="e.g. 5.45s" />
            </div>
            <div className="form-group">
              <label className="form-label">Athlete Image URL</label>
              <input className="form-input" value={form.athleteImageUrl} onChange={(e) => setForm({ ...form, athleteImageUrl: e.target.value })} placeholder="https://..." />
            </div>
            <div className="form-group">
              <label className="form-label">Athlete Slug (for linking)</label>
              <input className="form-input" value={form.athleteSlug} onChange={(e) => setForm({ ...form, athleteSlug: e.target.value })} placeholder="athlete-slug" />
            </div>
            <div className="form-group">
              <label className="form-label">Competition</label>
              <input className="form-input" value={form.competition} onChange={(e) => setForm({ ...form, competition: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Venue</label>
              <input className="form-input" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option>Active</option><option>Historical</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
            <button className="btn btn-primary" type="button" onClick={save}>Save Record</button>
          </div>
        </div>
      )}

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
              <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--sp-8)' }}>No records yet.</td></tr>
            )}
            {filtered.map((rec) => (
              <tr key={rec._id}>
                <td><span className="badge badge-info">{rec.gender}</span></td>
                <td><span className={`badge ${rec.recordType === 'current' ? 'badge-success' : 'badge-warning'}`}>{rec.recordType === 'current' ? 'Current' : 'Previous'}</span></td>
                <td style={{ fontWeight: 500 }}>{rec.athleteName}</td>
                <td style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 'var(--fs-md)' }}>{rec.recordTime}</td>
                <td>{rec.competition || '—'}</td>
                <td>{rec.date ? new Date(rec.date).toLocaleDateString() : '—'}</td>
                <td><span className={`badge ${rec.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>{rec.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                    <button className="btn btn-outline" style={{ fontSize: 'var(--fs-xs)' }} onClick={() => openEdit(rec)}>Edit</button>
                    <button className="btn btn-outline" style={{ fontSize: 'var(--fs-xs)', color: 'var(--error)' }} onClick={() => handleDelete(rec._id)}>Delete</button>
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
