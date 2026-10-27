# accelerator-test
Accelerator-test

## Training Sessions Workspace

A single-page React + TypeScript (Vite) app for listing, filtering, and creating training sessions. There is no backend: in development the API (`GET`/`POST /api/sessions`) is served by a [Mock Service Worker](https://mswjs.io) mock from `src/mocks/`.

### Prerequisites

- Node.js 24 and npm

### Commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies from `package-lock.json` |
| `npm run dev` | Start the dev server with the mock API; open the URL Vite prints |
| `npm test` | Run the Vitest behavior tests once |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Strict TypeScript check |
| `npm run build` | Production build (no mock included) |

### Mock error mode

Open the dev URL with `?mock=list-error` (for example `http://localhost:5173/?mock=list-error`, using your printed port) to make every session list request fail. This shows the error state and lets you exercise **Try again**. Remove the query and reload to get a working list.

### Known limitations

- The production build has no backend and does not start the mock, so its API requests fail.
- Mock data lives in memory and resets on page reload.
