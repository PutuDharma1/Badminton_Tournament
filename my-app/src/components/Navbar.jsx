import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const { pathname } = useLocation();
  return (
    <header className="nav">
      <Link to="/" className="brand">BOS — Badminton Organizer System</Link>
      <nav className="nav-links">
        <Link to="/" className={pathname === "/" ? "active" : ""}>Home</Link>
        <Link to="/roles" className={pathname.startsWith("/roles") ? "active" : ""}>Daftar</Link>
      </nav>
    </header>
  );
}
