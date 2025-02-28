import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(), // Useful for dev, ignored in production builds
    themePlugin(),         // Handles shadcn theme integration
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer()
          ),
        ]
      : []), // Replit-specific plugin, safe to keep
  ],
  base: process.env.NODE_ENV === "production" ? "/" : "/", // Simplified for Vercel
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"), // Alias for client/src
      "@shared": path.resolve(__dirname, "shared"),  // Alias for shared code
    },
  },
  root: path.resolve(__dirname, "client"), // Root remains client/
  build: {
    outDir: path.resolve(__dirname, "client", "dist"), // Adjusted for Vercel
    emptyOutDir: true,                                 // Clears output dir
  },
  server: {
    port: 3000, // Optional: keeps local dev consistent
  },
});
