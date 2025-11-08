# NYU Marketplace
[![Build Status](https://app.travis-ci.com/gcivil-nyu-org/team3-mon-fall25.svg?token=Xq8zJLesUKp4bvxArT4z&branch=develop)](https://app.travis-ci.com/gcivil-nyu-org/team3-mon-fall25)
[![Coverage Status](https://coveralls.io/repos/github/gcivil-nyu-org/team3-mon-fall25/badge.svg?branch=feature/%23118-text-search-integration)](https://coveralls.io/github/gcivil-nyu-org/team3-mon-fall25?branch=feature/%23118-text-search-integration)
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

### Dependency Management with UV

We use [UV](https://github.com/astral-sh/uv) for fast, reliable Python package management. UV is compatible with both Python 3.11 and 3.13.

**Note:** We use `requirements.txt` for dependency management instead of `pyproject.toml` because AWS Elastic Beanstalk (our deployment platform) expects and automatically installs dependencies from `requirements.txt`.

#### Installing UV

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or with pip
pip install uv
```

#### Setting Up Virtual Environment

```bash
cd backend

# Create virtual environment (Python 3.13 for production compatibility)
uv venv --python 3.11 .venv311

# Or use Python 3.13
uv venv --python 3.13 .venv

# Activate the environment
source .venv311/bin/activate  # or .venv/bin/activate
```

#### Installing Dependencies

```bash
# Install all dependencies from requirements.txt
uv pip install -r requirements.txt
```

#### Updating Dependencies

To update all packages to their latest compatible versions:

```bash
cd backend

# Compile latest versions (maintains Python 3.11/3.13 compatibility)
uv pip compile requirements.in --upgrade -o requirements.txt

# Then install the updated requirements
uv pip install -r requirements.txt
```

The `requirements.in` file contains high-level dependencies with flexible version constraints. UV resolves these to specific versions in `requirements.txt` that work across Python 3.11 and 3.13.

### Running Django

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
