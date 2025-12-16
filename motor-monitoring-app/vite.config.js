import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/motor_monitoring/', // Configuración correcta para GitHub Pages
  server: {
    host: true, // Permite conexiones externas
    strictPort: false,
    allowedHosts: [
      '.trycloudflare.com', // Permite todos los dominios de Cloudflare
      'localhost'
    ],
    hmr: {
      clientPort: 443 // Para que funcione con Cloudflare
    }
  }
})
