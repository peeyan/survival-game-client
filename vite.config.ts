import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // 0.0.0.0 でリッスン → Docker外からアクセス可能
    port: 5173,
  },
})
