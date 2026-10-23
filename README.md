# Feature Flag Platform — Frontend

**Live demo:** [Open Flagship](https://feature-flag-platform-frontend-lsf9.vercel.app/)


Production-oriented Next.js App Router frontend for the Feature Flag Platform.

## Stack

- Next.js 16.4.2
- React 19.3
- TypeScript
- App Router
- CSS design system without a runtime UI dependency

## Local development

Create an environment file:

```bash
cp .env.example .env.local
```

Start the app:

```bash
npm install
npm run dev
```

The frontend runs at `http://localhost:3000`.

The backend URL is configured with:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

Because this is a `NEXT_PUBLIC_` value, it is embedded into the browser bundle during the build.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

Or all three:

```bash
npm run check
```

## Production

A production build requires an explicit public API URL:

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1 npm run build
npm run start
```

Do not rely on the localhost fallback for production.

For a Docker production build:

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1 docker compose -f docker-compose.production.yml up --build -d
```

The Docker image runs as a non-root user and uses `npm ci` when a lockfile is present.

The repository commits `package-lock.json`; CI and Docker use `npm ci` for reproducible dependency installation. Keep the lockfile synchronized whenever dependencies change.

For browser-cookie authentication, a same-site deployment topology is preferred. Configure the backend CORS policy with the exact frontend origin and keep `SameSite=Lax` when the topology permits it.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Development: no, Production: yes | Browser-visible API base URL baked into the production build. |

Never commit `.env.local` or production secrets.

## Security and UX

The frontend includes cookie-based authentication without storing JWTs in localStorage, coordinated refresh handling, request timeout and request IDs, production security headers, responsive mobile navigation, responsive dashboard layouts, explicit save behavior for editable rules and segments, loading/error/404/error-boundary states, keyboard-visible focus styles, and reduced-motion support.

## Verification status

The source is structured as a production candidate. Before customer traffic, run the quality commands and complete a staging browser/E2E pass against the exact backend deployment.

