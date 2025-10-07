# NYU Marketplace

```bash
backend/
├── api/
│   └── v1/
│       ├── permissions.py   # Custom permission classes for API access control
│       ├── schemas.py       # API schema definitions (OpenAPI / DRF serializers)
│       ├── serializers.py   # Data serialization logic
│       ├── urls.py          # API routing (v1)
│       └── views.py         # REST API views / controllers
│
├── apps/
│   ├── catalog/             # Handles item listings and marketplace catalogs
│   ├── common/              # Shared utilities, base models, helpers
│   ├── orders/              # Order management logic
│   ├── payments/            # Payment processing and transactions
│   └── users/               # User authentication, profiles, and permissions
│
├── core/
│   ├── asgi.py              # ASGI entry point for async servers
│   ├── settings.py          # Django project configuration
│   ├── urls.py              # Root URL routing
│   └── wsgi.py              # WSGI entry point for production
│
├── scripts/                 # Custom management scripts (e.g. init_db, data seeding)
│
├── tests/                   # Unit & integration test cases
│
├── manage.py                # Django management CLI
├── pyproject.toml           # Python environment and dependency configuration
└── README.md
```
