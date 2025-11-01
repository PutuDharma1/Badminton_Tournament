// src/components/RoleCard.jsx
import { Link } from "react-router-dom";

export default function RoleCard({ title, desc, to }) {
  return (
    <Link to={to} className="role-card">
      <h3>{title}</h3>
      <p>{desc}</p>
      <span className="arrow">→</span>
    </Link>
  );
}
