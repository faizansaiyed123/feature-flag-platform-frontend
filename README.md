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

The complete local startup runner also needs Python 3.13+ because the backend is started through the backend repository's Docker Compose stack.

## Local development

\`\`\`bash
npm install
npm run dev
\`\`\`

The frontend runs at \`http://localhost:3000\`.

The frontend reads the backend API base URL from \`NEXT_PUBLIC_API_BASE_URL\`. The repository's \`.env.example\` uses:

\`\`\`text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
\`\`\`

This is a Next.js \`NEXT_PUBLIC_\` variable, so its value is exposed to the browser and is included when the application is built.

## Full-stack startup

\`run.py\` starts the backend/database stack first, waits for the backend health endpoint, then starts the frontend development server.

From this repository:

\`\`\`bash
python run.py
\`\`\`

The runner automatically looks for \`feature-flag-platform-backend\` next to the frontend repository. When the repositories are stored elsewhere, set \`FEATURE_FLAG_BACKEND_DIR\` to the backend repository path. You do not need to start the backend, PostgreSQL, or frontend manually.

The backend stack is started with its existing FastAPI application plus the Docker Compose PostgreSQL service, and Alembic migrations run automatically inside the backend container.

## Docker startup

Build and start the frontend independently:

\`\`\`bash
docker compose up --build
\`\`\`

The frontend is available at \`http://localhost:3000\`.

The Docker build uses the existing npm project configuration and \`npm run build\`, then runs the existing \`npm run start\` command. No backend container is created by this repository.

## Backend URL configuration

Set \`NEXT_PUBLIC_API_BASE_URL\` to the API base URL exposed by the separately running backend. For the default local backend configuration:

\`\`\`text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
\`\`\`

With Docker, this value is supplied as a build argument because \`NEXT_PUBLIC_\` variables are part of the client bundle at build time:

\`\`\`bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1 docker compose up --build
\`\`\`

Do not hardcode the backend URL in application source code.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| \`NEXT_PUBLIC_API_BASE_URL\` | No | Backend API base URL. Defaults to the local backend at \`http://localhost:8000/api/v1\`. |

Do not commit local \`.env\` or \`.env.local\` files containing secrets.

## Stop

\`\`\`bash
docker compose down
\`\`\`

For \`python run.py\`, press \`Ctrl+C\`; the runner stops the frontend process and shuts down the backend/database Compose stack when it started that stack itself.

## Rebuild

\`\`\`bash
docker compose up --build
\`\`\`

## Manual setup

No database or Redis setup is required for the frontend repository itself. The frontend expects the backend API to be reachable at the configured \`NEXT_PUBLIC_API_BASE_URL\`.
