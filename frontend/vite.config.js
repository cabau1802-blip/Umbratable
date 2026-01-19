import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: ["homolog.umbratable.com.br"],
    watch: { usePolling: true },
    hmr: {
      protocol: "wss",
      host: "homolog.umbratable.com.br",
      clientPort: 443,
    },
    proxy: {
      "/auth": { target: "http://backend:3000", changeOrigin: true },
      "/campaigns": { target: "http://backend:3000", changeOrigin: true },
      "/characters": { target: "http://backend:3000", changeOrigin: true },
      "/friends": { target: "http://backend:3000", changeOrigin: true },
      "/users": { target: "http://backend:3000", changeOrigin: true },
      "/upload": { target: "http://backend:3000", changeOrigin: true },
      "/uploads": { target: "http://backend:3000", changeOrigin: true },
      "/api": { target: "http://backend:3000", changeOrigin: true },
      "/socket.io": {
        target: "http://backend:3000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
