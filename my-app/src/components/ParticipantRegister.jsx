// my-app/src/components/ParticipantRegister.jsx
import React, { useState } from 'react';

function ParticipantRegister() {
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('MALE');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(''); // Menambahkan state untuk phone
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const participantData = {
      fullName,
      birthDate, // Format YYYY-MM-DD
      gender,
      email,
      phone,
      tournamentId: 1, // Asumsi ID turnamen 1
    };

    try {
      // Panggil API backend Anda
      const response = await fetch('http://127.0.0.1:5000/participant/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(participantData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal mendaftar');
      }

      // Berikan pesan sukses
      setMessage(`Sukses mendaftar! ${result.fullName} (ID: ${result.id}) masuk ke kategori ID ${result.categoryId}.`);
      
      // Reset form setelah sukses
      setFullName('');
      setBirthDate('');
      setEmail('');
      setPhone('');
      setGender('MALE');

    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Menggunakan komponen Card dari daisyUI
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h3 className="card-title">Daftar Peserta Baru</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">Nama Lengkap</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input input-bordered w-full"
              required
              placeholder="Masukkan nama lengkap"
            />
          </div>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">Email</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input input-bordered w-full"
              placeholder="contoh@email.com"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">No. Telepon</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input input-bordered w-full"
              placeholder="0812..."
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Tanggal Lahir</span>
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="input input-bordered w-full"
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Gender</span>
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="select select-bordered w-full"
            >
              <option value="MALE">Laki-laki</option>
              <option value="FEMALE">Perempuan</option>
            </select>
          </div>

          {/* Tombol Aksi */}
          <div className="card-actions justify-end mt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? <span className="loading loading-spinner"></span> : 'Daftar & Validasi Usia'}
            </button>
          </div>
        </form>
        
        {/* Pesan Alert untuk sukses atau error */}
        {message && (
          <div role="alert" className={`alert ${message.startsWith('Error') ? 'alert-error' : 'alert-success'} mt-4`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              {message.startsWith('Error') ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ParticipantRegister;