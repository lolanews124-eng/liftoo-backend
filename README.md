# Liftoo Backend

NestJS REST API with PostgreSQL, Prisma, and Socket.io.

## Setup

```bash
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

From project root:

```powershell
.\start-api.ps1
```

API runs at http://localhost:3000 — routes under `/api/v1/...`

## Environment

Copy `.env.example` to `.env` if present, or ensure PostgreSQL is running via `docker compose up -d` at the repo root.
