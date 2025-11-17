import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Ini memuat style Tailwind & daisyUI

// Impor GlobalContext Anda
import { GlobalProvider } from './context/GlobalContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Bungkus <App /> dengan <GlobalProvider> 
      agar semua komponen bisa mengakses datanya.
    */}
    <GlobalProvider>
      <App />
    </GlobalProvider>
  </React.StrictMode>,
)