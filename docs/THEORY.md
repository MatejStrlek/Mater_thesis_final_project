# Playwright & Automated Web Testing — Theory Reference

> Copied verbatim from the companion 15-week lab course repository
> (`Playwright-masters-thesis-code`) as reference context for this
> project. This project's [final project specification](PROJECT-SPECIFICATION.md)
> is built directly on top of the concepts documented here — every
> requirement in the spec traces back to a week covered below.

This document collects the **theory** behind everything the 15-week lab
course covers — concepts, mechanisms, and the reasoning behind design
choices — independent of any specific exercise. It's meant as raw
material for building lecture slides, not a replacement for the
week-by-week lab READMEs (which are hands-on and task-focused).

Where useful, it also includes non-obvious facts that were verified by
actually running Playwright while building this course, not just
paraphrased from documentation — these are marked **(verified)**.

---

## Table of contents

1. [Week 1 — Introduction to Playwright](#week-1--introduction-to-playwright)
2. [Week 2 — Structuring Tests](#week-2--structuring-tests)
3. [Week 3 — Advanced Locators & Dynamic UI](#week-3--advanced-locators--dynamic-ui)
4. [Week 4 — Forms, File Handling & Mocking Time](#week-4--forms-file-handling--mocking-time)
5. [Week 5 — API Testing & Network Interception](#week-5--api-testing--network-interception)
6. [Week 6 — Authentication & Environment Configuration](#week-6--authentication--environment-configuration)
7. [Week 7 — Visual Regression Testing](#week-7--visual-regression-testing)
8. [Week 8 — Accessibility Testing](#week-8--accessibility-testing)
9. [Week 9 — Cross-Browser Testing & Device Emulation](#week-9--cross-browser-testing--device-emulation)
10. [Week 10 — Parallelization, Sharding & Retries](#week-10--parallelization-sharding--retries)
11. [Week 11 — CI/CD Integration](#week-11--cicd-integration)
12. [Week 12 — Test Architecture at Scale](#week-12--test-architecture-at-scale)
13. [Week 13 — Component Testing & Flake-Resistant Tests](#week-13--component-testing--flake-resistant-tests)
14. [Week 14 — Advanced Debugging](#week-14--advanced-debugging)
15. [Week 15 — Test Suite Health at Scale](#week-15--test-suite-health-at-scale)

---

## Week 1 — Introduction to Playwright

### What Playwright is, architecturally

Playwright is a browser automation library that talks to real browser
engines (Chromium, Firefox, WebKit) over each engine's own low-level
automation protocol (e.g. Chromium's DevTools Protocol), rather than
scripting the DOM from inside the page like older tools did. This is why
a single Playwright API surface can drive three genuinely different
rendering engines: it's not injecting JavaScript into the page to control
it, it's driving the browser from the outside, the same way a human's
input would arrive.

Each test gets an **isolated browser context** — the equivalent of a
fresh incognito profile, with its own cookies, storage, and cache — so
tests don't leak state into one another even when they run in the same
browser process. This is the architectural reason "each test should be
independent" is achievable by default, not just a style guideline.

### Anatomy of a test

A Playwright test is a `test(title, async ({ page }) => { ... })` block.
`page` is a **fixture** — an object the test framework constructs and
injects, rather than something the test creates itself. This
dependency-injection model (elaborated heavily in week 2) is what lets
Playwright manage the browser lifecycle, isolation, and cleanup
transparently.

### Auto-waiting and actionability

Every Playwright action (`click`, `fill`, etc.) and every web-first
assertion (`expect(locator).toBeVisible()`, etc.) automatically waits and
retries against a live DOM until a condition is met or a timeout expires.
Before performing an action, Playwright runs a sequence of
**actionability checks**: the element must be attached to the DOM,
visible, stable (not mid-animation), able to receive events (not covered
by another element), and enabled. This is the mechanism that eliminates
almost all need for manual waiting — the wait isn't a fixed sleep, it's a
condition being polled.

### Locators are lazy

A `Locator` (from `page.getByRole()`, `getByLabel()`, etc.) doesn't
immediately find an element — it's a **recipe** for finding one at the
moment an action or assertion actually runs. This is why locators can be
created before the element exists yet, and why the same locator
re-queries the live DOM on every use instead of holding a stale
reference.

### Locator strategy: why role-based first

Playwright's own recommended priority order is: **role/label first**
(`getByRole`, `getByLabel`, `getByText`), then `getByTestId` as a
fallback, then CSS/XPath as a last resort. The reasoning:
- Role/label locators query by **what a user or assistive technology
  would perceive** (a button named "Submit", a field labeled "Email") —
  they survive markup refactors (class renames, div restructuring)
  because they're tied to meaning, not implementation.
- They double as a lightweight accessibility check: if `getByRole`
  can't find your button, neither can a screen reader.
- CSS class/ID selectors couple tests to styling/implementation details
  that change for reasons unrelated to the feature being tested.

**Strict mode**: by default, a locator that matches more than one element
throws instead of silently acting on the first match. This surfaces
ambiguous selectors as an immediate, loud test failure at the point of
use, rather than a silent wrong-element interaction that only shows up as
a confusing downstream assertion failure.

### Web-first assertions

`expect(locator).toHaveText(...)`, `toBeVisible()`, etc. are **polling
assertions** — they retry until the condition holds or a timeout elapses,
unlike a plain `expect(x).toBe(y)` which checks a value exactly once.
This distinction is the single most important idea for writing
non-flaky tests: a test that reads a value once and compares it is
racing the application's own asynchronous rendering; a test that polls
via a web-first assertion is not.

### The HTML report and trace viewer

The HTML reporter aggregates a run's results into a static, browsable
report. A **trace** is a much richer artifact — a recording of a test's
execution containing DOM snapshots before/after every action, network
requests, console logs, and source location, viewable in the trace
viewer (locally or at `trace.playwright.dev`). Playwright's own built-in
default for the `trace` option is `'off'` — recording is opt-in, since it
has real overhead. The config template `npm init playwright` generates
(and what this course's root config uses) explicitly sets `on-first-retry`
instead — i.e. only record when something already failed once — trading
a small amount of missing data on a test that passes first-try for not
paying trace-recording overhead on every green test.

---

## Week 2 — Structuring Tests

### `describe` blocks and hooks

`test.describe()` groups related tests, primarily for reporting and for
scoping hooks. `beforeEach`/`afterEach` run around **every** test in
their scope (including nested describes); `beforeAll`/`afterAll` run once
per **worker process** for that scope, not once globally — a common
misconception, since it implies `beforeAll` state doesn't automatically
exist in a different worker running a different file in parallel.

### `test.step`

Wraps a logical chunk of a test body so it appears as a named, collapsible
node in the HTML report and the trace timeline. It's a reporting/DX
feature, not a functional one — it changes nothing about how the test
executes, only how its execution is presented afterward for debugging.

### Fixtures: dependency injection for tests

A fixture is a named, reusable piece of test setup/teardown, declared
once and requested by name in a test's parameter object. Two properties
matter:
- **Scope**: `'test'` (default, recreated for every test) or `'worker'`
  (created once per worker process, shared across every test that worker
  runs — until a retry, see week 10).
- **Automatic vs. on-demand**: a fixture only runs if a test actually
  destructures it as a parameter (unless declared `{ auto: true }`), so
  unused setup work is never paid for.

Custom fixtures are built with `base.extend<{...}>({...})`, composing on
top of Playwright's own built-in fixtures (`page`, `context`, `request`,
etc.). This composability is what lets a test suite build up
higher-level fixtures (a logged-in page, a seeded page) out of primitive
ones, layer by layer.

### The Page Object Model (POM)

A design pattern, not a Playwright feature: wrap a page's locators and
interactions behind a class with meaningful method names
(`todoPage.addTodo('Buy milk')` instead of the raw locator/fill/click
sequence inline). The benefit is a **single point of change** — if a
selector or an interaction sequence changes, one class method updates
instead of every test that touched that page. POM and fixtures compose
naturally: a fixture can construct and hand back a Page Object instance,
combining "how do I get a ready-to-use page" (fixture) with "what can I
do on this page" (POM).

---

## Week 3 — Advanced Locators & Dynamic UI

### Filtering and chaining

`.filter({ hasText })`, `.filter({ has: otherLocator })`, `.first()`,
`.last()`, `.nth()` narrow a broad locator down to a specific element
without hand-writing a more complex selector. Because locators are lazy
recipes (week 1), filters compose: `page.getByRole('row').filter({
hasText: 'Smith' })` reads as "the row containing Smith," re-evaluated
fresh each time.

### Frames

An `<iframe>` is a genuinely separate document with its own DOM — a
locator scoped to the main page cannot see into it. `page.frameLocator()`
returns a locator scoped to a frame's content, letting the rest of the
API (role/label locators, actions, assertions) work identically inside
it. This mirrors the real DOM model: frames are isolated by design (often
deliberately, for security, e.g. third-party widgets), and the tooling
has to cross that boundary explicitly.

### Popups and multiple pages

`window.open()` or a target=`_blank` link creates a new `Page` object
within the same `BrowserContext`. Because Playwright doesn't know a popup
is coming until it happens, you listen for it explicitly:
`page.waitForEvent('popup')` fires only for popups opened by that
specific page, while the broader `context.waitForEvent('page')` fires for
any new page opened anywhere in the context (two distinctly-named
events, not the same event on two objects) — either way, you race the
wait against the action that triggers it (usually via `Promise.all`).
This models the real async nature of a new window/tab
opening — there's no synchronous way to "get the popup" the instant a
click returns.

### Native browser dialogs

`alert()`, `confirm()`, and `prompt()` are **blocking** in a real browser
— they pause script execution until dismissed. Playwright can't click a
native OS-level dialog (it isn't part of the page's DOM), so it exposes
`page.on('dialog', ...)` as an event handler that must call
`dialog.accept()`/`dialog.dismiss()` to unblock the page. If no handler
is registered, Playwright auto-dismisses dialogs by default — a
frequently-surprising default worth calling out explicitly, since a test
that "clicks a button and the confirm dialog seems to vanish" is this
default, not a bug.

### Data-driven testing

Generating tests from data (`for (const item of data) { test(`case
${item.name}`, ...) }`) instead of copy-pasting near-identical test
bodies. Because this loop runs at **file-collection time**, not at
runtime, every generated case shows up as its own named entry in the
report — a real, distinct test, not one test iterating silently over
many inputs. This is the mechanism that makes a table-driven suite
diagnosable: a failure in row 7 is reported as "row 7," not as one
opaque failure of "the loop."

---

## Week 4 — Forms, File Handling & Mocking Time

### Keyboard and mouse interaction model

`.fill()` sets a form field's value directly (fast, but bypasses
per-keystroke events like `keydown`); `.pressSequentially()` (or
`.press()`per key) dispatches real keyboard events one at a time,
necessary when the page's own JS reacts to individual keystrokes (e.g.
autocomplete, input masks, arrow-key handling). `.hover()` simulates real
mouse movement to trigger `:hover` CSS and `mouseenter`/`mouseleave`
handlers, which a `.click()` alone would never fire.

**A real, non-obvious gotcha (verified):** `.fill()` doesn't reliably
leave the element focused on every site — a chained `.press('ArrowUp')`
right after a `.fill()` can silently no-op if focus didn't land where
expected. Calling `.click()` on the field before `.fill()` (to force
focus) fixes this. It's a reminder that `.fill()`'s speed comes from
skipping the exact event sequence a real user's typing would produce.

### File upload and download

Upload: `<input type="file">` accepts a file path via
`locator.setInputFiles(path)` — no OS file picker dialog is ever opened
or needed, since Playwright sets the input's file list directly through
the browser's automation protocol. Download: triggering a download opens
a special `download` event; `page.waitForEvent('download')` (raced against
the triggering click) gives you a `Download` object you can read, save,
or assert on without ever touching the OS's actual downloads folder
unless you choose to.

### The Clock API — why mock time at all

Tests involving timers, countdowns, or scheduled UI changes are prime
flakiness sources if you wait on real wall-clock time (a 30-second
countdown either makes your test suite slow, or race-prone if you try to
shortcut it with a hard wait). `page.clock` lets a test **freeze,
set, or fast-forward** the browser's notion of time
(`Date.now()`, `setTimeout`, `setInterval`) deterministically.

**Verified behavior worth knowing:** `page.clock.fastForward(ms)` fires
each timer that comes due exactly **once**, regardless of how large the
jump is — it doesn't replay every tick a real clock would have produced.
After a fast-forward, the fake clock resumes advancing in lockstep with
real wall-clock time (unlike `pauseAt`, which freezes it permanently).
This matters when a UI's correctness depends on the number of times an
interval fired, not just the end time.

---

## Week 5 — API Testing & Network Interception

### The `request` fixture: testing without a browser

Playwright ships an HTTP client (`request` fixture, or
`apiRequestContext`) independent of any page or browser. This lets a test
call a REST API directly — faster and more direct than driving a UI to
indirectly exercise the same backend, and useful for setting up/tearing
down state a UI test depends on, or for testing an API in its own right.

### Network interception (`page.route()`)

Every request a page makes can be intercepted before it reaches the
network: inspected, allowed through, modified, or fulfilled with a fake
response, all without touching the real backend. This is the mechanism
behind testing error states (a 500 response, a network timeout) that
would be difficult or slow to provoke from a real server on demand — you
simulate the response instead of the failure condition that would
normally cause it.

**A cross-origin gotcha (verified):** a `page.setContent()` page has a
`null` origin. Any `fetch()` it makes — mocked or real — needs the
response to include `Access-Control-Allow-Origin` or the browser's CORS
check blocks it silently client-side, regardless of what the mock
returns. This is a browser security behavior, not a Playwright quirk, and
catches people off guard specifically because `page.setContent()` feels
like "just some HTML," not "a page with an unusual origin."

### HAR: recording and replaying real traffic

A HAR (HTTP Archive) file is a structured JSON record of a session's
network activity. `routeFromHAR()` (record mode) captures real traffic to
a file; the same API in replay mode serves responses from that file
instead of hitting the network — letting a test run fully offline,
deterministically, and fast, using data that was genuinely observed once
rather than hand-authored. Route handlers registered **after**
`routeFromHAR()` take precedence over it for matching requests (Playwright
checks handlers in reverse registration order), which is how you can
override one specific endpoint's replayed response while still replaying
everything else from the HAR.

---

## Week 6 — Authentication & Environment Configuration

### `storageState`: session reuse without re-logging-in

A browser context's `storageState` is a snapshot of its cookies and
`localStorage`. Logging in once, saving `storageState`, and constructing
future contexts with `storageState: <path>` skips the login UI flow
entirely for every test that only needs to already be authenticated —
trading "re-verify login works on every test" for "verify login works
once, reuse its result everywhere else." Login itself should still get
its own dedicated test; everything downstream shouldn't have to pay its
cost repeatedly.

### Setup projects — the modern alternative to `globalSetup`

A `*.setup.ts` file is itself a small test file whose only job is to
produce a `storageState` (or other setup artifact), run as its own named
**project** with `testMatch` scoped to just that file. Other projects
declare `dependencies: ['setup']`, so Playwright runs the setup project
first and only afterward starts the dependent projects with that
project's declared `use.storageState` picking up the resulting file. This
supersedes the older `globalSetup` config function because it produces a
visible test in the report (a failed login shows up as a real, readable
test failure, not a silent config-time crash) and can itself use
fixtures, retries, and all the same tooling as a normal test.

**A real gotcha (verified):** the setup project and the projects that
depend on it must share the same **browser fingerprint**
(`devices['Desktop Chrome']` on both), not just the storageState path —
a session tied to a specific User-Agent, created by a setup project
running Playwright's bare default Chromium, can be silently rejected by
the main project's `devices['Desktop Chrome']` UA. `storageState` alone
isn't the full identity a server sees.

### Multi-environment configuration

Reading `process.env.BASE_URL` (or similar) instead of hardcoding a
target lets the same test suite run against local, staging, and
production without editing test code — only the environment variable (or
CLI invocation) changes. This can be centralized once as `baseURL` in
`playwright.config.ts` `use`, so tests call `page.goto('/login')`
(relative) rather than repeating an absolute URL everywhere.

---

## Week 7 — Visual Regression Testing

### How `toHaveScreenshot()` works

The first run of `toHaveScreenshot()` against a name that has no saved
image creates the **baseline** and fails (deliberately — nothing to
compare against yet, so it can't silently "pass" on an unreviewed image).
Every subsequent run does a pixel-level diff against that baseline,
failing if the difference exceeds a configurable threshold, and (on
failure) writes the actual, expected, and diff images into the report.
`--update-snapshots` intentionally overwrites baselines when a change is
a real, reviewed update rather than a regression.

### The two real causes of visual flakiness, and their different fixes

- **Live-updating content** (a clock, a live counter): masked out with
  the `mask: [locator]` option, since there's no way to "wait" for text
  that's supposed to keep changing — you exclude the region from the
  comparison instead.
- **CSS animations/transitions**: `toHaveScreenshot()` disables CSS
  animations **by default** (the `animations` option defaults to
  `'disabled'`), so most spinners/fades need zero special handling — the
  screenshot is taken as if the animation had already settled.

### Baselines are environment-coupled

A baseline PNG is tied to the exact OS, browser build, and font-rendering
pipeline it was captured on. Playwright names baselines
`<name>-<project>-<platform>.png` precisely because a Windows-rendered
baseline and a Linux-rendered baseline of the same page are not pixel
identical even with byte-identical HTML/CSS — this is a genuine,
industry-wide constraint (the reason real teams generate baselines inside
Docker/CI rather than trusting a developer's own machine), not a
Playwright limitation.

---

## Week 8 — Accessibility Testing

### Automated scanning with axe-core

`AxeBuilder(page).analyze()` runs the axe-core accessibility rule engine
against the live, rendered DOM and returns a structured list of
violations (missing alt text, insufficient color contrast, unlabeled
form fields, etc.), each tagged with a WCAG success-criterion reference
and severity. Automated scanning is a **floor, not a ceiling** — it
reliably catches machine-checkable structural issues, but says nothing
about whether an interaction actually makes sense to someone using a
screen reader; it complements, not replaces, manual/assistive-technology
testing.

### Scoping scans: `.exclude()` vs `.disableRules()`

`.exclude(selector)` skips a specific region of the page from scanning —
useful for a known, already-tracked third-party widget's issue. `.
disableRules(ruleId)` turns a rule off **page-wide**. The distinction
matters: disabling a rule hides that violation everywhere it might occur
on the page, not just in the one place you meant to exempt — the broader
tool, with a correspondingly bigger blast radius if misapplied.

### Accessible names and ARIA

Every interactive element has a computed **accessible name** — the string
assistive technology announces — derived by a defined precedence
(`aria-label` > `aria-labelledby` > associated `<label>` > (for some
elements) `placeholder` > text content, roughly). `toHaveAccessibleName()`
asserts on this computed value directly. `toMatchAriaSnapshot()` asserts
against the page's accessibility tree as a whole (roles + names,
structured like `heading "todos"` / `textbox "What needs to be done?"`),
catching structural accessibility regressions a single-element assertion
would miss.

**A subtle, verified trap:** a `<input>` with only a `placeholder` (no
`<label>` or `aria-label`) does **not** trigger axe's `label` rule in
Chrome, because the placeholder gets computed as the accessible name.
This is a genuinely bad UX pattern (placeholder text disappears once you
start typing, so sighted users lose the field's label) that nonetheless
passes automated scanning — a concrete lesson that "the scanner is green"
and "this is accessible" are not the same claim.

---

## Week 9 — Cross-Browser Testing & Device Emulation

### Why three engines, not just Chromium

Chromium, Firefox (Gecko), and WebKit are genuinely different rendering
and JS engines, with real behavioral differences — not just "the same
browser with a different logo." Running the same suite against all three
via Playwright's `projects` catches engine-specific regressions
(rendering differences, API support gaps, timing differences) before
users do, without writing the test logic three times.

### Permission- and origin-gated APIs

Browser APIs like clipboard access and geolocation require explicit
permission grants (`context.grantPermissions([...])`) and, critically, a
**real origin** — a `page.setContent()` page's `null` origin doesn't
reliably support them (geolocation's `getCurrentPosition()` can hang
indefinitely rather than fail cleanly if no error callback is wired up).
This is the same origin-related theme as week 5's CORS issue: several
browser security mechanisms are keyed on origin, and a fabricated
in-memory page doesn't have a normal one.

**Verified engine gap:** `clipboard-read`/`clipboard-write` permissions
are Chromium-only as of this course's Playwright version — Firefox and
WebKit both throw `Unknown permission` for them. A cross-browser suite
has to conditionally skip (`test.skip(browserName !== 'chromium', ...)`)
rather than assume parity.

### Device, locale, timezone, and color-scheme emulation

`test.use({ ...devices['iPhone 13'] })` bundles viewport size, user
agent, touch support (`hasTouch`), and `isMobile` into one preset,
letting a test exercise mobile-specific behavior (touch targets,
responsive layout) without a real device. `locale`, `timezoneId`, and
`colorScheme` are independently settable and read back via standard web
APIs (`navigator.language`, `Intl.DateTimeFormat()`, `prefers-color-scheme`
media query) — genuinely useful for internationalization and dark-mode
testing, and (unlike clipboard/geolocation) not origin-gated, so they
work fine even against a `page.setContent()` page.

---

## Week 10 — Parallelization, Sharding & Retries

### Workers: Playwright's parallelism model

Playwright runs multiple **worker processes** in parallel, each handling
one test file (by default) at a time — parallelism is at the
file/process level, not by splitting individual tests across threads.
This is why `beforeAll` fixtures and worker-scoped fixtures are
per-worker, not global: a worker is a genuinely separate OS process with
its own memory.

### `describe.serial()`

Forces a group of tests to run in declared order, in the **same** worker,
and — critically — to cascade: if an earlier test in the group fails, the
later ones are reported as "did not run" rather than attempted and
potentially failing for an unrelated, downstream reason. It changes
*ordering and failure-cascade behavior* only; it does not, by itself,
share any state between the tests (that still requires an explicit
mechanism like a worker-scoped fixture).

**Verified:** a worker-scoped fixture's state does **not** survive a
retry — retrying a test spawns a brand-new worker process
(`testInfo.workerIndex` visibly increments across retries), so any
assumption that "the worker fixture will still hold what it held before"
breaks the moment retries are involved.

### Sharding

`--shard=x/y` splits the full test suite across `y` independent
machines/processes, each running only shard `x`'s slice, for wall-clock
speedup on large suites. Each shard produces its own report (a "blob"
report), later combined with `merge-reports` into one unified report.

**Verified constraint:** sharding keeps an entire file — and any
`describe.serial()` group within it — inside a single shard; tests never
split across shards mid-file. An over-provisioned shard count doesn't
error, it just leaves some shards silently empty.

### Retries and the "flaky" outcome

`retries: N` re-runs a failing test up to `N` more times before
reporting it failed. A test that fails once and then passes on a later
attempt is reported as **flaky**, not simply "passed" — a distinct,
named outcome Playwright tracks specifically so a green run doesn't
quietly hide the fact that something needed a second try. Retries are a
legitimate tool for genuinely non-deterministic failures (a one-off slow
response); they do nothing for a deterministic bug, which fails identically
on every attempt (see week 15's flaky-triage material for the fuller
argument).

---

## Week 11 — CI/CD Integration

### Why CI at all

Running tests only on a developer's own machine means "works for me" is
the only signal anyone gets before code reaches everyone else. A CI
pipeline runs the same suite, in the same clean environment, on every
change (or on a schedule), turning "did this break anything" into an
automatic, consistent check rather than a manual, inconsistently-applied
one.

### GitHub Actions basics

A workflow is YAML describing **jobs** (units of work, each running on a
fresh virtual machine) made of **steps** (individual commands). For
Playwright specifically: install dependencies, install browser binaries
(`npx playwright install --with-deps`), run the suite, and upload the
HTML report as a build artifact so a failure's evidence survives after
the job finishes (the runner's filesystem doesn't persist otherwise).

### Docker for test environments

A pinned, official Playwright Docker image
(`mcr.microsoft.com/playwright:v<version>-<codename>`) bundles the exact
browser binaries a given Playwright version expects, eliminating "which
Chromium build is installed on this machine" as a source of
environment-dependent flakiness. Pinning the image tag to the project's
actual installed `@playwright/test` version (not just "latest") matters
because browser binaries and the driver version are meant to move
together.

### Scaling CI: sharding, caching, gating

CI can automate the manual shard-and-merge workflow via a matrix
strategy (one job per shard index), with a separate downstream job that
waits for all shards (`needs: [...]`) and merges their reports. Browser
binaries can be cached between runs (keyed on the Playwright version, no
partial-match `restore-keys`, since a partial match could hand back the
wrong version's browsers).

**A real, verified gotcha with teaching value:** GitHub Actions' `needs:`
defaults to gating on **success** — a downstream job only runs if every
job it needs succeeded, unless overridden with `if: ${{ !cancelled() }}`.
A `merge-reports` job using that override still runs (and succeeds) even
when a shard failed, so gating a "notify" or "deploy" step on
`merge-reports` rather than on the actual test job can silently let a
red run through. Also verified in practice: a workflow's `reporter:
'blob'` setting (needed for merge-reports to have anything to merge) is
a real *runtime* dependency between the workflow and the project's
`playwright.config.ts` that a YAML syntax check cannot catch — only
actually running the pipeline surfaces it.

---

## Week 12 — Test Architecture at Scale

### Projects are a general grouping mechanism, not just "the 3 browsers"

A `playwright.config.ts` **project** is any named bundle of config
(`use` options, `retries`, `timeout`, `testMatch`) — browsers are the
most common use, but projects can equally split tests into `smoke` vs.
`regression` suites with different retry budgets, or `staging` vs.
`production` environments, each addressable independently via
`--project=<name>`.

### Tags, annotations, and selective running

`{ tag: ['@smoke'] }` on a test (or a suite) lets `--grep`/`--grep-invert`
select or exclude subsets at runtime without maintaining separate test
files. `test.skip()` (runtime-conditional), `test.fixme()`
(unconditionally known-broken, reported as skipped rather than
attempted), and `test.slow()` (extends the timeout) are all ways of
annotating a test's expected status without deleting it or leaving it to
fail loudly and uninformatively.

### Custom reporters

The `Reporter` interface (`onBegin`, `onTestEnd`, `onEnd`, etc. — every
method optional) lets you build entirely custom output: a Slack
notification, a metrics dashboard feed, a summary file — anything a
built-in reporter (`list`, `html`, `json`, `blob`) doesn't already do.
Multiple reporters can run side by side (`reporter: [['list'],
['./my-reporter.ts']]`), each receiving the same stream of events
independently.

### Static typing and linting for test code

`tsc --noEmit` catches type errors in test files the same as in
application code — test code is still code, and a wrong type is still a
bug, just one that manifests as "the test doesn't test what you think it
does" rather than a runtime crash. `eslint-plugin-playwright` adds
test-specific lint rules (`no-wait-for-timeout` flags exactly the hard-wait
anti-pattern this whole course avoids; `missing-playwright-await` flags a
dropped promise on an async matcher/action, which otherwise silently
never actually checks or blocks on anything).

---

## Week 13 — Component Testing & Flake-Resistant Tests

### Component testing vs. end-to-end testing

End-to-end tests exercise a full running application through the browser
UI; component testing mounts a single UI component in isolation (via a
lightweight dev-server-backed "gallery," in Playwright's current model)
and interacts with just that component's rendered output. It trades
full-system realism for speed and isolation — useful for teams that own
a component library, less central to most day-to-day SDET/QA work than
full end-to-end coverage, which is why this course treats it as a lighter
topic.

**Verified nuance**: a mounted component's `update()` (passing new props
to an already-mounted instance) re-renders **in place** rather than
remounting — if the component holds internal state via `useState(initial)`,
that state survives the update even though `initial` changed, because
`useState`'s argument is only read on the very first render. This is a
real React semantic, not a testing-tool quirk, and a common source of
confusion when first mounting stateful components in isolation.

### Soft assertions

A normal `expect()` failure throws immediately, aborting the rest of the
test — useful for "can't possibly continue" failures, but wasteful for
"check five independent things and report all failures at once."
`expect.soft()` records a failure without throwing, letting the test
continue and the report list **every** soft failure from a single run,
rather than only the first.

### Race conditions: the theoretical core of test flakiness

A race condition in a test happens when a **synchronous, point-in-time
read** (`await locator.textContent()` followed by a plain `expect(x).toBe(y)`)
executes before an **asynchronous** UI update (a network response, a
`setTimeout`, an animation frame) has actually landed. The read isn't
wrong when it runs — it's just checking the DOM before the update it's
supposed to observe has happened yet. The fix is never a bigger fixed
wait (which just shifts where the race can still lose, and wastes time
when it doesn't); it's replacing the point-in-time read with a **polling**
web-first assertion (`toHaveText()`, `toHaveCount()`, etc.), which by
definition keeps checking until the update lands or a real timeout is
reached.

---

## Week 14 — Advanced Debugging

### UI Mode

An interactive, visual test runner: pick and run individual tests, watch
files and auto-rerun on save, and — its signature feature — step through
an action-by-action **timeline** with before/after DOM snapshots for each
step, without needing a separately-recorded trace file. It's the
fastest feedback loop for iterating on a test locally.

### Codegen

`npx playwright codegen <url>` opens a real browser, records your clicks
and inputs as you perform them, and emits Playwright code live. It's a
starting point, not a finished test — raw codegen output tends to use
brittle selectors and misses the assertions that make a recording an
actual test; cleaning it up (better locators, added assertions, removed
redundant actions) is expected, not optional.

### The VS Code extension

Adds gutter icons to run/debug individual tests directly from the editor,
breakpoint support inside test code, its own locator picker, and
"record at cursor" (insert codegen'd steps into an existing test at the
cursor position). It's the same underlying engine as UI Mode/`--debug`,
surfaced inside the editor instead of a separate window.

### Trace viewer, in depth

A trace file bundles, per test attempt: a DOM snapshot before and after
every action, the full network log, console output, source location for
each step, and (if configured) video/screenshots. Comparing two attempts
of the same flaky test side by side — e.g. via `test.describe.configure({
retries: N })` plus `trace: 'on'` (so every attempt gets a trace, not
just retries) — is one of the highest-value debugging techniques for a
non-deterministic failure, because it's the only artifact showing what
was actually different between a passing and a failing run.

---

## Week 15 — Test Suite Health at Scale

### Flaky-test triage and quarantine

Not every failing test should block every merge forever, but not every
flaky test should be silently deleted or endlessly retried either.
**Quarantine** — isolating known-problematic tests into their own
project/job, tagged, retried, and always traced, kept separate from the
run that gates merges — preserves visibility (the test still runs and is
tracked) without letting an unsolved problem hold up unrelated work.
Retrying a test with a genuine race condition doesn't help (every attempt
loses the same deterministic race); retries only meaningfully rescue
failures that are truly independent per attempt. Quarantine is meant to
be **temporary**: once a trace reveals the root cause, the fix belongs
back in the main suite, not left tagged forever.

### Suite reporting and observability

`TestCase.outcome()` (`'expected' | 'unexpected' | 'flaky' | 'skipped'`)
is a richer signal than a single result's `status`, precisely because it
captures "passed, but only after a retry" as its own category — a
health-conscious report should surface flaky counts and slowest tests as
first-class metrics, not just a binary pass/fail count, because a
suite that's "all green" can still be quietly degrading underneath.

### Maintainable test code review

"The tests are green" only proves a specific run, under specific
conditions (file order, single worker, nothing run in isolation),
happened to succeed — it says nothing about whether a test would survive
being reordered, run alone, or handed to someone unfamiliar with its
hidden assumptions. Reviewing test code for maintainability applies the
same lens as reviewing any code: locator resilience (role/label over
CSS), absence of hard waits, correct use of web-first assertions, and
genuine test independence (no test silently depending on another test's
leftover fixture state) are all checkable, teachable review criteria —
not just "does it currently pass."

### A forward look: AI-assisted test generation

Playwright ships built-in **Test Agents** — planner (explores an app,
writes a Markdown test plan), generator (turns that plan into real spec
files), and healer (runs the suite and attempts to repair failing tests)
— usable independently or chained. Its MCP (Model Context Protocol)
server lets any AI coding assistant drive a real browser via
accessibility-tree snapshots rather than screenshots, which tends to
produce agent-written locators that already favor the role/label-first
priority this course teaches from week 1. None of this removes the need
for a human reviewer: an AI-generated test still needs someone who can
judge whether its locators are resilient, its assertions are web-first,
and it's actually testing the right thing — exactly the same checklist
as reviewing a human-written test.
