import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Inline styles for the login page — self-contained, no class conflicts
const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    background: 'var(--bg-base)',
  },
  // Left brand panel (hidden on mobile)
  brand: {
    flex: '0 0 42%',
    background: 'linear-gradient(155deg, #14532d 0%, #166534 40%, #15803d 75%, #1a9e4a 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '48px 48px 44px',
    position: 'relative',
    overflow: 'hidden',
  },
  brandGrid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
  },
  brandCircle1: {
    position: 'absolute',
    top: '-80px', right: '-80px',
    width: 280, height: 280,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
    pointerEvents: 'none',
  },
  brandCircle2: {
    position: 'absolute',
    bottom: '-60px', left: '-60px',
    width: 220, height: 220,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.05)',
    pointerEvents: 'none',
  },
  brandLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
    zIndex: 1,
  },
  brandMark: {
    width: 44, height: 44,
    borderRadius: 13,
    background: 'rgba(255,255,255,0.2)',
    border: '1px solid rgba(255,255,255,0.3)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
  },
  brandName: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 22,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.02em',
  },
  brandSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  brandContent: {
    position: 'relative',
    zIndex: 1,
  },
  brandHeadline: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 36,
    fontWeight: 800,
    color: '#fff',
    lineHeight: 1.15,
    letterSpacing: '-0.03em',
    marginBottom: 16,
  },
  brandCaption: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 1.6,
    maxWidth: 300,
  },
  brandPills: {
    display: 'flex',
    gap: 8,
    marginTop: 28,
    flexWrap: 'wrap',
    position: 'relative',
    zIndex: 1,
  },
  brandPill: {
    padding: '6px 14px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.14)',
    border: '1px solid rgba(255,255,255,0.22)',
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.04em',
    backdropFilter: 'blur(4px)',
  },
  // Right form panel
  formPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 32px',
  },
  formBox: {
    width: '100%',
    maxWidth: 400,
  },
  formEyebrow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
  },
  formEyebrowDot: {
    width: 8, height: 8,
    borderRadius: '50%',
    background: 'var(--accent)',
  },
  formEyebrowText: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-faint)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  divider: {
    height: '1px',
    background: 'var(--border)',
    margin: '24px 0',
  },
};

// SVG icon
const ShuttlecockSVG = () => (
  <svg width="20" height="24" viewBox="0 0 17 20" fill="none" aria-hidden="true">
    <ellipse cx="8.5" cy="16.5" rx="3.5" ry="2.5" fill="currentColor" opacity="0.95"/>
    <line x1="8.5" y1="14" x2="4"    y2="3"    stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="8.5" y1="14" x2="6.5"  y2="2"    stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="8.5" y1="14" x2="8.5"  y2="1.5"  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="8.5" y1="14" x2="10.5" y2="2"    stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="8.5" y1="14" x2="13"   y2="3"    stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M4 3 Q8.5 0.5 13 3" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
  </svg>
);

function Login() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password.');
      return;
    }
    try {
      const user = await login(formData.email, formData.password);
      const routes = { COMMITTEE: '/committee', PLAYER: '/player', REFEREE: '/referee', ADMIN: '/' };
      navigate(routes[user.role] || '/');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    }
  };

  return (
    <div style={S.page}>

      {/* ── Brand panel (desktop only) ── */}
      <div style={S.brand} className="login-brand-panel">
        <div style={S.brandGrid} />
        <div style={S.brandCircle1} />
        <div style={S.brandCircle2} />

        {/* Logo */}
        <div style={S.brandLogo}>
          <div style={S.brandMark}><ShuttlecockSVG /></div>
          <div>
            <div style={S.brandName}>SportHive</div>
            <div style={S.brandSub}>Badminton</div>
          </div>
        </div>

        {/* Headline */}
        <div style={S.brandContent}>
          <h2 style={S.brandHeadline}>
            Run every<br />tournament<br />flawlessly.
          </h2>
          <p style={S.brandCaption}>
            Schedule matches, track standings, and manage participants — all in one place.
          </p>
          <div style={S.brandPills}>
            {['Round Robin', 'Knockout Brackets', 'Live Scores', 'Auto Scheduling'].map(t => (
              <span key={t} style={S.brandPill}>{t}</span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            Trusted by tournament organizers
          </p>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div style={S.formPanel}>
        <div style={S.formBox}>

          {/* Eyebrow */}
          <div style={S.formEyebrow}>
            <div style={S.formEyebrowDot} />
            <span style={S.formEyebrowText}>Sign in to SportHive</span>
          </div>

          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 28, fontWeight: 700,
            letterSpacing: '-0.025em',
            color: 'var(--text-primary)',
            margin: '0 0 8px',
          }}>
            Welcome back
          </h1>
          <p style={{
            fontSize: 14, color: 'var(--text-muted)',
            margin: '0 0 28px', lineHeight: 1.5,
          }}>
            Enter your credentials to continue.
          </p>

          {/* Error */}
          {error && (
            <div className="alert-error" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                name="email"
                className="form-input"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                autoFocus
                autoComplete="email"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    color: 'var(--text-faint)',
                    cursor: 'pointer', padding: 2,
                    fontSize: 12, fontWeight: 500,
                  }}
                  title={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              className="btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '11px', fontSize: 15 }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div style={S.divider} />

          <p style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>
            Don't have an account?{' '}
            <Link
              to="/register"
              style={{
                color: 'var(--text-link)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Create one →
            </Link>
          </p>
        </div>
      </div>

      {/* Responsive: hide brand panel on small screens */}
      <style>{`
        @media (max-width: 720px) {
          .login-brand-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default Login;
