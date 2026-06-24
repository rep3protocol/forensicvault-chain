# ForensicVault Chain

Verify evidence. Prove custody. Protect truth.

**LOCAL TESTNET - TEST_VAULT HAS NO REAL VALUE.**

ForensicVault Chain is a local-first forensic evidence integrity MVP. It registers digital evidence with SHA-256 hashes, records custody events, verifies files later, maintains a hash-linked local ledger, generates reports/case packets, supports tamper testing, and exports external anchor files.

## Important Limitation

This app is tamper-evident, not tamper-proof. If someone controls the local database or disk, they may rewrite local data. External anchor exports are used to make silent rewrites detectable later.

This project does not claim to provide a real blockchain, real cryptocurrency, legal admissibility guarantees, or production-grade security.

## Features

- Local investigator login
- Demo mode
- First-run helper
- Case creation
- Case readiness checklist
- Evidence upload
- Evidence inventory search and filtering
- SHA-256 hashing
- Duplicate hash warning
- Evidence verification
- Chain-of-custody events
- Local custody signatures (Ed25519)
- Custody signature verification
- Role-based permissions (local MVP)
- Local hash-linked ledger
- Tamper test page
- Individual PDF evidence reports
- Case packet PDF export
- External anchor JSON/text export
- Local anchor history with duplicate snapshot guard
- ForensicVault Shield rule-based monitoring
- Fake TEST_VAULT local fee history

## Screenshots

![Dashboard](public/screenshots/dashboard.png)

Dashboard overview showing the local evidence integrity workspace.

![Demo Mode](public/screenshots/demo.png)

Demo mode entry point for creating a guided sample case.

![Demo Details](public/screenshots/demo-details.png)

Demo workflow details with seeded evidence and custody context.

![Cases](public/screenshots/cases.png)

Cases list for reviewing and opening investigation records.

![Case Detail](public/screenshots/case-detail.png)

Case detail view with evidence, custody events, and export actions.

![Verify Evidence](public/screenshots/verify-evidence.png)

Evidence verification page for comparing uploaded files against registered hashes.

![External Anchors](public/screenshots/anchors.png)

External anchor export view for preserving ledger proof outside the local app.

![Tamper Test Valid](public/screenshots/tamper-valid.png)

Tamper test result showing evidence that still matches its registered hash.

![Tamper Test Invalid](public/screenshots/tamper-invalid.png)

Tamper test result showing a detected hash mismatch after file changes.

![Tamper Test Restored](public/screenshots/tamper-restored.png)

Tamper test result after restoring evidence to its original valid state.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma 7
- SQLite
- `@prisma/adapter-better-sqlite3`
- `pdf-lib`
- Node crypto

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env`:

```bash
DATABASE_URL="file:./dev.db"
LOCAL_DEV_SEED_EMAIL="local@forensicvault.dev"
LOCAL_DEV_SEED_PASSWORD="change-me-local-only"
```

Run database migrations:

```bash
npx prisma migrate dev
```

Start the local dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Seed local development data:

```text
http://localhost:3000/api/dev/seed
```

## Default Local Dev Login

The seed route creates a local development account only. The email defaults to
`local@forensicvault.dev`, or the value of `LOCAL_DEV_SEED_EMAIL` in `.env`.

Set the local-only password with `LOCAL_DEV_SEED_PASSWORD` in `.env` before
running the seed route. Do not reuse this password outside local development.

## Demo Workflow

1. Log in.
2. Open Demo.
3. Create Demo Case.
4. Open Demo Case.
5. View duplicate SHA-256 warning.
6. Verify evidence.
7. View custody event.
8. Download case packet.
9. Export anchor.
10. Run tamper test.

Demo mode is for screenshots and testing only. Demo actions create local test
data, and resetting demo data should not be treated as deleting real evidence.
The ledger may retain historical demo transactions when append-only behavior is
preserved.

## Evidence Inventory

The `/evidence` route provides read-only inventory search and filtering by
filename, partial SHA-256, case, status, evidence type, duplicate-only,
unverified-only, and failed-verification-only views. It does not create or
modify evidence records.

## Case Readiness

Case detail pages include an advisory readiness checklist for verification
coverage, failed verifications, ledger registration references, custody events,
custody hash linkage, duplicate hashes, anchor status, packet export readiness,
and custody signature verification. The checklist does not block case packet
export.

## Local Custody Signatures

New custody events are signed with a per-user local Ed25519 signing key. Each
event stores the signer's public key and a signature over the custody event
hash. The evidence detail page, case readiness checklist, Shield monitor, and
reports can verify those stored signatures later.

- Signatures are computed over the deterministic `eventHash` for each custody event.
- Verification confirms the stored signature matches the stored event hash and public key.
- Existing custody events created before this feature are not rewritten or auto-signed.
- Local private keys are stored in the app database for MVP/demo convenience only.
- Production would require hardened key custody such as OS keychain, hardware-backed keys, or external key management.
- This remains local-first and tamper-evident, not tamper-proof.
- This does not claim production-grade key custody, legal admissibility, or tamper-proof security.

**LOCAL TESTNET — TEST_VAULT HAS NO REAL VALUE.**

## Role-Based Permissions

ForensicVault Chain includes local MVP role-based permissions for workflow separation.

Roles:

- **Admin** — full local control, tamper test, and user management
- **Supervisor** — review/export workflows plus Shield acknowledge and clear
- **Investigator** — create cases, upload evidence, verify, custody, anchors, and Shield acknowledge
- **Evidence Custodian** — evidence/custody focused workflow without case creation
- **Viewer** — read-only access to cases, evidence, ledger, reports, anchors, and Shield

Permissions are enforced in server page guards and server actions. Navigation hides unauthorized links, but server-side checks are the actual protection.

- `/admin/users` is available to Admin users for local role management.
- The dev seed user (`Local Investigator`) is seeded as **Admin** so local testing is not locked out.
- This is not production-grade IAM. Production would require hardened auth/session management, audit logs, and stronger policy controls.

## ForensicVault Shield

ForensicVault Shield is available at:

```text
http://localhost:3000/guard
```

Shield is a rule-based integrity monitoring dashboard for local evidence,
custody, verification, duplicate hash patterns, ledger health, and anchor
readiness. Phase 1 is AI-ready, but it does not call AI APIs, external APIs, or
automated decision systems.

Shield does not replace deterministic SHA-256 verification, ledger validation,
custody hash linkage, signature checks, or external anchor comparison. The app
remains local-first and tamper-evident, not tamper-proof.

Shield Phase 1.1 adds alert acknowledgements and a Shield event log.
Acknowledgements document that an investigator reviewed a deterministic alert,
but they do not delete the alert, change the underlying evidence, modify the
ledger, or prove the issue is resolved.

## Anchor History

The `/anchors` page can save local anchor snapshots and track publication URLs
or notes for externally published anchor values. Shield compares the current
ledger tip and ledger root against the latest saved anchor snapshot.

The app prevents saving an identical anchor snapshot by default. If a matching
snapshot already exists for the current latestBlockHeight, latestBlockHash, and
ledgerRoot, the existing snapshot can be labeled or annotated instead of
creating another duplicate row.

Mismatches require review, but they do not automatically prove tampering. They
may reflect local database rewrite, restore from backup, corruption, tamper-test
activity, or normal ledger growth after the snapshot. This remains local-first
and does not add real blockchain integration or an external timestamping API.

## Project Status

Local MVP / testnet simulation.

ForensicVault Chain is intended for local development, demos, training, and exploration of forensic integrity workflows. It does not publish to a real blockchain or timestamp authority automatically.

Current release status: local-first portfolio MVP / testnet simulation. It is
tamper-evident, not tamper-proof; it has no real blockchain, no real
cryptocurrency, no legal admissibility guarantee, and no production-grade
security claim.

## Roadmap

- Better production auth
- Streaming file uploads
- RFC 3161 timestamping
- GitHub/Gist anchoring
- Audit log export
- Role-based permissions
- Stronger evidence inventory workflows
- Deployment hardening
## License

Copyright (c) 2026 Luis Correa / rep3protocol. All rights reserved.

This project is public for viewing and portfolio purposes, but it is not open source. No permission is granted to copy, modify, distribute, sublicense, sell, host, deploy, or use this software without prior written permission.
