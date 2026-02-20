import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: "/quran-toolkit/",   // 👈 your repo name
  plugins: [react()],
  server: { port: 5173 }
})