import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages / static hosting friendly: relative base so the build can be
// served from any sub-path (e.g. hinzu.ru/<hash>-teomor/).
export default defineConfig({
  base: './',
  plugins: [react()],
});
