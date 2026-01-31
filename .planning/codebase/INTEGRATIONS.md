# External Integrations

**Analysis Date:** 2026-01-31

## APIs & External Services

**None detected** - This is a standalone CLI utility with no external API integrations. All functionality is local filesystem operations.

## Data Storage

**Databases:**
- Not applicable - No database connections

**File Storage:**
- Local filesystem only - Application reads and deletes files locally using Node.js `fs` APIs and rimraf

**Caching:**
- None - No external caching service

## Authentication & Identity

**Auth Provider:**
- None - No authentication required. Application runs entirely locally.

## Monitoring & Observability

**Error Tracking:**
- None - No error tracking service

**Logs:**
- Console only via `consola` package
- No log aggregation or external logging service

## CI/CD & Deployment

**Hosting:**
- Published to npm registry
- Distributed as installable package via `pnpm publish` (uses Changesets)

**CI Pipeline:**
- Not detected in codebase - Would be configured in GitHub Actions or similar (not in this repo)
- Test command available: `pnpm test`
- Lint/format check: `pnpm check:ci`

## Environment Configuration

**Required env vars:**
- None - Application has no external dependencies on environment variables

**Secrets location:**
- Not applicable - No secrets required

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Git Integration

**Features:**
- Git dirty check: Uses `node:child_process` to run `git status --short` command (see `src/lib/git.ts`)
- Prevents execution if uncommitted changes exist (safety check, can be bypassed with `--force` flag)
- Respects `.gitignore` by parsing it (via `ignore` package)

**Behavior:**
- Reads `.gitignore` file from project root
- Applies ignore rules to filter out files before deletion
- Does not interact with remote repositories

## Build & Release Pipeline

**Version Management:**
- `@changesets/cli` - Manages versioning and changelog automation
- Commands: `pnpm version` (changelog), `pnpm publish` (npm publish)
- Uses Changesets workflow for semantic versioning

**Build Artifacts:**
- Output published to npm: CommonJS and ESM builds
- TypeScript type definitions included
- Distributed as published npm package

## File Operations (Core Functionality)

**Glob Patterns:**
- Uses `glob` package for pattern matching
- Pattern sources: `src/nuke.ts` defines predefined glob patterns for various cache and build directories

**Ignore File Processing:**
- Reads from `.nukeignore` file (project-specific ignore patterns)
- Also reads and respects `.gitignore` patterns
- Uses `ignore` package for pattern matching and filtering

**File Deletion:**
- Uses `rimraf` package for recursive deletion
- Applies custom filtering based on ignore rules
- Supports safety checks (git dirty state check, optional force override)

---

*Integration audit: 2026-01-31*
