import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      const user = await login(formData.email, formData.password);

      // Redirect based on role
      const redirectRoutes = {
        COMMITTEE: '/committee',
        PLAYER: '/',
        REFEREE: '/referee',
        ADMIN: '/',
      };

      navigate(redirectRoutes[user.role] || '/');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    }
  };

  return (
    <div className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="form-card" style={{ maxWidth: 420, width: '100%' }}>
        <h2 className="form-title">Welcome Back</h2>
        <p className="form-subtitle">
          Sign in to your account to manage tournaments
        </p>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            <p style={{ color: '#dc2626', fontSize: '14px', margin: 0 }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <button
            className="btn-primary mt-16"
            type="submit"
            disabled={loading}
            style={{ width: '100%', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;

