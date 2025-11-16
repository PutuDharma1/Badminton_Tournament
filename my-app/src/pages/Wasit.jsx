import React, { useState } from 'react';
import { useGlobalContext } from '../context/GlobalContext';
import RefereeMatchPicker from '../components/RefereeMatchPicker';
import ScoreInput from '../components/ScoreInput';

function Wasit() {
  const { matches } = useGlobalContext();
  const [selectedMatchId, setSelectedMatchId] = useState(null);

  const availableMatches = matches.filter(m => m.status !== 'Selesai');
  const selectedMatch = matches.find(m => m.id === selectedMatchId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Panel Wasit</h2>
      <RefereeMatchPicker 
        matches={availableMatches} 
        onSelectMatch={setSelectedMatchId}
        selectedMatchId={selectedMatchId}
      />
      
      {selectedMatch && (
        <ScoreInput key={selectedMatch.id} match={selectedMatch} />
      )}
    </div>
  );
}

export default Wasit;