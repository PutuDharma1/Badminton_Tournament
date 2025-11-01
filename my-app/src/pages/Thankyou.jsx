// src/pages/Thankyou.jsx
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Thankyou() {
  const loc = useLocation();
  const name = loc.state?.name || "Peserta";
  const role = loc.state?.role || "Pengguna";

  return (
    <motion.div
      className="container center"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h2>Terima kasih, {name}!</h2>
      <p>Registrasi sebagai <b>{role}</b> berhasil disimpan (demo localStorage).</p>
      <div className="cta-row">
        <Link to="/roles" className="btn">Daftarkan Lagi</Link>
        <Link to="/" className="btn primary">Kembali ke Home</Link>
      </div>
    </motion.div>
  );
}
