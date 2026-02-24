import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // STATE UNTUK DARK MODE
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Inisialisasi Dark Mode saat pertama kali dimuat
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    }
  }, []);

  // Fungsi toggle tema
  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

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

        {/* Right: Toggle Theme, Profile or Login */}
        <div className="nav-right">
          
          {/* TOMBOL TOGGLE DARK MODE */}
          <button 
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            className="hover:bg-gray-200 dark:hover:bg-slate-700"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>

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

                {/* User info (NAMA DAN ROLE YANG DIPERBAIKI) */}
                <div style={{ textAlign: 'left' }}>
                  <div style={{ 
                    fontSize: '13px', 
                    fontWeight: 600,
                    /* Hitam pekat di Terang, Putih di Gelap */
                    color: isDarkMode ? '#ffffff' : '#0f172a' 
                  }}>
                    {user.name}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    fontWeight: 500,
                    /* Abu-abu gelap di Terang, Abu-abu terang di Gelap */
                    color: isDarkMode ? '#9ca3af' : '#475569'
                  }}>
                    {user.role}
                  </div>
                </div>

                {/* Dropdown arrow */}
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  /* Warnanya ikut menyesuaikan mode */
                  stroke={isDarkMode ? '#9ca3af' : '#475569'}
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

              {/* Dropdown menu (BENTUK DIKEMBALIKAN KE DESAIN ASLI ANDA) */}
              {showProfileMenu && (
                <>
                  {/* Backdrop to close menu */}
                  <div
                    onClick={() => setShowProfileMenu(false)}
                    style={{
                      position: 'fixed',
                      top: 0, left: 0, right: 0, bottom: 0,
                      zIndex: 999,
                    }}
                  />

                  {/* Menu Container */}
                  <div
                    className="bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-[#374151]"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      borderRadius: '8px',
                      minWidth: '200px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                      zIndex: 1000,
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      onClick={() => { navigate('/profile'); setShowProfileMenu(false); }}
                      className="w-full text-left cursor-pointer transition-colors text-slate-800 dark:text-[#f9fafb] hover:bg-slate-100 dark:hover:bg-[#374151]"
                      style={{ padding: '12px 16px', background: 'transparent', border: 'none', fontSize: '14px' }}
                    >
                      👤 View Profile
                    </button>

                    <button
                      onClick={() => { navigate('/settings'); setShowProfileMenu(false); }}
                      className="w-full text-left cursor-pointer transition-colors text-slate-800 dark:text-[#f9fafb] hover:bg-slate-100 dark:hover:bg-[#374151]"
                      style={{ padding: '12px 16px', background: 'transparent', border: 'none', fontSize: '14px' }}
                    >
                      ⚙️ Settings
                    </button>

                    <div className="border-t border-gray-200 dark:border-[#374151]" style={{ margin: '4px 0' }}></div>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left cursor-pointer transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-[#374151]"
                      style={{ padding: '12px 16px', background: 'transparent', border: 'none', fontSize: '14px', fontWeight: 500 }}
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