import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:3001',
      '/user': 'http://localhost:3001',
      '/workout': 'http://localhost:3001',
      '/nutrition': 'http://localhost:3001',
    },
  },
  build: {
    rollupOptions: {
      // Production ships ONLY the app. preview.html (the dev preview harness)
      // is served by the dev server but deliberately excluded here, so no
      // harness code can reach the APK/site. The A8 isolation test asserts
      // the built bundle contains no harness sentinel.
      input: 'index.html',
    },
  },
});
