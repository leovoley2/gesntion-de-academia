import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // PORT lo asigna el previsualizador de Claude Code; 5173 es el default local.
    port: Number(process.env.PORT) || 5173,
    host: true,
  },
});
