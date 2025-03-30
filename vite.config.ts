/// <reference types="vitest" />

// import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'
import UnoCSS from 'unocss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // legacy()
    UnoCSS(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom'
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/e': {
        target: 'https://next.0122.vip',
        changeOrigin: true,
      }
    }
  },
})
