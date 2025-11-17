/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  
  // Pastikan bagian 'plugins' dan 'daisyui' ini ada
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: ["light"], // Tema default
  },
}