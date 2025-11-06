import React from 'react';
import { useNavigate } from 'react-router-dom';

const RoleCard = ({ role }) => {
  const navigate = useNavigate();

  const getPath = () => {
    switch (role.toLowerCase()) {
      case 'organizer':
        return '/register-organizer';
      case 'referee':
        return '/register-referee';
      case 'player':
        return '/register-player';
      default:
        return '/';
    }
  };

  const handleClick = () => {
    navigate(getPath());
  };

  return (
    // Pastikan Anda menambahkan className="role-card" di sini
    <div className="role-card" onClick={handleClick}>
      <h3>{role}</h3>
      <p>Daftar sebagai {role}</p>
    </div>
  );
};

export default RoleCard;