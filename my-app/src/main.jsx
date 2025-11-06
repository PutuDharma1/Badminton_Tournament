// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { GlobalProvider } from './context/GlobalContext.jsx'; // 1. Import

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 2. Bungkus <App /> dengan <GlobalProvider> */}
    <GlobalProvider>
      <App />
    </GlobalProvider>
  </React.StrictMode>,
);