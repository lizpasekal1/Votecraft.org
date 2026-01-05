import { defineConfig } from 'vite';

export default defineConfig({
  // Base public path for GitHub Pages deployment
  base: '/Votecraft.org/',

  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        embed: 'embed.html'
      }
    }
  },

  // Development server configuration
  server: {
    port: 3000,
    open: true
  }
});
