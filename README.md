# Feature Flag Platform — Frontend

Next.js App Router frontend for the Feature Flag Platform.

## Stack

- Next.js 16.3
- React 19.3
- TypeScript
- App Router

## Prerequisites

For local development, install Node.js 22+ and npm 10+.

For the Docker workflow, install Docker with the Docker Compose plugin.

## Local development

```bash
npm install
npm run dev
```

The frontend runs at `http://localhost:3000`.

The frontend reads the backend API base URL from `NEXT_PUBLIC_API_BASE_URL`. The repository's `.env.example` uses:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

This is a Next.js `NEXT_PUBLIC_` variable, so its value is exposed to the browser and is included when the application is built.

## Docker startup

Build and start the frontend independently:

```bash
docker compose up --build
```

The frontend is available at `http://localhost:3000`.

The Docker build uses the existing npm project configuration and `npm run build`, then runs the existing `npm run start` command.

The frontend repository does not start PostgreSQL or the backend container. Start the backend separately from the backend repository.

## Backend URL configuration

Set `NEXT_PUBLIC_API_BASE_URL` to the API base URL exposed by the separately running backend. For the default local backend configuration:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

With Docker, this value is supplied as a build argument because `NEXT_PUBLIC_` variables are part of the client bundle at build time:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1 docker compose up --build
```

Do not hardcode the backend URL in application source code.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | No | Backend API base URL. Defaults to `http://localhost:8000/api/v1`. |

Do not commit local `.env` or `.env.local` files containing secrets.

## Stop

```bash
docker compose down
```

## Rebuild

```bash
docker compose up --build
```

## Manual setup

The backend must be running separately and reachable through `NEXT_PUBLIC_API_BASE_URL`.

No database or Redis setup is required in this repository itself.
