import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    server: {
      host: "::",
      port: 8080,
      allowedHosts: env.ALLOW_TUNNEL === "true" ? true : [],
      hmr: {
        overlay: false,
      },
    },
    preview: {
      allowedHosts: env.ALLOW_TUNNEL === "true" ? true : [],
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            // NOTE: file-saver intentionally NOT here — export modules statically import
            // saveAs, which would pull this heavy chunk into the initial load graph.
            if (id.includes("exceljs") || id.includes("xlsx-js-style")) {
              return "excel";
            }
            if (id.includes("recharts") || id.includes("/d3-")) return "charts";
            if (id.includes("@radix-ui")) return "radix";
            if (id.includes("lucide-react")) return "icons";
            if (id.includes("@supabase")) return "supabase";
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("react-router") ||
              id.includes("@tanstack/react-query") ||
              id.includes("react-hook-form") ||
              id.includes("@hookform") ||
              id.includes("/zod/") ||
              id.includes("date-fns")
            ) {
              return "react-core";
            }
            return undefined;
          },
        },
      },
    },
  };
});
