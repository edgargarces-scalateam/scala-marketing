# Local validation — October 16, 2026

Passed against the final application source:

- TypeScript type checking and ESLint.
- Thirteen unit tests, including CSV parsing, five-kind import validation, import role/count/assignee/dependency checks, UTC event normalization, username normalization and scheduling/permissions: overlap, dependency order, capacity isolation by week, permission scoping and circular dependencies.
- Eight Firebase emulator rules tests, covering unauthenticated/uninvited reads, Viewer writes, self-provisioning/role escalation, audited Manager changes, denied agency approval, assigned Contributor execution-only updates, validated task creation and Storage role/type/existing-task restrictions and browser profile/role provisioning denial even for administrators.
- Real Auth/Firestore emulator integration: username mapping, seeded Auth login, protected profile read, task creation/completion, atomic multi-record import with audit entries, invalid-batch rollback and access denied after logout.
- Thirteen Playwright browser checks passed: task creation/completion, Spanish translation, project creation, bulk import validation/confirmation, unknown assignee rejection, registered-name filters/workload and username login controls at desktop/phone sizes; desktop sidebar plus opens the creation form. One phone sidebar-specific check is intentionally skipped because the sidebar is replaced by mobile navigation.
- Interactive visual inspection of the dashboard, timeline and language switching in the Codex browser. Quarter scale was checked to render actual quarter headers. Phone dashboard fits the viewport without horizontal document overflow.
- Production Vite build succeeds; output is static and uses relative asset URLs for repository GitHub Pages hosting.
- `npm audit --omit=dev`: zero advisories. Seven advisories remain in transitive development CLI dependencies; see README. No critical advisory remains after updates.
- Emulator-only seed ran successfully against Auth, Firestore and Storage. Webinar milestone is October 24, 2026 at 18:00 UTC (11:00 AM Pacific).

Build note: the initial JavaScript bundle is approximately 920 kB before gzip (~280 kB gzipped). Vite warns about its size; route/vendor code splitting is a recommended performance improvement.

Production state: Firebase Authentication email/password is enabled, public signup is disabled, the GitHub Pages hostname is authorized, and Firestore rules/indexes are deployed. The standard default database in `us-east1` reports `freeTier: true`; billing, paid backups/PITR and Storage are not enabled. Three requested accounts were provisioned via hidden terminal input: two Administrators and one Agency Editor. No passwords are stored in source, Firestore or GitHub variables.

Production SDK checks passed for all three username/password logins, matching role profiles and the three-person registered directory. Agency administrator-settings writes and anonymous reads were denied as expected. The live build disables demo entry and file uploads. No campaign/task sample data was seeded into production.

Publishing uses the manually triggered GitHub Pages workflow. Advanced functional limitations remain listed in README.

GitHub Pages production deployment succeeded. The live browser verified administrator username/password sign-in, a connected empty production workspace, all three registered assignees, working New Activity form, disabled attachment upload and absence of demo entry on the production login page. Workspace started without sample projects/tasks.
