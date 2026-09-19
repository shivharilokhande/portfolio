import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Function form on purpose: the object form pulls each listed
        // package's *entire* dependency graph into the chunk, which dragged
        // react-dom/scheduler into `three` (and react into `motion`). That
        // made the entry chunk statically depend on three.js, so Vite
        // emitted a <link rel="modulepreload"> for the 984 KB three chunk
        // on every route. Matching by path keeps three.js confined to the
        // lazily-imported SkillsCanvas graph.
        manualChunks(id) {
          // Vite's dynamic-import preload helper is shared by every chunk;
          // if rollup folds it into `three` the entry must import `three`.
          if (id.includes('vite/preload-helper')) return 'react';
          if (!id.includes('node_modules')) return undefined;
          // React runtime (+ small shared deps such as zustand, used by both
          // the cart store and @react-three/fiber) gets its own chunk so that
          // neither `three` nor `motion` can absorb it and force the entry
          // to import them.
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|zustand|use-sync-external-store)[\\/]/.test(id)) return 'react';
          if (/[\\/]node_modules[\\/](three|@react-three|three-stdlib|maath|its-fine|react-reconciler|suspend-react|camera-controls|@monogrid|stats-gl|meshline|troika-[\w-]+|@mediapipe|detect-gpu|glsl-noise|hls\.js|webgl-sdf-generator|bidi-js)[\\/]/.test(id)) return 'three';
          if (/[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return 'motion';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Proxy /api/* to the Spring Boot backend during local dev,
      // so the frontend can call relative URLs without CORS hassle.
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:9090',
        changeOrigin: true,
      },
    },
  },
});
