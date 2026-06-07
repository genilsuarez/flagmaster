import { defineConfig } from 'vite'

export default defineConfig({
  base: '/flagmaster/',
  server: {
    port: 3000,
    open: '/index.html',
    host: '127.0.0.1'
  },
  build: {
    outDir: 'dist'
  },
  test: {
    environment: 'jsdom',
  }
})