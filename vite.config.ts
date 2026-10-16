import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
// Relative assets work for both username.github.io and repository GitHub Pages URLs.
export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      "frappe-gantt/dist/frappe-gantt.css": fileURLToPath(
        new URL(
          "./node_modules/frappe-gantt/dist/frappe-gantt.css",
          import.meta.url,
        ),
      ),
    },
  },
});
