import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { apiDevPlugin } from './vite-plugin-api.ts'

export default defineConfig({
  plugins: [react(), tailwindcss(), apiDevPlugin()],
  ssr: {
    external: ['pg', '@electric-sql/pglite'],
  },
})
