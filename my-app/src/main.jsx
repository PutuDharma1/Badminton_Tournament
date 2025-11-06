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
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-4xl font-bold text-center text-blue-800">
          Badminton Tournament Management
        </h1>
        <nav className="flex justify-center gap-4 mt-4 bg-white p-2 rounded-lg shadow-md">
          {Object.values(TABS).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-semibold rounded-md transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {renderTabContent()}
      </main>
    </div>
  );
}

export default App;