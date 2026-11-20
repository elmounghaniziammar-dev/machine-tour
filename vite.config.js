import { defineConfig } from "vite";
// Three.js est inclus dans le projet : aucun téléchargement externe au lancement.
export default defineConfig({ build: { chunkSizeWarningLimit: 700 } });
