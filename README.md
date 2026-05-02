# Hardware Store Management System

A full-stack web application for managing hardware store operations — inventory, point of sale, supplier management, payments, and reporting. Built to support multiple branches under one account.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL 16 (via Prisma ORM) |
| Infrastructure | Docker, Docker Compose, Nginx |

## Getting started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running
- [Git](https://git-scm.com) installed

### 1. Clone the project
```bash
git clone <your-repo-url>
cd hardware-store
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Open .env and fill in your values
```

### 3. Start everything
```bash
docker compose up --build
```

This will:
- Pull the Postgres 16 image
- Build the backend container (Node/Express)
- Build the frontend container (React/Vite)
- Start Nginx as a reverse proxy
- All containers connect on an internal Docker network

### 4. Run database migrations
In a new terminal tab (while containers are running):
```bash
docker compose exec backend npm run db:migrate
```

### 5. Open the app
| URL | What it is |
|---|---|
| http://localhost | Full app (via Nginx) |
| http://localhost:3000 | Frontend direct |
| http://localhost:5000/api/health | Backend health check |

## Project structure

```
hardware-store/
├── docker-compose.yml      # Orchestrates all containers
├── .env.example            # Copy to .env and fill in secrets
├── nginx/
│   └── nginx.conf          # Routes / to frontend, /api to backend
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── prisma/
│   │   └── schema.prisma   # Database schema (source of truth)
│   └── src/
│       ├── index.js        # Express server entry point
│       ├── routes/         # API route definitions
│       ├── controllers/    # Business logic
│       └── middleware/     # Auth, validation, error handling
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── pages/          # Full page components
        ├── components/     # Reusable UI components
        └── hooks/          # Custom React hooks
```

## Development workflow

```bash
# Start all containers
docker compose up

# View logs from one container
docker compose logs backend -f

# Run a command inside the backend container
docker compose exec backend npm run db:studio

# Rebuild after adding a new npm package
docker compose up --build

# Stop everything
docker compose down

# Stop and delete the database volume (fresh start)
docker compose down -v
```

## Modules (built phase by phase)

- [x] Phase 1 — Project setup, Docker, database schema
- [ ] Phase 2 — Inventory management
- [ ] Phase 3 — Point of sale
- [ ] Phase 4 — Suppliers & payments
- [ ] Phase 5 — Reports & dashboard
- [ ] Phase 6 — Polish & deployment

---

*Built as a learning project — one module at a time.*
