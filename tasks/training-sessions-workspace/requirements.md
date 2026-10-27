# training-sessions-workspace: Training Sessions Workspace

Sources:

- `TASK.md` (primary requirements) — `c:\Users\user\Work\Frontend-accelerator\frontend-accelerator-toolset\training\frontend-accelerator-onboarding\TASK.md`
- `PASS_CRITERIA.md` (acceptance gate) — same directory
- Onboarding `README.md` (same directory) — context only

## Goal

Deliver a small frontend workspace where a trainer can view training sessions loaded through a mock API, filter them by one status, and create a new session that then appears in the list. Scope is intentionally minimal: the exercise exists to practise the accelerator role workflow, not to build a production application.

## Users And Outcome

- **User:** a trainer managing their training sessions.
- **Problem:** the trainer needs one place to see sessions, narrow them by status, and schedule a new one.
- **Outcome:** in one browser session the trainer can open the workspace, see sessions, filter by status, create a session with a title and a future date/time, and see it in the list without reloading.

## Expected Application Behavior

### Main flow

1. Trainer opens the workspace → a loading state is shown while sessions are requested from the mock API.
2. Request succeeds → a list of sessions is shown; each item displays **title**, **status**, and **start date/time**.
3. Trainer chooses a status in the filter → only sessions with that status are shown. Choosing `All` shows every session again.
4. Trainer opens the create form.
5. Trainer enters a title and a future date/time and submits → while the request is pending, the submit cannot be triggered again.
6. Request succeeds → the new session is visible in the list.

### Alternative paths

- **List request fails** → an understandable error message is shown together with a way to recover (e.g. a retry action that repeats the request). Recovery that succeeds shows the list normally.
- **Invalid create input** → submission is blocked, no request is sent, and a useful message explains what to fix (title length/emptiness, missing date/time, date/time not in the future).

## Acceptance Criteria

### Sessions list

- [ ] AC-1: On opening the workspace, sessions are requested through the replaceable request boundary (HTTP client or equivalent), not read directly from an in-component constant.
- [ ] AC-2: While the list request is pending, a visible loading state is shown instead of the list.
- [ ] AC-3: After a successful response, every returned session is shown with its title, status, and start date/time in a human-readable form.
- [ ] AC-4: When the list request fails, one understandable error message is shown (not a blank screen, raw stack trace, or silent empty list).
- [ ] AC-5: The error state offers a recovery action; triggering it repeats the request, shows the loading state again, and on success shows the list.

### Status filter

- [ ] AC-6: A single status filter control exists with an `All` option plus the available status values; exactly one option is active at a time.
- [ ] AC-7: `All` is the initial selection and shows all loaded sessions.
- [ ] AC-8: Selecting a status shows only sessions with that status; selecting `All` again restores the full list.

### Create session

- [ ] AC-9: The trainer can open a create form from the workspace.
- [ ] AC-10: Title is trimmed before validation and submission; a trimmed title shorter than 3 or longer than 80 characters (including empty / whitespace-only) is rejected with a useful message. Titles of exactly 3 and exactly 80 trimmed characters are accepted.
- [ ] AC-11: Date and time are both required; a missing value is rejected with a useful message.
- [ ] AC-12: A date/time that is not later than the current time at submission is rejected with a useful message.
- [ ] AC-13: Invalid input does not send a create request.
- [ ] AC-14: While the create request is pending, repeated submission is prevented (e.g. the submit control is disabled or ignored), so at most one session is created per submit.
- [ ] AC-15: After a successful create, the created session (trimmed title, chosen date/time, its status) appears in the visible list without a page reload.

### Mock boundary

- [ ] AC-16: Mock data is served behind the request boundary using the repository's existing mock mechanism; if none exists, MSW or another conventional HTTP mock is used. Replacing the mock with a real API must not require changing UI components.
- [ ] AC-17: No backend service is implemented.

### Tests and verification (from TASK.md / PASS_CRITERIA.md)

- [ ] AC-18: At least one behavior-level automated test covers the main flow (filtering or successful creation) and passes with the repository's test tooling.
- [ ] AC-19: The application starts with a documented repository command.
- [ ] AC-20: The list → filter → create flow is exercised once manually in a real browser and the actual observation is recorded in `tasks/training-sessions-workspace/workflow-log.md`.

## Constraints

- No frontend stack exists yet; per Q1 (resolved: option b), a new React + TypeScript app is scaffolded in this repository. Keep the scaffold minimal and conventional, and use it consistently for scripts and tests.
- Do not rewrite unrelated code or configuration.
- Do not add features outside the required flow.
- Report incomplete behavior and unperformed checks honestly.
- Workflow constraint (PASS_CRITERIA): roles run one at a time, each STOPs, and the developer selects the next role; requirements, plan, review, verification, and workflow-log artifacts must exist.

## Non-Goals

- Session details, drawers, deep links.
- Search, multiple filters, sorting, pagination.
- Editing or deleting sessions.
- A complete API contract or scenario matrix.
- Backend service implementation.
- Desktop/mobile screenshot sets; exhaustive responsive and accessibility validation.
- Full test coverage, CI, deployment, public URL.
- Strict TypeScript migration or unrelated refactoring.

## Facts

- The repository `accelerator-test` currently contains **no frontend application**: no `package.json`, no source directory, no build, test, or mock configuration. It contains only the accelerator toolset (`.claude/`, `.agents/`, `.codex/`, `rulesets/`, `toolchain/`), `README.md`, and task files.
- The active framework ruleset is React (`rulesets/framework/README.md`); the onboarding README expects "a prepared React and TypeScript repository".
- `rulesets/project/` contains no project-specific rules (no chosen bundler, test runner, mock library, or layout).
- Doctor result is `DEGRADED`; Claude Code hooks are `ACTIVE`; the Changed-File Lint Gate has no lint script to run (recorded in the workflow log).
- Pass/fail is binary; visual polish, mobile edge cases, exhaustive a11y, and extra error/race scenarios do not block passing.

## Assumptions

Non-blocking; the planner may adopt them unless the developer corrects them.

- A1: Status values are a small fixed set, e.g. `scheduled`, `completed`, `cancelled`. Exact names and labels are not specified in TASK.md.
- A2: A newly created session receives a default status assigned by the mock API (e.g. `scheduled`); the trainer does not choose status in the form.
- A3: "Future" is evaluated against the user's current local time at the moment of submission; date/time is entered and displayed in the browser's local time zone.
- A4: If a status filter is active and the new session does not match it, satisfying AC-15 requires the session to become visible; the simplest acceptable behavior is either resetting the filter to `All` or the new session matching the active filter. The planner should choose one and state it.
- A5: Validation messages appear at least on submit attempt; inline/on-blur validation is optional.
- A6: A failed create request shows a message and keeps the entered values so the trainer can retry; no detailed create-error matrix is required.
- A7: An empty list (zero sessions, or zero after filtering) shows a short "no sessions" message. Not explicitly required; low cost.
- A8: The mock should support forcing the list request to fail (e.g. a handler override in tests or a dev toggle) so AC-4/AC-5 can be demonstrated.
- A9: UI language is English; no localization required.

## Open Questions

- **Q1 (RESOLVED 2026-10-27, developer decision: option b):** There is no existing frontend application. The developer authorized scaffolding a new React + TypeScript app in this repository. Choosing the application root, package manager, bundler/dev server, test runner, and mock mechanism (MSW is allowed by TASK.md when no mock exists) belongs to `writing-plans` (or `architect` if a recorded decision is needed), not to this role. Because the stack is new, the planner must also define the documented start and test commands (AC-18, AC-19).
- Q2 (non-blocking): Confirm the status set (A1) and default status of created sessions (A2).
- Q3 (non-blocking): Confirm the post-create filter behavior (A4).

## Specialist Gaps

- Architecture (stack, app root, state ownership for list + create, request boundary): `architect` only if Q1 resolves to scaffolding and the plan needs a recorded decision; otherwise `writing-plans` can cover it for this small scope.
- API contract (`GET` list / `POST` create shape, mock error mode): small enough for `writing-plans`; `api-integration` is optional.
- Visual direction: not required; `ui-designer` is optional.

## Readiness

**Ready for implementation planning.** Q1 is resolved (scaffold a new React + TypeScript app). Behavioral requirements are clear and verifiable; Q2–Q3 have workable defaults (A1–A4) that the planner may adopt unless the developer corrects them. Recommended next role: `writing-plans`.
