# Project Research Summary

**Project:** nuka-code multi-package-manager support
**Domain:** JavaScript/TypeScript package manager detection and cleanup tools
**Researched:** 2026-01-31
**Confidence:** HIGH

## Executive Summary

nuka-code is a CLI cleanup tool targeting the modern JavaScript ecosystem where developers regularly switch between npm, yarn, pnpm, bun, and deno. The 2025 standard for multi-PM support centers on `package-manager-detector` (v1.6.0), a battle-tested library extracted from `@antfu/ni` that detects package managers via lockfiles, packageManager fields, and install metadata. The key architectural insight is to detect first, then execute PM-specific cleanup commands (npm cache clean vs pnpm store prune vs yarn cache clean).

The recommended approach: build a detection layer that identifies the PM type, workspace structure, and monorepo tools (Turborepo/Nx), then use this context to intelligently clean node_modules, caches, and build artifacts. The major risk is incomplete detection leading to broken cleanup—missing new lockfile formats (bun.lock vs bun.lockb), misunderstanding PM-specific storage models (pnpm symlinks, Yarn PnP), or hardcoding cache paths that vary by platform and configuration.

Mitigation: comprehensive lockfile detection covering all 7+ formats, PM-aware cleanup strategies that respect each tool's architecture, and cross-platform path handling from day one. The payoff is a zero-config tool that "just works" regardless of the PM used—a clear differentiator over existing cleanup tools that either ignore PMs entirely or assume npm-only workflows.

## Key Findings

### Recommended Stack

The JavaScript package manager detection ecosystem has converged on `package-manager-detector` as the de facto standard. This library powers popular tools like `@antfu/ni` and is maintained by the antfu-collective with active development (v1.6.0 released November 2025). It provides zero-dependency detection supporting npm, yarn (Classic and Berry), pnpm, bun, and deno via multiple strategies: lockfile scanning, packageManager field parsing, and devEngines detection.

**Core technologies:**
- **package-manager-detector** (^1.6.0): PM detection from lockfiles and manifest fields — industry standard, powers ni, actively maintained
- **nypm** (^0.6.4): Unified PM operations API for running commands — high-level abstraction over PM differences
- **yaml** (^2.8.x): Parse pnpm-workspace.yaml and Yarn Berry lockfiles — already in project, reuse for workspace detection
- **type-fest** (^4.x): TypeScript utilities for type definitions — already in project, leverage for strict typing

**Critical version requirements:**
- Bun lockfile: Support both `bun.lockb` (binary, legacy) and `bun.lock` (text JSONC, v1.2+ default)
- Yarn version detection: Distinguish Classic (custom format) vs Berry (YAML with __metadata) via lockfile structure

### Expected Features

Research into competitor tools (npkill, clean-modules, kondo, projclean) reveals a clear feature hierarchy.

**Must have (table stakes):**
- Delete node_modules recursively (including nested monorepo packages)
- Delete build artifacts (dist, out, .next, .nuxt, .svelte-kit framework-specific outputs)
- Delete cache directories (.turbo, .nx/cache, build tool caches)
- Dry run / list mode for safety
- Confirmation prompt before deletion
- Git dirty check to prevent data loss
- Ignore file support (.nukeignore)
- Multi-package-manager support (npm, yarn, pnpm, bun, deno)
- Cross-platform (macOS, Linux, Windows)
- Monorepo workspace support

**Should have (competitive differentiators):**
- **Auto-detect package manager and clean its cache** — key differentiator; no other tool does this comprehensively
- Deno and Bun support (newer runtimes gaining traction)
- Smart workspace detection (Turborepo/Nx-aware cleanup)
- Size reporting (before/after freed space like npkill)
- Single command, zero config (maintain simplicity)
- JSON output mode for CI/CD integration

**Defer (v2+):**
- Last modified filtering (only clean projects older than X days)
- Global cache cleanup option (risky, needs careful UX design)
- Configuration file (nuke.config.ts — complexity cost high)
- Interactive TUI (npkill's approach; scope creep for single-project cleanup)

**Anti-features to avoid:**
- System-wide recursive search (let npkill handle this use case)
- Delete lockfiles by default (breaks reproducible builds)
- Auto-reinstall after nuke (couples cleanup with installation)
- Delete .git directory (catastrophic data loss risk)

### Architecture Approach

The standard architecture for multi-PM detection and cleanup tools follows a layered approach with clear separation of concerns: detection layer → context building → cleanup execution.

**Major components:**
1. **Detection Layer** (PMDetector, WSDetector, ToolDetector) — Independent detectors for package managers, workspaces, and monorepo tools; each produces partial results merged into ProjectContext
2. **ProjectContext Builder** — Unified detection result object containing PM info, workspace structure, and tool configuration; passed to all cleanup functions
3. **Cleanup Layer** (NodeModulesCleaner, CacheCleaner, BuildCleaner) — PM-aware and tool-aware deletion strategies based on ProjectContext
4. **GlobResolver** — Workspace-aware glob expansion with .nukeignore integration
5. **Orchestrator** (NukeOrchestrator) — Coordinates detection → cleanup flow, aggregates results, handles reporting

**Key patterns:**
- **Strategy Pattern for PM Detection:** Each PM has independent detector implementing common interface; priority-sorted execution
- **Composite Detection Result:** Single ProjectContext object containing all detection metadata
- **Glob Registry:** Centralized patterns per artifact type, composable based on detected tools

**Recommended structure:**
```
src/
├── lib/
│   ├── detection/       # PM, workspace, tool detection
│   ├── cleanup/         # Node modules, cache, build artifact cleaners
│   ├── manifest/        # Config parsers (extend for turbo.json, nx.json, deno.json)
│   └── fs/              # Workspace-aware glob expansion
└── nuke.ts              # Orchestrator
```

### Critical Pitfalls

1. **Missing New Lockfile Formats** — Bun 1.2 changed from binary `bun.lockb` to text-based `bun.lock`; tools checking only one format fail. Prevention: Maintain exhaustive lockfile registry, check both old and new formats, add detection tests for all 7+ formats.

2. **Hardcoded Forward Slashes Breaking Windows** — Glob patterns with `/` fail silently on Windows. Prevention: Use `path.join()`, ensure glob libraries handle Windows, add Windows CI testing.

3. **Breaking pnpm Symlinks by Deleting Store** — pnpm uses hard links to global store; deleting store leaves broken symlinks. Prevention: Run `pnpm store prune` after node_modules deletion, warn about symlink implications.

4. **Incomplete Yarn PnP Cleanup** — Yarn Berry stores in `.yarn/cache` not node_modules; partial cleanup leaves orphaned cache. Prevention: Detect Yarn version via `.yarnrc.yml`, clean `.yarn/cache`, `.yarn/unplugged`, `.pnp.cjs`, `.pnp.loader.mjs`.

5. **Cross-Disk Store Location Failures** — pnpm/Bun hard links can't cross filesystem boundaries; store location varies. Prevention: Query actual location via `pnpm store path`, support custom store-dir config.

6. **Turborepo/Nx Cache Directory Misconfiguration** — Projects use custom `cacheDir` settings; hardcoded paths miss actual cache. Prevention: Parse `turbo.json` and `nx.json` for cacheDir configuration.

7. **Silent Failure on Permission Errors** — Locked files cause silent incomplete cleanup. Prevention: Track and report files that couldn't be deleted, implement retry logic.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation (Comprehensive PM Detection)
**Rationale:** All features depend on accurate PM detection. Missing lockfile formats breaks everything downstream. Cross-platform path handling is foundational and costly to retrofit.

**Delivers:**
- Complete lockfile detection (npm, yarn classic/berry, pnpm, bun.lockb, bun.lock, deno.lock)
- packageManager field parsing
- Cross-platform path handling
- Error tracking and reporting
- Windows CI integration

**Addresses:**
- Table stakes: Multi-PM support foundation
- Critical pitfall #1 (missing lockfile formats)
- Critical pitfall #2 (Windows path issues)
- Critical pitfall #7 (silent errors)

**Avoids:** Technical debt from hardcoded assumptions about PM types or platforms

### Phase 2: PM-Specific Cleanup Logic
**Rationale:** Each PM has unique storage model (npm hoisting vs pnpm symlinks vs Yarn PnP). Generic cleanup breaks these. Must detect PM first (Phase 1) before executing PM-specific commands.

**Delivers:**
- npm cache cleanup (`npm cache clean --force`)
- yarn cache cleanup (detect Classic vs Berry, run appropriate command)
- pnpm cache cleanup (`pnpm store prune` with symlink awareness)
- bun cache cleanup (manual deletion, no official command)
- deno cache cleanup (`deno clean`)

**Uses:**
- package-manager-detector for runtime detection
- PM-specific cache path resolution (query commands, not hardcode)

**Addresses:**
- Table stakes: Working multi-PM cleanup
- Differentiator: Auto-detect PM and clean cache (no other tool does this)
- Critical pitfall #3 (pnpm symlinks)
- Critical pitfall #4 (Yarn PnP)
- Critical pitfall #10 (Deno platform-specific paths)

**Avoids:** Broken state after cleanup (symlinks, orphaned caches)

### Phase 3: Workspace and Monorepo Tool Support
**Rationale:** Monorepos are standard in modern JS projects. Turborepo/Nx generate large caches separate from PM caches. Workspace-aware traversal prevents breaking symlinked workspace packages.

**Delivers:**
- Workspace detection (package.json workspaces, pnpm-workspace.yaml, deno.json)
- Turborepo detection and cache cleanup (parse turbo.json for cacheDir)
- Nx detection and cache cleanup (parse nx.json for cache config)
- Workspace-aware glob expansion
- Nested node_modules handling

**Implements:**
- WSDetector and ToolDetector components
- turbo.json and nx.json parsers
- GlobResolver with workspace boundary awareness

**Addresses:**
- Table stakes: Monorepo workspace support
- Differentiator: Smart workspace detection
- Critical pitfall #8 (nested workspace traversal)
- Critical pitfall #9 (custom cache directories)

**Avoids:** Incomplete cleanup in monorepos, broken workspace symlinks

### Phase 4: User Experience Enhancements
**Rationale:** Core cleanup works, now make it delightful. Size reporting and JSON output are low-effort, high-value additions that don't risk breaking existing functionality.

**Delivers:**
- Size reporting (freed X MB/GB)
- JSON output mode for CI/CD
- Improved dry-run with detailed preview
- Progress indication for large deletions
- Warning when switching PM types (phantom dependency exposure)

**Addresses:**
- Differentiator: Size reporting (satisfying feedback like npkill)
- Should-have: JSON output for automation
- Critical pitfall #6 (phantom dependency education)

**Avoids:** User confusion about partial success, anxiety during long operations

### Phase 5: Polish and Edge Cases
**Rationale:** Handle remaining edge cases discovered during early adoption. These are nice-to-have improvements that refine existing features.

**Delivers:**
- Global cache cleanup flag (with explicit confirmation)
- Last modified filtering (--older flag)
- Custom target directories via CLI
- Build tool cache detection (Vite, Webpack, etc.)

**Addresses:**
- Future features from research
- Edge cases in cross-disk stores (pitfall #5)
- Advanced use cases (old project cleanup)

### Phase Ordering Rationale

- **Phase 1 before 2:** Can't execute PM-specific commands without knowing which PM to use
- **Phase 2 before 3:** Basic single-package cleanup must work before adding monorepo complexity
- **Phase 3 before 4:** Core functionality (workspace support) before UX enhancements
- **Phase 4 independent:** UX features don't block core functionality; can be implemented in parallel
- **Dependencies:** Detection (Phase 1) → PM Logic (Phase 2) → Workspace Support (Phase 3) → UX (Phase 4) → Edge Cases (Phase 5)

This order follows the architecture's layered approach: foundation → detection → cleanup → orchestration → polish

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (PM-Specific Logic):** Each PM has unique cache model; may need additional investigation of Bun's evolving cache strategy and Deno's vendor mode
- **Phase 3 (Workspace Detection):** Deno workspaces are newer; documentation may be sparse; test with real Deno monorepo

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Lockfile detection is well-documented; package-manager-detector provides reference implementation
- **Phase 4 (UX Enhancements):** Size calculation and JSON output are standard CLI patterns; no domain-specific research needed

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | package-manager-detector is verified standard; npm registry confirms versions; active maintenance proven |
| Features | HIGH | Extensive competitor analysis (npkill, clean-modules, kondo, projclean); clear table stakes vs differentiators |
| Architecture | MEDIUM-HIGH | Patterns extracted from successful tools; component boundaries clear; some uncertainty around optimal workspace traversal |
| Pitfalls | HIGH | Real-world evidence (Cloudflare bun.lock issues, pnpm symlink problems documented); pitfall-to-phase mapping clear |

**Overall confidence:** HIGH

### Gaps to Address

- **Bun cache cleanup:** No official cache clean command yet; manual deletion only. Monitor Bun releases for API addition. Verify manual approach works across platforms.
- **Deno workspace edge cases:** Deno workspaces are newer; may encounter undocumented behaviors. Plan for iteration based on real-world testing.
- **Cross-disk pnpm stores:** Behavior when project and store are on different filesystems needs validation. Query `pnpm store path` to avoid assumptions.
- **Yarn PnP detection reliability:** Need to test both `.yarnrc.yml` parsing and `yarn.lock` format detection. Ensure both Classic and Berry correctly identified.

## Sources

### Primary (HIGH confidence)
- package-manager-detector npm registry (v1.6.0 verified)
- package-manager-detector GitHub README (detection strategies)
- nypm GitHub README (v0.6.4 verified)
- Bun official docs (lockfile formats)
- pnpm official docs (store behavior, symlinks)
- Yarn official docs (PnP mode, cache strategies)
- Deno official docs (cache location, workspaces)
- Turborepo official docs (configuration, caching)
- Nx official docs (project configuration, cache)

### Secondary (MEDIUM confidence)
- npkill GitHub (feature analysis)
- clean-modules GitHub (ignore patterns)
- kondo GitHub (multi-language cleanup)
- projclean GitHub (rule-based cleanup)
- Cloudflare Community (bun.lock detection issues)
- GitHub pnpm issues (store location problems)

### Tertiary (LOW confidence)
- Various lockfile format discussions (for context, not decisions)

---
*Research completed: 2026-01-31*
*Ready for roadmap: yes*
