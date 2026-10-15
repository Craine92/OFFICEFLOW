import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// Relative Assets funktionieren auf GitHub Pages sowohl unter / als auch /repository/.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  base: process.env.VITE_BASE_PATH || './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: { canvas: ['konva', 'react-konva'], react: ['react', 'react-dom', 'react-router-dom'] },
      },
    },
  },
});
