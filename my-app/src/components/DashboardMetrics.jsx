// my-app/src/components/DashboardMetrics.jsx
import React from 'react';

function DashboardMetrics() {
  // Data ini nantinya akan diambil dari API
  const metrics = {
    participants: 128,
    matchesToday: 32,
    categories: 8,
    ongoing: 3,
  };

  return (
    <div className="card bg-base-100 shadow-xl mb-6">
      <div className="card-body">
        <h3 className="card-title">Statistik Turnamen</h3>
        <div className="stats shadow w-full">
          <div className="stat">
            <div className="stat-title">Total Peserta</div>
            <div className="stat-value">{metrics.participants}</div>
            <div className="stat-desc">Di {metrics.categories} kategori</div>
          </div>
          
          <div className="stat">
            <div className="stat-title">Pertandingan Hari Ini</div>
            <div className="stat-value">{metrics.matchesToday}</div>
            <div className="stat-desc text-success">{metrics.ongoing} sedang berlangsung</div>
          </div>
          
          <div className="stat">
            <div className="stat-title">Pertandingan Selesai</div>
            <div className="stat-value">12</div>
            <div className="stat-desc">dari 64 total</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardMetrics;