import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // Dev proxy to bypass CORS for LibreTranslate
          '/lt': {
            target: 'https://libretranslate.de',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/lt/, ''),
          },
          // Dev proxy for Google Translate backend proxy
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
          // Dev proxy for OpenStreetMap Nominatim reverse geocoding
          '/geocode': {
            target: 'https://nominatim.openstreetmap.org',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/geocode/, ''),
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 2000,
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          }
        },
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom'],
              'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/database'],
              'vendor-capacitor': ['@capacitor/core', '@capacitor/geolocation', '@capacitor/local-notifications'],
              'vendor-ui': ['lucide-react']
            }
          }
        }
      }
    };
});
