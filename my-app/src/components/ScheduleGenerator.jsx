import React from 'react';
import { useGlobalContext } from '../context/GlobalContext';

function ScheduleGenerator() {
  const { participants, generateSchedule } = useGlobalContext();

  const handleGenerate = () => {
    if (participants.length < 2) {
      alert("Butuh minimal 2 peserta untuk membuat jadwal.");
      return;
    }
    generateSchedule();
    alert("Jadwal Round Robin telah dibuat!");
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4">Jadwal Pertandingan</h3>
      <p className="text-sm text-gray-600 mb-4">
        Klik untuk membuat jadwal Round Robin berdasarkan kategori umur peserta yang terdaftar.
      </p>
      <button
        onClick={handleGenerate}
        disabled={participants.length < 2}
        className="w-full bg-green-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400"
      >
        Generate Jadwal Round Robin
      </button>
    </div>
  );
}

export default ScheduleGenerator;