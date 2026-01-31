# Stack Research: Multi-Package-Manager Detection

**Domain:** JavaScript/TypeScript package manager detection and cleanup tools
**Researched:** 2026-01-31
**Confidence:** HIGH (verified with official npm registry and GitHub sources)

## Executive Summary

The 2025 standard approach for JS package manager detection centers on the **`package-manager-detector`** library (v1.6.0) by Anthony Fu. This library powers `@antfu/ni` and provides battle-tested detection strategies. For unified package manager operations, **`nypm`** (v0.6.4) from the UnJS ecosystem offers a higher-level API. Both are actively maintained with releases in late 2025/early 2026.

**Key insight:** Detection should follow a priority order: lockfiles first (most reliable), then `packageManager` field in package.json (explicit intent), then `devEngines.packageManager` field, then install metadata. This order maximizes accuracy across real-world projects.

---

## Recommended Stack

### Core Detection Library

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| `package-manager-detector` | ^1.6.0 | PM detection from lockfiles, package.json fields | **THE** standard. Powers ni, used by SvelteKit, maintained by antfu-collective. Supports npm, yarn, pnpm, bun, deno. | HIGH |

**Why this over alternatives:**
- Extracted from `@antfu/ni`, the most popular PM abstraction tool
- Configurable detection strategies (lockfile, packageManager field, devEngines, install-metadata)
- Returns both the PM name and agent info (for commands)
- Actively maintained (v1.6.0 released Nov 2025)
- Zero runtime dependencies

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| `nypm` | ^0.6.4 | Unified PM operations API | If you need to run PM commands (install, add, remove) | MEDIUM |
| `yaml` | ^2.8.x | Parse pnpm-workspace.yaml, yarn.lock (Berry) | Already in project; reuse for workspace detection | HIGH |
| `type-fest` | ^4.x | TypeScript utilities | Already in project; use for type definitions | HIGH |

**Do NOT add:**
- `detect-package-manager` (by EGOIST) - Older, less comprehensive than `package-manager-detector`
- `@skarab/detect-package-manager` - Lower adoption, less maintained
- `corepack` (as a library) - Different purpose; it's a Node.js shim, not a detection library

---

## Detection Strategies

### Lockfile Detection (Primary)

| Package Manager | Lockfile(s) | Notes |
|-----------------|-------------|-------|
| npm | `package-lock.json` | Also check for `npm-shrinkwrap.json` (legacy) |
| pnpm | `pnpm-lock.yaml` | Binary not used; always YAML |
| Yarn Classic (v1) | `yarn.lock` | NOT standard YAML; custom format |
| Yarn Berry (v2+) | `yarn.lock` | Standard YAML with `__metadata` key |
| Bun (legacy) | `bun.lockb` | Binary format, deprecated as default in v1.2 |
| Bun (v1.2+) | `bun.lock` | Text-based JSONC format, now default |
| Deno | `deno.lock` | JSON format; also check `deno.json`/`deno.jsonc` |

**Yarn Version Detection:**
- Yarn Berry lockfiles contain a `__metadata` section with version info
- Yarn Classic lockfiles lack this; they use a custom non-YAML format
- Also check for `.yarnrc.yml` (Berry) vs `.yarnrc` (Classic)

### packageManager Field Detection (Secondary)

The `packageManager` field in `package.json` is the Corepack standard:

```json
{
  "packageManager": "pnpm@9.15.0"
}
```

Format: `<name>@<version>[+sha224.<hash>]`

Supported values: `npm@x.y.z`, `yarn@x.y.z`, `pnpm@x.y.z`, `bun@x.y.z`

**Note:** Deno projects typically use `deno.json` instead of `package.json` for configuration.

### devEngines.packageManager Field (Tertiary)

Node.js projects may specify in `package.json`:

```json
{
  "devEngines": {
    "packageManager": {
      "name": "pnpm",
      "version": ">=9.0.0"
    }
  }
}
```

This is newer and less common but supported by `package-manager-detector`.

---

## Cache Locations Per Package Manager

### npm

| Platform | Location | Notes |
|----------|----------|-------|
| macOS/Linux | `~/.npm` or `~/.npm/_cacache` | Content-addressable cache |
| Windows | `%AppData%\npm-cache` or `%LocalAppData%\npm-cache` | |

**Commands:** `npm cache clean --force`, `npm config get cache`

### pnpm

| Platform | Location | Notes |
|----------|----------|-------|
| All | `~/.pnpm-store` (default) | Content-addressable store |
| macOS | `~/Library/pnpm/store` | Alternative location |
| Windows | `%LocalAppData%\pnpm-cache` | Metadata cache |

**Project-local:** `node_modules/.pnpm`

**Commands:** `pnpm store path`, `pnpm store prune`

### Yarn Classic (v1)

| Platform | Location | Notes |
|----------|----------|-------|
| All | `~/.cache/yarn` or `/usr/local/share/.cache/yarn` | Global cache |

**Commands:** `yarn cache dir`, `yarn cache clean`

### Yarn Berry (v2+)

| Location Type | Path | Notes |
|--------------|------|-------|
| Project-local (default) | `.yarn/cache` | Committed to git with Zero-Installs |
| Global (when `enableGlobalCache: true`) | `~/.yarn/berry/cache` | macOS |
| Windows | `%LocalAppData%\Yarn\Berry\cache` | |

**Commands:** `yarn config get cacheFolder`, `yarn cache clean`

### Bun

| Platform | Location | Notes |
|----------|----------|-------|
| All | `~/.bun/install/cache` | Global cache |

**Config:** Set `BUN_INSTALL_CACHE_DIR` env var or `[install.cache].dir` in `bunfig.toml`

**Commands:** `bun pm cache`, `bun pm cache rm`

### Deno

| Platform | Location | Notes |
|----------|----------|-------|
| macOS | `~/Library/Caches/deno` | |
| Linux | `~/.cache/deno` | XDG compliant |
| Windows | `%LocalAppData%\deno` | |

**Subdirectories:** `deps/` (remote modules), `gen/` (compiled TypeScript), `npm/` (npm packages)

**Config:** Set `DENO_DIR` env var

**Commands:** `deno info` (shows paths)

---

## Monorepo Tool Detection

### Turborepo

| Detection Method | Files/Patterns |
|------------------|----------------|
| Config file | `turbo.json` |
| Cache directory | `.turbo/cache` (current), `node_modules/.cache/turbo` (legacy) |
| Remote cache | Vercel Remote Cache enabled via config |

**Cache cleaning:** Delete `.turbo/cache` or use `--cache-dir` flag

### Nx

| Detection Method | Files/Patterns |
|------------------|----------------|
| Config file | `nx.json` |
| Cache directory | `.nx/cache` (v17+), `node_modules/.cache/nx` (legacy) |

**Cache cleaning:** `nx reset`, or delete `.nx/cache`

### Workspaces Detection

| Tool | Config Location |
|------|-----------------|
| pnpm | `pnpm-workspace.yaml` with `packages:` array |
| Yarn | `package.json` with `workspaces:` array |
| npm | `package.json` with `workspaces:` array |
| Bun | `package.json` with `workspaces:` array |
| Deno | `deno.json` with `workspace:` array |

---

## Build Tool Caches

| Tool | Cache Location | Notes |
|------|----------------|-------|
| Vite | `node_modules/.vite` | Pre-bundled deps |
| Next.js | `.next/cache` | Build cache, ISR cache, image cache |
| Webpack | `node_modules/.cache` | When using cache: filesystem |
| TypeScript | `*.tsbuildinfo`, `.tscache/` | Incremental compilation |
| ESBuild | `node_modules/.esbuild` | Sometimes used |
| SWC | `.swc/` | SWC compiler cache |
| Babel | `node_modules/.cache/babel-loader` | When using babel-loader |

---

## API Usage: package-manager-detector

### Basic Detection

```typescript
import { detect } from 'package-manager-detector/detect'

const result = await detect()
// Returns: { name: 'pnpm', agent: 'pnpm@9', version: '9.15.0' } | undefined

if (result) {
  console.log(`Detected: ${result.name}`)
}
```

### Custom Strategy Order

```typescript
import { detect } from 'package-manager-detector/detect'

// Prioritize lockfiles over packageManager field
const pm = await detect({
  cwd: '/path/to/project',
  strategies: ['lockfile', 'packageManager-field', 'devEngines-field', 'install-metadata']
})
```

### Getting Commands

```typescript
import { resolveCommand } from 'package-manager-detector/commands'
import { detect } from 'package-manager-detector/detect'

const pm = await detect()
if (pm) {
  const { command, args } = resolveCommand(pm.agent, 'install', [])
  // For pnpm: { command: 'pnpm', args: ['install'] }
  // For npm: { command: 'npm', args: ['install'] }
}
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `package-manager-detector` | `detect-package-manager` (EGOIST) | Older API, less comprehensive, no deno support |
| `package-manager-detector` | `@skarab/detect-package-manager` | Lower npm downloads, less ecosystem adoption |
| `package-manager-detector` | Custom implementation | Maintenance burden; lockfile formats change |
| `nypm` | Direct PM CLI calls | `nypm` handles command differences across PMs |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Rolling custom lockfile detection | Lockfile formats change (Bun switched to text, Yarn has v1/v2 differences) | `package-manager-detector` |
| `which` for PM detection | Only tells if PM is installed, not which project uses | Lockfile-based detection |
| Corepack as detection library | Corepack is a runtime shim, not a library; has been removed from Node 25 | `package-manager-detector` |
| Parsing lockfiles for dependency info | Complex, version-specific | Only detect PM type, not contents |

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `package-manager-detector@^1.6.0` | Node 18+ | ESM-only |
| `nypm@^0.6.4` | Node 18+ | ESM-only |
| Both | TypeScript 5.x | Full type definitions included |

---

## Installation

```bash
# Core detection (required)
pnpm add package-manager-detector

# If you need to run PM commands (optional)
pnpm add nypm
```

---

## Implementation Recommendations

### For nuka-code

1. **Add `package-manager-detector`** - Use for all PM detection logic
2. **Keep existing lockfile checks** but migrate to use `package-manager-detector` constants
3. **Add Bun detection** - Check both `bun.lock` (new) and `bun.lockb` (legacy)
4. **Add Deno detection** - Check `deno.lock` and `deno.json`/`deno.jsonc`
5. **Add monorepo detection** - Check for `turbo.json` and `nx.json`
6. **Build cache location map** - Hardcode paths per PM with platform detection

### Detection Priority (for nuka-code)

```
1. Lockfile (most reliable indicator of what was used)
2. packageManager field in package.json (explicit intent)
3. Monorepo tool config (turbo.json, nx.json)
4. Workspace config (pnpm-workspace.yaml, workspaces in package.json)
```

### Cleanup Order

```
1. node_modules/ (always safe)
2. PM-specific caches (based on detected PM)
3. Build tool caches (.next, .turbo, .nx, node_modules/.vite)
4. Lockfiles (only if --reset flag, dangerous)
```

---

## Sources

- [package-manager-detector npm](https://www.npmjs.com/package/package-manager-detector) - npm registry, verified v1.6.0 current
- [package-manager-detector GitHub](https://github.com/antfu-collective/package-manager-detector) - README fetched via gh API
- [nypm GitHub](https://github.com/unjs/nypm) - README fetched via gh API, v0.6.4 verified
- [Bun lockfile documentation](https://bun.com/docs/pm/lockfile) - Official docs on bun.lock vs bun.lockb
- [Bun text lockfile blog](https://bun.com/blog/bun-lock-text-lockfile) - Official announcement of bun.lock
- [pnpm settings](https://pnpm.io/settings) - Official cache/store configuration
- [npm cache docs](https://docs.npmjs.com/cli/v8/commands/npm-cache/) - Official npm cache documentation
- [Yarn Berry caching](https://yarnpkg.com/features/caching) - Official Yarn cache strategies
- [Deno modules documentation](https://docs.deno.com/runtime/fundamentals/modules/) - Official module caching
- [Turborepo caching](https://turborepo.dev/docs/crafting-your-repository/caching) - Official cache docs
- [Nx cache location](https://nx.dev/recipes/running-tasks/change-cache-location) - Official Nx docs
- [Corepack documentation](https://github.com/nodejs/corepack) - Official Node.js corepack repo
- npm registry queries via `npm view` command (live data)

---

*Stack research for: nuka-code multi-package-manager support*
*Researched: 2026-01-31*
