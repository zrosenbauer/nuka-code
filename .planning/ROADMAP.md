# Roadmap: nuka-code

## Overview

This roadmap transforms nuka-code from a pnpm-focused tool into a universal cache cleaner that auto-detects and nukes caches across npm, pnpm, yarn, bun, and deno with full Turborepo and Nx workspace support. The journey starts with modernizing the CLI infrastructure, then builds detection, execution, and cache cleanup capabilities in layers, culminating in configuration support and quality polish.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: CLI Foundation** - Migrate to @clack/prompts and remove legacy dependencies
- [ ] **Phase 2: Detection** - Implement package-manager-detector with version/format handling
- [ ] **Phase 3: Execution Infrastructure** - Build parallel/sequential task execution framework
- [ ] **Phase 4: npm/yarn Cache Cleanup** - Implement npm and yarn (Classic + Berry) cache cleanup
- [ ] **Phase 5: pnpm/bun/deno Cache Cleanup** - Implement remaining package manager cache cleanup
- [ ] **Phase 6: Workspace Support** - Add Turborepo and Nx detection and cleanup
- [ ] **Phase 7: Configuration** - Implement .nuke.config.ts support with typed schema
- [ ] **Phase 8: UX Enhancements** - Add size reporting, JSON output, improved dry-run
- [ ] **Phase 9: Quality & Polish** - Error handling, verification, docs, integration tests

## Phase Details

### Phase 1: CLI Foundation
**Goal**: Users interact with nuka-code through a modern, consistent CLI experience
**Depends on**: Nothing (first phase)
**Requirements**: CLI-01, CLI-02, CLI-03, CLI-04, CLI-05, CLI-06
**Success Criteria** (what must be TRUE):
  1. Running `nuke` displays spinners using @clack/prompts during operations
  2. All user messages use consistent clack styling (intro, outro, log, error)
  3. chalk, consola, and yocto-spinner are removed from package.json dependencies
  4. Spinner states correctly reflect operation progress (start, stop, success, error)
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md - Install @clack/prompts and picocolors, remove chalk/consola/yocto-spinner
- [ ] 01-02-PLAN.md - Migrate cli.ts to use clack and picocolors
- [ ] 01-03-PLAN.md - Migrate tree.ts and project.ts, verify full build

### Phase 2: Detection
**Goal**: nuka-code correctly identifies the package manager and its specific version/format
**Depends on**: Phase 1
**Requirements**: DET-01, DET-02, DET-03, DET-04
**Success Criteria** (what must be TRUE):
  1. Running `nuke` in a yarn project shows correct yarn version detection (Classic vs Berry)
  2. Running `nuke` in a bun project detects lockfile format (bun.lockb vs bun.lock)
  3. Running `nuke` in a project with multiple lockfiles reports detected managers
  4. Detection uses package-manager-detector library (not custom parsing)
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Execution Infrastructure
**Goal**: Cleanup tasks execute efficiently with configurable parallelism
**Depends on**: Phase 1
**Requirements**: EXEC-01, EXEC-02, EXEC-03
**Success Criteria** (what must be TRUE):
  1. Independent cleanup tasks (e.g., multiple cache directories) execute in parallel
  2. Dependent tasks (e.g., cache clean commands) execute sequentially
  3. User can set execution mode via CLI flag (--parallel, --sequential, default: auto)
  4. Parallel execution shows concurrent spinner progress
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: npm/yarn Cache Cleanup
**Goal**: Users can clean npm and yarn caches completely
**Depends on**: Phase 2, Phase 3
**Requirements**: CACHE-01, CACHE-02, CACHE-03
**Success Criteria** (what must be TRUE):
  1. Running `nuke` in an npm project executes `npm cache clean --force`
  2. Running `nuke` in a yarn v1 project executes `yarn cache clean`
  3. Running `nuke` in a yarn Berry project executes `yarn cache clean --all`
  4. Cache cleanup commands run with appropriate spinners and success/error reporting
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: pnpm/bun/deno Cache Cleanup
**Goal**: Users can clean pnpm, bun, and deno caches completely
**Depends on**: Phase 4
**Requirements**: CACHE-04, CACHE-05, CACHE-06
**Success Criteria** (what must be TRUE):
  1. Running `nuke` in a pnpm project executes `pnpm store prune`
  2. Running `nuke` in a bun project deletes ~/.bun/install/cache directory
  3. Running `nuke` in a deno project executes `deno clean`
  4. All cache cleanups report success/failure consistently
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Workspace Support
**Goal**: Users can clean monorepo workspaces including Turborepo and Nx caches
**Depends on**: Phase 5
**Requirements**: WORK-01, WORK-02, WORK-03, WORK-04, WORK-05
**Success Criteria** (what must be TRUE):
  1. Running `nuke` in a Turborepo project detects turbo.json and cleans .turbo and node_modules/.cache/turbo
  2. Running `nuke` in an Nx project detects nx.json and cleans .nx/cache and node_modules/.cache/nx
  3. Running `nuke` in a monorepo cleans node_modules in all workspace packages
  4. Workspace detection works regardless of package manager (pnpm, yarn, npm)
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD
- [ ] 06-03: TBD

### Phase 7: Configuration
**Goal**: Users can customize nuka-code behavior via .nuke.config.ts
**Depends on**: Phase 6
**Requirements**: CONF-01, CONF-02, CONF-03
**Success Criteria** (what must be TRUE):
  1. Running `nuke` loads .nuke.config.ts from project root if present
  2. Config file supports typed options (TypeScript autocomplete works)
  3. Config options override default behavior (e.g., exclude paths, custom cache dirs)
  4. Missing config file uses sensible defaults (no error)
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 8: UX Enhancements
**Goal**: Users get clear feedback on cleanup impact and CI-friendly output
**Depends on**: Phase 7
**Requirements**: UX-01, UX-02, UX-03
**Success Criteria** (what must be TRUE):
  1. Running `nuke` shows total disk space freed (e.g., "Freed 2.3 GB")
  2. Running `nuke --json` outputs machine-readable JSON for CI/CD
  3. Running `nuke --dry-run` shows what would be deleted with sizes per item
  4. Size calculation is accurate and fast (not blocking)
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD

### Phase 9: Quality & Polish
**Goal**: nuka-code is reliable, well-documented, and thoroughly tested
**Depends on**: Phase 8
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04
**Success Criteria** (what must be TRUE):
  1. Errors during cleanup are surfaced to users (not silently swallowed)
  2. Detection accuracy is verified across all supported PM/monorepo combinations
  3. README documents all supported package managers and monorepo tools
  4. Integration tests cover multi-PM detection and cleanup scenarios
**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD
- [ ] 09-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. CLI Foundation | 0/3 | Planned | - |
| 2. Detection | 0/TBD | Not started | - |
| 3. Execution Infrastructure | 0/TBD | Not started | - |
| 4. npm/yarn Cache Cleanup | 0/TBD | Not started | - |
| 5. pnpm/bun/deno Cache Cleanup | 0/TBD | Not started | - |
| 6. Workspace Support | 0/TBD | Not started | - |
| 7. Configuration | 0/TBD | Not started | - |
| 8. UX Enhancements | 0/TBD | Not started | - |
| 9. Quality & Polish | 0/TBD | Not started | - |
