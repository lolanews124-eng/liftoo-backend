# Liftoo Backend

NestJS REST API with PostgreSQL, Prisma, and Socket.io.

## Setup

```bash
npm install
npm run db:setup          # local: migrate deploy + seed
npm run dev
```

Production / server:

```bash
npm install
npx prisma migrate deploy
npx prisma db seed        # optional, first deploy only
npm run start:prod
```

From project root:

```powershell
.\start-api.ps1
```

API runs at http://localhost:3000 — routes under `/api/v1/...`

## Environment

Copy `.env.example` to `.env` if present, or ensure PostgreSQL is running via `docker compose up -d` at the repo root.
