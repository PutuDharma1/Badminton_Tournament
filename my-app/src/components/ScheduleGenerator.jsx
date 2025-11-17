// my-app/src/components/ScheduleGenerator.jsx
import React, { useState, useEffect } from 'react';

function ScheduleGenerator() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/category/list/1'); // Asumsi turnamen ID 1
        const data = await response.json();
        setCategories(data.data || []);
        if (data.data && data.data.length > 0) {
          setSelectedCategory(data.data[0].id);
        }
      } catch (error) {
        console.error("Gagal mengambil kategori:", error);
      }
    };
    fetchCategories();
  }, []);

  const handleGenerate = async () => {
    if (!selectedCategory) {
      setMessage('Error: Silakan pilih kategori');
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('http://127.0.0.1:5000/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: parseInt(selectedCategory) })
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      setMessage(result.message);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h3 className="card-title">Generate Jadwal</h3>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Pilih Kategori</span>
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="select select-bordered w-full"
          >
            <option value="">Pilih Kategori...</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.team_count || cat.participant_count} peserta)
              </option>
            ))}
          </select>
        </div>
        
        <div className="card-actions justify-end mt-4">
          <button
            onClick={handleGenerate}
            disabled={isLoading || !selectedCategory}
            className="btn btn-success w-full"
          >
            {isLoading ? <span className="loading loading-spinner"></span> : 'Generate Jadwal'}
          </button>
        </div>

        {message && (
           <div role="alert" className={`alert ${message.startsWith('Error') ? 'alert-error' : 'alert-success'} mt-4`}>
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScheduleGenerator;