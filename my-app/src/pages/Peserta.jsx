import React, { useState, useEffect, useContext } from 'react';
import ParticipantRegister from '../components/ParticipantRegister';
import ParticipantTable from '../components/ParticipantTable';
import { GlobalContext } from '../context/GlobalContext';

function Peserta() {
  const [participants, setParticipants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const { state } = useContext(GlobalContext);

  const fetchParticipants = async () => {
    try {
      const response = await fetch(`${state.api_url}/participants/`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setParticipants(data);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${state.api_url}/categories/`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchParticipants();
    fetchCategories();
  }, []);

  const handleSeed = async (count) => {
    setLoading(true);
    try {
      const response = await fetch(`${state.api_url}/participants/seed/${count}`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to seed ${count} participants`);
      }

      alert(data.message); 
      fetchParticipants();
    } catch (error) {
      console.error('Error seeding participants:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Manajemen Peserta</h1>

      <div className="mb-6 p-4 border rounded-lg shadow-sm bg-gray-50">
        <h2 className="text-lg font-semibold mb-3">Shortcut Data Dummy (Sementara)</h2>
        <p className="text-sm text-gray-600 mb-3">
          Gunakan tombol ini untuk menambahkan data peserta dummy secara cepat.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleSeed(16)}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : 'Seed 16 Pemain'}
          </button>
          <button
            onClick={() => handleSeed(32)}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : 'Seed 32 Pemain'}
          </button>
          <button
            onClick={() => handleSeed(64)}
            disabled={loading}
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : 'Seed 64 Pemain'}
          </button>
        </div>
        {loading && <p className="text-sm text-gray-700 mt-2">Menambahkan data dummy...</p>}
      </div>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <ParticipantRegister 
            categories={categories} 
            onParticipantRegistered={fetchParticipants} 
          />
        </div>
        <div className="md:col-span-2">
          <ParticipantTable 
            participants={participants} 
            fetchParticipants={fetchParticipants} 
          />
        </div>
      </div>
    </div>
  );
}

export default Peserta;