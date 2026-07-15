import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Climb Pakistan</h1>
        <p>Sign in to the admin panel</p>

        {error && (
          <div style={{
            background: 'rgba(248, 113, 113, 0.1)',
            color: 'var(--error)',
            padding: 'var(--sp-2) var(--sp-3)',
            borderRadius: 8,
            fontSize: 'var(--fs-sm)',
            marginBottom: 'var(--sp-4)',
          }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="email">Email</label>
          <input
            className="form-input"
            id="email"
            type="email"
            placeholder="admin@climbpakistan.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="password">Password</label>
          <input
            className="form-input"
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          className="btn btn-primary"
          type="submit"
          disabled={loading}
          style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
