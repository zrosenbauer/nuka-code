# nuka-code

## What This Is

A CLI tool that auto-detects your package manager and monorepo setup, then nukes caches, node_modules, and build artifacts — restoring your project to a clean state like a fresh `git clone`. Works across npm, pnpm, yarn, bun, deno, with full workspace support for Turborepo and Nx.

## Core Value

Run `nuke` in any JS/TS project and it correctly detects and cleans everything, regardless of package manager or monorepo tool.

## Requirements

### Validated

- ✓ Basic nuke functionality (deletes node_modules, caches, build artifacts) — existing
- ✓ pnpm workspace support — existing
- ✓ .nukeignore file support — existing
- ✓ Git dirty check before nuking — existing
- ✓ CLI with help, list, and nuke commands — existing

### Active

- [ ] Auto-detect package manager (npm, pnpm, yarn, bun, deno)
- [ ] Package manager-specific cleanup (correct lockfiles, caches per PM)
- [ ] Yarn Berry (.yarn, .pnp.*) support
- [ ] Bun (bun.lockb, .bun) support
- [ ] Deno (deno.lock, deno_dir) support
- [ ] Turborepo workspace-aware detection and cleanup
- [ ] Nx workspace-aware detection and cleanup
- [ ] .nuke.config.ts configuration file support
- [ ] Verify detection accuracy across all supported PM/tools
- [ ] Fix silent error handling (surface real errors)
- [ ] Fix Windows path handling (use path module consistently)
- [ ] Update README with supported package managers and tools
- [ ] Integration tests for core functionality

### Out of Scope

- GUI/web interface — CLI-only tool
- Package installation/management — only deletion
- Non-JS/TS ecosystems (Cargo, pip, etc.) — focus on JS ecosystem

## Context

**Brownfield project** — existing codebase with ~1200 lines of core functionality. Codebase analysis identified several concerns:

- Windows paths broken (hardcoded `/` in path handling)
- Silent error handling hiding real issues
- Glob patterns may fail in deeply nested workspaces
- No integration tests
- Package manager edge cases not tested

Current implementation supports pnpm workspaces but other package managers need verification and extension.

**TODOS.md items now in scope:**
1. `.nuke.config.ts` configuration file
2. Auto-detect package manager
3. Auto-detect framework

## Constraints

- **Runtime**: Node.js 22.0.0+ (existing requirement)
- **Language**: TypeScript with existing patterns (tsup build, biome lint)
- **Dependencies**: Prefer existing deps (rimraf, glob, ignore, yargs)
- **Compatibility**: Must not break existing functionality for pnpm users

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Support all major JS package managers | Users shouldn't need to know which PM before running | — Pending |
| Workspace-aware for Turbo/Nx | Monorepos need per-workspace cleaning | — Pending |
| Config file over CLI flags | Complex customization needs persistent config | — Pending |

---
*Last updated: 2026-01-31 after initialization*
