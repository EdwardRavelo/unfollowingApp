import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Rutas relativas: el sitio funciona igual en localhost que en
  // https://usuario.github.io/unfollowing/ sin depender del nombre del repo.
  base: './',
  plugins: [react()],
})
