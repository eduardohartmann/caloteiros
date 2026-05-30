import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/caloteiros/",
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
        name: "Caloteiros",
        short_name: "Caloteiros",
        description: "Controle financeiro pessoal com dados no Google Sheets.",
        start_url: "./",
        display: "standalone",
        background_color: "#f5f7f3",
        theme_color: "#0f766e",
        lang: "pt-BR",
        icons: [
          {
            src: "./assets/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
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
