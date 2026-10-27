# training-sessions-workspace: Implementation Plan

Inputs read:

- `tasks/training-sessions-workspace/requirements.md` (AC-1…AC-20, assumptions A1–A9, Q1 resolved = scaffold new React + TypeScript app)
- `TASK.md`, `PASS_CRITERIA.md` (onboarding training directory)
- Rulesets: `rulesets/common/coder/*`, `rulesets/common/architect/rules/*`, `rulesets/common/api-integration/rules/client-behavior.md`, `rulesets/common/browser-verify/rules/*`, `rulesets/common/shared/web-interface-guidelines/command.md`, `rulesets/framework/coder/INDEX.md` (+ referenced React rules), `rulesets/framework/test-generator/rules/react-behavior-testing.md`. `rulesets/project/` is empty.
- `toolchain/lib/lint-gate.mjs` (how the accelerator lint gate discovers a lint command)

## Current Behavior

- The repository has no frontend application: no `package.json`, lockfile, `src/`, build, test, or mock setup. Only the accelerator toolset, `README.md`, and task files exist.
- No `.gitignore` exists.
- Doctor is `DEGRADED` partly because the Changed-File Lint Gate finds no `lint` script.
- Environment observed: Node `v24.14.1`, npm `11.11.0`, pnpm `10.30.3`; yarn not installed.

## Intended Behavior

A single-page React + TypeScript app at the repository root that:

1. requests sessions from `GET /api/sessions` (served by MSW) and shows `Loading sessions…` while pending;
2. renders each session's title, status, and start date/time;
3. on failure shows one clear error with a `Try again` button that re-requests;
4. offers one `Status` filter (`All`, `Scheduled`, `Completed`, `Cancelled`) applied client-side;
5. has a `New session` button that reveals an inline create form (title + start date/time);
6. validates trimmed title 3–80 chars and a required future date/time before sending `POST /api/sessions`;
7. disables submit while the POST is pending and guards against double submission;
8. adds the created session to the visible list.

## Preconditions And Confirmed Decisions

Q1 (requirements) authorized a new React + TypeScript scaffold. The stack choices below are the plan's decisions; the developer may override any of them before `coder` starts.

| Decision | Choice | Why |
| --- | --- | --- |
| Application root | **Repository root** (`package.json` beside `README.md`) | It is the only frontend candidate (writing-plans context rule 3). The accelerator lint gate (`toolchain/lib/lint-gate.mjs`) looks for a `lint` script in the root `package.json` first, so a root app turns the gate from DEGRADED to active without extra configuration. A subfolder would add a second root for no benefit at this scope. |
| Package manager | **npm** (commit `package-lock.json`) | Bundled with the installed Node 24; no extra tooling. The lint gate detects npm from `package-lock.json`. pnpm is installed but brings no benefit here. |
| Framework / dev server / build | **React 19 + TypeScript + Vite** (`@vitejs/plugin-react`) | Conventional, minimal React + TS setup with a fast dev server; matches the React framework ruleset. No routing or SSR is needed, so Next.js would be unnecessary scope. |
| Test runner | **Vitest** + `jsdom` + `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom` | Reuses the Vite config and TS setup; Testing Library lets tests drive the UI as a user would and assert visible output (per `react-behavior-testing.md`). |
| Mock API | **MSW 2.x**: Service Worker in the browser (dev), `msw/node` server in tests, one shared set of handlers | TASK.md allows MSW when no mock exists. It mocks at the HTTP layer, so the app uses a real `fetch` client, and swapping in a real backend means removing the mock bootstrap only (AC-16). |
| Lint | **ESLint flat config** (as in Vite's React-TS template: `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`) | Part of the standard Vite scaffold; enables the accelerator lint gate. It must ignore toolchain folders, because the gate runs `npm run lint` from the root. |
| State management | Local React state in one feature hook; no query library | Two endpoints and one screen; a data library would be a new dependency without demonstrated need (`typescript-and-project-fit.md`, `frontend-boundaries.md`). |
| Create form presentation | Inline section toggled by a button (no modal/drawer) | Smallest accessible option; avoids focus-trap work. |
| Date/time input | One `<input type="datetime-local">` labelled "Start date and time" | Captures date and time together; empty value covers the "required" check. |

Assumptions adopted from requirements (developer may still correct):

- A1: statuses `scheduled | completed | cancelled`.
- A2: the mock assigns `scheduled` to created sessions.
- A3: "future" = strictly later than `new Date()` at submit, in browser local time.
- A4 (decision): after a successful create, if the active filter is neither `All` nor the new session's status, the filter resets to `All` so the new session is visible. Otherwise the filter is unchanged.
- A5: validation runs on submit; errors are shown inline.
- A6: a failed POST shows a form-level error and keeps the entered values.
- A7: empty states `No sessions yet.` / `No sessions match this filter.`
- A8: dev error mode is turned on by the URL query `?mock=list-error` (see Mock contract).
- A9: English UI copy only.

Versions: install the current stable majors with `npm install`. The resolved versions are recorded in `package-lock.json`. Vite, `@vitejs/plugin-react`, and Vitest must be mutually compatible majors (Vitest's peer range tells you).

## Ordered File Changes

Paths are relative to the repository root. Steps 1–2 are sequential. After step 2, steps 3–5 can proceed in parallel. Steps 6–8 depend on 3–5. Step 9 depends on 6–8.

### Step 1 — Scaffold config (create)

Create these by hand instead of running `npm create vite` (it prompts on a non-empty directory and would also generate demo files):

- `package.json`: `"name": "training-sessions-workspace"`, `"private": true`, `"type": "module"`, scripts:
  - `dev`: `vite`
  - `build`: `tsc -b && vite build`
  - `preview`: `vite preview`
  - `test`: `vitest run`
  - `test:watch`: `vitest`
  - `typecheck`: `tsc -b`
  - `lint`: `eslint .`
  - `"msw": { "workerDirectory": ["public"] }` (written by `msw init --save`).
- `index.html`: Vite entry with `<div id="root">`, `<title>Training Sessions</title>`, `lang="en"`, and the script `/src/main.tsx`.
- `vite.config.ts`: React plugin, plus a `test` block: `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`, `include: ['src/**/*.test.{ts,tsx}']`. Use `/// <reference types="vitest/config" />` or `defineConfig` from `vitest/config`.
- `tsconfig.json` (references), `tsconfig.app.json` (`strict: true`, `jsx: react-jsx`, `noEmit`, `include: ["src"]`, `types: ["vitest/globals"]` only if globals are enabled; otherwise import from `vitest`), `tsconfig.node.json` (covers `vite.config.ts`). Follow Vite React-TS template conventions.
- `eslint.config.js`: Vite template flat config with `ignores: ['dist', 'coverage', 'public/mockServiceWorker.js', 'toolchain', '.claude', '.agents', '.codex', '.frontend-accelerator', 'tasks']`.
- `.gitignore`: `node_modules`, `dist`, `coverage`, `*.local`.

### Step 2 — Install dependencies and generate the MSW worker

- Runtime deps: `react`, `react-dom`.
- Dev deps: `typescript`, `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `@testing-library/jest-dom`, `msw`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`.
- Run `npx msw init public --save`. This creates `public/mockServiceWorker.js` (a generated file, committed, never hand-edited).
- Result: `package-lock.json`, `node_modules/` (ignored).

### Step 3 — Domain types and validation (create)

- `src/features/training-sessions/types.ts`
  - `SESSION_STATUSES = ['scheduled', 'completed', 'cancelled'] as const`; `type SessionStatus`.
  - `STATUS_LABELS: Record<SessionStatus, string>`.
  - `interface TrainingSession { id: string; title: string; status: SessionStatus; startsAt: string /* ISO 8601 */ }`.
  - `interface CreateSessionInput { title: string; startsAt: string /* ISO 8601 */ }`.
  - `isTrainingSession(value: unknown): value is TrainingSession`. This type guard narrows the API response; no `any` (`typescript-and-project-fit.md`).
- `src/features/training-sessions/validation.ts`
  - `TITLE_MIN = 3`, `TITLE_MAX = 80`.
  - `validateSessionForm(values: { title: string; startsAt: string /* datetime-local value */ }, now: Date): { errors: Partial<Record<'title' | 'startsAt', string>>; input?: CreateSessionInput }`.
  - Rules and messages (each message says how to fix the problem, per the web-interface guidelines):
    - trimmed title empty → `Enter a session title.`
    - trimmed length < 3 or > 80 → `Title must be between 3 and 80 characters.` (an 80-char title passes; 81 fails; leading/trailing spaces don't count)
    - `startsAt` empty or invalid → `Choose a start date and time.`
    - parsed date `<= now` → `Choose a date and time in the future.`
  - When valid, return `input` with the trimmed title and `new Date(localValue).toISOString()`.
  - `now` is a parameter so the logic is deterministic in tests (AC-10–AC-12).

### Step 4 — Request boundary (create)

- `src/features/training-sessions/api/sessionsApi.ts`
  - `const SESSIONS_URL = new URL('/api/sessions', window.location.origin)`. Build an absolute URL because Node's `fetch` in Vitest rejects relative URLs; jsdom provides `window.location.origin`.
  - `fetchSessions(): Promise<TrainingSession[]>`: `GET`; a non-2xx response throws `ApiError`; validate the JSON as an array via `isTrainingSession` and throw `ApiError('Unexpected response')` if it is malformed.
  - `createSession(input: CreateSessionInput): Promise<TrainingSession>`: `POST` with a JSON body and `Content-Type: application/json`; non-2xx → `ApiError`; validate the response with `isTrainingSession`.
  - `class ApiError extends Error { status?: number }`. The UI shows fixed friendly copy, never raw server text (`client-behavior.md`).
  - Do **not** pass an `AbortSignal` to `fetch`. jsdom's `AbortSignal` is rejected by Node's `fetch` in Vitest. Stale-response protection is handled in the hook (step 6).
- This module is the only place that knows URLs. Components never call `fetch` (AC-1, AC-16).

### Step 5 — Mock API (create)

- `src/mocks/data.ts`: `createSeedSessions(now = new Date()): TrainingSession[]`. Return about 5 sessions covering every status. `scheduled` ones are in the future and `completed` ones in the past, computed relative to `now` so the data stays realistic.
- `src/mocks/handlers.ts`
  - An in-memory `db` module variable, initialised from the seed, plus an exported `resetMockDb()` for tests.
  - `createHandlers(options: { listError?: boolean } = {})` returns:
    - `http.get('*/api/sessions', …)`: `await delay()` (realistic in the browser, instant in Node). If `listError` is set, return `HttpResponse.json({ message: 'Mock failure' }, { status: 500 })`; otherwise return `db`.
    - `http.post('*/api/sessions', …)`: `await delay()`; read the JSON body. If `title`/`startsAt` are missing, return 400. Otherwise create `{ id: crypto.randomUUID(), title, startsAt, status: 'scheduled' }`, push it to `db`, and return 201.
  - Export `handlers = createHandlers()` as the default set.
- `src/mocks/browser.ts`: `export const startMockWorker = (options) => setupWorker(...createHandlers(options)).start({ onUnhandledRequest: 'bypass' })`.
- `src/mocks/server.ts`: `export const server = setupServer(...handlers)` (Node only, for tests).

**Mock contract:**

| Request | Success | Failure |
| --- | --- | --- |
| `GET /api/sessions` | `200` `TrainingSession[]` | `500` `{ message }` |
| `POST /api/sessions` body `CreateSessionInput` | `201` `TrainingSession` (`status: 'scheduled'`) | `400` `{ message }` |

Dev error mode: opening the app with `?mock=list-error` makes **every** list request fail. That shows the error state, and `Try again` visibly re-requests (the loading state appears again and a new request shows in the Network tab). Recovery to a successful list is proven by the automated test (step 9, case 3), and manually by removing the query and reloading. This deliberately avoids a "fail once" toggle: React StrictMode runs the initial effect twice in dev, so a one-shot failure would be swallowed by the discarded first request.

### Step 6 — Feature state hook (create)

- `src/features/training-sessions/useSessions.ts`. This is the single owner of remote list state (`state-and-failure-flow.md`).
  - State: a discriminated union `{ status: 'loading' } | { status: 'error' } | { status: 'success'; sessions: TrainingSession[] }`.
  - `load()`: set `loading`, call `fetchSessions()`, then set `success` or `error`. Protect against stale responses with an `ignore` flag set in the effect cleanup, or a request-id ref so only the latest request writes state.
  - Effect on mount calls `load()` (dependency list: `[]`/a stable `load`, per `rerender-narrow-dependencies.md`).
  - `retry = load` (AC-5).
  - `addSession(session)`: a functional update that appends to `sessions` when status is `success` (`rerender-functional-setstate.md`, AC-15).
  - Returns `{ state, retry, addSession }`.

### Step 7 — UI components (create)

All under `src/features/training-sessions/components/` unless noted. Use semantic HTML, label every control, and render conditions explicitly with ternaries rather than `&&` on numbers (`rendering-conditional-render.md`).

- `SessionStatusFilter.tsx`: a `<label for>` "Status" plus a `<select>` with options `All` + `STATUS_LABELS`. Controlled props `value: 'all' | SessionStatus` and `onChange`. (AC-6, AC-7)
- `SessionList.tsx`: takes the already-filtered `sessions` and an `emptyMessage`. Renders a `<ul aria-label="Training sessions">`. Each `<li>` shows the title (heading or `<strong>`), a status label, and `<time dateTime={startsAt}>` formatted with a module-level `Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })` (hoisted, per `rendering-hoist-static-work.md`; `Intl` per the guidelines). Shows `emptyMessage` when the list is empty. (AC-3)
- `CreateSessionForm.tsx`
  - Props: `onCreated(session: TrainingSession)`, `onCancel()`.
  - Local state: `title`, `startsAt` (raw datetime-local string), `errors`, `submitError`, `isSubmitting`. A `useRef<boolean>` in-flight flag is checked synchronously at the start of submit, so two fast clicks before a re-render cannot send two POSTs (AC-14).
  - Submit handler: `preventDefault`, then return early if in flight. Next run `validateSessionForm(values, new Date())`. If there are errors, set them, focus the first invalid field, and **do not** call the API (AC-13). If valid, set the in-flight flag and `isSubmitting`, then `await createSession(input)`. On success call `onCreated` and reset the fields. On failure set `submitError = "Couldn't create the session. Check the details and try again."` and keep the values (A6). In `finally`, clear the flag and `isSubmitting`.
  - Markup: `<form noValidate aria-labelledby>` with a "New training session" heading.
    - Title: `<input id type="text" autoComplete="off">` with `<label>Title</label>`, `aria-invalid` and `aria-describedby` → inline error `<p id>`.
    - Start: `<input type="datetime-local">` with `<label>Start date and time</label>` and the same error wiring.
    - Submit button `Create session`. While pending it is disabled and its label is `Creating…`.
    - A `Cancel` button (`type="button"`).
    - Field errors and `submitError` render inside an `aria-live="polite"` region or with `role="alert"`. (AC-9–AC-14)
- `TrainingSessionsWorkspace.tsx` (feature root)
  - Uses `useSessions()`. Local `statusFilter` (`'all' | SessionStatus`, initially `'all'`) and `isFormOpen`.
  - `visibleSessions` is derived during render from `state.sessions` + `statusFilter`; it is never stored (`rerender-derived-state.md`, AC-8).
  - Renders:
    - an `<h1>Training sessions</h1>` header;
    - the `New session` button (`aria-expanded`), which opens the form;
    - `CreateSessionForm` when open;
    - the filter;
    - the body by `state.status`:
      - `loading` → `<p role="status">Loading sessions…</p>` (AC-2);
      - `error` → `<div role="alert"><p>Couldn't load training sessions. Check your connection and try again.</p><button>Try again</button></div>`, where the button calls `retry` (AC-4, AC-5);
      - `success` → `SessionList` with an empty message that depends on the filter.
  - `handleCreated(session)`: `addSession(session)`, close the form, and apply A4 (reset the filter to `'all'` if it would hide the new session) (AC-15).
- `src/App.tsx`: renders `<main>` containing `TrainingSessionsWorkspace`.
- `src/index.css` (optional, small): readable base layout (max-width container, spacing, visible `:focus-visible` outline). No design system; visual polish is a non-goal.

### Step 8 — App bootstrap (create)

- `src/main.tsx`:
  - In `import.meta.env.DEV`, read `new URLSearchParams(window.location.search).get('mock') === 'list-error'`, dynamically import `./mocks/browser`, and `await startMockWorker({ listError })` **before** `createRoot(...).render(<StrictMode><App/></StrictMode>)`. That way the first request is intercepted.
  - In a production build no mock is started. This is documented as a known limitation, since no backend exists (AC-17).
- `src/vite-env.d.ts`: `/// <reference types="vite/client" />`.

### Step 9 — Tests and docs (create / modify)

- `src/test/setup.ts`: import `@testing-library/jest-dom/vitest`. `beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))`. `afterEach(() => { cleanup(); server.resetHandlers(); resetMockDb(); })`. `afterAll(() => server.close())`.
- `src/features/training-sessions/TrainingSessionsWorkspace.test.tsx`: see Essential Tests.
- `README.md` (**modify**): add a short "Training Sessions Workspace" section with prerequisites (Node 24 / npm), `npm install`, `npm run dev` (open the URL Vite prints), `?mock=list-error`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`. This is the documented start command required by PASS_CRITERIA (AC-19).

## Contracts And Dependencies

- `types.ts` ← used by validation, API, mocks, hook, and components. It must exist first.
- `validateSessionForm(values, now)` returns `{ errors, input? }`. `input.startsAt` is ISO 8601 UTC, and `input.title` is already trimmed.
- `sessionsApi` is the only module that calls `fetch`. It throws `ApiError` for non-2xx responses or malformed data and never returns unvalidated data.
- MSW handlers implement exactly the mock contract table. Browser and tests share `createHandlers`, so test and dev behavior match.
- `useSessions` owns remote list state. The workspace owns `statusFilter` and `isFormOpen`. The form owns its field state. No state is duplicated.
- Dependency direction: `components → hook → api → (network/MSW)`. `mocks/` is imported only by `main.tsx` (dev) and `src/test/setup.ts`.

## Acceptance Criteria Coverage

| AC | Covered by | Proven by |
| --- | --- | --- |
| AC-1 request boundary | `sessionsApi.ts`, `useSessions.ts` | test cases 1–3 (go through MSW); review |
| AC-2 loading | Workspace `loading` branch | test case 1 (`Loading sessions…` visible before list); manual |
| AC-3 fields shown | `SessionList.tsx` | test case 1; manual |
| AC-4 error message | Workspace `error` branch | test case 3; manual with `?mock=list-error` |
| AC-5 retry | `retry` + `Try again` | test case 3 |
| AC-6/7/8 filter | `SessionStatusFilter`, derived `visibleSessions` | test case 1; manual |
| AC-9 open form | `New session` button | test case 2; manual |
| AC-10/11/12 validation | `validation.ts`, inline errors | test case 2 (short title + past date); optional unit tests |
| AC-13 no request on invalid | early return in submit | test case 2 (list unchanged, optional POST counter) |
| AC-14 double submit | `useRef` in-flight flag + disabled button | **test case 4 (required)**; manual |
| AC-15 created visible | `addSession`, A4 filter reset | test case 2; manual |
| AC-16/17 mock, no backend | `src/mocks/*`, `main.tsx` | review |
| AC-18 behavior test | `TrainingSessionsWorkspace.test.tsx` | `npm test` |
| AC-19 start command | `package.json` `dev`, README | `npm run dev` |
| AC-20 manual check | — | Manual Browser Check below, recorded in `workflow-log.md` |

## Essential Tests

File: `src/features/training-sessions/TrainingSessionsWorkspace.test.tsx`. Render `<TrainingSessionsWorkspace />` directly. It needs no providers.

1. **Loads, shows loading, then filters (required minimum for PASS):** assert `Loading sessions…` is visible; `findByRole('list', { name: 'Training sessions' })`; all seeded titles are visible; select `Completed` in the `Status` combobox with `user.selectOptions`; only completed titles remain; select `All`; all titles are back.
2. **Creates a valid session and rejects invalid input:**
   - Wait for the list, then click `New session`.
   - Type title `ab` and set start to yesterday. Set the datetime-local value with `fireEvent.change(input, { target: { value } })`, because user-event typing into `datetime-local` is unreliable in jsdom. Use a small helper that formats a local `YYYY-MM-DDTHH:mm`.
   - Submit, and assert both inline messages appear and the list did not change.
   - Fix the inputs: title `  Intro to React  ` (with surrounding spaces) and start tomorrow. Submit.
   - Assert the button shows `Creating…`/is disabled while pending (optional; the mock delay is instant in Node).
   - Assert `Intro to React` (trimmed) appears in the list.
3. **Error then retry recovers:** `server.use(http.get('*/api/sessions', () => HttpResponse.json({ message: 'x' }, { status: 500 }), { once: true }))`; assert the `alert` with `Couldn't load training sessions…`; click `Try again`; assert the list renders.

4. **Double submit while the POST is pending sends exactly one request (required, AC-14):**
   - Arrange: before rendering, `server.use(http.post('*/api/sessions', handler))`. The handler:
     - increments a test-local `postCount`;
     - awaits a test-controlled deferred promise (`let release!: () => void; const pending = new Promise<void>(r => { release = r; })`), so the first POST stays pending until the test releases it (no timing-based `delay`);
     - returns `HttpResponse.json({ id: 'created-1', title, startsAt, status: 'scheduled' }, { status: 201 })` from the request body.
   - Act:
     - Wait for the list and record the initial number of `listitem`s.
     - Open the form, enter the title `Double Submit Check`, and set a future start with `fireEvent.change`.
     - Submit #1: `await user.click(screen.getByRole('button', { name: 'Create session' }))`.
     - While it is pending, assert the submit button is disabled and reads `Creating…`.
     - Submit #2: `fireEvent.submit(screen.getByRole('form', { name: 'New training session' }))`. Submitting the form directly bypasses the disabled button, so the test proves the `useRef` in-flight guard itself and not only the `disabled` attribute.
     - Assert `postCount === 1` while still pending.
   - Release: `release()`, then `await screen.findByText('Double Submit Check')`.
   - Assert:
     - `postCount === 1`;
     - `getAllByText('Double Submit Check')` has length 1;
     - the `listitem` count equals the initial count + 1;
     - the submit button is no longer in the busy state (the form closes on success).
   - Prerequisite: the form must have an accessible name (`aria-labelledby` → "New training session" heading, as in step 7) so `getByRole('form', …)` resolves.

Cases 1–4 are all required in this scope. Case 1 alone satisfies the AC-18 minimum. Cases 2–4 protect the most damaging regressions: validation and create, the recoverable error, and duplicate creation (`essential-behavior-tests.md`).

## Additional Risk-Based Tests

Optional; for `test-generator` or later.

- `validation.test.ts`: boundaries at 2/3/80/81 trimmed characters, whitespace-only title, empty date, `now` exactly equal to the chosen time.
- Create failure (POST 500): form-level error shown, values kept.
- A4: with filter `Completed`, create a session → the filter resets to `All` and the new session is visible.
- Malformed list response → error state.

## Verification Commands

None exist today (no `package.json`). After steps 1–2 the following repository commands exist and are the ones `verify` should run from the repository root:

| Command | Purpose |
| --- | --- |
| `npm install` | install from `package-lock.json` (one-time) |
| `npm run dev` | start the Vite dev server with the MSW worker; use the URL Vite prints (do not assume a port) |
| `npm test` | run Vitest once (`vitest run`) |
| `npm run typecheck` | `tsc -b` strict type check |
| `npm run lint` | ESLint (also used by the accelerator lint gate) |
| `npm run build` | production build (no mock included) |

## Manual Browser Check

To be done by the developer and recorded in `workflow-log.md` → "Manual Browser Observation" (AC-20):

1. `npm run dev`, then open the printed URL.
2. Observe `Loading sessions…`, then the list with title, status, and date/time for each session.
3. Change `Status` to `Scheduled`, then `Completed`, then `All`, and check that the list narrows and restores.
4. Click `New session`. Submit an empty form and check the messages. Enter a 2-char title and a past date and check the messages. Enter a valid title and a future date, click `Create session` (ideally double-click), and check that one new session appears.
5. Open `<printed URL>?mock=list-error`. Observe the error message. Click `Try again` and check that loading appears again and a new `GET /api/sessions` shows in DevTools Network.
6. Note any console errors and anything not observed.

## Risks And Rollback

- **Relative URL in tests:** Node `fetch` rejects relative URLs, so build an absolute URL from `window.location.origin` (step 4). Handlers use the `*/api/sessions` wildcard.
- **AbortSignal mismatch in jsdom:** don't pass signals to `fetch`; use an ignore flag or request id (step 6).
- **StrictMode double effect in dev:** two initial GETs are expected and harmless; the stale-response guard prevents flicker. The dev error mode fails all list requests for this reason (step 5).
- **MSW worker not intercepting:** the worker must be started before render, and `public/mockServiceWorker.js` must exist. Re-run `npx msw init public --save` if it is missing.
- **Lint gate scope:** `npm run lint` runs over the repository root, so the ESLint `ignores` must exclude toolchain/agent folders or the gate will fail on non-app files.
- **Version drift:** pin through `package-lock.json`. If Vite and Vitest majors conflict, align to Vitest's supported Vite peer range.
- **Rollback:** everything is new and additive except `README.md`. Revert the commit, or delete the created files plus `node_modules/`, and restore `README.md`. No feature flag is needed.

## Out Of Scope (unchanged from requirements)

Details/drawers/deep links, search, multiple filters, sorting, pagination, edit/delete, backend, CI/deploy, exhaustive responsive or a11y validation, full coverage.

## Recommended Next Role

`coder`, implementing steps 1–9 and required test cases 1–4. Not started by this role.
