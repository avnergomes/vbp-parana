import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/vbp-parana/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})
