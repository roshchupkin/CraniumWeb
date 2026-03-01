import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In Docker: VITE_API_TARGET=http://backend:8000; locally: defaults to localhost
const apiTarget = process.env.VITE_API_TARGET || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})
