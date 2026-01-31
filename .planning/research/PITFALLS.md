# Pitfalls Research

**Domain:** Multi-PM Cache/Artifact Cleaning Tool
**Researched:** 2026-01-31
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Missing New Lockfile Formats

**What goes wrong:**
Tool fails to detect package manager when users adopt new lockfile formats. Bun 1.2 changed default from binary `bun.lockb` to text-based `bun.lock` (JSONC format). Tools that only check for `bun.lockb` will fail to detect Bun projects.

**Why it happens:**
Lockfile formats evolve. The current codebase only checks for `pnpm-lock.yaml`, `yarn.lock`, and `package-lock.json` in `lockfile.ts`. Missing: `bun.lockb`, `bun.lock`, `deno.lock`, `deno.json`.

**How to avoid:**
- Maintain an exhaustive lockfile registry with version notes
- Check for BOTH old and new formats (e.g., both `bun.lockb` AND `bun.lock`)
- Add lockfile detection tests that cover all known formats
- Subscribe to package manager release notes for format changes

**Warning signs:**
- CI/CD platforms failing to detect Bun (Cloudflare Pages already hit this with `bun.lock`)
- Users reporting "not detected as a Node project"
- AWS CDK and other tools already encountering this issue

**Phase to address:**
Phase 1 (Foundation) - Comprehensive PM detection is prerequisite for all other features

---

### Pitfall 2: Hardcoded Forward Slashes Breaking Windows

**What goes wrong:**
Glob patterns like `**/node_modules` work on Unix but fail silently or behave unexpectedly on Windows. Path construction using `/` instead of `path.sep` or `path.join` causes cross-platform failures.

**Why it happens:**
Developers test on macOS/Linux and assume paths work universally. The current codebase uses hardcoded `/` in glob patterns in `nuke.ts`.

**How to avoid:**
- Always use `path.join()` or `path.posix.join()` for path construction
- For globs, use forward slashes but ensure the glob library handles Windows
- Add Windows-specific CI testing (GitHub Actions `windows-latest`)
- Test with paths containing spaces and special characters

**Warning signs:**
- Windows users reporting "nothing was deleted"
- Tests pass on macOS/Linux but fail on Windows
- Path normalization issues in error messages

**Phase to address:**
Phase 1 (Foundation) - Cross-platform path handling is foundational

---

### Pitfall 3: Breaking pnpm Symlinks by Deleting Store

**What goes wrong:**
Deleting `node_modules` in a pnpm project leaves broken symlinks everywhere if the global store is also affected. pnpm uses hard links from a global store to each project's `node_modules`. Deleting store contents without removing all `node_modules` creates orphaned symlinks.

**Why it happens:**
Unlike npm and yarn, pnpm's node_modules are symlinks to a content-addressable store. Treating pnpm like npm leads to inconsistent state.

**How to avoid:**
- For pnpm projects, recommend running `pnpm store prune` after deleting `node_modules`
- Document that global store deletion requires subsequent reinstall
- Detect pnpm via `pnpm-lock.yaml` and warn users about symlink implications
- Consider running `pnpm store prune` automatically when `--deep` flag used

**Warning signs:**
- Users reporting "broken symlinks" after cleanup
- `node_modules` directory empty but still has broken link structure
- Subsequent `pnpm install` failing with store errors

**Phase to address:**
Phase 2 (PM-Specific Logic) - Requires understanding of each PM's storage model

---

### Pitfall 4: Incomplete Yarn PnP Cleanup

**What goes wrong:**
Deleting `node_modules` but leaving `.pnp.cjs`, `.pnp.loader.mjs`, or `.yarn/cache` causes Yarn 2+ projects to remain in broken state. Current codebase handles `.pnp.cjs` and `.pnp.loader.mjs` but may miss `.yarn/cache` and `.yarn/unplugged`.

**Why it happens:**
Yarn Berry (v2+) uses Plug'n'Play which stores dependencies in `.yarn/cache` with a runtime loader. Partial cleanup leaves orphaned cache.

**How to avoid:**
- For Yarn 2+ projects (detect via `.yarnrc.yml` or `yarn.lock` format), also target:
  - `.yarn/cache`
  - `.yarn/unplugged`
  - `.pnp.cjs`
  - `.pnp.loader.mjs`
- Check for Yarn version via `.yarnrc.yml` `nodeLinker` setting

**Warning signs:**
- Users report "still using old cached versions" after cleanup
- Disk space not recovered as expected
- `.yarn` directory size unchanged after "full" cleanup

**Phase to address:**
Phase 2 (PM-Specific Logic) - Yarn PnP is a distinct install mode

---

### Pitfall 5: Cross-Disk Store Location Failures

**What goes wrong:**
pnpm and Bun use hard links which cannot cross filesystem boundaries. If global store is on disk C but project is on disk D, packages are copied instead of linked. Cleanup tools may look for store in wrong location.

**Why it happens:**
Hard links are a filesystem-level feature that cannot address locations on different filesystems. Developers assume a single global store location.

**How to avoid:**
- Query actual store location via `pnpm store path` rather than assuming `~/.pnpm-store`
- Support custom store locations set via `store-dir` config
- Document that cache location varies by filesystem layout
- Use `npm config get cache`, `yarn cache dir`, `pnpm store path` for accurate paths

**Warning signs:**
- Users with external drives or Docker volumes reporting "cache not found"
- `ERR_PNPM_UNEXPECTED_STORE` errors after cleanup
- Disk space usage higher than expected (copying instead of linking)

**Phase to address:**
Phase 3 (Cache Management) - Global cache cleanup requires accurate path resolution

---

### Pitfall 6: Phantom Dependency Exposure After Cleanup

**What goes wrong:**
After cleanup and reinstall with different PM, previously working code breaks because it relied on phantom dependencies (packages accessible via hoisting but not declared in package.json).

**Why it happens:**
npm and Yarn Classic hoist all dependencies to root `node_modules`. Code may import undeclared dependencies that happened to be available. pnpm enforces strict dependency isolation.

**How to avoid:**
- This is NOT a bug to fix, but important to document
- After cleanup, recommend running with strict mode to surface phantom deps
- Consider adding `--verify` flag that checks imports against declared deps
- Warn users when switching between hoisted (npm/yarn) and isolated (pnpm) modes

**Warning signs:**
- "Module not found" errors after reinstall with different PM
- Tests pass with npm but fail with pnpm
- Imports work in development but fail in production

**Phase to address:**
Phase 4 (Developer Experience) - User education and documentation

---

### Pitfall 7: Silent Failure on Permission Errors

**What goes wrong:**
Tool encounters permission error (locked file, running process) but silently continues. User thinks cleanup succeeded but files remain.

**Why it happens:**
Current codebase may swallow errors in `rimraf` calls. Windows especially has file locking issues with open editors/processes.

**How to avoid:**
- Track and report which files couldn't be deleted
- Return structured result with success/failure counts
- Warn about running processes that may lock files
- Implement retry logic with exponential backoff for transient locks

**Warning signs:**
- Disk space not freed after "successful" cleanup
- User reports files still exist after running tool
- No errors shown but cleanup incomplete

**Phase to address:**
Phase 1 (Foundation) - Error handling is foundational

---

### Pitfall 8: Nested Workspace node_modules Traversal

**What goes wrong:**
In monorepos with nested workspaces, glob pattern `**/node_modules` may match too many or too few directories. Workspace packages may have their own `node_modules` that should (or shouldn't) be deleted independently.

**Why it happens:**
Monorepos have complex nesting: `apps/*/node_modules`, `packages/*/node_modules`, plus nested dependencies within workspace packages themselves.

**How to avoid:**
- Respect workspace boundaries defined in `pnpm-workspace.yaml` or `package.json` workspaces
- Allow filtering by workspace pattern (e.g., `--workspace=packages/*`)
- Display tree structure before deletion so users can verify targets
- Current codebase has `workspaces.ts` - ensure it handles all workspace config formats

**Warning signs:**
- Unexpectedly long deletion times in large monorepos
- Some workspace packages not cleaned
- Symlinked workspace packages broken

**Phase to address:**
Phase 5 (Monorepo Support) - Workspace-aware traversal

---

### Pitfall 9: Turborepo/Nx Cache Directory Misconfiguration

**What goes wrong:**
Tool targets default `.turbo/cache` or `.nx/cache` but project uses custom `cacheDir` setting. Cache not cleaned because looking in wrong location.

**Why it happens:**
Both Turborepo and Nx allow configuring cache directory via `turbo.json` (`cacheDir`) or `nx.json`. Current codebase hardcodes `.turbo` and `.nx/cache`.

**How to avoid:**
- Parse `turbo.json` for `cacheDir` setting
- Parse `nx.json` for cache configuration
- Support `TURBO_CACHE_DIR` and `NX_CACHE_DIR` environment variables
- Fall back to defaults only when no custom config found

**Warning signs:**
- Users reporting "turbo cache not cleaned" despite running tool
- Custom cache directories still consuming disk space
- Git worktree users having separate cache copies

**Phase to address:**
Phase 3 (Cache Management) - Accurate cache location resolution

---

### Pitfall 10: Deno Cache Location Varies by Platform

**What goes wrong:**
Tool looks for Deno cache in hardcoded location but actual location varies by OS and `DENO_DIR` environment variable.

**Why it happens:**
Deno uses platform-specific defaults: macOS uses `~/Library/Caches/deno`, Linux uses `~/.cache/deno`, Windows uses `%LOCALAPPDATA%/deno`. Plus `DENO_DIR` can override.

**How to avoid:**
- Use `deno info` command output to find actual cache location
- Check `DENO_DIR` environment variable first
- Handle platform-specific defaults as fallback
- For Deno projects with `vendor: true`, also clean `vendor/` directory

**Warning signs:**
- Deno cache not cleaned on Windows/Linux
- Different behavior across platforms
- `DENO_DIR` custom location not respected

**Phase to address:**
Phase 2 (PM-Specific Logic) - Deno has unique cache model

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode lockfile names | Quick detection | New formats break detection | Never - use registry pattern |
| Ignore Yarn PnP | Simpler logic | Yarn 2+ users get incomplete cleanup | Only for MVP if documented |
| Skip store path queries | Faster execution | Wrong cache locations | Only if user confirms location |
| Synchronous file ops | Simpler code | Blocks on large deletions | Never - always async |
| Single glob pattern | Simple implementation | Edge cases in nested workspaces | MVP only |
| Ignore Windows | Faster development | 30%+ of users affected | Never |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| pnpm store | Assuming `~/.pnpm-store` | Run `pnpm store path` to get actual location |
| npm cache | Assuming `~/.npm` | Run `npm config get cache` for actual path |
| Yarn cache | Assuming `~/.yarn/cache` | Run `yarn cache dir` - varies by Yarn version |
| Bun cache | No standard query | Check `~/.bun/install/cache` but may vary |
| Deno cache | Hardcoding path | Use `deno info` output, respect `DENO_DIR` |
| Turborepo | Targeting `.turbo` only | Parse `turbo.json` for `cacheDir`, check env vars |
| Nx | Targeting `.nx/cache` only | Parse `nx.json` for custom cache paths |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sequential file deletion | Slow cleanup times | Use parallel deletion with worker pool | >1000 files |
| Glob without depth limit | Hangs on deep nesting | Set max depth, use `ignore` patterns | Recursive `node_modules` |
| No progress indication | User thinks tool frozen | Show spinner with count | >5 seconds |
| Reading all files to filter | Memory exhaustion | Stream-based filtering | Large monorepos |
| Synchronous store queries | Startup delay | Cache PM detection results | Every run |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Following symlinks into store | Deleting global packages | Use `lstat` to detect symlinks, don't follow |
| No path validation | Directory traversal attack | Ensure paths stay within project root |
| Deleting without confirmation | Accidental data loss | Require `--force` for non-standard targets |
| Trusting lockfile content | Malicious package injection | Only use lockfiles for PM detection, not execution |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No dry-run mode | Users afraid to run tool | Add `--dry-run` showing what would be deleted |
| Silent partial success | Confusion about actual state | Report success/failure counts explicitly |
| No size reporting | Can't verify space recovered | Show disk space before/after |
| Deleting without showing | Anxiety about what's happening | Show real-time deletion progress |
| All-or-nothing cleanup | Can't clean selectively | Add flags for each target type |

## "Looks Done But Isn't" Checklist

- [ ] **Lockfile detection:** Often missing `bun.lock`, `bun.lockb`, `deno.lock` -- verify all 7+ formats supported
- [ ] **Yarn PnP cleanup:** Often missing `.yarn/cache` and `.yarn/unplugged` -- verify full Yarn 2+ support
- [ ] **Windows paths:** Often broken with hardcoded `/` -- verify on actual Windows machine
- [ ] **Custom cache dirs:** Often missing Turbo/Nx config parsing -- verify custom `cacheDir` respected
- [ ] **Error reporting:** Often silent failures -- verify permission errors surface to user
- [ ] **Workspace awareness:** Often flat traversal -- verify nested workspaces handled correctly
- [ ] **Global store detection:** Often hardcoded paths -- verify `pnpm store path` queried

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Broken pnpm symlinks | LOW | Run `pnpm install` to recreate links |
| Orphaned Yarn PnP cache | LOW | Delete `.yarn/cache` manually, run `yarn install` |
| Wrong cache directory cleaned | LOW | Run build tool again to regenerate cache |
| Phantom deps exposed | MEDIUM | Add missing deps to package.json, test with pnpm |
| Silent permission failures | MEDIUM | Re-run with elevated permissions or close locking process |
| Windows path failures | HIGH | Fix code, release new version, document workaround |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Missing lockfile formats | Phase 1 (Foundation) | Test detection for all 7+ PM lockfiles |
| Windows path issues | Phase 1 (Foundation) | Windows CI passes, real Windows testing |
| Silent error handling | Phase 1 (Foundation) | Error count reported after every run |
| pnpm symlink handling | Phase 2 (PM-Specific) | pnpm projects work after cleanup + reinstall |
| Yarn PnP cleanup | Phase 2 (PM-Specific) | Full Yarn Berry cleanup verified |
| Deno cache location | Phase 2 (PM-Specific) | `deno info` location used dynamically |
| Custom cache dirs | Phase 3 (Cache) | `turbo.json`/`nx.json` parsing tests |
| Cross-disk stores | Phase 3 (Cache) | Multi-disk scenario tested |
| Workspace traversal | Phase 5 (Monorepo) | Nested workspace edge cases pass |
| Phantom deps exposure | Phase 4 (DX) | Warning shown when switching PM types |

## Sources

- [pnpm FAQ - Store and hard linking behavior](https://pnpm.io/faq) (HIGH confidence)
- [Bun Blog - Text-based lockfile announcement](https://bun.com/blog/bun-lock-text-lockfile) (HIGH confidence)
- [Turborepo Docs - Caching configuration](https://turborepo.dev/docs/crafting-your-repository/caching) (HIGH confidence)
- [Yarn Docs - Install modes and PnP](https://yarnpkg.com/features/linkers) (HIGH confidence)
- [Deno Docs - Modules and cache](https://docs.deno.com/runtime/fundamentals/modules/) (HIGH confidence)
- [GitHub pnpm issues - Store location problems](https://github.com/pnpm/pnpm/issues/712) (MEDIUM confidence)
- [Lockfile format design article](https://nesbitt.io/2026/01/17/lockfile-format-design-and-tradeoffs.html) (MEDIUM confidence)
- [Cloudflare Community - bun.lock detection issues](https://community.cloudflare.com/t/bun-not-detected-as-tool-when-using-new-bun-lock-instead-of-bun-lockb/779835) (MEDIUM confidence)
- [pnpm symlinked node_modules structure](https://pnpm.io/symlinked-node-modules-structure) (HIGH confidence)
- [Nx migration from Turborepo](https://nx.dev/docs/guides/adopting-nx/from-turborepo) (HIGH confidence)

---
*Pitfalls research for: nuka-code multi-PM cache cleaning tool*
*Researched: 2026-01-31*
