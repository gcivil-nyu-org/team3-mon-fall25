import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";

const isProduction = process.env.NODE_ENV === 'production'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // production or development
  base: isProduction ? '/static/' : '/',

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    // Output dir：Put build files into ../backend/static
    outDir: path.resolve(__dirname, "../backend/frontend_build"),
    emptyOutDir: true, // Empty before build
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
      // Only measure coverage for files we actively test to keep signal meaningful
      include: [
        'src/components/browse/*.jsx',
        'src/components/common/*.jsx',
        'src/components/ListingCard*.jsx',
        'src/components/ProtectedRoute.jsx',
        'src/pages/BrowseListings*.jsx',
        'src/pages/ListingDetail.jsx',
        'src/contexts/AuthContext.jsx'
      ],
      exclude: [
        'node_modules/',
        'src/setupTests.js',
        '**/*.css',
        '**/*.test.jsx',
        'src/assets/**'
      ],
      // Enforce 85% coverage threshold - CI will fail if not met
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85
      }
    }
  }
})
