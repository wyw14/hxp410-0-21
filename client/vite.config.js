import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 41021,
    proxy: {
      '/api': {
        target: 'http://localhost:41121',
        changeOrigin: true
      }
    }
  }
})
