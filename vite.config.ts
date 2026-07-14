import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/teacher-game/',
  plugins: [react()],
  server: {
    host: true,
  },
})
