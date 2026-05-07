# Deployment Guide: Connecting Frontend to Production Backend

## Context

The frontend is a Next.js app deployed to **Vercel**. It never talks to the database directly — it communicates exclusively through a backend REST API (`http://localhost:5000/api` today). To make the deployed site work, two things must happen:

1. The backend API must be reachable at a public URL (not localhost).
2. The frontend must be told that new URL via the `NEXT_PUBLIC_API_URL` environment variable.

The database is the backend's concern, not the frontend's — but the backend must be configured to talk to a hosted database instead of localhost before its public URL becomes reliable.

---

## What Needs to Change

### 1. Deploy the Backend API Somewhere Public

The backend (Node.js, port 5000) must be hosted on a service with a permanent public HTTPS URL. Recommended options (all have free tiers):

| Service | Notes |
|---|---|
| **Railway** | railway.app — easiest, connects GitHub repo, auto-deploys |
| **Render** | render.com — free tier, good for Node/Express |
| **fly.io** | More control, good for persistent workloads |
| **VPS** (DigitalOcean, Hetzner) | Full control, you manage the server |

After deploying, you will have a URL like `https://my-api.railway.app`.

### 2. Move the Database Off Localhost

The backend's database must also be accessible remotely. Options:

| Option | Notes |
|---|---|
| **Managed DB on Railway/Render** | Easiest — provision Postgres/MySQL alongside the backend, they share an internal network |
| **PlanetScale / Neon / Supabase** | Hosted Postgres/MySQL with a connection string — works from any backend host |
| **VPS** | Run DB on the same VPS as the backend; bind to localhost on that machine |

Set the backend's database connection env var (e.g. `DATABASE_URL`) to point to the hosted DB.

### 3. Frontend: Set `NEXT_PUBLIC_API_URL` on Vercel

This is the **only change needed in this repository** for deployment.

**In the Vercel dashboard:**
1. Open the project → **Settings** → **Environment Variables**
2. Add:
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://your-production-backend.com/api`  ← the real backend URL
   - **Environment:** Production (and Preview if desired)
3. Redeploy (Vercel does not auto-apply new env vars to existing builds).

> **Why a redeploy is required:** `NEXT_PUBLIC_` variables are embedded into the JS bundle at **build time**. Changing the value in the dashboard only takes effect on the next build — the running deployment keeps the old value.

**Critical:** Do NOT commit the production URL to `.env.local` — that file is for local dev and is gitignored.

### 4. Update `next.config.ts` — No Change Needed

The current config already allows any HTTPS image hostname:
```ts
{ protocol: 'https', hostname: '**' },
```
As long as the production backend serves images over HTTPS (standard for all hosted services), no change is required. The `http://localhost` entry only applies locally.

---

## Files to Touch

| File | Change |
|---|---|
| `next.config.ts` | No change needed |
| `.env.local` | No change (stays localhost for local dev) |
| Vercel dashboard | Add `NEXT_PUBLIC_API_URL=https://your-api.com/api` |
| Backend repo | Set DB connection env var to point to hosted database |

---

## Verification

1. **Backend health check** — visit `https://your-api.com/api` (or a `/health` endpoint) in the browser; should return a response, not a connection error.
2. **Vercel build log** — confirm the build picked up the new `NEXT_PUBLIC_API_URL` (it appears as an env var in the build output).
3. **Auth flow** — go to the deployed site → log in → confirm the token is stored and authenticated requests succeed (DevTools → Network tab, check `Authorization: Bearer ...` header is sent and API returns 200).
4. **Images** — confirm article thumbnails and avatars load (no broken images, no `next.config.ts` remote pattern errors in the console).
