# Requirements: nuka-code

**Defined:** 2026-01-31
**Core Value:** Run `nuke` in any JS/TS project and it correctly detects and cleans everything, regardless of package manager or monorepo tool.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Detection

- [ ] **DET-01**: Auto-detect package manager from lockfile using package-manager-detector
- [ ] **DET-02**: Detect Yarn version (Classic vs Berry) for correct cache handling
- [ ] **DET-03**: Detect Bun lockfile format (bun.lockb legacy vs bun.lock text)
- [ ] **DET-04**: Handle multiple lockfiles in same project (migration scenarios)

### Package Manager Cache Cleanup

- [ ] **CACHE-01**: npm cache cleanup via `npm cache clean --force`
- [ ] **CACHE-02**: yarn v1 cache cleanup via `yarn cache clean`
- [ ] **CACHE-03**: yarn Berry cache cleanup via `yarn cache clean --all`
- [ ] **CACHE-04**: pnpm cache cleanup via `pnpm store prune`
- [ ] **CACHE-05**: bun cache cleanup (manual deletion of ~/.bun/install/cache)
- [ ] **CACHE-06**: deno cache cleanup via `deno clean`

### Workspace & Monorepo

- [ ] **WORK-01**: Turborepo workspace detection from turbo.json
- [ ] **WORK-02**: Turborepo cache cleanup (node_modules/.cache/turbo, .turbo)
- [ ] **WORK-03**: Nx workspace detection from nx.json
- [ ] **WORK-04**: Nx cache cleanup (.nx/cache, node_modules/.cache/nx)
- [ ] **WORK-05**: Workspace-aware node_modules cleanup (per-package in monorepo)

### Configuration

- [ ] **CONF-01**: .nuke.config.ts configuration file support
- [ ] **CONF-02**: Config file schema with typed options
- [ ] **CONF-03**: Config file auto-discovery in project root

### User Experience

- [ ] **UX-01**: Size reporting showing disk space freed ("Freed 2.3 GB")
- [ ] **UX-02**: JSON output mode for CI/CD integration (--json flag)
- [ ] **UX-03**: Improved dry-run output showing what would be deleted with sizes

### Execution

- [ ] **EXEC-01**: Parallel execution support for independent cleanup tasks
- [ ] **EXEC-02**: Sequential execution fallback for dependent tasks
- [ ] **EXEC-03**: Configurable parallelism (auto, parallel, sequential)

### CLI & Logging

- [ ] **CLI-01**: Install and integrate @clack/prompts for all user interaction
- [ ] **CLI-02**: Build unified logging abstraction using clack (spinners, messages, prompts)
- [ ] **CLI-03**: Remove chalk dependency (replace with clack styling)
- [ ] **CLI-04**: Remove consola dependency (replace with clack logging)
- [ ] **CLI-05**: Remove yocto-spinner dependency (replace with clack spinner)
- [ ] **CLI-06**: Consistent spinner states during cleanup operations

### Quality & Polish

- [ ] **QUAL-01**: Fix silent error handling - surface real errors to users
- [ ] **QUAL-02**: Verify detection accuracy across all supported PM/tools
- [ ] **QUAL-03**: Update README with supported package managers and tools
- [ ] **QUAL-04**: Integration tests for core multi-PM functionality

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Platform Support

- **PLAT-01**: Windows path handling (use path module consistently)
- **PLAT-02**: Windows-specific cache locations

### Advanced Features

- **ADV-01**: Global cache cleanup flag (--global)
- **ADV-02**: --older flag for time-based filtering
- **ADV-03**: Custom target directories via CLI

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Interactive TUI | Adds complexity; npkill already does this well |
| System-wide search | Scope creep; recommend npkill for this use case |
| Lockfile deletion | Breaks reproducible builds; too dangerous |
| Auto-reinstall after nuke | Couples concerns; users can run install manually |
| Delete .git directory | Catastrophic data loss risk |
| Plugin system | Massive complexity; keep tool focused |
| Remote cache cleanup (Vercel, Nx Cloud) | Requires auth/API; out of scope |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLI-01 | Phase 1 | Pending |
| CLI-02 | Phase 1 | Pending |
| CLI-03 | Phase 1 | Pending |
| CLI-04 | Phase 1 | Pending |
| CLI-05 | Phase 1 | Pending |
| CLI-06 | Phase 1 | Pending |
| DET-01 | Phase 2 | Pending |
| DET-02 | Phase 2 | Pending |
| DET-03 | Phase 2 | Pending |
| DET-04 | Phase 2 | Pending |
| EXEC-01 | Phase 3 | Pending |
| EXEC-02 | Phase 3 | Pending |
| EXEC-03 | Phase 3 | Pending |
| CACHE-01 | Phase 4 | Pending |
| CACHE-02 | Phase 4 | Pending |
| CACHE-03 | Phase 4 | Pending |
| CACHE-04 | Phase 5 | Pending |
| CACHE-05 | Phase 5 | Pending |
| CACHE-06 | Phase 5 | Pending |
| WORK-01 | Phase 6 | Pending |
| WORK-02 | Phase 6 | Pending |
| WORK-03 | Phase 6 | Pending |
| WORK-04 | Phase 6 | Pending |
| WORK-05 | Phase 6 | Pending |
| CONF-01 | Phase 7 | Pending |
| CONF-02 | Phase 7 | Pending |
| CONF-03 | Phase 7 | Pending |
| UX-01 | Phase 8 | Pending |
| UX-02 | Phase 8 | Pending |
| UX-03 | Phase 8 | Pending |
| QUAL-01 | Phase 9 | Pending |
| QUAL-02 | Phase 9 | Pending |
| QUAL-03 | Phase 9 | Pending |
| QUAL-04 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0

---
*Requirements defined: 2026-01-31*
*Last updated: 2026-01-31 after roadmap creation*
