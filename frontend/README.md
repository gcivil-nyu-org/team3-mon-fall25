# Frontend (Vite + React + Axios)

```bash
frontend/
├── e2e/                        # End-to-end tests (Playwright / Cypress)
│   └── .gitkeep
│
├── public/                     # Static assets (index.html, favicon.ico)
│   ├── index.html
│   └── favicon.ico
│
├── src/
│   ├── api/                    # Axios client & API endpoint definitions
│   │   ├── client.js           # Axios instance configuration
│   │   └── endpoints.js        # Centralized backend endpoint paths
│   │
│   ├── pages/                  # Page-level components
│   │   ├── Home.jsx            # Home page
│   │   └── Login.jsx           # Login form with API integration
│   │
│   ├── routes/                 # Routing configuration
│   │   └── index.jsx           # React Router setup
│   │
│   ├── shared/                 # Reusable constants, utilities, helpers
│   │   ├── constants.js
│   │   └── utils.js
│   │
│   ├── assets/                 # Static files (logos, images)
│   │   └── react.svg
│   │
│   ├── App.jsx                 # Root React component
│   ├── main.jsx                # Entry point for the React app
│   └── index.css               # Global CSS styles
│
├── .gitignore
├── eslint.config.js
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
