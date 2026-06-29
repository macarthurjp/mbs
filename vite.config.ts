import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  optimizeDeps: {
    exclude: ['lucide-react'],
  },

  build: {
    chunkSizeWarningLimit: 900,

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'reactVendor';
          }

          if (id.includes('node_modules/@supabase/supabase-js')) {
            return 'supabase';
          }

          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }

          return undefined;
        },
      },
    },
  },
});
