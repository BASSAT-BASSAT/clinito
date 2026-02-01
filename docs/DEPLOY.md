# Deployment: Vercel + Railway + main

This document describes how to deploy CLINITO (frontend + Convex on Vercel, SAM3 backend on Railway) and push to `main`.

## Prerequisites

- Convex project linked (`npx convex dev` run at least once)
- Vercel and Railway accounts
- GitHub repo connected

## Order of deployment

1. **Convex** – Ensure production deployment is up to date: `npx convex deploy`
2. **Railway** – Deploy SAM3 backend (e.g. `sam3-server` or `Medical-SAM3`) per existing Railway config; set `PORT` and any checkpoint URL env.
3. **Vercel** – Deploy Next.js frontend; set env vars (see below).

## Environment variables

### Vercel (Next.js)

- `NEXT_PUBLIC_CONVEX_URL` – Convex deployment URL (from Convex dashboard)
- `NEXT_PUBLIC_SAM3_MODE` – `production` to use Railway SAM3; `local` for local proxy
- `SAM3_SERVER_URL` or `RAILWAY_SAM3_URL` – Railway SAM3 base URL (e.g. `https://your-app.up.railway.app`) when `NEXT_PUBLIC_SAM3_MODE=production`

Do **not** commit `.env.local` or secrets. Use `.env.example` as a template (see repo root).

### Railway (SAM3)

- `PORT` – Set by Railway; your server should listen on `process.env.PORT`
- Any checkpoint or model URL if required by the SAM3 service

## Deploy steps

### Vercel

1. Ensure `npm run build` succeeds locally.
2. In Vercel dashboard, set the env vars above for the project.
3. Deploy via:
   - **Git:** Push to the connected branch (e.g. `main`) to trigger a deploy, or
   - **CLI:** `npx vercel --prod` from project root.

### Railway

1. Deploy `sam3-server` or `Medical-SAM3` per their `railway.json` / `Dockerfile`.
2. Copy the public URL and set it in Vercel as `SAM3_SERVER_URL` (or `RAILWAY_SAM3_URL`).

### GitHub

1. After local testing and any CI (lint, tests) pass, merge to `main` and push.
2. If Vercel is connected to `main`, this will trigger a production deploy.

## Checklist

- [ ] Convex: `npx convex deploy` (production)
- [ ] Railway: SAM3 service deployed; URL noted
- [ ] Vercel: Env vars set; deploy triggered (Git push or `vercel --prod`)
- [ ] Smoke test: Landing page, login, home, workstation (segment), patients
