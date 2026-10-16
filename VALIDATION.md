# Local validation — October 16, 2026

Passed against the final application source:

- TypeScript type checking and ESLint.
- Five scheduling/permission unit tests: overlap, dependency order, capacity isolation by week, permission scoping and circular dependencies.
- Seven Firebase emulator rules tests, covering unauthenticated/uninvited reads, Viewer writes, self-provisioning/role escalation, audited Manager changes, denied agency approval, assigned Contributor execution-only updates, validated task creation and Storage role/type/existing-task restrictions.
- Real Auth/Firestore emulator integration: seeded Auth login, protected profile read, task creation, completion and access denied after logout.
- Six Playwright browser checks: demo login/task creation/completion and chart/calendar rendering, Spanish translation/persistence without changing stored status codes, and project creation — each at 1440×1000 and 390×844.
- Interactive visual inspection of the dashboard, timeline and language switching in the Codex browser. Quarter scale was checked to render actual quarter headers. Phone dashboard fits the viewport without horizontal document overflow.
- Production Vite build succeeds; output is static and uses relative asset URLs for repository GitHub Pages hosting.
- `npm audit --omit=dev`: zero advisories. Seven advisories remain in transitive development CLI dependencies; see README. No critical advisory remains after updates.
- Emulator-only seed ran successfully against Auth, Firestore and Storage. Webinar milestone is October 24, 2026 at 18:00 UTC (11:00 AM Pacific).

Build note: the initial JavaScript bundle is approximately 901 kB before gzip (~273 kB gzipped). Vite warns about its size; route/vendor code splitting is a recommended performance improvement.

Cloud state: free Firebase project `scala-marketing-2026` and Web app registered; no billing enabled, no application deployed, no production users or team invitations created. The real public Web configuration is saved only in ignored `.env.production.local`. The GitHub Pages workflow is manual and rejects missing Firebase build variables.

Production Firebase Authentication providers, Firestore database/location, deployed security rules, Storage availability/billing and real team identities still require setup/review. Emulator tests verify local rules, not deployed production access. This local release intentionally leaves advanced features listed in README for later implementation.
