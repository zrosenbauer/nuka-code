# Feature Research

**Domain:** JS/TS project cleanup CLI tools (node_modules, caches, build artifacts)
**Researched:** 2026-01-31
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Delete node_modules recursively** | Core purpose of cleanup tools; npkill, clean-modules, rimraf all do this | LOW | Already implemented. Must handle nested node_modules in monorepos |
| **Delete build artifacts (dist, out, .next, etc.)** | Standard cleanup expectation; users expect "clean slate" | LOW | Already implemented. Framework-specific outputs (.next, .nuxt, .svelte-kit) are key |
| **Delete cache directories (.turbo, .nx/cache)** | Monorepo tools generate large caches; cleanup is expected | LOW | Already implemented for Turbo/Nx |
| **Dry run / list mode** | ALL destructive tools (aws-nuke, cloud-nuke, rimraf) have this; safety expectation | LOW | Partially implemented via `list` command |
| **Confirmation prompt before deletion** | Safety standard; npkill, aws-nuke require explicit confirmation | LOW | Implemented (5-second countdown + git dirty check) |
| **Git dirty check** | Prevents accidental data loss; nuka-code already does this well | LOW | Already implemented |
| **Ignore file support (.nukeignore)** | Users need to exclude specific paths; clean-modules has .cleanmodules | MEDIUM | Already implemented |
| **Multi-package-manager support (npm, yarn, pnpm, bun)** | Users switch between PMs; tool must "just work" | MEDIUM | Partial - pnpm works, others need cache cleanup commands |
| **Cross-platform (macOS, Linux, Windows)** | npkill, rimraf explicitly support all three | LOW | Via Node.js/rimraf - should work but verify Windows paths |
| **Monorepo workspace support** | Modern JS projects are often monorepos (Turborepo, Nx, pnpm workspaces) | MEDIUM | Partial - cleans child node_modules but not workspace-aware cleanup |
| **Clear output showing what was deleted** | Users want to know what happened; npkill shows sizes, kondo shows disk freed | LOW | Basic implementation exists; could show sizes freed |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Auto-detect package manager and clean its cache** | "Run `nuke` and it does the right thing" - no need to remember `pnpm store prune` vs `npm cache clean --force` vs `yarn cache clean` | MEDIUM | Key differentiator. Detect PM from lockfile, run appropriate cache clean |
| **Deno and Bun support** | Newer runtimes gaining traction; most tools ignore them | MEDIUM | Deno has `deno clean`, Bun cache at `~/.bun/install/cache` |
| **Smart workspace detection (Turborepo/Nx)** | Clean workspace-specific caches and artifacts; most tools miss this | MEDIUM | Turbo cache in `node_modules/.cache/turbo`, Nx in `.nx/cache` |
| **Size reporting (before/after)** | Show "Freed 2.3GB" like npkill and Kondo; satisfying feedback | LOW | Very satisfying UX; npkill's killer feature |
| **"Last modified" filtering** | Only clean projects not touched in X days (Kondo's `--older 3M`) | MEDIUM | Useful for cleaning old projects; reduces accidental deletion risk |
| **Single command, zero config** | Unlike clean-modules which needs glob config, just run `nuke` | LOW | Already a strength - maintain simplicity |
| **Fun Fallout theming** | Memorable branding; ASCII art, Vault-Tec references | LOW | Already implemented; keep it |
| **Global cache cleanup option** | Clean global npm/yarn/pnpm caches (not just project-local) | MEDIUM | Risky but valuable for disk recovery. Needs explicit flag |
| **JSON output mode** | CI/CD integration; npkill has `--json` and `--json-stream` | LOW | Useful for automation, scripting |
| **Configuration file (nuke.config.ts)** | README mentions this as future consideration | HIGH | Only if users demand it; complexity cost is high |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Interactive TUI with selection** | npkill has this; looks fancy | Adds complexity, dependencies (blessed/ink), and maintenance burden. Not needed when cleaning single project | Keep simple CLI. Interactive is for system-wide cleanup tools like npkill |
| **System-wide recursive search** | "Find all node_modules on my disk" | Scope creep - npkill already does this well. Focus on single-project cleanup | Recommend npkill for system-wide; nuka-code for project-specific |
| **Delete lockfiles (package-lock.json, etc.)** | "Start completely fresh" | Almost never correct; breaks reproducible builds. User can manually delete if needed | Explicitly exclude lockfiles; document why |
| **Auto-reinstall after nuke** | "Clean and reinstall in one command" | Couples cleanup with package installation; different concerns. Users might want to clean without reinstalling | Provide clear message like "Run `pnpm install` to reinstall" |
| **Delete .git directory** | "Total clean slate" | Catastrophic data loss risk; never appropriate | Explicitly exclude; error if user tries to include |
| **Pattern like *.ts by default** | clean-modules issue: removing source files | Breaks TypeScript projects; d.ts files needed for builds | Only delete known-safe directories, never source patterns |
| **Too many default patterns** | "Clean everything possible" | ModClean's "danger" mode caused issues. More patterns = more risk | Conservative defaults; let users add via .nukeignore inverse |
| **Background/daemon mode** | "Auto-clean old projects" | Risky for automated destructive operations; user should always initiate | Provide guidance for cron/scheduled tasks instead |
| **Plugin system** | "Let users extend functionality" | Massive complexity; this is a focused tool, not a platform | Keep scope narrow; if needed, fork |
| **Remote cache cleanup (Vercel, Nx Cloud)** | "Clean cloud caches too" | Requires auth, API integration, network dependency. Out of scope | Focus on local cleanup; document cloud cache UIs |

## Feature Dependencies

```
[Package Manager Detection]
    └──requires──> [Lockfile Parsing] (already exists)
                       └──enables──> [PM-specific Cache Cleanup]
                                         └──npm cache clean --force
                                         └──pnpm store prune
                                         └──yarn cache clean
                                         └──bun pm cache rm (limited)
                                         └──deno clean

[Workspace Detection]
    └──requires──> [Manifest Parsing] (already exists)
                       └──enables──> [Turborepo Cache Cleanup]
                       └──enables──> [Nx Cache Cleanup]

[Size Reporting]
    └──requires──> [Pre-deletion Size Calculation]
                       └──enhances──> [Post-deletion Summary]

[--older Flag]
    └──requires──> [File/Dir Mtime Checking]
                       └──conflicts──> [--force Flag] (can't be both time-filtered and forced)

[JSON Output]
    └──independent
    └──enhances──> [CI/CD Integration]
```

### Dependency Notes

- **PM Detection requires Lockfile Parsing:** Already have lockfile detection; extend to trigger correct cache commands
- **Workspace Detection requires Manifest Parsing:** Already parse package.json; add pnpm-workspace.yaml, turbo.json, nx.json detection
- **Size Reporting is independent:** Can implement without other features; high-value, low-risk
- **--older conflicts with --force:** Time filtering implies caution; forcing implies no caution. Pick one per invocation

## MVP Definition

### Launch With (v1) - Multi-PM Support

Minimum for this milestone - what's needed to claim "works with npm, yarn, pnpm, bun, deno".

- [x] Delete node_modules recursively (done)
- [x] Delete build artifacts (done)
- [x] Delete cache directories (done)
- [x] Confirmation prompt (done)
- [x] Git dirty check (done)
- [x] .nukeignore support (done)
- [ ] **npm cache cleanup** - `npm cache clean --force`
- [ ] **yarn cache cleanup** - `yarn cache clean` (v1 and v2+)
- [ ] **pnpm cache cleanup** - `pnpm store prune`
- [ ] **bun cache cleanup** - Limited support (no official command)
- [ ] **deno cache cleanup** - `deno clean`
- [ ] **Auto-detect package manager** from lockfile

### Add After Validation (v1.x)

Features to add once core multi-PM support is validated.

- [ ] **Size reporting** (freed X MB/GB) - Trigger: User feedback requesting this
- [ ] **Turborepo workspace-aware cleanup** - Trigger: Monorepo adoption
- [ ] **Nx workspace-aware cleanup** - Trigger: Nx user requests
- [ ] **JSON output mode** - Trigger: CI/CD integration requests
- [ ] **--older flag** for time-based filtering - Trigger: Users with many projects

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Global cache cleanup flag** - Defer: High risk, needs careful UX design
- [ ] **nuke.config.ts** - Defer: Complexity cost, most users don't need
- [ ] **Vite cache cleanup** (.vite directory) - Defer: Less common, can add to globs later
- [ ] **Custom target directories via CLI** - Defer: .nukeignore inverse is simpler

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| npm cache cleanup | HIGH | LOW | **P1** |
| yarn cache cleanup | HIGH | LOW | **P1** |
| pnpm cache cleanup | HIGH | LOW | **P1** |
| Auto-detect PM | HIGH | LOW | **P1** |
| bun cache cleanup | MEDIUM | MEDIUM | **P1** |
| deno cache cleanup | MEDIUM | LOW | **P1** |
| Size reporting | HIGH | LOW | **P2** |
| JSON output | MEDIUM | LOW | **P2** |
| Turborepo workspace cleanup | MEDIUM | MEDIUM | **P2** |
| Nx workspace cleanup | MEDIUM | MEDIUM | **P2** |
| --older flag | LOW | MEDIUM | **P3** |
| Global cache cleanup | MEDIUM | HIGH | **P3** |
| nuke.config.ts | LOW | HIGH | **P3** |

**Priority key:**
- P1: Must have for multi-PM launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | npkill | clean-modules | rimraf | kondo | projclean | **nuka-code (current)** | **nuka-code (planned)** |
|---------|--------|---------------|--------|-------|-----------|------------------------|------------------------|
| Delete node_modules | Yes (interactive) | Yes (prune) | Yes (manual) | Yes | Yes | Yes | Yes |
| Delete build artifacts | No | No | Yes (manual) | Yes (20+ project types) | Yes (17+ types) | Yes | Yes |
| Delete caches | No | No | No | Yes | Yes | Partial (Turbo/Nx) | Yes (all PMs) |
| PM cache cleanup | No | No | No | No | No | No | **Yes (key differentiator)** |
| Dry run | Yes | Yes | No | Yes | Yes | Partial (list) | Yes (improve) |
| Size reporting | Yes | No | No | Yes | Yes | No | Yes |
| Interactive UI | Yes (TUI) | No | No | Yes (optional) | Yes (TUI) | No | No (intentional) |
| System-wide search | Yes | No | No | Yes | Yes | No | No (recommend npkill) |
| Ignore file | No | Yes (.cleanmodules) | No | No | No | Yes (.nukeignore) | Yes |
| Multi-runtime | No (Node only) | No | No | Yes (20 languages) | Yes (17 languages) | No | Yes (Deno, Bun) |
| Workspace-aware | No | No | No | No | No | Basic | Yes (Turbo, Nx) |
| Cross-platform | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

### Competitive Positioning

**nuka-code's niche:** Single-project, multi-PM, workspace-aware cleanup with zero config.

- **vs npkill:** npkill is for system-wide cleanup of old projects. nuka-code is for cleaning current project.
- **vs clean-modules:** clean-modules prunes inside node_modules. nuka-code deletes entire directories.
- **vs rimraf:** rimraf is a low-level delete command. nuka-code is opinionated about what to delete.
- **vs kondo/projclean:** These are multi-language tools. nuka-code is JS/TS focused with PM cache awareness.

**Key differentiator to build:** Auto-detect PM and clean its cache. No other tool does this.

## Cache Cleanup Commands Reference

Commands to invoke for each package manager:

| Package Manager | Cache Cleanup Command | Global Store Location | Notes |
|-----------------|----------------------|----------------------|-------|
| npm | `npm cache clean --force` | `~/.npm` (Unix), `%LocalAppData%\npm-cache` (Windows) | Also clean `~/.npm/_npx` for npx cache |
| yarn v1 | `yarn cache clean` | `~/.cache/yarn` | Single command |
| yarn v2+ (Berry) | `yarn cache clean --all` | `.yarn/cache` (project-local) | PnP mode uses project-local cache |
| pnpm | `pnpm store prune` | `~/.local/share/pnpm/store` | Removes unreferenced packages |
| bun | Manual: `rm -rf ~/.bun/install/cache` | `~/.bun/install/cache` | No official cache clean command yet |
| deno | `deno clean` | `~/Library/Caches/deno` (macOS), `~/.cache/deno` (Linux) | Cleans DENO_DIR |

## Sources

### Tools Analyzed
- [npkill - npm](https://www.npmjs.com/package/npkill) - Interactive node_modules finder/deleter
- [npkill - GitHub](https://github.com/voidcosmos/npkill) - CLI flags, safety features
- [rimraf - npm](https://www.npmjs.com/package/rimraf) - Cross-platform rm -rf
- [rimraf - GitHub](https://github.com/isaacs/rimraf) - API details
- [clean-modules - npm](https://www.npmjs.com/package/clean-modules) - Prune unnecessary files
- [clean-modules - GitHub](https://github.com/duniul/clean-modules) - Configuration options
- [kondo - lib.rs](https://lib.rs/crates/kondo) - Multi-language cleanup tool
- [kondo - GitHub](https://github.com/tbillington/kondo) - 20+ project type support
- [projclean - GitHub](https://github.com/sigoden/projclean) - Rule-based cleanup, 17+ build systems
- [ModClean - GitHub](https://github.com/ModClean/modclean) - Pattern-based cleanup (safe/caution/danger modes)

### Package Manager Cache Documentation
- [pnpm cache delete](https://pnpm.io/cli/cache-delete)
- [pnpm store prune](https://pnpm.io/cli/prune)
- [yarn cache clean](https://yarnpkg.com/cli/cache/clean)
- [npm cache clean](https://docs.npmjs.com/cli/v8/commands/npm-cache)
- [deno clean](https://docs.deno.com/runtime/reference/cli/clean/)
- [Bun cache discussion](https://github.com/oven-sh/bun/discussions/8078) - No official command yet

### Safety Patterns
- [aws-nuke - GitHub](https://github.com/rebuy-de/aws-nuke) - Dry run by default, double confirmation
- [cloud-nuke - GitHub](https://github.com/gruntwork-io/cloud-nuke) - DryRun feature, exclusion tags
- [CLI dry run patterns](https://nickjanetakis.com/blog/cli-tools-that-support-previews-dry-runs-or-non-destructive-actions)

### Monorepo Cache Cleanup
- [Turborepo cache discussion](https://github.com/vercel/turborepo/discussions/5270) - turbo cache clean
- [Turborepo caching docs](https://turborepo.dev/docs/crafting-your-repository/caching)
- [Nx workspace cleanup](https://github.com/nrwl/nx/discussions/9871)

---
*Feature research for: JS package manager cleanup tools*
*Researched: 2026-01-31*
