import { useState, useEffect, useRef } from 'react';
import { getTeams, createTeam, updateTeam, deleteTeam, uploadPhoto } from '../api';

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSlug, setEditingSlug] = useState(null);
  const [form, setForm] = useState({ slug: '', name: '', logoUrl: '', description: '', active: true });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    getTeams().then(setTeams).finally(() => setLoading(false));
  }, []);

  const openNew = () => {
    setEditingSlug('__new__');
    setForm({ slug: '', name: '', logoUrl: '', description: '', active: true });
  };

  const openEdit = (team) => {
    setEditingSlug(team.slug);
    setForm({ ...team });
  };

  const cancelEdit = () => {
    setEditingSlug(null);
    setUploadError('');
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = form.name.trim() || file.name.replace(/\.[^.]+$/, '');
    setUploading(true);
    setUploadError('');

    try {
      const saved = await uploadPhoto(file, name, 'teams');
      setForm((prev) => ({ ...prev, logoUrl: saved.url }));
    } catch (err) {
      setUploadError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

const save = async () => {
    if (!form.name.trim()) return alert('Team name is required.');
    const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    try {
      if (editingSlug === '__new__') {
        await createTeam({ ...form, slug });
      } else {
        await updateTeam(editingSlug, { ...form, slug });
      }
      const updated = await getTeams();
      setTeams(updated);
      setEditingSlug(null);
    } catch (err) {
      alert('Failed to save team: ' + err.message);
    }
  };

  const handleDelete = async (slug) => {
    if (!confirm('Delete this team? This cannot be undone.')) return;
    try {
      await deleteTeam(slug);
      setTeams(teams.filter((t) => t.slug !== slug));
      if (editingSlug === slug) setEditingSlug(null);
    } catch (err) {
      alert('Failed to delete team: ' + err.message);
    }
  };

  if (loading) return <p style={{ padding: 'var(--sp-6)' }}>Loading teams...</p>;

  return (
    <>
      <div className="page-header">
        <h1>Teams</h1>
        <p>Create and manage team profiles used throughout the website.</p>
      </div>

      <div style={{ marginBottom: 'var(--sp-6)', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" type="button" onClick={openNew}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Team
        </button>
      </div>

      {editingSlug !== null && (
        <div className="card" style={{ marginBottom: 'var(--sp-6)' }}>
          <div className="card-header">
            <h3 className="card-title">{editingSlug === '__new__' ? 'New Team' : 'Edit Team'}</h3>
            <button className="btn btn-outline" type="button" onClick={cancelEdit}>Cancel</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
            <div className="form-group">
              <label className="form-label">Team Name *</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Islamabad Alpine Club" />
            </div>
            <div className="form-group">
              <label className="form-label">Team Slug (unique identifier) *</label>
              <input className="form-input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="e.g. islamabad-alpine-club" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Team Logo</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
              style={{
                display: 'block', width: '100%', padding: 'var(--sp-4)',
                border: '2px dashed var(--card-border)', borderRadius: 8,
                background: 'var(--bg-secondary)', cursor: 'pointer',
                fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)',
                marginBottom: 'var(--sp-2)',
              }}
            />
            {uploading && (
              <p style={{ color: 'var(--accent)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-2)' }}>
                Uploading to Cloudinary...
              </p>
            )}
            {uploadError && (
              <p style={{ color: 'var(--error)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-2)' }}>{uploadError}</p>
            )}
            <input className="form-input" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://res.cloudinary.com/.../team-logo.png" />
            {form.logoUrl && (
              <div style={{ marginTop: 'var(--sp-2)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <img src={form.logoUrl} alt="Team logo" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--card-border)' }} />
                <button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)' }} onClick={() => setForm({ ...form, logoUrl: '' })}>Remove</button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea className="form-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the team..." />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
              <span className="form-label" style={{ marginBottom: 0 }}>Active</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
            <button className="btn btn-primary" type="button" onClick={save}>Save Team</button>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: 60 }}>Logo</th>
              <th>Team Name</th>
              <th>Slug</th>
              <th>Status</th>
              <th style={{ width: 130 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--sp-8)' }}>No teams yet. Click "Add Team" to create one.</td></tr>
            )}
            {teams.map((team) => (
              <tr key={team.slug}>
                <td>
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 4 }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: 4, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{(team.name || '?')[0]}</div>
                  )}
                </td>
                <td style={{ fontWeight: 500 }}>{team.name}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{team.slug}</td>
                <td>{team.active ? <span className="badge badge-success">Active</span> : <span className="badge badge-warning">Inactive</span>}</td>
                <td>
                  <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                    <button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)' }} onClick={() => openEdit(team)}>Edit</button>
                    <button className="btn btn-outline" type="button" style={{ fontSize: 'var(--fs-xs)', color: 'var(--error)' }} onClick={() => handleDelete(team.slug)}>Delete</button>
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
