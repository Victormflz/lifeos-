import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    // Safari 14+ / iOS 14+ — soporta ES2019, async/await nativo, optional chaining
    target: ['es2019', 'safari14'],

    cssCodeSplit: true,

    rollupOptions: {
      output: {
        // Función requerida en Vite 8 (rolldown)
        manualChunks(id) {
          if (id.includes('node_modules/chart.js') || id.includes('node_modules/react-chartjs-2')) {
            return 'vendor-charts'
          }
          if (id.includes('node_modules/react-router') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-router'
          }
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react'
          }
        }
      }
    }
  }
})
