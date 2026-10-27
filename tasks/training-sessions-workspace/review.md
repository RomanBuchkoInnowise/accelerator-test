# training-sessions-workspace: Code Review

Role: `code-reviewer` (read-only; no production code, tests, docs, or rulesets changed)
Date: 2026-10-27

## Review Surface

- Comparison base: `4a7a45e` (feat run writing-plan) → `ec07224` (feat implement coder), i.e. `git diff HEAD~1 HEAD`.
- Application root: repository root (only candidate; `package.json` beside `README.md`).
- Inputs: `tasks/training-sessions-workspace/requirements.md` (AC-1…AC-20, A1–A9), `tasks/training-sessions-workspace/implementation-plan.md` (steps 1–9, test cases 1–4).
- Rulesets loaded: `rulesets/common/code-reviewer/INDEX.md` → `rules/evidence-first-review.md`; `rulesets/framework/code-reviewer/INDEX.md` (React review priorities). `rulesets/project/` has no code-reviewer section.
- Not reviewed: `package-lock.json` contents and generated `public/mockServiceWorker.js` (generated files).

## Verdict

**PASS (code)**, with one open acceptance item.

There are no blocking or should-fix code findings. The implementation follows the plan step by step and meets AC-1…AC-19 when checked against the code. **AC-20 (the manual browser observation) is not done yet**, so the task as a whole cannot be accepted until it is recorded (see Open Acceptance Items). Low findings and gaps are listed below. None of them blocks the task.

## Findings (most severe first)

| # | Severity | Area | Location |
| --- | --- | --- | --- |
| F1 | Low | Correctness / state | `src/features/training-sessions/useSessions.ts:37-41`, `src/features/training-sessions/TrainingSessionsWorkspace.tsx:26-40` |
| F2 | Low | Test coverage (AC-5) | `src/features/training-sessions/TrainingSessionsWorkspace.test.tsx:104-107` |
| F3 | Low | Test coverage (AC-10, A4) | `src/features/training-sessions/validation.ts:19-26`, `TrainingSessionsWorkspace.tsx:19` |
| F4 | Low | Accessibility (focus) | `src/features/training-sessions/TrainingSessionsWorkspace.tsx:17,38` |
| F5 | Info | Plan deviation (justified) | `src/mocks/browser.ts:5`, `src/test/setup.ts:7`, `package.json:25` |
| F6 | Info | Build output | `dist/mockServiceWorker.js` |

### F1 — Low: a session created while the list is loading or failed is not added to local state

- **Evidence:** `addSession` only appends when `current.status === 'success'` and otherwise returns `current` (`useSessions.ts:38-40`). The `New session` button and the form are available in every list state (`TrainingSessionsWorkspace.tsx:26-40`), so a trainer can create a session while the list shows the error.
- **Failure scenario:** The list is in the error state (`?mock=list-error`). The trainer opens the form and submits a valid session. The POST succeeds and the form closes, but the error panel stays and there is no confirmation that anything was created. The session only shows up after `Try again`. That works here only because the mock `db` keeps it (`src/mocks/handlers.ts:36`). With a real API, a GET started before the POST and answered after it would also drop the session from view until the next reload.
- **Impact:** This is outside the main flow in AC-15, which assumes a loaded list. The data is not lost on the mock server.
- **Suggested direction (for `coder`):** Either disable or hide `New session` unless `state.status === 'success'`, or re-request the list after a create when the state is not `success`.

### F2 — Low: the retry test does not prove that the loading state comes back

- **Evidence:** AC-5 says retrying "repeats the request, **shows the loading state again**, and on success shows the list". The code does this (`useSessions.ts:33` sets `loading` before `request()`). The test only checks that the list comes back after `Try again` (`TrainingSessionsWorkspace.test.tsx:104-107`).
- **Failure scenario:** If someone removes `setState({ status: 'loading' })` from `retry`, the error panel stays on screen until the response arrives. AC-5 would be broken, but all tests would still pass.
- **Suggested direction (for `test-generator`):** After clicking `Try again`, assert `getByRole('status')` has the text `Loading sessions…` before waiting for the list.

### F3 — Low: the AC-10 boundaries and the A4 filter reset are untested

- **Evidence:** AC-10 explicitly requires that titles of exactly 3 and exactly 80 trimmed characters are accepted, and that 2, 81, and whitespace-only titles are rejected. Reading `validation.ts:19-26` shows this is correct, but no test covers it (the only invalid case tested is `ab`). The A4 decision, which resets the filter to `All` when it would hide the new session (`TrainingSessionsWorkspace.tsx:19`), is also untested. The plan lists both as optional ("Additional Risk-Based Tests"), so this is a gap, not a deviation from the plan.
- **Failure scenario:** If someone changes `>` to `>=` in `validateTitle`, an 80-character title is rejected, and no test fails.
- **Suggested direction (for `test-generator`):** Add `validation.test.ts` with cases for 2/3/80/81 characters, whitespace-only titles, an empty date, and `now` equal to the chosen time. Add one workspace test for creating a session while the `Completed` filter is active.

### F4 — Low: focus is lost when the create form closes

- **Evidence:** On success, `handleCreated` calls `setIsFormOpen(false)` (`TrainingSessionsWorkspace.tsx:17`). `Cancel` does the same (`:38`). Either way the focused element is unmounted and no focus is restored.
- **Failure scenario:** A keyboard or screen-reader user presses `Create session` or `Cancel`. Focus falls back to `<body>`, so the user has to tab through the page again from the top to find the new session or the `New session` button.
- **Impact:** Exhaustive a11y is a non-goal in the requirements, so this is Low. Moving focus back to the `New session` button would be a small fix.

### F5 — Info: plan deviations that are justified

- `onUnhandledFrame` is used where the plan says `onUnhandledRequest` (`src/mocks/browser.ts:5`, `src/test/setup.ts:7`). This is correct for the installed MSW `3.0.3`: `node_modules/msw/lib/_chunks/shared-options.d.ts:15` declares `onUnhandledFrame?: UnhandledFrameHandle`. Tests still fail on unhandled requests.
- `@types/node` was added (`package.json:25`) for `tsconfig.node.json` (`types: ["node"]`), and `*.tsbuildinfo` was added to `.gitignore`. Both are reasonable additions to the scaffold.
- `CreateSessionForm` uses `role="alert"` on each field error instead of a shared `aria-live` region. The plan allows either.

### F6 — Info: the production build contains an unused MSW worker

- **Evidence:** A local `dist/` exists and contains `mockServiceWorker.js`, because Vite copies `public/`. `main.tsx:8` skips mocking outside DEV, so the worker is never registered.
- **Impact:** None at runtime. The README already documents that the production build has no API (`README.md`, "Known limitations").

## Acceptance Criteria Check

| AC | Status | Evidence |
| --- | --- | --- |
| AC-1 request boundary | Met | `api/sessionsApi.ts:25-30` is the only `fetch`; components use the hook |
| AC-2 loading | Met | `TrainingSessionsWorkspace.tsx:44-45`; test `:36` |
| AC-3 title/status/date shown | Met | `SessionList.tsx:16-24` (`Intl.DateTimeFormat`, `<time dateTime>`); test `:40-45` |
| AC-4 error message | Met | `TrainingSessionsWorkspace.tsx:46-52`; test `:100-102` |
| AC-5 retry | Met in code; test partial (F2) | `useSessions.ts:32-35`; test `:104-108` |
| AC-6/7/8 filter | Met | `SessionStatusFilter.tsx:17-31`, derived filter `TrainingSessionsWorkspace.tsx:55-59`; test `:47-52` |
| AC-9 open form | Met | `TrainingSessionsWorkspace.tsx:26-40`; test `:66` |
| AC-10 title trim 3–80 | Met in code; boundaries untested (F3) | `validation.ts:19-26,49` |
| AC-11 date/time required | Met | `validation.ts:29-31` |
| AC-12 future only | Met | `validation.ts:32` (`<=` now, local time per A3); test `:71-75` |
| AC-13 no request on invalid | Met | `CreateSessionForm.tsx:38-42`; test `:78` (`postCount === 0`) |
| AC-14 double submit | Met | `useRef` guard `CreateSessionForm.tsx:33,44,54` + `disabled` `:111`; test `:111-149` (exercises the guard directly through `fireEvent.submit`) |
| AC-15 created visible | Met (loaded-list path); edge case F1 | `useSessions.ts:37-41`, A4 reset `TrainingSessionsWorkspace.tsx:19`; test `:86-90` |
| AC-16 mock boundary | Met | MSW handlers `src/mocks/handlers.ts`, started only in `main.tsx:6-12`; UI has no mock imports |
| AC-17 no backend | Met | none present |
| AC-18 behavior test | Met by code inspection; **run not observed by this review** | 4 tests in `TrainingSessionsWorkspace.test.tsx` |
| AC-19 start command | Met | `package.json:7` `dev`, `README.md` Commands table |
| AC-20 manual browser check | **Not done** | `workflow-log.md` "Manual Browser Observation" still holds placeholders |

## React Review Priorities (framework ruleset)

- **State ownership:** single owners, as planned. `useSessions` owns the list, the workspace owns the filter and form toggle, and the form owns its fields. `visibleSessions` is derived during render and never stored.
- **Effects:** one mount effect with a stable `request` (`useCallback([])`). The request-id ref keeps only the latest response, which also covers the StrictMode double mount. No stale closures found.
- **Conditional rendering:** explicit ternaries, with no `&&` on numbers. List keys use `session.id`.
- **Async:** no waterfalls. The mock bootstrap is dynamically imported in DEV only.
- **Component APIs:** small, with no boolean-prop growth.

## Open Acceptance Items

1. **AC-20** is blocking for task completion but is not a code defect. Run the plan's "Manual Browser Check" (list → filter → create, plus `?mock=list-error` → `Try again`) and record what actually happened in `workflow-log.md` → "Manual Browser Observation".
2. **Verification evidence:** this review did not run `npm test`, `npm run typecheck`, `npm run lint`, or `npm run build`, because it is read-only by contract. A `dist/` folder exists locally, but no command output is recorded anywhere. Run them through `verify` before accepting the task.

## Residual Gaps

- Runtime: real-browser MSW worker start, the StrictMode double request, and the `datetime-local` UX are not observed (AC-20).
- Coverage: F2 and F3. Create failure (POST 500 keeps values, A6) and malformed list response are untested. The plan marks both as optional.

## Recommended Next Role

`verify` runs the repository checks. Then `browser-verify` (or the developer manually) does AC-20 and records the observation in `workflow-log.md`. If you want to fix the Low findings, use `test-generator` for F2/F3 and `coder` for F1/F4.

## STOP

The review is complete. Nothing was implemented, and no other role was started. Waiting for the developer to choose the next role.
