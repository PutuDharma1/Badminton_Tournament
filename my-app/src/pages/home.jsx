// src/pages/home.jsx
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="hero">
      <div className="hero-box">
        <h1>Badminton Organizer System</h1>
        <p>
          Kelola registrasi <b>pemain</b>, <b>wasit</b>, dan <b>panitia</b> (demo frontend only).
        </p>
        <Link to="/roles" className="btn primary">
          Mulai Daftar
        </Link>
      </div>
    </div>
  );
}
