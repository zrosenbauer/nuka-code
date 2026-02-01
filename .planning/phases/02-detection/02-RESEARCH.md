# Phase 2: Detection - Research

**Researched:** 2026-01-31
**Domain:** Package manager detection, lockfile parsing, version identification
**Confidence:** HIGH

## Summary

This research investigates how to implement robust package manager detection for nuka-code using the `package-manager-detector` library. The goal is to correctly identify the package manager (npm, yarn, pnpm, bun, deno) and distinguish between versions that require different cache handling (Yarn Classic vs Berry, bun.lockb vs bun.lock).

The `package-manager-detector` library by antfu-collective provides comprehensive detection via multiple strategies: lockfile presence, `packageManager` field in package.json, `devEngines.packageManager` field, and installation metadata. Critically, it distinguishes between `yarn` (Classic/v1) and `yarn@berry` (v2+), and between `pnpm` and `pnpm@6`, which is essential for correct cache cleanup commands.

The current nuka-code implementation has basic lockfile detection but lacks:
1. Version-aware detection (Yarn Classic vs Berry)
2. Bun lockfile format detection (bun.lockb legacy vs bun.lock text)
3. Multiple lockfile handling for migration scenarios
4. Integration with the standard package-manager-detector library

**Primary recommendation:** Install `package-manager-detector` and create a detection module that wraps its API, extending it with multiple-lockfile detection and exposing the results needed for cache cleanup decisions.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| package-manager-detector | latest | Detect PM from lockfiles, packageManager field, metadata | De facto standard by antfu-collective; used by ni, taze, and other ecosystem tools; handles all edge cases |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (built-in fs/path) | - | File system operations | Already using fs/promises for lockfile checks |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| package-manager-detector | detect-package-manager | Less maintained, doesn't distinguish yarn versions |
| package-manager-detector | custom implementation | Would miss edge cases (devEngines, install-metadata); maintenance burden |
| package-manager-detector | which-package-manager | Doesn't provide agent specifiers for version-specific handling |

**Installation:**
```bash
pnpm add package-manager-detector
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── detection/
│   │   ├── index.ts         # Main exports
│   │   ├── detect.ts        # Wrapper around package-manager-detector
│   │   ├── lockfiles.ts     # Multi-lockfile detection logic
│   │   └── types.ts         # Detection result types
│   ├── manifest/            # Existing - may merge or reference
│   │   ├── lockfile.ts      # UPDATE: use detection module instead
```

### Pattern 1: Unified Detection Result

**What:** Wrap package-manager-detector to provide a consistent result type with all information needed for cache cleanup
**When to use:** Any code that needs to know the package manager or its version
**Example:**
```typescript
// Source: https://github.com/antfu-collective/package-manager-detector
import { detect } from 'package-manager-detector/detect';

export interface DetectionResult {
  /** Primary detected package manager */
  primary: {
    name: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'deno';
    agent: 'npm' | 'yarn' | 'yarn@berry' | 'pnpm' | 'pnpm@6' | 'bun' | 'deno';
    version?: string;
  } | null;

  /** All lockfiles found (for migration scenario detection) */
  lockfiles: LockfileInfo[];

  /** Whether multiple lockfiles exist (migration scenario) */
  hasMultipleLockfiles: boolean;
}

export interface LockfileInfo {
  name: string;           // e.g., 'yarn.lock', 'bun.lock'
  path: string;           // Full path to lockfile
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'deno';
}
```

### Pattern 2: Yarn Version Detection

**What:** Use the `agent` field to distinguish Yarn Classic from Berry
**When to use:** Determining correct cache cleanup command for Yarn
**Example:**
```typescript
// Source: package-manager-detector constants.ts
// Agent values: 'yarn' = Classic (v1), 'yarn@berry' = v2+

import { detect } from 'package-manager-detector/detect';

const result = await detect();

if (result?.name === 'yarn') {
  if (result.agent === 'yarn@berry') {
    // Yarn Berry (v2+): yarn cache clean --all
    console.log('Detected Yarn Berry');
  } else {
    // Yarn Classic (v1): yarn cache clean
    console.log('Detected Yarn Classic');
  }
}
```

### Pattern 3: Bun Lockfile Format Detection

**What:** Check for both bun.lock (text, new) and bun.lockb (binary, legacy)
**When to use:** Logging which format was detected, potential future format-specific handling
**Example:**
```typescript
// Source: package-manager-detector constants.ts
// LOCKS includes both: 'bun.lock': 'bun', 'bun.lockb': 'bun'

import fs from 'node:fs/promises';
import path from 'node:path';

export type BunLockfileFormat = 'text' | 'binary';

export async function detectBunLockfileFormat(cwd: string): Promise<BunLockfileFormat | null> {
  // Priority: bun.lock (text) takes precedence over bun.lockb (binary)
  if (await exists(path.join(cwd, 'bun.lock'))) {
    return 'text';
  }
  if (await exists(path.join(cwd, 'bun.lockb'))) {
    return 'binary';
  }
  return null;
}
```

### Pattern 4: Multiple Lockfile Detection

**What:** Scan for all known lockfiles to detect migration scenarios
**When to use:** Warning users about conflicting lockfiles, understanding project state
**Example:**
```typescript
// Source: package-manager-detector constants.ts LOCKS object

const LOCKFILES: Record<string, 'npm' | 'yarn' | 'pnpm' | 'bun' | 'deno'> = {
  'bun.lock': 'bun',
  'bun.lockb': 'bun',
  'deno.lock': 'deno',
  'pnpm-lock.yaml': 'pnpm',
  'yarn.lock': 'yarn',
  'package-lock.json': 'npm',
  'npm-shrinkwrap.json': 'npm',
};

export async function detectAllLockfiles(cwd: string): Promise<LockfileInfo[]> {
  const results: LockfileInfo[] = [];

  for (const [filename, pm] of Object.entries(LOCKFILES)) {
    const filepath = path.join(cwd, filename);
    if (await exists(filepath)) {
      results.push({
        name: filename,
        path: filepath,
        packageManager: pm,
      });
    }
  }

  return results;
}
```

### Anti-Patterns to Avoid

- **Rolling your own lockfile detection:** The existing `isLockfile()` function misses bun.lockb, bun.lock, deno.lock, npm-shrinkwrap.json, pnpm-workspace.yaml. Use package-manager-detector's LOCKS constant.
- **Ignoring install-metadata strategy:** If node_modules exists but lockfile is missing, install-metadata can still detect the PM via `.yarn_integrity`, `.pnpm/`, etc.
- **Treating all Yarn as one version:** Yarn Classic and Berry have completely different cache structures and cleanup commands.
- **Assuming lockfile means PM is installed:** Detection tells you what was used, not what's currently available.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Lockfile-to-PM mapping | Custom filename checks | package-manager-detector LOCKS | Covers edge cases (npm-shrinkwrap, pnpm-workspace.yaml, both bun formats) |
| Yarn version detection | Parse yarn.lock header | package-manager-detector detect() | Uses packageManager field, install-metadata; more reliable than lockfile parsing |
| PM version extraction | Regex on packageManager field | package-manager-detector | Handles edge cases like `^` prefix, malformed versions |
| Directory traversal | Custom upward search | package-manager-detector detect() with cwd option | Handles stopDir, all strategies correctly |

**Key insight:** Package manager detection has many edge cases: the `devEngines.packageManager` field, corepack compatibility, install-metadata like `.pnp.cjs` for Yarn PnP, npm-shrinkwrap.json for legacy npm. The package-manager-detector library handles all of these; custom code would need constant updates.

## Common Pitfalls

### Pitfall 1: Confusing `name` and `agent`

**What goes wrong:** Using `name: 'yarn'` to decide cache cleanup command, which fails for Berry
**Why it happens:** Both Classic and Berry have `name: 'yarn'`; only `agent` distinguishes them
**How to avoid:** Always use `agent` for cache command decisions, `name` for display purposes
**Warning signs:** Yarn Berry projects getting `yarn cache clean` instead of `yarn cache clean --all`

```typescript
// WRONG:
if (result.name === 'yarn') {
  exec('yarn cache clean'); // Fails for Berry
}

// RIGHT:
if (result.agent === 'yarn') {
  exec('yarn cache clean'); // Classic only
} else if (result.agent === 'yarn@berry') {
  exec('yarn cache clean --all'); // Berry
}
```

### Pitfall 2: Missing pnpm@6 Distinction

**What goes wrong:** Using pnpm 6.x commands on pnpm 7+ or vice versa
**Why it happens:** pnpm 7 changed some command behaviors
**How to avoid:** Check for `agent === 'pnpm@6'` vs `agent === 'pnpm'`
**Warning signs:** pnpm commands failing or behaving unexpectedly

### Pitfall 3: Multiple Lockfiles Not Reported

**What goes wrong:** User has both yarn.lock and package-lock.json; tool silently uses one
**Why it happens:** `detect()` returns first match, doesn't report alternatives
**How to avoid:** Implement separate multi-lockfile scan before or after primary detection
**Warning signs:** User confusion about which PM is being used

```typescript
// Detect primary (first match wins based on LOCKS order)
const primary = await detect();

// Also scan for all lockfiles
const allLockfiles = await detectAllLockfiles(cwd);

if (allLockfiles.length > 1) {
  console.warn('Multiple lockfiles detected:', allLockfiles.map(l => l.name));
}
```

### Pitfall 4: Not Handling Detection Failure

**What goes wrong:** `detect()` returns null, code crashes on `.name` access
**Why it happens:** Directory has no lockfile, no package.json, or is outside a project
**How to avoid:** Always check for null result
**Warning signs:** "Cannot read property 'name' of null" errors

```typescript
const result = await detect();
if (!result) {
  throw new Error('No package manager detected. Are you in a JavaScript project?');
}
```

### Pitfall 5: Bun Format Migration Confusion

**What goes wrong:** User has both bun.lock and bun.lockb; unclear which is authoritative
**Why it happens:** Bun v1.2+ creates bun.lock but supports both during migration
**How to avoid:** When both exist, bun.lock takes precedence (per Bun docs)
**Warning signs:** bun.lockb listed as detected format when bun.lock also exists

## Code Examples

Verified patterns from official sources:

### Basic Detection

```typescript
// Source: https://github.com/antfu-collective/package-manager-detector
import { detect } from 'package-manager-detector/detect';

export async function detectPackageManager(cwd?: string) {
  const result = await detect({ cwd });

  if (!result) {
    return null;
  }

  return {
    name: result.name,      // 'npm' | 'yarn' | 'pnpm' | 'bun' | 'deno'
    agent: result.agent,    // 'yarn@berry', 'pnpm@6', etc.
    version: result.version // e.g., '3.2.1' if from packageManager field
  };
}
```

### Detection with All Strategies

```typescript
// Source: https://github.com/antfu-collective/package-manager-detector/blob/main/src/types.ts
import { detect } from 'package-manager-detector/detect';

// Include install-metadata for more reliable detection
const result = await detect({
  cwd: process.cwd(),
  strategies: ['lockfile', 'packageManager-field', 'devEngines-field', 'install-metadata'],
});
```

### Full Detection Module

```typescript
// src/lib/detection/detect.ts
import { detect as pmDetect } from 'package-manager-detector/detect';
import { LOCKS } from 'package-manager-detector/constants';
import fs from 'node:fs/promises';
import path from 'node:path';

export type AgentName = 'npm' | 'yarn' | 'pnpm' | 'bun' | 'deno';
export type Agent = 'npm' | 'yarn' | 'yarn@berry' | 'pnpm' | 'pnpm@6' | 'bun' | 'deno';

export interface LockfileInfo {
  name: string;
  path: string;
  packageManager: AgentName;
}

export interface DetectionResult {
  primary: {
    name: AgentName;
    agent: Agent;
    version?: string;
  } | null;
  lockfiles: LockfileInfo[];
  hasMultipleLockfiles: boolean;
  bunLockfileFormat: 'text' | 'binary' | null;
}

async function exists(filepath: string): Promise<boolean> {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

export async function detectAllLockfiles(cwd: string): Promise<LockfileInfo[]> {
  const results: LockfileInfo[] = [];

  for (const [filename, pm] of Object.entries(LOCKS)) {
    const filepath = path.join(cwd, filename);
    if (await exists(filepath)) {
      results.push({
        name: filename,
        path: filepath,
        packageManager: pm as AgentName,
      });
    }
  }

  return results;
}

export async function detectBunLockfileFormat(cwd: string): Promise<'text' | 'binary' | null> {
  // bun.lock (text) takes precedence over bun.lockb (binary)
  if (await exists(path.join(cwd, 'bun.lock'))) {
    return 'text';
  }
  if (await exists(path.join(cwd, 'bun.lockb'))) {
    return 'binary';
  }
  return null;
}

export async function detect(cwd: string = process.cwd()): Promise<DetectionResult> {
  // Detect primary package manager
  const pmResult = await pmDetect({
    cwd,
    strategies: ['lockfile', 'packageManager-field', 'devEngines-field', 'install-metadata'],
  });

  // Detect all lockfiles for migration scenario awareness
  const lockfiles = await detectAllLockfiles(cwd);

  // Detect bun lockfile format if applicable
  const bunLockfileFormat = pmResult?.name === 'bun'
    ? await detectBunLockfileFormat(cwd)
    : null;

  // Count unique package managers (bun.lock and bun.lockb count as one)
  const uniquePMs = new Set(lockfiles.map(l => l.packageManager));

  return {
    primary: pmResult ? {
      name: pmResult.name,
      agent: pmResult.agent,
      version: pmResult.version,
    } : null,
    lockfiles,
    hasMultipleLockfiles: uniquePMs.size > 1,
    bunLockfileFormat,
  };
}
```

### Usage in CLI

```typescript
// Usage in nuka-code CLI
import { detect } from '#/lib/detection';
import * as clack from '@clack/prompts';

const detection = await detect();

if (!detection.primary) {
  clack.log.error('No package manager detected');
  process.exit(1);
}

clack.log.info(`Detected: ${detection.primary.name} (${detection.primary.agent})`);

if (detection.hasMultipleLockfiles) {
  clack.log.warn('Multiple lockfiles detected:');
  for (const lf of detection.lockfiles) {
    clack.log.warn(`  - ${lf.name} (${lf.packageManager})`);
  }
}

if (detection.bunLockfileFormat) {
  clack.log.info(`Bun lockfile format: ${detection.bunLockfileFormat}`);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Check for single lockfile only | package-manager-detector with multiple strategies | 2024+ | Handles packageManager field, devEngines, install-metadata |
| No yarn version distinction | `yarn` vs `yarn@berry` agent | 2024+ | Correct cache commands per version |
| bun.lockb only | bun.lock (text) priority with bun.lockb fallback | Bun 1.1.39/1.2 (late 2024) | Text lockfile is now default |
| Manual lockfile checks | LOCKS constant from package-manager-detector | ongoing | Single source of truth, stays updated |

**Deprecated/outdated:**
- Custom lockfile detection: package-manager-detector's LOCKS is the definitive list
- bun.lockb as primary: bun.lock (text) is now the default in Bun 1.2+
- Yarn lockfile header parsing for version: unreliable; use packageManager field or install-metadata

## Open Questions

Things that couldn't be fully resolved:

1. **Yarn Berry PnP detection specifics**
   - What we know: `.pnp.cjs` and `.pnp.js` indicate Yarn Berry with PnP enabled
   - What's unclear: Whether we need different cleanup for PnP vs node_modules linker in Berry
   - Recommendation: Treat all Berry the same for now; PnP cleanup is handled by `yarn cache clean --all`

2. **pnpm@6 vs pnpm@7+ cache differences**
   - What we know: package-manager-detector distinguishes `pnpm@6` from `pnpm`
   - What's unclear: Whether cache cleanup commands differ between these versions
   - Recommendation: Both use `pnpm store prune`; no version-specific handling needed yet

3. **deno cleanup command**
   - What we know: Deno has `deno clean` command (mentioned in requirements)
   - What's unclear: Exact behavior and when it was introduced
   - Recommendation: Verify `deno clean` command exists in current Deno version during implementation

## Sources

### Primary (HIGH confidence)
- package-manager-detector source code (constants.ts, detect.ts, types.ts) - GitHub antfu-collective
- Bun lockfile documentation - https://bun.com/docs/pm/lockfile
- Bun blog on text-based lockfile - https://bun.com/blog/bun-lock-text-lockfile
- Yarn Berry cache clean docs - https://yarnpkg.com/cli/cache/clean
- Yarn Classic cache docs - https://classic.yarnpkg.com/lang/en/docs/cli/cache/

### Secondary (MEDIUM confidence)
- Multiple lockfiles handling patterns - GitHub issues and discussions
- Yarn lockfile format differences - https://ayc0.github.io/posts/yarn-lock-how-to-update-it/

### Tertiary (LOW confidence)
- None - all critical findings verified with primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - package-manager-detector is the de facto standard, source code verified
- Architecture: HIGH - Patterns derived from library source code and official docs
- Pitfalls: HIGH - Based on library design and documented behaviors
- Bun format: HIGH - Official Bun documentation confirms text lockfile priority

**Research date:** 2026-01-31
**Valid until:** 2026-03-01 (30 days - stable ecosystem with infrequent lockfile format changes)
