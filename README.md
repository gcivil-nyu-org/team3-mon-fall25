# NYU Marketplace

```bash
├── backend/        # Django backend — APIs, business logic, database models, tests
│   ├── api/        # REST API endpoints (Django REST Framework)
│   ├── apps/       # Modular Django apps (users, listings, payments, etc.)
│   ├── core/       # Core configuration (settings, urls, WSGI/ASGI)
│   ├── scripts/    # Utility or maintenance scripts
│   ├── tests/      # Unit and integration tests
│   ├── manage.py   # Django management CLI
│   └── pyproject.toml  # Python dependencies and project metadata
│
├── frontend/       # React (Vite) frontend — SPA client with Axios and Ant Design
│   ├── src/        # Source code: pages, routes, components, shared utilities
│   ├── public/     # Static assets (index.html, favicon, etc.)
│   ├── e2e/        # End-to-end tests (Playwright/Cypress)
│   ├── package.json / vite.config.js  # Frontend build and configuration
│   └── README.md   # Frontend-specific documentation
│
├── docs/           # Project documentation and design materials
│   ├── ADR/        # Architecture Decision Records
│   ├── api.md      # API documentation
│   ├── architecture.md  # High-level system design
│   └── onboarding.md    # Developer onboarding guide
│
├── schema/         # API schema and code generation
│   ├── openapi.yaml  # OpenAPI specification
│   └── codegen/      # Auto-generated API clients or SDKs
│
├── scripts/        # General setup or deployment scripts
│
├── LICENSE         # Project license
├── Makefile        # Common build/test commands
└── README.md       # This file
```

## Backend — Django

```bash
cd backend
python manage.py migrate
python manage.py runserver
```

## Frontend — React (Vite)

```bash
cd frontend
npm install
npm run dev
```
