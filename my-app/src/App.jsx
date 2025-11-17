// src/App.jsx
import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Peserta from './pages/Peserta';
import Wasit from './pages/Wasit';
import Panitia from './pages/Panitia';

const TABS = {
  DASHBOARD: 'Dashboard',
  PESERTA: 'Peserta',
  WASIT: 'Wasit',
  PANITIA: 'Panitia',
};

function App() {
  const [activeTab, setActiveTab] = useState(TABS.DASHBOARD);

  const renderTabContent = () => {
    switch (activeTab) {
      case TABS.PESERTA:
        return <Peserta />;
      case TABS.WASIT:
        return <Wasit />;
      case TABS.PANITIA:
        return <Panitia />;
      case TABS.DASHBOARD:
      default:
        return <Dashboard />;
    }
  };

  return (
    // Gunakan warna tema daisyUI untuk latar belakang
    <div className="min-h-screen bg-base-200">
      {/* === NAVBAR BARU MENGGUNAKAN daisyUI === */}
      <div className="navbar bg-base-100 shadow-lg">
        <div className="navbar-start">
          <a className="btn btn-ghost text-xl text-blue-800 font-bold">
            🏸 TournaMan
          </a>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            {Object.values(TABS).map((tab) => (
              <li key={tab}>
                <a
                  onClick={() => setActiveTab(tab)}
                  // Ganti logika 'className' dengan 'active'
                  className={activeTab === tab ? 'active' : ''}
                >
                  {tab}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="navbar-end">
          {/* Anda bisa tambahkan tombol Login/Logout di sini */}
          <a className="btn btn-primary">Login</a>
        </div>
      </div>
      {/* === AKHIR NAVBAR === */}

      {/* Beri padding pada konten utama */}
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {renderTabContent()}
      </main>
    </div>
  );
}

export default App;