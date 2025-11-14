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
    environment: 'happy-dom', // Use happy-dom instead of jsdom to avoid ESM issues with parse5
    setupFiles: './src/setupTests.js', // Setup file for test configuration
    css: true, // Parse CSS imports
    testTimeout: 30000, // 30 seconds timeout for tests (needed for complex async operations)
    coverage: {
      provider: 'v8', // Use v8 for coverage
      reporter: ['text', 'lcov'], // text for CI logs, lcov for Coveralls
      exclude: [
        'node_modules/',
        'src/setupTests.js',
        'src/api/**',
        '**/*.css',
        'src/test-utils/**',
        'src/hooks/**',
        'src/pages/Chat.jsx'
      ],
      // Enforce coverage thresholds - 85% required for all metrics
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85
      }
    }
  }
})
