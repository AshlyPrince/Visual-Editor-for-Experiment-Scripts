# Visual Editor Backend

REST API for the Visual Editor application.

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose

## Installation

```bash
npm install
```

## Configuration

Create `.env` file from template:

```bash
cp .env.example .env
```

Configure the following required variables:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` - Database connection
- `KC_REALM`, `KC_AUTH_SERVER_URL`, `KC_CLIENT_ID`, `KC_REALM_PUBLIC_KEY` - Keycloak authentication
- `SESSION_SECRET` - Session encryption key

## Database Setup

Start PostgreSQL:

```bash
docker-compose -f docker-compose.postgres.yml up -d
```

Initialize schema:

```bash
psql -U <user> -d <database> -f init-scripts/01-init.sql
psql -U <user> -d <database> -f init-scripts/02-schema.sql
```

## Authentication Setup

Start Keycloak:

```bash
docker-compose -f docker-compose.keycloak.yml up -d
```

Access Keycloak admin console at `http://localhost:8080/admin` (admin/admin)

## Running the Application

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

API will be available at `http://localhost:3001`

## API Documentation

Base URL: `http://localhost:3001`

### Endpoints

**Health**
- `GET /health` - Service health check
- `GET /db/ping` - Database connectivity check

**Authentication** (Protected)
- `GET /auth/check` - Verify authentication status
- `GET /auth/user` - Get authenticated user details

**Experiments** (Protected)
- `GET /api/experiments` - List experiments
- `POST /api/experiments` - Create experiment
- `GET /api/experiments/:id` - Get experiment
- `PUT /api/experiments/:id` - Update experiment
- `DELETE /api/experiments/:id` - Delete experiment

**Versions** (Protected)
- `POST /api/experiments/:id/versions` - Create version
- `GET /api/experiments/:id/versions` - List versions
- `POST /api/experiments/:id/versions/:versionId/checkout` - Checkout version

All endpoints require `Authorization: Bearer <token>` header.
