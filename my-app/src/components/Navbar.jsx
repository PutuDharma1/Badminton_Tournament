import { useState, useEffect, useRef } from 'react';
import { useNavigate, NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ─── Icons ────────────────────────────────────────────────────────────────────
const ShuttlecockIcon = () => (
  <svg width="17" height="20" viewBox="0 0 17 20" fill="none" aria-hidden="true">
    <ellipse cx="8.5" cy="16.5" rx="3.5" ry="2.5" fill="currentColor" opacity="0.95"/>
    <line x1="8.5" y1="14" x2="4"   y2="3"  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="8.5" y1="14" x2="6.5" y2="2"  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="8.5" y1="14" x2="8.5" y2="1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="8.5" y1="14" x2="10.5" y2="2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="8.5" y1="14" x2="13"  y2="3"  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M4 3 Q8.5 0.5 13 3" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
  </svg>
);

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1"  x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
);

const ChevronIcon = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"
    style={{ transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'none' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

// ─── Role config ──────────────────────────────────────────────────────────────
const ROLE_COLORS = {
  COMMITTEE: '#3b82f6',
  PLAYER:    '#22c55e',
  REFEREE:   '#f59e0b',
  ADMIN:     '#ef4444',
};

const ROLE_NAV = {
  COMMITTEE: [
    { path: '/',          label: 'Home',      end: true },
    { path: '/committee', label: 'Dashboard', end: false },
    { path: '/matches',   label: 'Matches',   end: false },
    { path: '/brackets',  label: 'Brackets',  end: false },
    { path: '/settings',  label: 'Settings',  end: false },
  ],
  PLAYER: [
    { path: '/',         label: 'Home',         end: true },
    { path: '/player',   label: 'My Dashboard', end: false },
    { path: '/matches',  label: 'My Matches',   end: false },
    { path: '/brackets', label: 'Brackets',     end: false },
  ],
  REFEREE: [
    { path: '/',         label: 'Home',      end: true },
    { path: '/referee',  label: 'Dashboard', end: false },
    { path: '/matches',  label: 'Matches',   end: false },
    { path: '/brackets', label: 'Brackets',  end: false },
  ],
  ADMIN: [
    { path: '/',         label: 'Home',     end: true },
    { path: '/matches',  label: 'Matches',  end: false },
    { path: '/brackets', label: 'Brackets', end: false },
    { path: '/settings', label: 'Settings', end: false },
  ],
};

// ─── Navbar ───────────────────────────────────────────────────────────────────
const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const profileRef = useRef(null);

  // Init theme from localStorage / system preference
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved === 'dark' || (!saved && sysDark);
    document.documentElement.classList.toggle('dark', dark);
    setIsDarkMode(dark);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && showProfileMenu) {
        setShowProfileMenu(false);
        // Return focus to the trigger button
        profileRef.current?.querySelector('#profile-menu-btn')?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showProfileMenu]);

  const toggleTheme = () => {
    const next = !isDarkMode;
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setIsDarkMode(next);
  };

  const handleLogout = () => {
    logout();
    setShowProfileMenu(false);
    navigate('/login');
  };

  const navItems = user ? (ROLE_NAV[user.role] || [{ path: '/', label: 'Home', end: true }]) : [];

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'U';

  const roleColor = ROLE_COLORS[user?.role] || '#6b7280';

  return (
    <header className="navbar" role="banner">
      <div className="nav-inner">

        {/* ── Logo ── */}
        <Link to="/" className="nav-left" aria-label="SportHive Badminton — go to home">
          <div className="logo-mark" style={{ color: '#fff' }}>
            <ShuttlecockIcon />
          </div>
          <div className="logo-text">
            <span className="logo-title">SportHive</span>
            <span className="logo-subtitle">Badminton</span>
          </div>
        </Link>

        {/* ── Nav links ── */}
        {isAuthenticated && (
          <nav className="nav-links" aria-label="Main navigation">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        {/* ── Right controls ── */}
        <div className="nav-right">

          {/* Theme toggle */}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Authenticated: profile menu */}
          {isAuthenticated && user ? (
            <div style={{ position: 'relative' }} ref={profileRef}>
              <button
                id="profile-menu-btn"
                className="profile-btn"
                onClick={() => setShowProfileMenu(v => !v)}
                aria-haspopup="menu"
                aria-expanded={showProfileMenu}
                aria-label={`${user.name} — account menu`}
              >
                <div className="avatar" style={{ background: roleColor }} aria-hidden="true">
                  {initials}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div className="profile-name">{user.name}</div>
                  <div className="profile-role">{user.role}</div>
                </div>
                <ChevronIcon open={showProfileMenu} />
              </button>

              {showProfileMenu && (
                <div
                  className="dropdown-menu"
                  role="menu"
                  aria-labelledby="profile-menu-btn"
                >
                  {/* User info header — not interactive */}
                  <div
                    style={{
                      padding: '12px 14px 10px',
                      borderBottom: '1px solid var(--border)',
                    }}
                    role="presentation"
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {user.name}
                    </div>
                    <div style={{
                      fontSize: 11, color: 'var(--text-faint)',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      marginTop: 2,
                    }}>
                      {user.email || user.role}
                    </div>
                  </div>

                  <button
                    className="dropdown-item"
                    role="menuitem"
                    onClick={() => { navigate('/profile'); setShowProfileMenu(false); }}
                  >
                    <UserIcon /> View Profile
                  </button>
                  <button
                    className="dropdown-item"
                    role="menuitem"
                    onClick={() => { navigate('/settings'); setShowProfileMenu(false); }}
                  >
                    <SettingsIcon /> Settings
                  </button>

                  <div className="dropdown-divider" role="separator" />

                  <button className="dropdown-item danger" role="menuitem" onClick={handleLogout}>
                    <LogoutIcon /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="btn-primary"
              onClick={() => navigate('/login')}
              style={{ padding: '7px 16px', fontSize: 13 }}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
