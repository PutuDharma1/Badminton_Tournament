/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Pastikan ini mencakup semua file React Anda
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  
  // Tambahkan bagian 'plugins' dan 'daisyui' di bawah ini
  plugins: [
    require('daisyui'),
  ],

  // Konfigurasi daisyUI
  daisyui: {
    themes: [
      "light", // Tema default
      "dark",
      "cupcake",
      "bumblebee",
      "emerald",
      "corporate",
      "synthwave",
      "retro",
      "cyberpunk",
      "valentine",
      "halloween",
      "garden",
      "forest",
      "aqua",
      "lofi",
      "pastel",
      "fantasy",
      "wireframe",
      "black",
      "luxury",
      "dracula",
      "cmyk",
      "autumn",
      "business",
      "acid",
      "lemonade",
      "night",
      "coffee",
      "winter",
    ],
    darkTheme: "dark", // Tema default untuk mode gelap
    base: true, // Menerapkan warna latar belakang dan foreground default
    styled: true, // Menerapkan style ke komponen daisyUI
    utils: true, // Menambahkan kelas utilitas responsif
    logs: true, // Menampilkan log daisyUI di konsol saat startup
  },
}