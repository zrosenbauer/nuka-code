# Phase 4: npm/yarn Cache Cleanup - Research

**Researched:** 2026-02-01
**Domain:** Cache cleanup command execution, yarn version detection, child process management
**Confidence:** HIGH

## Summary

This research investigates how to implement npm and yarn cache cleanup using the existing executor infrastructure (Phase 3) and detection module (Phase 2). The phase involves creating Task implementations that execute cache cleanup commands via `child_process.spawn()`, respecting the decisions in CONTEXT.md.

The core challenge is creating a clean bridge between detection results (which identify npm/yarn and yarn version) and the executor framework (which manages parallel/sequential execution with progress display). The cache cleanup commands are well-documented: `npm cache clean --force` for npm, `yarn cache clean` for Yarn Classic, and `yarn cache clean --all` for Yarn Berry.

The existing infrastructure handles most complexity: Phase 2's detection module provides the `agent` field that distinguishes `yarn` (Classic) from `yarn@berry`, and Phase 3's executor provides fail-fast behavior, progress display, and cancellation support. This phase implements Task objects that wrap the shell commands and integrates them into the CLI flow.

**Primary recommendation:** Create a `cache-cleanup` module with Task factory functions that use detection results to generate the appropriate cache cleanup tasks, then wire these into the CLI's nuke command.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| child_process | Node.js built-in | Execute shell commands | Standard Node.js API, supports spawn with shell mode |
| package-manager-detector | 1.6.0+ | Detect PM and version | Already in use (Phase 2); `agent` field distinguishes yarn/yarn@berry |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @clack/prompts | 1.0.0 | Progress display | Already in use; spinner for cache cleanup progress |
| Phase 3 executor | internal | Task execution | Run cache tasks with fail-fast, cancellation support |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| spawn with shell:true | exec() | exec buffers entire output; spawn streams. Spawn is safer for potentially large stderr |
| spawn with shell:true | execa | Would add dependency; native spawn is sufficient for simple commands |
| Detecting yarn version at runtime | Trust detection result | Detection already done; no need to re-detect |

**Installation:**
```bash
# No new dependencies needed - using built-in Node.js APIs and existing packages
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── cache/                    # NEW: Cache cleanup module
│   │   ├── index.ts              # Public exports
│   │   ├── types.ts              # CacheCleanupTask types
│   │   ├── npm.ts                # npm cache cleanup task factory
│   │   ├── yarn.ts               # yarn cache cleanup task factory (Classic + Berry)
│   │   └── tasks.ts              # Main factory that creates tasks from detection
│   ├── executor/                 # Existing (Phase 3)
│   ├── detection/                # Existing (Phase 2)
│   └── ...
├── cli.ts                        # Update: wire cache cleanup into nuke command
```

### Pattern 1: Task Factory from Detection Result

**What:** Factory function that takes detection result and returns appropriate cache cleanup tasks
**When to use:** When the user runs `nuke` and cache cleanup is needed
**Example:**
```typescript
// src/lib/cache/tasks.ts
import type { DetectionResult } from '#/lib/detection';
import type { Task } from '#/lib/executor';
import { createNpmCacheTask } from './npm';
import { createYarnCacheTask } from './yarn';

export function createCacheCleanupTasks(detection: DetectionResult): Task[] {
  const tasks: Task[] = [];

  if (!detection.primary) {
    return tasks;
  }

  const { agent } = detection.primary;

  // npm cache cleanup
  if (agent === 'npm') {
    tasks.push(createNpmCacheTask());
  }

  // yarn cache cleanup (version-aware)
  if (agent === 'yarn') {
    tasks.push(createYarnCacheTask('classic'));
  } else if (agent === 'yarn@berry') {
    tasks.push(createYarnCacheTask('berry'));
  }

  return tasks;
}
```

### Pattern 2: Shell Command Task Implementation

**What:** Task that executes a shell command via child_process.spawn
**When to use:** For cache cleanup commands that must run in user's shell environment
**Example:**
```typescript
// src/lib/cache/npm.ts
import { spawn } from 'node:child_process';
import type { Task, TaskResult, TaskExecuteOptions, TaskDescription } from '#/lib/executor';

export function createNpmCacheTask(): Task {
  return {
    id: 'npm-cache-clean',
    title: 'npm cache',
    parallelSafe: false,  // Sequential per CONTEXT.md

    async execute(options: TaskExecuteOptions): Promise<TaskResult> {
      return runCommand('npm', ['cache', 'clean', '--force'], options);
    },

    describe(): TaskDescription {
      return {
        action: 'Would run',
        target: 'npm cache clean --force',
      };
    },
  };
}

async function runCommand(
  cmd: string,
  args: string[],
  options: TaskExecuteOptions
): Promise<TaskResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      signal: options.signal,
    });

    let stderr = '';

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (err) => {
      if (err.name === 'AbortError') {
        resolve({ success: false, message: 'Cancelled', noop: false });
      } else {
        resolve({
          success: false,
          message: `${cmd} cache clean failed: ${stderr || err.message}`,
          noop: false
        });
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, message: `${cmd} cache cleaned`, noop: false });
      } else {
        resolve({
          success: false,
          message: `${cmd} cache clean failed` + (stderr ? `: ${stderr.trim()}` : ''),
          noop: false
        });
      }
    });
  });
}
```

### Pattern 3: Yarn Version-Aware Task

**What:** Single factory that creates the correct yarn cache task based on version
**When to use:** When detection indicates yarn (either Classic or Berry)
**Example:**
```typescript
// src/lib/cache/yarn.ts
import type { Task } from '#/lib/executor';

export type YarnVersion = 'classic' | 'berry';

export function createYarnCacheTask(version: YarnVersion): Task {
  const command = version === 'berry'
    ? ['cache', 'clean', '--all']
    : ['cache', 'clean'];

  const displayCommand = version === 'berry'
    ? 'yarn cache clean --all'
    : 'yarn cache clean';

  return {
    id: `yarn-${version}-cache-clean`,
    title: 'yarn cache',
    parallelSafe: false,  // Sequential per CONTEXT.md

    async execute(options) {
      return runCommand('yarn', command, options);
    },

    describe() {
      return {
        action: 'Would run',
        target: displayCommand,
      };
    },
  };
}
```

### Pattern 4: CLI Integration

**What:** Wire cache cleanup tasks into the main nuke command
**When to use:** In the nuke command handler
**Example:**
```typescript
// In cli.ts nuke command handler
import { detect } from '#/lib/detection';
import { execute, createSignalHandler } from '#/lib/executor';
import { createCacheCleanupTasks } from '#/lib/cache';

// In handler:
const detection = await detect(cwd);
const cacheTasks = createCacheCleanupTasks(detection);

if (cacheTasks.length === 0) {
  clack.log.warn('No package manager detected for cache cleanup');
  return;
}

const signalHandler = createSignalHandler();
try {
  const summary = await execute(cacheTasks, {
    mode: 'sequential',  // Per CONTEXT.md: cache tasks run sequentially
    concurrency: 1,
    dryRun: argv.dryRun ?? false,
    signal: signalHandler.signal,
  });

  // Handle summary...
} finally {
  signalHandler.cleanup();
}
```

### Anti-Patterns to Avoid

- **Re-detecting yarn version:** Detection already provides `agent` field distinguishing yarn/yarn@berry. Don't shell out to `yarn --version` or check `.yarnrc.yml` again.
- **Using exec() instead of spawn():** exec() buffers entire output which could be large; spawn() streams and supports AbortSignal properly.
- **Making cache tasks parallel-safe:** Per CONTEXT.md, cache cleanup tasks are sequential since they may share resources.
- **Adding confirmation prompts:** Per CONTEXT.md, auto-run without prompts - user already invoked `nuke`.
- **Adding retry logic:** Per CONTEXT.md, fail immediately on first failure, no retries.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Yarn version detection | Check .yarnrc.yml or yarn --version | Phase 2 detection `agent` field | Already done correctly in Phase 2; `yarn` vs `yarn@berry` |
| Task execution with progress | Custom Promise.all with spinner | Phase 3 executor | Handles fail-fast, cancellation, progress display |
| PM detection | Custom lockfile checks | Phase 2 detection module | Handles all edge cases via package-manager-detector |
| Cancellation handling | Custom SIGINT handler | Phase 3 SignalHandler | Already implements second Ctrl+C force exit |

**Key insight:** This phase is primarily integration work. The hard problems (detection, execution, cancellation) are solved by Phases 2 and 3. Focus on clean Task implementations that leverage existing infrastructure.

## Common Pitfalls

### Pitfall 1: Using Wrong Yarn Command for Version

**What goes wrong:** Using `yarn cache clean --all` on Yarn Classic fails or behaves unexpectedly
**Why it happens:** Yarn Classic (v1) doesn't support `--all` flag
**How to avoid:** Always check `agent` field from detection: `yarn` = Classic, `yarn@berry` = Berry
**Warning signs:** "Unknown option: --all" errors

```typescript
// WRONG: Guessing based on file existence
if (fs.existsSync('.yarnrc.yml')) { /* berry */ }

// RIGHT: Use detection result
if (detection.primary?.agent === 'yarn@berry') { /* berry */ }
```

### Pitfall 2: Not Passing AbortSignal to spawn()

**What goes wrong:** Cache cleanup continues after user presses Ctrl+C
**Why it happens:** spawn() needs explicit `signal` option to respect AbortSignal
**How to avoid:** Always pass `signal: options.signal` to spawn options
**Warning signs:** Process continues running after "Cancelled" message

```typescript
// WRONG
spawn(cmd, args, { shell: true });

// RIGHT
spawn(cmd, args, { shell: true, signal: options.signal });
```

### Pitfall 3: Not Handling spawn Error Event

**What goes wrong:** Unhandled error if command doesn't exist or AbortSignal fires
**Why it happens:** spawn emits 'error' event for abort/spawn failures
**How to avoid:** Always listen to both 'error' and 'close' events
**Warning signs:** Unhandled error crashes, AbortError not caught

```typescript
child.on('error', (err) => {
  if (err.name === 'AbortError') {
    resolve({ success: false, message: 'Cancelled', noop: false });
  } else {
    resolve({ success: false, message: err.message, noop: false });
  }
});
```

### Pitfall 4: Forgetting --force for npm cache clean

**What goes wrong:** npm cache clean does nothing without --force
**Why it happens:** npm v5+ requires --force flag for cache clean
**How to avoid:** Always include --force flag
**Warning signs:** No error but cache not cleared

```typescript
// WRONG
spawn('npm', ['cache', 'clean'], { shell: true });

// RIGHT
spawn('npm', ['cache', 'clean', '--force'], { shell: true });
```

### Pitfall 5: Making Cache Tasks Parallel

**What goes wrong:** Unexpected behavior if cache operations conflict
**Why it happens:** CONTEXT.md explicitly states cache tasks should be sequential
**How to avoid:** Set `parallelSafe: false` on all cache cleanup tasks
**Warning signs:** Race conditions, partial cleanup

## Code Examples

Verified patterns from official sources:

### spawn with shell and AbortSignal

```typescript
// Source: https://nodejs.org/api/child_process.html
import { spawn } from 'node:child_process';

function runShellCommand(
  command: string,
  args: string[],
  signal: AbortSignal
): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      signal,
    });

    let stderr = '';
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (err) => {
      // AbortError when signal triggers
      reject(err);
    });

    child.on('close', (code) => {
      resolve({ code, stderr });
    });
  });
}
```

### npm cache clean command

```typescript
// Source: https://docs.npmjs.com/cli/v10/commands/npm-cache
// Command: npm cache clean --force
// The --force flag is REQUIRED since npm v5

const result = await runShellCommand('npm', ['cache', 'clean', '--force'], signal);
// Exit code 0 = success
// Non-zero = failure (check stderr for details)
```

### yarn Classic cache clean command

```typescript
// Source: https://classic.yarnpkg.com/en/docs/cli/cache
// Command: yarn cache clean
// Clears the global yarn cache

const result = await runShellCommand('yarn', ['cache', 'clean'], signal);
```

### yarn Berry cache clean command

```typescript
// Source: https://yarnpkg.com/cli/cache/clean
// Command: yarn cache clean --all
// --all: deletes both global and local cache

const result = await runShellCommand('yarn', ['cache', 'clean', '--all'], signal);
```

### Complete Task Implementation

```typescript
// src/lib/cache/utils.ts
import { spawn } from 'node:child_process';
import type { TaskResult, TaskExecuteOptions } from '#/lib/executor';

export async function runCacheCommand(
  command: string,
  args: string[],
  options: TaskExecuteOptions
): Promise<TaskResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      signal: options.signal,
    });

    let stderr = '';

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (err) => {
      if (err.name === 'AbortError') {
        resolve({ success: false, message: 'Cancelled', noop: false });
      } else {
        // Command not found or spawn error
        const friendlyMessage = `${command} cache clean failed`;
        resolve({
          success: false,
          message: friendlyMessage + (stderr ? `: ${stderr.trim()}` : `: ${err.message}`),
          noop: false
        });
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          message: `${command} cache cleaned`,
          noop: false
        });
      } else {
        resolve({
          success: false,
          message: `${command} cache clean failed` + (stderr ? `: ${stderr.trim()}` : ''),
          noop: false,
        });
      }
    });
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| exec() for shell commands | spawn() with shell:true | 2020+ | Better streaming, AbortSignal support |
| npm cache clean | npm cache clean --force | npm v5 (2017) | --force required |
| yarn cache clean | yarn cache clean --all (Berry) | Yarn v2 (2020) | Version-specific commands |
| Manual yarn version check | package-manager-detector agent field | 2024+ | Automatic yarn/yarn@berry distinction |

**Deprecated/outdated:**
- `npm cache clean` without `--force`: Does nothing since npm v5
- Parsing yarn.lock header for version: Unreliable; use agent field from detection
- execa for simple commands: Native spawn with shell:true is sufficient

## Open Questions

Things that couldn't be fully resolved:

1. **Timeout handling for slow cache operations**
   - What we know: CONTEXT.md lists this as Claude's discretion
   - What's unclear: Whether to add timeout or let user Ctrl+C
   - Recommendation: No timeout initially; user can Ctrl+C if needed. Add timeout in Phase 8 (UX Enhancements) if users report issues.

2. **stdout from cache commands**
   - What we know: CONTEXT.md lists capturing stdout as Claude's discretion
   - What's unclear: Whether npm/yarn cache clean produce useful stdout
   - Recommendation: Capture stderr for error reporting, ignore stdout. Cache commands typically output minimal information.

3. **Exit codes other than 0/non-zero**
   - What we know: spawn provides exit code via 'close' event
   - What's unclear: Whether specific exit codes have meaning
   - Recommendation: Treat 0 as success, any non-zero as failure. Specific exit codes don't matter for user-facing messages.

## Sources

### Primary (HIGH confidence)
- https://nodejs.org/api/child_process.html - Node.js child_process.spawn() documentation
- https://docs.npmjs.com/cli/v10/commands/npm-cache - npm cache clean documentation
- https://yarnpkg.com/cli/cache/clean - Yarn Berry cache clean documentation
- https://classic.yarnpkg.com/en/docs/cli/cache - Yarn Classic cache clean documentation
- Phase 2 RESEARCH.md - package-manager-detector agent field distinction
- Phase 3 RESEARCH.md - Executor infrastructure, Task interface

### Secondary (MEDIUM confidence)
- https://www.warp.dev/terminus/clear-npm-cache - npm cache clean best practices
- https://github.com/yarnpkg/berry/discussions/5591 - Yarn version detection patterns

### Tertiary (LOW confidence)
- None - all critical findings verified with primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing Phase 2/3 infrastructure plus Node.js built-ins
- Architecture: HIGH - Clean integration with existing modules
- Pitfalls: HIGH - Based on official documentation and existing project decisions
- Commands: HIGH - Verified with official npm/yarn documentation

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - stable commands, infrastructure already built)
