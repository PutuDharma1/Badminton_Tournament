import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    setShowProfileMenu(false);
    navigate('/login');
  };

  // Role-based navigation items
  const getNavItems = () => {
    if (!user) return [];

    const commonItems = [
      { path: '/', label: 'Home' },
    ];

    const roleSpecificItems = {
      COMMITTEE: [
        { path: '/committee', label: 'Dashboard' },
        { path: '/matches', label: 'Matches' },
        { path: '/settings', label: 'Settings' },
      ],
      PLAYER: [
        { path: '/player', label: 'My Dashboard' },
        { path: '/matches', label: 'My Matches' },
      ],
      REFEREE: [
        { path: '/referee', label: 'Dashboard' },
        { path: '/matches', label: 'Matches' },
      ],
      ADMIN: [
        { path: '/', label: 'Dashboard' },
        { path: '/matches', label: 'Matches' },
        { path: '/players', label: 'Players' },
        { path: '/settings', label: 'Settings' },
      ],
    };

    return [...commonItems, ...(roleSpecificItems[user.role] || [])];
  };

  const navItems = getNavItems();

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.name[0].toUpperCase();
  };

  // Get role badge color
  const getRoleBadgeColor = () => {
    const colors = {
      COMMITTEE: '#3b82f6',
      PLAYER: '#10b981',
      REFEREE: '#f59e0b',
      ADMIN: '#ef4444',
    };
    return colors[user?.role] || '#6b7280';
  };

  return (
    <header className="navbar">
      <div className="nav-inner">
        {/* Left: Logo */}
        <div
          className="nav-left"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          <div className="logo-circle">S</div>
          <div className="logo-text">
            <span className="logo-title">SportHive</span>
            <span className="logo-subtitle">Badminton Tournament</span>
          </div>
        </div>

        {/* Center: Menu */}
        {isAuthenticated && (
          <nav className="nav-links">
            {navItems.map((item) => (
              <button
                key={item.path}
                className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}

        {/* Right: Profile or Login */}
        <div className="nav-right">
          {isAuthenticated && user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: getRoleBadgeColor(),
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  {getUserInitials()}
                </div>

                {/* User info */}
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#f9fafb' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {user.role}
                  </div>
                </div>

                {/* Dropdown arrow */}
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: showProfileMenu ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {showProfileMenu && (
                <>
                  {/* Backdrop to close menu */}
                  <div
                    onClick={() => setShowProfileMenu(false)}
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 999,
                    }}
                  />

                  {/* Menu */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      background: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      minWidth: '200px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                      zIndex: 1000,
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setShowProfileMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        color: '#f9fafb',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => (e.target.style.background = '#374151')}
                      onMouseLeave={(e) => (e.target.style.background = 'none')}
                    >
                      👤 View Profile
                    </button>

                    <button
                      onClick={() => {
                        navigate('/settings');
                        setShowProfileMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        color: '#f9fafb',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => (e.target.style.background = '#374151')}
                      onMouseLeave={(e) => (e.target.style.background = 'none')}
                    >
                      ⚙️ Settings
                    </button>

                    <div style={{ borderTop: '1px solid #374151', margin: '4px 0' }}></div>

                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        color: '#f87171',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => (e.target.style.background = '#374151')}
                      onMouseLeave={(e) => (e.target.style.background = 'none')}
                    >
                      🚪 Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              className="btn-primary"
              onClick={() => navigate('/login')}
              style={{ padding: '8px 16px', fontSize: '14px' }}
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
