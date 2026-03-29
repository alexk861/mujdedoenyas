import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  build: {
    target: 'es2015'
  },
  esbuild: {
    target: 'es2015'
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2015'
    }
  }
})
