import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(() => {
  if (
    process.env.CONTEXT === "production" &&
    (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY)
  ) {
    throw new Error(
      "Netlify builds require VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Configure both in the Netlify site environment.",
    );
  }

  return {
    plugins: [react(), tailwindcss()],
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test-setup.ts"],
      clearMocks: true,
      restoreMocks: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  };
});
