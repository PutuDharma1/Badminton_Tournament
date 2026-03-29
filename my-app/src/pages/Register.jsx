import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import participantsApi from '../api/participants';

// ─── Role selector pill ───────────────────────────────────────────────────────
function RolePill({ value, current, label, icon, onClick }) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '12px 8px',
        borderRadius: 10,
        border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        background: active ? 'rgba(var(--accent-rgb,21,128,61),0.08)' : 'var(--bg-subtle)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{
        fontSize: 11.5,
        fontWeight: 600,
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        letterSpacing: '0.04em',
      }}>
        {label}
      </span>
    </button>
  );
}

// ─── Field row (label + input) ────────────────────────────────────────────────
function Field({ label, optional, children }) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {optional && <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 5, fontWeight: 400 }}>optional</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Register Page ────────────────────────────────────────────────────────────
function Register() {
  const navigate = useNavigate();
  const { register, loading } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'PLAYER',
    birthDate: '',
    gender: '',
    phone: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const setRole = (role) => {
    setFormData(prev => ({ ...prev, role }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.password) return 'Please fill in all required fields.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Please enter a valid email address.';
    if (formData.password.length < 6) return 'Password must be at least 6 characters.';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match.';
    if (formData.role === 'PLAYER') {
      if (!formData.birthDate) return 'Birth date is required for players.';
      if (!formData.gender) return 'Gender is required for players.';
      if (new Date(formData.birthDate) >= new Date()) return 'Birth date must be in the past.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }
    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      };
      if (formData.role === 'PLAYER') {
        userData.birthDate = formData.birthDate;
        userData.gender = formData.gender;
        if (formData.phone) userData.phone = formData.phone;
      }
      await register(userData);
      setSuccess('Account created! Redirecting to sign in…');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    }
  };

  const isPlayer = formData.role === 'PLAYER';

  const ROLES = [
    { value: 'PLAYER',    label: 'Player',    icon: '🏸' },
    { value: 'COMMITTEE', label: 'Committee', icon: '🎯' },
    { value: 'REFEREE',   label: 'Referee',   icon: '⚖️' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-base)' }}>

      {/* ── Brand panel (desktop only) ── */}
      <div
        className="login-brand-panel"
        style={{
          flex: '0 0 42%',
          background: 'linear-gradient(155deg, #14532d 0%, #166534 40%, #15803d 75%, #1a9e4a 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '48px 48px 44px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 13,
            background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="24" viewBox="0 0 17 20" fill="none" style={{ color: '#fff' }}>
              <ellipse cx="8.5" cy="16.5" rx="3.5" ry="2.5" fill="currentColor" opacity="0.95"/>
              <line x1="8.5" y1="14" x2="4" y2="3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <line x1="8.5" y1="14" x2="6.5" y2="2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <line x1="8.5" y1="14" x2="8.5" y2="1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <line x1="8.5" y1="14" x2="10.5" y2="2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <line x1="8.5" y1="14" x2="13" y2="3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M4 3 Q8.5 0.5 13 3" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>SportHive</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>Badminton</div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 36, fontWeight: 800,
            color: '#fff', lineHeight: 1.15,
            letterSpacing: '-0.03em', marginBottom: 16,
          }}>
            Join the<br />tournament<br />community.
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, maxWidth: 300 }}>
            Register as a player, committee member, or referee — and be part of every match.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 28, flexWrap: 'wrap' }}>
            {['Free to Join', 'Auto Scheduling', 'Live Brackets', 'Score Tracking'].map(t => (
              <span key={t} style={{
                padding: '6px 14px', borderRadius: 8,
                background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)',
                color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
                backdropFilter: 'blur(4px)',
              }}>{t}</span>
            ))}
          </div>
        </div>

        <p style={{ position: 'relative', zIndex: 1, fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
          Trusted by tournament organizers
        </p>
      </div>

      {/* ── Form panel ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 32px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Create your account
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 28, fontWeight: 700,
            letterSpacing: '-0.025em',
            color: 'var(--text-primary)',
            margin: '0 0 8px',
          }}>
            Get started
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 28px', lineHeight: 1.5 }}>
            Fill in your details to create an account.
          </p>

          {/* Error / Success */}
          {error && <div className="alert-error" style={{ marginBottom: 20 }}>{error}</div>}
          {success && (
            <div style={{
              padding: '12px 14px', borderRadius: 8, marginBottom: 20,
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
              fontSize: 13, color: 'var(--accent)',
            }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* Role selector */}
            <div className="form-group">
              <label className="form-label">I am a…</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {ROLES.map(r => (
                  <RolePill key={r.value} value={r.value} current={formData.role} label={r.label} icon={r.icon} onClick={setRole} />
                ))}
              </div>
            </div>

            <Field label="Full Name">
              <input
                type="text" name="name" className="form-input"
                placeholder="Your full name"
                value={formData.name} onChange={handleChange}
                disabled={loading} autoFocus autoComplete="name"
              />
            </Field>

            <Field label="Email Address">
              <input
                type="email" name="email" className="form-input"
                placeholder="you@example.com"
                value={formData.email} onChange={handleChange}
                disabled={loading} autoComplete="email"
              />
            </Field>

            <Field label="Password">
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} name="password" className="form-input"
                  placeholder="Min. 6 characters"
                  value={formData.password} onChange={handleChange}
                  disabled={loading} autoComplete="new-password"
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>

            <Field label="Confirm Password">
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'} name="confirmPassword" className="form-input"
                  placeholder="Re-enter password"
                  value={formData.confirmPassword} onChange={handleChange}
                  disabled={loading} autoComplete="new-password"
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>

            {/* Player-specific fields */}
            {isPlayer && (
              <div style={{
                borderTop: '1.5px solid var(--border)',
                paddingTop: 20, marginTop: 4, marginBottom: 0,
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--text-faint)',
                  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14,
                }}>
                  Player Info
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Birth Date">
                    <input
                      type="date" name="birthDate" className="form-input"
                      value={formData.birthDate} onChange={handleChange}
                      disabled={loading}
                    />
                  </Field>

                  <Field label="Gender">
                    <select name="gender" className="form-input" value={formData.gender} onChange={handleChange} disabled={loading}>
                      <option value="">Select…</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </Field>
                </div>

                <Field label="Phone" optional>
                  <input
                    type="tel" name="phone" className="form-input"
                    placeholder="+62 ..."
                    value={formData.phone} onChange={handleChange}
                    disabled={loading}
                  />
                </Field>
              </div>
            )}

            <button
              className="btn-primary" type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '11px', fontSize: 15, marginTop: 8 }}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <div style={{ height: 1, background: 'var(--border)', margin: '24px 0' }} />

          <p style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--text-link)', fontWeight: 600, textDecoration: 'none' }}>
              Sign in →
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .login-brand-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default Register;
