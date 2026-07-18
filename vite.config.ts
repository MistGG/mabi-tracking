import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const mabibaseProxy = {
  target: 'https://api.na.mabibase.com',
  changeOrigin: true,
  rewrite: (path: string) =>
    path.replace(/^\/mabi-tracking\/mabibase/, ''),
} as const

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/mabi-tracking/',
  server: {
    proxy: {
      '/mabi-tracking/mabibase': mabibaseProxy,
    },
  },
  preview: {
    proxy: {
      '/mabi-tracking/mabibase': mabibaseProxy,
    },
  },
})
