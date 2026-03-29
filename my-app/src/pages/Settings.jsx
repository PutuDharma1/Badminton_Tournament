import React from 'react';
import { useAuth } from '../context/AuthContext';

function Settings() {
  const { user } = useAuth();
  const isCommittee = user?.role === 'COMMITTEE' || user?.role === 'ADMIN';

  const sections = [
    {
      icon: '🏆',
      title: 'Tournament Defaults',
      description: 'Set default formats, scoring rules, and match duration for new tournaments.',
      available: false,
    },
    {
      icon: '🏟️',
      title: 'Court Management',
      description: 'Configure court names, availability windows, and scheduling preferences.',
      available: false,
    },
    {
      icon: '📣',
      title: 'Notifications',
      description: 'Choose how and when you receive alerts for match updates and registrations.',
      available: false,
    },
    {
      icon: '🔐',
      title: 'Security',
      description: 'Update your password and manage account access.',
      available: false,
    },
  ];

  return (
    <div className="main-content">
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Configuration
        </p>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle" style={{ marginTop: 6 }}>
          Manage your tournament preferences and account configuration.
        </p>
      </div>

      <div style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sections.map((s) => (
            <div
              key={s.title}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border)',
                borderRadius: 14,
                boxShadow: 'var(--shadow-card)',
                opacity: s.available ? 1 : 0.6,
              }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 11,
                background: 'var(--bg-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>
                {s.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600,
                  color: 'var(--text-primary)', marginBottom: 3,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {s.title}
                  {!s.available && (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      padding: '2px 7px', borderRadius: 5,
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-faint)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}>
                      Coming soon
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-faint)', lineHeight: 1.45 }}>
                  {s.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 24,
          padding: '14px 18px',
          borderRadius: 12,
          background: 'rgba(var(--accent-rgb,21,128,61),0.06)',
          border: '1.5px solid rgba(var(--accent-rgb,21,128,61),0.15)',
        }}>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            Settings will be expanded in future releases. For now, tournament parameters can be configured directly from the Committee Dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Settings;
