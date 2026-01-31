# Architecture Research

**Domain:** Multi-PM Detection and Cleanup Systems for CLI Tools
**Researched:** 2026-01-31
**Confidence:** MEDIUM-HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLI Entry Layer                              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │   nuke      │  │    init     │  │   config    │                  │
│  │  command    │  │   command   │  │  command    │                  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │
│         │                │                │                          │
├─────────┴────────────────┴────────────────┴──────────────────────────┤
│                        Orchestration Layer                           │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │                    NukeOrchestrator                         │     │
│  │   (coordinates detection → cleanup → reporting flow)        │     │
│  └─────────────────────────────────────────────────────────────┘     │
├─────────────────────────────────────────────────────────────────────┤
│                         Detection Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ PMDetector   │  │ WSDetector   │  │ ToolDetector │               │
│  │ (pkg mgrs)   │  │ (workspaces) │  │ (turbo/nx)   │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                 │                        │
│         └─────────────────┴─────────────────┘                        │
│                           │                                          │
│               ┌───────────▼───────────┐                              │
│               │  ProjectContext       │                              │
│               │  (unified detection   │                              │
│               │   result)             │                              │
│               └───────────────────────┘                              │
├─────────────────────────────────────────────────────────────────────┤
│                         Cleanup Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ NodeModules  │  │    Cache     │  │    Build     │               │
│  │   Cleaner    │  │   Cleaner    │  │   Cleaner    │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
├─────────────────────────────────────────────────────────────────────┤
│                        Filesystem Layer                              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                      GlobResolver                            │    │
│  │   (workspace-aware glob expansion with ignore support)       │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **CLI Entry** | Parse commands, validate args, invoke orchestrator | Commander.js/CAC/Citty |
| **NukeOrchestrator** | Coordinate detection → cleanup flow, aggregate results | Class coordinating all subsystems |
| **PMDetector** | Detect package manager (npm/yarn/pnpm/bun/deno) | Lockfile + packageManager field parsing |
| **WSDetector** | Detect workspace packages via globs | package.json workspaces / pnpm-workspace.yaml |
| **ToolDetector** | Detect monorepo tools (Turborepo/Nx) | Config file presence + parsing |
| **ProjectContext** | Unified detection result object | Data class/interface |
| **NodeModulesCleaner** | Remove node_modules based on PM type | rimraf with PM-specific paths |
| **CacheCleaner** | Remove cache dirs (.turbo, .nx/cache, etc.) | rimraf with tool-specific globs |
| **BuildCleaner** | Remove build artifacts (dist, .next, etc.) | rimraf with framework globs |
| **GlobResolver** | Expand workspace globs, apply ignores | fast-glob/tinyglobby with ignore integration |

## Recommended Project Structure

```
src/
├── cli.ts                    # CLI entry point
├── index.ts                  # Public API exports
├── nuke.ts                   # Orchestrator (coordinate detection→cleanup)
├── lib/
│   ├── detection/            # Detection subsystem
│   │   ├── index.ts          # Re-exports
│   │   ├── types.ts          # Detection result types
│   │   ├── pm-detector.ts    # Package manager detection
│   │   ├── workspace-detector.ts  # Workspace detection
│   │   ├── tool-detector.ts  # Monorepo tool detection
│   │   └── project-context.ts # Unified context builder
│   ├── cleanup/              # Cleanup subsystem
│   │   ├── index.ts          # Re-exports
│   │   ├── types.ts          # Cleanup result types
│   │   ├── node-modules.ts   # node_modules cleanup
│   │   ├── cache.ts          # Cache cleanup
│   │   └── builds.ts         # Build artifact cleanup
│   ├── manifest/             # Manifest parsing (existing)
│   │   ├── index.ts
│   │   ├── lockfile.ts       # Extend for bun.lock, deno.lock
│   │   ├── package-json.ts   # packageManager field parsing
│   │   ├── pnpm.ts           # pnpm-workspace.yaml
│   │   ├── turbo.ts          # NEW: turbo.json parsing
│   │   ├── nx.ts             # NEW: nx.json/project.json parsing
│   │   ├── deno.ts           # NEW: deno.json parsing
│   │   └── types.ts
│   ├── fs/                   # Filesystem utilities
│   │   ├── index.ts
│   │   ├── glob.ts           # Workspace-aware glob expansion
│   │   └── ignore.ts         # .nukeignore handling
│   └── project.ts            # Project initialization (existing)
```

### Structure Rationale

- **detection/:** Isolated detection logic makes adding new PMs/tools straightforward. Each detector is independent.
- **cleanup/:** Separation allows different cleanup strategies per artifact type (PM-aware node_modules, tool-aware caches).
- **manifest/:** Parser modules for each config file type. Pure functions, easily testable.
- **fs/:** Filesystem abstractions that can be mocked for testing.

## Architectural Patterns

### Pattern 1: Strategy Pattern for Package Manager Detection

**What:** Each package manager has a detector strategy implementing a common interface.
**When to use:** When detection logic differs significantly between PMs (e.g., yarn PnP vs pnpm symlinks).
**Trade-offs:** More files but clearer boundaries; easier to add new PMs.

**Example:**
```typescript
interface PMDetector {
  name: PackageManager;
  detect(dir: string): Promise<PMDetectionResult | null>;
  priority: number; // Higher = check first
}

const detectors: PMDetector[] = [
  bunDetector,    // priority: 100 - check new bun.lock first
  pnpmDetector,   // priority: 90
  yarnDetector,   // priority: 80
  npmDetector,    // priority: 70  - fallback
  denoDetector,   // priority: 60
];

async function detectPackageManager(dir: string): Promise<PMDetectionResult> {
  for (const detector of detectors.sort((a, b) => b.priority - a.priority)) {
    const result = await detector.detect(dir);
    if (result) return result;
  }
  return { manager: 'unknown', confidence: 'low' };
}
```

### Pattern 2: Composite Detection Result

**What:** Detection produces a unified ProjectContext containing all detected information.
**When to use:** When multiple subsystems need detection results (cleanup, reporting, config generation).
**Trade-offs:** Single object to pass around; may grow large but easy to extend.

**Example:**
```typescript
interface ProjectContext {
  rootDir: string;
  packageManager: PackageManagerInfo;
  workspaces: WorkspaceInfo[];
  monorepoTool: MonorepoToolInfo | null;
  features: {
    hasTurborepo: boolean;
    hasNx: boolean;
    hasYarnPnP: boolean;
    hasPnpmWorkspaces: boolean;
  };
}

// Built once, used everywhere
const context = await buildProjectContext(process.cwd());
await nukeNodeModules(context);
await nukeCache(context);
```

### Pattern 3: Glob Registry for Cleanup Targets

**What:** Centralized registry of glob patterns per artifact type, extensible per PM/tool.
**When to use:** When cleanup targets vary by detected tools and need to be composable.
**Trade-offs:** Single source of truth for patterns; easy to audit and extend.

**Example:**
```typescript
const cacheGlobs = {
  // Base patterns always included
  base: ['.cache'],

  // Tool-specific patterns
  turborepo: ['.turbo', '**/turbo-cache'],
  nx: ['.nx/cache', 'node_modules/.cache/nx'],

  // PM-specific patterns
  yarn: ['.yarn/cache', '.pnp.cjs', '.pnp.loader.mjs'],
  pnpm: ['.pnpm-store'], // Usually global, but check local
};

function getCacheGlobs(context: ProjectContext): string[] {
  const globs = [...cacheGlobs.base];
  if (context.features.hasTurborepo) globs.push(...cacheGlobs.turborepo);
  if (context.features.hasNx) globs.push(...cacheGlobs.nx);
  if (context.packageManager.name === 'yarn') globs.push(...cacheGlobs.yarn);
  return globs;
}
```

## Data Flow

### Detection Flow

```
Directory Path
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Detection Pipeline                            │
│                                                                  │
│  1. Scan for lockfiles (bun.lock, pnpm-lock.yaml, yarn.lock,    │
│     package-lock.json, deno.lock)                               │
│                     │                                            │
│                     ▼                                            │
│  2. Check packageManager field in package.json                  │
│                     │                                            │
│                     ▼                                            │
│  3. Determine PM with priority resolution                       │
│     (lockfile > packageManager field > fallback)                │
│                     │                                            │
│                     ▼                                            │
│  4. Detect workspaces:                                          │
│     - package.json workspaces (npm/yarn/bun)                    │
│     - pnpm-workspace.yaml (pnpm)                                │
│     - deno.json workspace (deno)                                │
│                     │                                            │
│                     ▼                                            │
│  5. Detect monorepo tools:                                      │
│     - turbo.json → Turborepo                                    │
│     - nx.json → Nx                                              │
│     - lerna.json → Lerna (deprecated but common)                │
│                     │                                            │
│                     ▼                                            │
│  6. Build ProjectContext                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
ProjectContext {
  packageManager: { name: 'pnpm', version: '10.x', lockfile: 'pnpm-lock.yaml' },
  workspaces: [{ name: 'app', path: 'apps/web' }, ...],
  monorepoTool: { name: 'turborepo', configPath: 'turbo.json' },
  features: { hasTurborepo: true, hasPnpmWorkspaces: true, ... }
}
```

### Cleanup Flow

```
ProjectContext
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cleanup Pipeline                              │
│                                                                  │
│  1. Read .nukeignore patterns                                   │
│                     │                                            │
│                     ▼                                            │
│  2. Build glob patterns based on ProjectContext                 │
│     - node_modules globs (PM-aware)                             │
│     - cache globs (tool-aware)                                  │
│     - build globs (framework-aware)                             │
│                     │                                            │
│                     ▼                                            │
│  3. Expand globs across workspace packages                      │
│                     │                                            │
│                     ▼                                            │
│  4. Filter by ignore patterns                                   │
│                     │                                            │
│                     ▼                                            │
│  5. Execute deletion (rimraf)                                   │
│                     │                                            │
│                     ▼                                            │
│  6. Aggregate results                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
CleanupResult {
  deleted: ['node_modules', 'apps/web/node_modules', '.turbo', ...],
  skipped: ['packages/config/node_modules'], // ignored
  errors: []
}
```

### Key Data Flows

1. **Detection → Context:** Detection components produce independent results; ProjectContext builder merges them into unified object.
2. **Context → Globs:** Cleanup layer reads context to determine which glob patterns to use.
3. **Globs → Files:** GlobResolver expands patterns, respects workspaces, applies ignores.
4. **Files → Deletion:** Cleaner receives filtered file list, executes rimraf, reports results.

## Component Integration Details

### Turborepo Integration

**Config Files:**
- `turbo.json` (root) - main configuration
- `turbo.jsonc` (root) - with comments
- `turbo.json` in packages - extends root with `"extends": ["//"]`

**Detection Logic:**
```typescript
interface TurboConfig {
  $schema?: string;
  extends?: string[];
  tasks?: Record<string, TurboTask>;
  globalDependencies?: string[];
  globalEnv?: string[];
  ui?: 'tui' | 'stream';
}

async function detectTurborepo(dir: string): Promise<TurboInfo | null> {
  const configPath = await findUp(['turbo.json', 'turbo.jsonc'], { cwd: dir });
  if (!configPath) return null;

  const config = await parseJsonc<TurboConfig>(configPath);
  return {
    name: 'turborepo',
    configPath,
    cacheDir: '.turbo',           // Local cache in each package
    globalCacheDir: 'node_modules/.cache/turbo',  // Shared cache
  };
}
```

**Cache Directories to Clean:**
- `.turbo/` (in root and each workspace package)
- `node_modules/.cache/turbo/`

### Nx Integration

**Config Files:**
- `nx.json` (root) - workspace configuration
- `project.json` (in each project) - project-specific config
- `workspace.json` (deprecated, but still supported)

**Detection Logic:**
```typescript
interface NxConfig {
  $schema?: string;
  targetDefaults?: Record<string, object>;
  namedInputs?: Record<string, string[]>;
  workspaceLayout?: { appsDir?: string; libsDir?: string };
  defaultProject?: string;
}

async function detectNx(dir: string): Promise<NxInfo | null> {
  const configPath = await findUp('nx.json', { cwd: dir });
  if (!configPath) return null;

  const config = await parseJson<NxConfig>(configPath);
  return {
    name: 'nx',
    configPath,
    cacheDir: '.nx/cache',
    legacyCacheDir: 'node_modules/.cache/nx',
  };
}
```

**Cache Directories to Clean:**
- `.nx/cache/`
- `node_modules/.cache/nx/`

### Package Manager Lockfile Matrix

| Package Manager | Lockfile(s) | Workspace Config |
|-----------------|-------------|------------------|
| npm | `package-lock.json` | `package.json` workspaces |
| Yarn Classic | `yarn.lock` | `package.json` workspaces |
| Yarn Berry | `yarn.lock` + `.yarnrc.yml` | `package.json` workspaces |
| pnpm | `pnpm-lock.yaml` | `pnpm-workspace.yaml` |
| Bun | `bun.lockb` (binary) or `bun.lock` (text, v1.2+) | `package.json` workspaces |
| Deno | `deno.lock` | `deno.json` workspace |

### Detection Priority Algorithm

```typescript
// Priority order for lockfile detection (higher = checked first)
const LOCKFILE_PRIORITY: Record<string, number> = {
  'bun.lock': 100,      // New text format, preferred
  'bun.lockb': 95,      // Legacy binary format
  'pnpm-lock.yaml': 90,
  'yarn.lock': 80,
  'package-lock.json': 70,
  'deno.lock': 60,
};

// Secondary detection via packageManager field
function parsePackageManagerField(value: string): PMInfo | null {
  // Format: "npm@10.8.1" or "pnpm@9.1.4+sha256.abc123"
  const match = value.match(/^(npm|yarn|pnpm|bun)@(\d+\.\d+\.\d+)/);
  if (!match) return null;
  return { name: match[1], version: match[2] };
}

// Full detection strategy (matches package-manager-detector approach)
async function detectPM(dir: string): Promise<PMInfo> {
  // 1. Check lockfiles (highest priority)
  const lockfile = await findLockfile(dir);
  if (lockfile) return lockfileTopm(lockfile);

  // 2. Check packageManager field
  const pkg = await readPackageJson(dir);
  if (pkg?.packageManager) {
    const pm = parsePackageManagerField(pkg.packageManager);
    if (pm) return pm;
  }

  // 3. Check devEngines.packageManager (newer standard)
  if (pkg?.devEngines?.packageManager) {
    const pm = parsePackageManagerField(pkg.devEngines.packageManager);
    if (pm) return pm;
  }

  // 4. Crawl upward to parent directory
  const parent = path.dirname(dir);
  if (parent !== dir) return detectPM(parent);

  // 5. Default fallback
  return { name: 'npm', version: 'unknown', confidence: 'low' };
}
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single package | Simple detection, direct cleanup. Current architecture sufficient. |
| Small monorepo (5-20 packages) | Workspace detection important. Parallel cleanup beneficial. |
| Large monorepo (50+ packages) | Workspace caching critical. Consider streaming glob results. |

### Scaling Priorities

1. **First bottleneck:** Glob expansion in large monorepos with many packages. Solution: Stream results, use fast-glob with `onlyDirectories` for initial pass.
2. **Second bottleneck:** File deletion when thousands of node_modules exist. Solution: Parallel rimraf calls with concurrency limit.

## Anti-Patterns

### Anti-Pattern 1: Hardcoded PM Assumptions

**What people do:** Assume npm is default, or hardcode PM-specific logic throughout codebase.
**Why it's wrong:** Breaks for pnpm strict mode, Yarn PnP, or Bun workspaces.
**Do this instead:** Always detect first, pass context to all cleanup functions.

### Anti-Pattern 2: Global Lockfile Ignorance

**What people do:** Only look for lockfile in current directory.
**Why it's wrong:** Running in a workspace package won't find root lockfile.
**Do this instead:** Crawl upward using find-up pattern until lockfile found.

### Anti-Pattern 3: Missing bun.lock Support

**What people do:** Only check for `bun.lockb` (binary format).
**Why it's wrong:** Bun 1.2+ defaults to text-based `bun.lock`. Many tools (Cloudflare, Netlify) have faced this issue.
**Do this instead:** Check for both `bun.lock` (preferred) and `bun.lockb` (legacy).

### Anti-Pattern 4: Nested Package Deletion

**What people do:** Delete node_modules in nested packages without respecting workspace structure.
**Why it's wrong:** May break symlinked workspace dependencies.
**Do this instead:** Detect workspace structure, delete root node_modules first, then workspace packages.

### Anti-Pattern 5: Ignoring PnP Mode

**What people do:** Assume node_modules always exists.
**Why it's wrong:** Yarn Berry with PnP has no node_modules; instead has `.pnp.cjs` and `.yarn/cache`.
**Do this instead:** Check for PnP indicators (`.pnp.cjs`, `.yarnrc.yml` with `nodeLinker: pnp`).

## Build Order Implications

Based on component dependencies, recommended build order for implementation:

### Phase 1: Foundation (No Dependencies)
1. **types.ts** - Detection and cleanup type definitions
2. **manifest/types.ts** - Config file type definitions

### Phase 2: Parsers (Depends on Types)
3. **manifest/lockfile.ts** - Extend with bun.lock, deno.lock
4. **manifest/turbo.ts** - NEW: turbo.json/turbo.jsonc parser
5. **manifest/nx.ts** - NEW: nx.json parser
6. **manifest/deno.ts** - NEW: deno.json parser

### Phase 3: Detection (Depends on Parsers)
7. **detection/pm-detector.ts** - Package manager detection
8. **detection/workspace-detector.ts** - Workspace detection
9. **detection/tool-detector.ts** - Turborepo/Nx detection
10. **detection/project-context.ts** - Unified context builder

### Phase 4: Cleanup (Depends on Detection)
11. **cleanup/node-modules.ts** - PM-aware node_modules cleanup
12. **cleanup/cache.ts** - Tool-aware cache cleanup
13. **cleanup/builds.ts** - Framework-aware build cleanup

### Phase 5: Integration (Depends on All)
14. **nuke.ts** - Orchestrator update
15. **cli.ts** - CLI command updates

### Dependency Graph

```
types.ts ─────────────────────────────────────────────┐
    │                                                 │
    ▼                                                 │
manifest/lockfile.ts ────┐                            │
manifest/turbo.ts ───────┼────► detection/pm-detector.ts
manifest/nx.ts ──────────┤            │
manifest/deno.ts ────────┘            │
                                      ▼
                         detection/workspace-detector.ts
                                      │
                                      ▼
                         detection/tool-detector.ts
                                      │
                                      ▼
                         detection/project-context.ts
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
          cleanup/node-modules  cleanup/cache  cleanup/builds
                    │                 │                 │
                    └─────────────────┼─────────────────┘
                                      │
                                      ▼
                                  nuke.ts
                                      │
                                      ▼
                                   cli.ts
```

## Sources

- [Turborepo Configuration Reference](https://turborepo.dev/docs/reference/configuration)
- [Turborepo Caching Documentation](https://turborepo.dev/docs/crafting-your-repository/caching)
- [Turborepo Package Configurations](https://turborepo.dev/docs/reference/package-configurations)
- [Nx Project Configuration](https://nx.dev/docs/reference/project-configuration)
- [Nx nx.json Reference](https://nx.dev/docs/reference/nx-json)
- [Nx Reset Command](https://nx.dev/nx-api/nx/documents/reset)
- [Bun Lockfile Documentation](https://bun.com/docs/pm/lockfile)
- [Bun Text-Based Lockfile Announcement](https://bun.com/blog/bun-lock-text-lockfile)
- [Deno Configuration Documentation](https://docs.deno.com/runtime/fundamentals/configuration/)
- [Deno Workspaces and Monorepos](https://docs.deno.com/runtime/fundamentals/workspaces/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Yarn Workspaces](https://yarnpkg.com/features/workspaces)
- [Corepack Repository](https://github.com/nodejs/corepack)
- [package-manager-detector npm](https://www.npmjs.com/package/package-manager-detector)
- [Rails PR for bun.lock detection](https://github.com/rails/rails/pull/56655)
- [Cloudflare Bun Detection Issue](https://community.cloudflare.com/t/bun-not-detected-as-tool-when-using-new-bun-lock-instead-of-bun-lockb/779835)

---
*Architecture research for: Multi-PM Detection and Cleanup CLI*
*Researched: 2026-01-31*
