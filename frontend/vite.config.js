import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  // Vitest configuration
  test: {
    globals: true, // Allows using describe, it, expect etc. globally
    environment: 'jsdom', // Use jsdom for DOM simulation
    setupFiles: './src/setupTests.js', // Setup file for test configuration
    css: true, // Parse CSS imports
    coverage: {
      provider: 'v8', // Use v8 for coverage
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/setupTests.js',
      ]
    }
  }
})
