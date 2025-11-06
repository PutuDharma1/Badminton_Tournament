// src/pages/Peserta.jsx
import React from 'react';
import ParticipantRegister from '../components/ParticipantRegister';
import ParticipantTable from '../components/ParticipantTable';
import ScheduleGenerator from '../components/ScheduleGenerator';

function Peserta() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 space-y-4">
        <ParticipantRegister />
        <ScheduleGenerator />
      </div>
      <div className="md:col-span-2">
        <ParticipantTable />
      </div>
    </div>
  );
}

export default Peserta;