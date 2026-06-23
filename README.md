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
- Evidence upload
- SHA-256 hashing
- Duplicate hash warning
- Evidence verification
- Chain-of-custody events
- Local hash-linked ledger
- Tamper test page
- Individual PDF evidence reports
- Case packet PDF export
- External anchor JSON/text export
- Fake TEST_VAULT local fee history

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

These credentials are for local development only:

```text
Email: local@forensicvault.dev
Password: localdev123
```

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

## Project Status

Local MVP / testnet simulation.

ForensicVault Chain is intended for local development, demos, training, and exploration of forensic integrity workflows. It does not publish to a real blockchain or timestamp authority automatically.

## Roadmap

- Better production auth
- Streaming file uploads
- Stronger custody signatures
- RFC 3161 timestamping
- GitHub/Gist anchoring
- Audit log export
- Role-based permissions
- Evidence search/filtering
- Deployment hardening
