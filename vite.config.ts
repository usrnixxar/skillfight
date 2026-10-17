import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: false,
    host: true,
    watch: {
      ignored: [
        '**/Male_Fighter_PNG_Frames/**',
        '**/Female_Fighter_PNG_Frames_Lite/**',
        '**/*_Frames*/**',
        '**/.git/**'
      ]
    }
  }
});
