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

Set `GOOGLE_MAPS_API_KEY` for address search and reverse geocoding (enable **Geocoding API** and **Places API** in Google Cloud Console).

## Maps / location API (for mobile app & website)

Base URL: `https://api.liftoo.in` (or `http://localhost:5000` locally).  
All responses: `{ "success": true, "data": ... }`.

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/geocode/config` | Check if Google search is enabled |
| `GET /api/v1/geocode/reverse?lat=&lng=` | GPS → address label |
| `GET /api/v1/geocode/autocomplete?q=&lat=&lng=` | Place search suggestions |
| `GET /api/v1/geocode/place?placeId=` | Selected place → lat/lng + address |
| `GET /api/v1/geocode/forward?address=` | Typed address → coordinates |
| `GET /api/v1/assistants/availability-summary?lat=&lng=` | Nearby assistant count |
| `GET /api/v1/assistants/nearby?lat=&lng=` | List nearby assistants |

**Booking / saved address flow:** use autocomplete → `place` → send `lat`, `lng`, `formattedAddress`, `label` to `POST /api/v1/users/addresses` or booking create.

**Assistant app:** send live GPS to `PATCH /api/v1/assistants/location` with `{ lat, lng }`.

**Map display on client:** embed Google Maps SDK in the app/website with the same API key (restrict by Android package / iOS bundle / web domain in Google Cloud). Use the backend endpoints above for search — do not call Google Places directly from the client unless you prefer client-side SDK.
