import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        entregaCerta: resolve(__dirname, 'entrega-certa.html')
      }
    }
  }
});
