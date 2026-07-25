import { defineConfig } from 'vite';
import { resolve } from 'node:path';

function entregaCertaLauncher() {
  return {
    name: 'scanmaster-entrega-certa-launcher',
    transformIndexHtml(html, context) {
      if (context.path !== '/' && !context.path.endsWith('/index.html')) return html;
      return {
        html,
        tags: [
          {
            tag: 'style',
            children: `.delivery-launcher{position:fixed;right:18px;bottom:108px;z-index:110;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:12px 17px;border-radius:16px;text-decoration:none;color:#fff;background:linear-gradient(135deg,#5d31c8,#7c52ef);font:700 14px Inter,system-ui,sans-serif;box-shadow:0 16px 38px rgba(63,31,145,.32);border:1px solid rgba(255,255,255,.22)}.delivery-launcher:focus-visible{outline:3px solid #fff;outline-offset:3px}@media(max-width:600px){.delivery-launcher{right:12px;bottom:102px;padding:11px 14px;font-size:13px}}`,
            injectTo: 'head'
          },
          {
            tag: 'a',
            attrs: { href: '/entrega-certa.html', class: 'delivery-launcher', 'aria-label': 'Abrir Entrega Certa' },
            children: '✓ Entrega Certa',
            injectTo: 'body'
          }
        ]
      };
    }
  };
}

export default defineConfig({
  plugins: [entregaCertaLauncher()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        entregaCerta: resolve(__dirname, 'entrega-certa.html')
      }
    }
  }
});
