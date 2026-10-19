# Scala Marketing Command Center

Local-first development build of Scala’s shared marketing workspace. React 19 + TypeScript + Vite; Firebase Authentication, Firestore and Storage; native React timeline. Live application: **https://edgargarces-scalateam.github.io/scala-marketing/** (GitHub Pages). Firebase project `scala-marketing-2026` and its Web app have been created without enabling billing. The public GitHub repository is https://github.com/edgargarces-scalateam/scala-marketing. Production Authentication and Firestore are configured on the free plan. Attachments are disabled; billing is not enabled. GitHub Pages publication is managed by the manual deployment workflow.

## Prerequisites and installation

Use Node.js 22.18+ (the seed imports TypeScript using Node’s type stripping), npm and Java 21 for emulators. From this directory:

```sh
npm ci
npm run dev
```

Open the printed localhost URL and select **Explore the local demo**. Demo data persists only in this browser. This is not collaborative storage and has no real authentication. Existing documents and the sibling webinar landing page are untouched.

## Firebase emulator development

```sh
cp .env.example .env.local
npm run emulators
# In another terminal:
npm run seed
npm run dev
```

The explicit seed targets only loopback emulators and `demo-scala`; it never runs automatically. The emulator UI is at http://127.0.0.1:4000. Sign in with username `edgar` / password `ScalaDemo2026!` after seeding. Those credentials are local sample credentials only. Restart Vite after changing environment values. To retain emulator data use `firebase emulators:start --project demo-scala --export-on-exit ./emulator-data --import ./emulator-data` (create the initial export without `--import`).

## Production Firebase configuration

1. The project and Web app already exist: `scala-marketing-2026`. Its public browser configuration is in the ignored `.env.production.local` file. Copy values to `.env.local` only when ready to connect local development to the cloud. Use the variable names in `.env.example`. Set `VITE_USE_EMULATORS=false`.
2. Enable Authentication → Email/Password in Firebase. The app presents **Username + Password**; the username is normalized and mapped to an internal `USERNAME@users.scala.invalid` Firebase Auth identifier. There is no public username lookup or self-registration. Add your `edgargarces-scalateam.github.io` hostname (or custom domain) under Authentication → Settings → Authorized domains.
3. Create Firestore and a Storage bucket. Storage availability/billing depends on your Firebase project; do not enable paid resources without approval.
4. After review and approval, deploy **rules only** with `npx firebase deploy --only firestore:rules,firestore:indexes,storage --project YOUR_PROJECT_ID`. GitHub Pages deployment does not deploy Firebase rules.
5. Provision the first administrator through the trusted script below. Web clients cannot bootstrap themselves, register publicly or modify their own role.
6. Run emulator permission tests and verify a separate Viewer account before accepting real team data.

Firebase Web API keys and app IDs are public project identifiers, not server credentials. Authorization is enforced by Firebase rules. Never put service-account JSON, private keys or Admin SDK credentials in `VITE_*`, browser source, GitHub variables or the repository.

## Initial administrator and invitations

Install the declared dependencies, then authenticate the trusted operator with Application Default Credentials (for example `gcloud auth application-default login`) using an identity authorized for this Firebase project. Alternatively, sign in with `firebase login` and add `--firebase-cli` to the provisioning command; that mode reuses the CLI login in memory without exporting a credential file. Keep all credentials outside this repository.

```sh
npm run provision-user -- --project scala-marketing-2026 --username edgar --name 'Edgar Garcés' --role Administrator --bootstrap
```

The terminal securely prompts for a password and confirmation without echoing either. Use at least 8 characters. Never supply a password in shell arguments, a Firestore document, a CSV import or chat. Bootstrap refuses when an administrator already exists.

For another team member, omit `--bootstrap` and choose a role:

```sh
npm run provision-user -- --project scala-marketing-2026 --username colleague.name --name 'Full registered name' --role 'Contributor' --email colleague@example.com
```

`--email` is optional contact metadata; users sign in with their username. Usernames contain 3–32 ASCII letters/numbers, dots, underscores or hyphens, and are normalized to lowercase. Display names must be unique because task execution permissions currently use the trusted profile name. The registered names appear in filters, assignment menus and workload; no generic agency/associate placeholder users are created.

To reset a password, rerun the trusted command for that username with `--set-password`. It securely prompts for the new password. Existing usernames keep their password when only profile fields change. To migrate an older email/password identity while preserving its UID, pass its original Auth email with `--email` and the desired `--username`. A provisioning event is recorded without logging the password. No email is sent; distribute initial credentials privately.

Browser clients, including administrators, cannot create profiles, change roles or delete users. The Admin SDK terminal tool bypasses client Security Rules using the authorized operator's ADC credentials. Production accounts are provisioned only through this operator flow, never from website registration. The script initializes default workspace settings when missing.

## Bulk import

Use **Bulk import / Importar en lote** beside **New activity**. Choose CSV or JSON, inspect the validation preview, then click **Confirm import**. Uploading a file alone writes nothing. Files are limited to 2 MB and 200 records per import; repeat in batches for larger datasets. Imports create new records only and reject IDs that already exist. Firestore writes and per-activity audit entries commit in a single atomic batch. An invalid record prevents saving the entire batch.

Supported record kinds: `task`, `event`, `milestone`, `project`, `campaign`. Tasks/events/milestones share the activity store and appear in the existing activity/calendar/timeline workflows. Timed events preserve `startAt` and `endAt` as UTC instants; date-only planning uses `YYYY-MM-DD` in the selected workspace timezone. Profiles/passwords cannot be imported through the website.

- Download the CSV template from the import dialog. `kind` defaults to `task`; title, start and end are required for ordinary tasks. Use semicolons for dependency IDs and tags. All dates must be valid ISO calendar dates.
- JSON accepts an array of records with `kind`, or an object with `projects`, `campaigns`, `tasks`, `events` and `milestones` arrays. See [examples/bulk-import.json](examples/bulk-import.json) for a complete five-kind example.
- Imported plans are resolved before tasks. Project/campaign references may use IDs or exact names. Campaigns must belong to the selected project. Unknown assignees, statuses and categories, missing dependencies, cycles, approval decisions and duplicate IDs are rejected.
- Assignees match registered full names, case-insensitively. Leave blank for unassigned work. Use canonical workspace status/category values (initial defaults are English) even when the interface is Spanish.
- Managers/Administrators may import all five kinds. Agency Editors may import tasks/events/milestones only. Contributors/Viewers cannot import.
- Events may use ISO timestamps with explicit timezone offsets instead of date fields. Milestones need only a start date and use the same end date. Imports do not overwrite existing records or create team members.

## Commands and quality checks

```sh
npm run typecheck
npm run lint
npm test
npm run test:rules
npm run test:e2e
npm run test:integration
npm run build
npm run preview
```

Rules tests launch disposable Firestore and Storage emulators. The integration test seeds the local Auth/Firestore emulators and verifies real Firebase SDK login, task creation/completion and logout denial. Run them with an available Java runtime. End-to-end tests cover demo entry, task creation/completion, timeline rendering and calendar rendering at desktop and phone sizes. Install a Playwright Chromium runtime with `npx playwright install chromium` if needed. These demo browser tests do not substitute for a production authentication test; use the emulator credentials for manual username/password verification; password resets are performed by the operator terminal command. No production credentials are stored in tests.

## GitHub Pages deployment — manual, approval required

Make **this directory the repository root**, or adapt workflow working directories and `dist` path if nesting it. Commit source and `package-lock.json`, excluding `.env*` except `.env.example` and all credentials.

1. Set the repository’s Settings → Pages → Source to **GitHub Actions**.
2. Add GitHub repository **Variables** matching the public Firebase `VITE_*` values. Do not use emulator values for production. `VITE_USE_EMULATORS` is forced to false by the workflow.
3. Configure the `github-pages` environment with a required reviewer for deployment approval.
4. After explicit approval, manually dispatch **Deploy Scala to GitHub Pages** in Actions.

The workflow does not run on push. It builds, checks and uploads `dist`, then deploys through the Pages environment. `base: './'` makes generated asset URLs work on both repository subpaths and custom domains. Views use client state at one URL, so refreshes do not require a server rewrite or `404.html` hack. The app has its own Git repository inside `scala-marketing`; the parent document workspace remains separate. The source repository is public as requested. Publishing still requires a manual workflow dispatch and approval; making the repository public did not deploy the app.

References: [Vite deployment guide](https://vite.dev/guide/static-deploy.html#github-pages), [Firebase password authentication](https://firebase.google.com/docs/auth/web/password-auth), [Frappe Gantt configuration](https://docs.frappe.io/gantt/config).

## Data model and security

One private workspace per Firebase project. All invited members can read team tasks, profiles, projects, campaigns, milestones and history. This model is not for multiple isolated client organizations.

- `users/{authUid}`: username, name, contactEmail, role, timezone. The trusted operator provisions identities; client updates are restricted to the signed-in user’s timezone.
- `projects/{id}`: project name and scheduling bounds; `campaigns/{id}`: project relationship.
- `tasks/{id}`: full activity record, assignment, collaborators, start/end date, effort, status/priority, channel/type, progress, dependency IDs, tags, approval, completion timestamp, embedded checklist/comments/attachment metadata and audit history.
- `milestones/{id}`: event timestamp and project relationship. The sample webinar is `2026-10-24T18:00:00Z` (11 AM Pacific daylight time).
- `settings/workspace`: configurable statuses, priority/type/channel defaults and weekly capacity.
- `activityHistory/{id}`: append-only global audit records for task changes and trusted provisioning actions.
- `savedFilters/{id}`: owner-scoped saved filter schema; the current UI stores filter combinations in browser storage.
- `notifications/{id}`: recipient-scoped future server notifications. Current notification center derives overdue items, approval requests and mentions from tasks.
- Storage `tasks/{taskId}/{uuid}-{filename}`: authenticated team reads; editors and assigned contributors upload only PDF, PNG, JPEG or WebP, up to 10 MB. Uploading requires an existing saved task. Files cannot overwrite existing objects.

All unmatched Firestore/Storage access is denied. Viewer is read-only. Contributors may update assigned tasks’ execution fields only. Managers and Administrators approve deliverables. Agency Editors can create/manage marketing activities but cannot approve. Task updates require validated fields, actor attribution and an appended history entry. Global audit records cannot be edited or deleted by clients. Storage validates type and size on the server as well as in the UI. File bytes are not inspected for malware; add scanning if distributing untrusted uploads externally.

Dates for all-day planning are ISO `YYYY-MM-DD` values (calendar dates, not ambiguous local timestamps). Created/updated/completed timestamps, comments and history are UTC ISO instants. The timezone selector controls displayed dates. The webinar instant includes its actual UTC offset. The current UI timezone preference is browser-local.

## Implemented workflows and first-release limits

Use the **Español / English** button on login or in the app header to change the interface language. The preference persists in this browser. Status labels and date formatting change without translating stored status codes or altering user-authored comments/content.

Available: validated CSV/JSON bulk import of tasks/events/milestones/plans; project/campaign creation, editing and archive/restore; protected Firebase login, persistent Auth sessions, username/password login, terminal password reset, logout; live task synchronization; creation and editing; search over task JSON including comments/project/campaign names; combined status/person/priority filters; saved browser filters; task details/checklists/comments/mentions/files/history; approval decisions; CSV export; list sorting and bulk actions; simple timeline with click-to-edit dates and no dependency arrows; status board with drag and grouping; calendar month/week/agenda; workload and conflict warnings; responsive dashboard.

This is an initial local release, not a claim that every advanced item in the source brief is complete. Known limits:

- Project/campaign metadata has a management screen. Tasks currently reference project/campaign names; stable document ID relationships and cascading rename handling are next. Invited user profiles supply the team directory when Firebase is connected. Provisioned display names must be unique because contributor assignment rules currently compare the trusted profile name.
- Timeline supplies day/week/month/quarter scales, fixed activity labels, status colors and milestone markers. Edit dates in activity details; drag scheduling and dependency arrows are intentionally omitted.
- Calendar supports month, navigable week and agenda. Imported milestones and events appear as activities; a dedicated milestone layer and richer timed calendar layout remain next.
- Conflict analysis is advisory: it detects active assignment overlap, dependency order, campaign end overflow and weekly estimated-effort capacity. Effort is allocated to the start week rather than spread across workdays. Workload warnings use the configured project end, with the sample October 30 end as fallback. Milestone risk and overdue blocker propagation remain future work.
- Task filters cover text, person, priority, status, due today/this week/overdue, unassigned work, blocked work and attachments. Exact date-range, unread controls and column visibility remain future work. Bulk selection supports individual rows and select-all.
- Comments and checklist changes are persisted when **Save activity** is clicked; they share the task document. Rules reject stale history lengths rather than silently accepting a conflicting task edit; users must reopen a task after such a rejection. Move comments/history to subcollections and use transactional field updates before high-volume collaboration. Embedded audit history is not a tamper-proof regulatory log.
- In-app notifications are derived live; unread tracking, all notification event types, email reminders and background notification jobs require Cloud Functions and explicit email approval. No automated marketing/reminder emails are sent; password resets are managed through the trusted terminal command.
- Settings expose statuses, channels, types, priorities and weekly capacity. Keep canonical status names to preserve workflow semantics. Personal timezone synchronization and broader settings controls are next.
- The dashboard is campaign-centric, with basic activity counts and workload. Multi-project aggregation, dedicated unassigned work and more advanced reporting are next.
- Attachments require a previously saved task and Firebase. Abandoned uploads need a scheduled cleanup policy later.
- No logo asset was supplied; the preview uses a text Scala wordmark. Replace it with the provided licensed logo when available.

Do not enable a production team until rules have passed in your environment and real Firebase configuration/identities have been reviewed. See `VALIDATION.md` for the checks actually executed in this session.

## Dependency audit

Runtime dependencies passed `npm audit --omit=dev` with zero advisories during validation. The latest Firebase CLI still brings seven development-only advisories (including a high-severity `braces` advisory) through its transitive tools. No affected CLI code ships in the browser bundle. Critical test/CLI findings were removed by updating dependencies; the Firebase Node gRPC dependency uses a patched compatible override. Review these development dependencies again before using the toolchain on untrusted files. Use Node 22.18+ or 24 LTS; this machine’s Node 25 emits toolchain engine warnings although the checks pass.

## Production launch settings

Production uses `VITE_ENABLE_DEMO=false` and `VITE_ATTACHMENTS_ENABLED=false`. The live login page offers username/password only; demo entry is available during local development. File uploads are disabled because the user selected the free plan. No Storage bucket or billing account was enabled. The default Firestore database uses the standard edition in `us-east1`, with its free tier and paid backup/PITR features disabled. Production signup is disabled at the Auth service; the trusted terminal can still provision requested accounts.
