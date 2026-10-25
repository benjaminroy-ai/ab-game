import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base relative : le site fonctionne depuis n'importe quel sous-dossier (GitHub Pages).
export default defineConfig({ base: "./", plugins: [react()] });
