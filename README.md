# CivicPulse

Citizens report civic issues from an Android app (React Native). A cloud AI layer verifies the photo and scores urgency. The citizen gets an SMS. The report lands on the dashboard of the municipal officer for that ward and department, who assigns a worker and closes it out.

```
 React Native app ──► Node/Express API ──► MongoDB
 (citizen)              │   │   └─► SMS (Twilio)
                        │   └─► AI service (FastAPI: CV + NLP)    [module 5/6]
 Officer dashboard ─────┘
```

## Lifecycle

`submitted → verified → worker_assigned → in_progress → resolved`
`submitted → rejected → (citizen resubmits photo) → submitted`
`submitted → manual_review` when the AI service is down after 3 attempts.

1. Citizen posts photo + category + description + GPS. API replies `202` with status `submitted`.
2. Background job calls the AI service. Invalid photo → `rejected` + SMS with the reason. Valid → urgency stored, report routed.
3. Routing: GPS point → ward (point-in-polygon) → officer for that ward and the category's department. SMS "submitted successfully".
4. Officer sees their queue (most urgent first), assigns a worker from their ward/department, starts, resolves with a note and optional photo. SMS on resolve.

## Module status

| # | Module | Status |
|---|--------|--------|
| 1 | Complaint service (`backend/`, Node.js + TypeScript) | **Built, strict typecheck clean, 31 tests passing** |
| 2 | Auth (OTP login, JWT, roles) | Next. Dev uses `x-user-*` headers (blocked in production) |
| 3 | React Native app (Expo, Android) | Not started |
| 4 | AI service: CV verification + urgency | Not started. Contract defined in `backend/src/services/aiClient.ts`; a keyword mock stands in |
| 5 | NLP text analysis, fused urgency | Not started |
| 6 | Officer dashboard (web) | Not started |
| 7 | Deployment | Not started |

## Run the backend

```bash
cd backend
cp .env.example .env
docker compose up -d          # MongoDB
npm install
npm run seed                  # demo wards/officers/workers around Shirpur
npm run dev                   # tsx watch
npm run typecheck && npm test
npm run build && npm start    # compiled output in dist/
```

No Docker? `REPO=memory npm run dev` runs with an in-memory store (no wards seeded, so reports are flagged for manual routing).

### Try it

```bash
H='-H x-user-id:CIT-1 -H x-user-role:citizen -H x-user-phone:+919800000001'
curl -X POST localhost:4000/api/v1/complaints $H \
  -F category=pothole -F "description=Deep pothole near the market gate" \
  -F latitude=21.35 -F longitude=74.88 -F "photo=@pothole.jpg;type=image/jpeg"
# SMS text appears in the server log (SMS_PROVIDER=console)
curl localhost:4000/api/v1/officer/complaints -H x-user-id:OFF-W01-roads -H x-user-role:officer
```

## API (`/api/v1`)

| Method | Path | Who |
|---|---|---|
| POST | `/complaints` (multipart: `photo`, `category`, `description`, `latitude`, `longitude`, optional `address`, `accuracyM`, `title`) | citizen |
| GET | `/complaints/mine`, `/complaints/:id` | citizen (own) |
| POST | `/complaints/:id/photo` (resubmit after rejection) | citizen (own) |
| GET | `/officer/complaints?status=`, `/officer/workers` | officer |
| POST | `/officer/complaints/:id/assign` `{workerId}`, `/start`, `/resolve` (multipart: `note`, optional `photo`) | officer (assigned) |

## Alignment with report section 7.4

| Report says | Status |
|---|---|
| TypeScript + Node.js + Express | Done |
| Mongoose, MongoDB (Atlas), GeoJSON 2dsphere index | Done (set `MONGO_URI` to your Atlas string). Ward routing uses point-in-polygon in code rather than `$geoIntersects` so it can be unit-tested |
| JWT middleware | Auth module (next) |
| Multer + Cloudinary | Multer done. Storage is behind a `Storage` interface; a Cloudinary implementation is a small addition |
| Bull (Redis) retry queue | Not yet: in-process timers today. Note Bull is in maintenance mode; BullMQ is its maintained successor with the same model |
| Socket.io, FCM push | Not yet. SMS is the notification channel built so far |
| Change Streams, MTTR aggregations | Not yet |

## Known gaps before production

- **Mongo repository has not been run against a live MongoDB** (my build sandbox couldn't fetch one). Schemas load and validate and the logic is tested through the identical in-memory repository, but run `docker compose up` + `npm run seed` + the curl above once to confirm.
- **Twilio notifier is untested against the real API.** Use E.164 numbers. For India, check DLT template registration requirements before sending to real users.
- Uploaded photos are served from `/uploads` without auth. Move to private object storage with signed URLs.
- Background jobs run in-process; retries are lost on restart. Use a durable queue.
- Reports outside every ward, or in a ward with no officer, are `verified` with `needsManualRouting: true`. An admin screen to route them is not built yet.
