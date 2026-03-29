import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window'
  },
  preview: {
    host: true,
    allowedHosts: ['badmintontournament-production.up.railway.app']
  }
})