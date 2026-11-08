import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Pre-transform the entry files so the first localhost load isn't blank for seconds.
      warmup: { clientFiles: ['./src/main.tsx', './src/App.tsx', './src/components/BottomNav.tsx'] },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true
        }
      }
    },
    build: {
      target: 'esnext',
      rollupOptions: {
        output: {
          // Vendor code in its own long-cached chunks: downloads in parallel and
          // survives app updates, so returning users only fetch the changed app code.
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            motion: ['motion/react'],
            icons: ['lucide-react'],
          },
        },
      },
    }
  };
});
