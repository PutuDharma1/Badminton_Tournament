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
        <h3 className="card-title">Tournament Statistics</h3>
        <div className="stats shadow w-full">
          <div className="stat">
            <div className="stat-title">Total Participants</div>
            <div className="stat-value">{metrics.participants}</div>
            <div className="stat-desc">In {metrics.categories} categories</div>
          </div>

          <div className="stat">
            <div className="stat-title">Today's Matches</div>
            <div className="stat-value">{metrics.matchesToday}</div>
            <div className="stat-desc text-success">{metrics.ongoing} in progress</div>
          </div>

          <div className="stat">
            <div className="stat-title">Matches Completed</div>
            <div className="stat-value">12</div>
            <div className="stat-desc">out of 64 total</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardMetrics;