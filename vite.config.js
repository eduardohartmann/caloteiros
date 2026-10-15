import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// base: /caloteiros/ (prod) ou /caloteiros/dev/ (preview), via DEPLOY_BASE no CI.
const base = process.env.DEPLOY_BASE || "/caloteiros/";
const isDev = base === "/caloteiros/dev/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        // Cacheia todos os assets gerados pelo build
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Não cacheia chamadas à API do Google (são dinâmicas)
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            // Cache da fonte Manrope do Google Fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      },
      manifest: {
        name: isDev ? "Caloteiros DEV" : "Caloteiros",
        short_name: isDev ? "Caloteiros DEV" : "Caloteiros",
        description: "Controle financeiro pessoal com dados no Google Sheets.",
        start_url: "./",
        display: "standalone",
        background_color: "#f5f7f3",
        theme_color: isDev ? "#b45309" : "#0f766e",
        lang: "pt-BR",
        icons: [
          {
            src: "./assets/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "./assets/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "./assets/pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "./assets/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any"
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    allowedHosts: true
  }
});
