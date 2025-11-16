import React from 'react';

function DashboardMetrics({ metrics }) {
  const { participantsCount, categoriesCount, matchesCount } = metrics;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h4 className="text-lg font-semibold text-gray-600">Total Peserta</h4>
        <p className="text-3xl font-bold text-blue-600">{participantsCount}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h4 className="text-lg font-semibold text-gray-600">Total Kategori</h4>
        <p className="text-3xl font-bold text-blue-600">{categoriesCount}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h4 className="text-lg font-semibold text-gray-600">Total Pertandingan</h4>
        <p className="text-3xl font-bold text-blue-600">{matchesCount}</p>
      </div>
    </div>
  );
}

export default DashboardMetrics;