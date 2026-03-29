import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// ─── Role config ──────────────────────────────────────────────────────────────
const ROLE_CFG = {
  COMMITTEE: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  label: 'Committee' },
  PLAYER:    { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   label: 'Player' },
  REFEREE:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'Referee' },
  ADMIN:     { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'Admin' },
};

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value, muted }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13.5, color: muted ? 'var(--text-muted)' : 'var(--text-primary)', fontWeight: 500 }}>
        {value || '—'}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function Profile() {
  const { user, updateProfile, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateProfile(formData);
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  const role = ROLE_CFG[user?.role] || { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: user?.role };

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'U';

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="main-content">
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Account
        </p>
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle" style={{ marginTop: 6 }}>View and manage your personal information.</p>
      </div>

      <div style={{ maxWidth: 560 }}>

        {/* ── Avatar card ── */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border)',
          borderRadius: 16,
          padding: '28px 24px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          boxShadow: 'var(--shadow-card)',
        }}>
          <div style={{
            width: 72, height: 72,
            borderRadius: 18,
            background: role.color,
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 700,
            flexShrink: 0,
            boxShadow: `0 4px 16px ${role.color}40`,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 20, fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 6px',
              letterSpacing: '-0.01em',
            }}>
              {user?.name}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 11.5, fontWeight: 700,
                padding: '3px 10px', borderRadius: 6,
                background: role.bg, color: role.color,
                textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>
                {role.label}
              </span>
              {memberSince && (
                <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                  Member since {memberSince}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Success / Error alerts ── */}
        {success && (
          <div style={{ padding: '11px 14px', borderRadius: 8, marginBottom: 14, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', fontSize: 13, color: 'var(--accent)' }}>
            {success}
          </div>
        )}
        {error && <div className="alert-error" style={{ marginBottom: 14 }}>{error}</div>}

        {/* ── Personal info card ── */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border)',
          borderRadius: 16,
          padding: '20px 24px',
          marginBottom: 16,
          boxShadow: 'var(--shadow-card)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Personal Information
            </h3>
            {!isEditing ? (
              <button
                className="btn-outline"
                onClick={() => setIsEditing(true)}
                style={{ fontSize: 12, padding: '5px 14px' }}
              >
                Edit
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={loading}
                  style={{ fontSize: 12, padding: '5px 14px' }}
                >
                  {loading ? 'Saving…' : 'Save'}
                </button>
                <button
                  className="btn-outline"
                  onClick={handleCancel}
                  disabled={loading}
                  style={{ fontSize: 12, padding: '5px 14px' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" name="name" className="form-input" value={formData.name} onChange={handleChange} disabled={loading} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" name="email" className="form-input" value={formData.email} onChange={handleChange} disabled={loading} />
              </div>
              {user?.role === 'PLAYER' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input type="tel" name="phone" className="form-input" placeholder="+62..." value={formData.phone} onChange={handleChange} disabled={loading} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Birth Date <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 400 }}>cannot be changed</span></label>
                    <input type="text" className="form-input" value={user.birthDate ? new Date(user.birthDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set'} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Gender <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 400 }}>cannot be changed</span></label>
                    <input type="text" className="form-input" value={user.gender || 'Not set'} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div>
              <InfoRow label="Full Name" value={user?.name} />
              <InfoRow label="Email" value={user?.email} />
              {user?.role === 'PLAYER' && (
                <>
                  <InfoRow label="Phone" value={user?.phone} muted />
                  <InfoRow
                    label="Birth Date"
                    value={user?.birthDate ? new Date(user.birthDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null}
                    muted
                  />
                  <InfoRow label="Gender" value={user?.gender} muted />
                </>
              )}
              <InfoRow label="Member Since" value={memberSince} muted />
            </div>
          )}
        </div>

        {/* ── Danger zone ── */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border)',
          borderRadius: 16,
          padding: '18px 24px',
          boxShadow: 'var(--shadow-card)',
        }}>
          <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: 'var(--text-primary)' }}>
            Account Actions
          </h3>
          <button
            onClick={() => { if (confirm('Sign out of your account?')) logout(); }}
            style={{
              width: '100%',
              padding: '9px 14px',
              borderRadius: 8,
              border: '1.5px solid rgba(239,68,68,0.35)',
              background: 'rgba(239,68,68,0.05)',
              color: '#ef4444',
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'; }}
          >
            Sign Out
          </button>
        </div>

      </div>
    </div>
  );
}

export default Profile;
