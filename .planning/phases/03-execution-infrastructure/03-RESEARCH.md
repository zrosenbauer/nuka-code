# Phase 3: Execution Infrastructure - Research

**Researched:** 2026-02-01
**Domain:** Task execution, concurrency control, progress display, signal handling
**Confidence:** HIGH

## Summary

This research investigates how to build a task execution framework for cleanup operations with configurable parallelism, progress display, error handling, and cancellation support. The framework will serve as infrastructure for Phases 4-6, which implement actual cleanup logic.

The core challenge is coordinating multiple asynchronous cleanup operations (file deletions, CLI commands) while providing user feedback and respecting fail-fast semantics. Node.js provides excellent primitives for this: `p-limit` for concurrency control, `AbortController` for cancellation, and rimraf already supports abort signals. The existing `@clack/prompts` library provides the `tasks()` function for sequential execution with spinner feedback, but parallel operations require a custom approach using the single `spinner()` with aggregate status updates.

The recommended architecture uses a Task abstraction where each task can run in either "execute" or "dry-run" mode. Tasks are categorized as parallel-safe (file operations) or sequential-only (CLI commands). The executor respects these categories when running in "auto" mode, applies concurrency limits to parallel tasks, and coordinates progress display through a unified spinner showing aggregate status.

**Primary recommendation:** Build a lightweight task executor using `p-limit` (v7.2.0) for concurrency control, `AbortController` for immediate cancellation, and a single `@clack/prompts` spinner for aggregate progress display.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| p-limit | 7.2.0 | Concurrency control for parallel operations | De facto standard; 15M weekly downloads; minimal, well-tested |
| @clack/prompts | 1.0.0 | Progress display (spinner, logging) | Already in use; provides tasks() for sequential, spinner for parallel feedback |
| rimraf | 6.0.1 | File deletion with abort support | Already in use; supports AbortSignal for cancellation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| AbortController | Node.js built-in | Cancellation signaling | For immediate Ctrl+C stop; pass to rimraf |
| process signals | Node.js built-in | SIGINT handling | For Ctrl+C detection |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| p-limit | p-queue | p-queue is full queue with ordering; p-limit is simpler, sufficient for our needs |
| p-limit | Promise.all with chunking | Custom implementation, no dynamic concurrency control |
| Custom executor | listr2 | listr2 adds 500KB+ dependencies; our needs are simpler |

**Installation:**
```bash
pnpm add p-limit
```

Note: rimraf and @clack/prompts are already installed.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── executor/           # New: Task execution framework
│   │   ├── index.ts        # Public API exports
│   │   ├── types.ts        # Task, ExecutorOptions, ExecutionResult types
│   │   ├── executor.ts     # Main executor implementation
│   │   ├── progress.ts     # Progress display coordination
│   │   └── signals.ts      # SIGINT/abort handling
│   ├── detection/          # Existing: PM detection (Phase 2)
│   └── ...
```

### Pattern 1: Task Definition Interface

**What:** A Task represents a single cleanup operation that knows how to execute and describe itself
**When to use:** Every cleanup operation (file deletion, cache clear command)
**Example:**
```typescript
// Source: Custom design based on command pattern principles
interface Task {
  /** Unique identifier for the task */
  id: string;

  /** Human-readable title for progress display */
  title: string;

  /** Whether this task is safe to run in parallel with others */
  parallelSafe: boolean;

  /** Execute the task, respecting the abort signal */
  execute(options: {
    signal: AbortSignal;
    onProgress?: (message: string) => void;
  }): Promise<TaskResult>;

  /** Return what this task would do without executing (for dry-run) */
  describe(): TaskDescription;
}

interface TaskResult {
  /** Whether the task completed successfully */
  success: boolean;
  /** Human-readable message for display */
  message: string;
  /** Detailed info (e.g., paths deleted) - hidden by default */
  details?: string[];
  /** True if task found nothing to do */
  noop: boolean;
}

interface TaskDescription {
  /** What this task will do */
  action: string;
  /** Target of the action (path, command, etc.) */
  target: string;
}
```

### Pattern 2: Executor with Mode Selection

**What:** Executor that runs tasks according to the selected mode (auto, sequential)
**When to use:** Main entry point for task execution
**Example:**
```typescript
// Source: Custom design based on CONTEXT.md decisions
type ExecutionMode = 'auto' | 'sequential';

interface ExecutorOptions {
  /** Execution mode: auto separates parallel-safe/sequential, sequential runs all serially */
  mode: ExecutionMode;
  /** Concurrency limit for parallel tasks (auto mode only) */
  concurrency: number;
  /** Dry-run mode: describe tasks without executing */
  dryRun: boolean;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

async function execute(
  tasks: Task[],
  options: ExecutorOptions
): Promise<ExecutionSummary> {
  if (options.mode === 'sequential') {
    return executeSequentially(tasks, options);
  }
  // Auto mode: parallel-safe tasks run concurrently, others run sequentially
  const parallelTasks = tasks.filter(t => t.parallelSafe);
  const sequentialTasks = tasks.filter(t => !t.parallelSafe);

  // Run parallel tasks first with concurrency limit
  await executeParallel(parallelTasks, options);
  // Then sequential tasks one by one
  await executeSequentially(sequentialTasks, options);
}
```

### Pattern 3: Concurrency Control with p-limit

**What:** Use p-limit to control parallel file operation concurrency
**When to use:** When running parallel-safe tasks in auto mode
**Example:**
```typescript
// Source: https://github.com/sindresorhus/p-limit
import pLimit from 'p-limit';

const DEFAULT_CONCURRENCY = 4; // Reasonable for file I/O

async function executeParallel(
  tasks: Task[],
  options: ExecutorOptions
): Promise<TaskResult[]> {
  const limit = pLimit(options.concurrency ?? DEFAULT_CONCURRENCY);

  const promises = tasks.map(task =>
    limit(async () => {
      // Check for abort before starting each task
      if (options.signal?.aborted) {
        return { success: false, message: 'Aborted', noop: false };
      }
      return task.execute({ signal: options.signal! });
    })
  );

  return Promise.all(promises);
}
```

### Pattern 4: Immediate Cancellation with AbortController

**What:** Use AbortController to immediately stop all tasks on Ctrl+C
**When to use:** SIGINT handling
**Example:**
```typescript
// Source: https://nodejs.org/api/process.html
// Source: https://betterstack.com/community/guides/scaling-nodejs/understanding-abortcontroller/

function createCancellableExecutor(): {
  execute: typeof execute;
  abort: () => void;
} {
  const controller = new AbortController();

  // Handle SIGINT (Ctrl+C)
  const sigintHandler = () => {
    controller.abort();
    // Remove handler to allow second Ctrl+C to force exit
    process.off('SIGINT', sigintHandler);
  };
  process.on('SIGINT', sigintHandler);

  return {
    execute: (tasks, options) =>
      execute(tasks, { ...options, signal: controller.signal }),
    abort: () => controller.abort(),
  };
}
```

### Pattern 5: Single Spinner with Aggregate Status

**What:** Use one spinner showing current task count/status for parallel operations
**When to use:** Progress display during parallel execution
**Example:**
```typescript
// Source: https://bomb.sh/docs/clack/packages/prompts/
import * as clack from '@clack/prompts';

class ProgressDisplay {
  private spinner = clack.spinner();
  private completed = 0;
  private total = 0;
  private failed = 0;

  start(total: number) {
    this.total = total;
    this.completed = 0;
    this.failed = 0;
    this.spinner.start(this.formatMessage());
  }

  update(taskTitle: string, success: boolean) {
    this.completed++;
    if (!success) this.failed++;
    // Update spinner message with aggregate status
    this.spinner.message(this.formatMessage());
  }

  private formatMessage(): string {
    // Example: "Cleaning up... (3/10)"
    return `Cleaning up... (${this.completed}/${this.total})`;
  }

  stop(totalTime: number) {
    if (this.failed > 0) {
      this.spinner.stop(`Completed with ${this.failed} error(s)`);
    } else {
      this.spinner.stop(`Done in ${totalTime}ms`);
    }
  }

  cancel() {
    this.spinner.stop('Cancelled');
  }
}
```

### Pattern 6: Dry-Run Support

**What:** Every task implements describe() for dry-run mode
**When to use:** When --dry-run flag is passed
**Example:**
```typescript
// Source: Custom design per CONTEXT.md decisions
async function executeDryRun(tasks: Task[]): Promise<void> {
  clack.log.info('Dry run - no changes will be made:');
  for (const task of tasks) {
    const desc = task.describe();
    clack.log.step(`${desc.action}: ${desc.target}`);
  }
}
```

### Pattern 7: Fail-Fast Error Handling

**What:** Cancel remaining tasks immediately when one fails
**When to use:** Default error behavior per CONTEXT.md decisions
**Example:**
```typescript
// Source: Custom design per CONTEXT.md decisions
async function executeWithFailFast(
  tasks: Task[],
  options: ExecutorOptions
): Promise<ExecutionSummary> {
  const limit = pLimit(options.concurrency);
  const controller = new AbortController();

  // Combine user abort signal with our fail-fast signal
  const combinedSignal = options.signal
    ? AbortSignal.any([options.signal, controller.signal])
    : controller.signal;

  const results: TaskResult[] = [];
  let firstError: Error | null = null;

  const promises = tasks.map(task =>
    limit(async () => {
      if (combinedSignal.aborted) {
        return { success: false, message: 'Cancelled', noop: false };
      }

      try {
        const result = await task.execute({
          signal: combinedSignal,
          onProgress: (msg) => { /* update spinner */ }
        });

        if (!result.success) {
          // Trigger fail-fast
          controller.abort();
          firstError = new Error(result.message);
        }

        return result;
      } catch (err) {
        controller.abort();
        firstError = err as Error;
        return { success: false, message: String(err), noop: false };
      }
    })
  );

  await Promise.all(promises);

  if (firstError) {
    throw firstError;
  }

  return { results, totalTime: Date.now() - startTime };
}
```

### Anti-Patterns to Avoid

- **Multiple simultaneous spinners:** @clack/prompts doesn't support concurrent spinners well; use single spinner with aggregate updates
- **process.exit() in signal handler:** Prevents cleanup; instead, abort and let natural flow complete
- **Not checking abort signal:** Each task must check signal before and during execution
- **Retry logic:** Per CONTEXT.md decisions, no retries - fail immediately
- **Blocking on failed task results:** Use AbortController.abort() to cancel pending tasks, don't wait

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Concurrency limiting | Custom semaphore | p-limit | Handles edge cases, cancellation, dynamic adjustment |
| File deletion with cancel | Custom rimraf wrapper | rimraf({ signal }) | Built-in abort signal support |
| CLI spinner | setInterval animation | @clack/prompts spinner | TTY detection, Windows compat, cleanup |
| Signal handling | Raw process.on | AbortController pattern | Standard, composable, works with rimraf |

**Key insight:** Cancellation is the hardest part of concurrent execution. AbortController/AbortSignal are now the standard Node.js pattern, and rimraf supports them natively. Don't build custom cancellation logic.

## Common Pitfalls

### Pitfall 1: Not Propagating Abort Signal to rimraf

**What goes wrong:** File deletion continues after user presses Ctrl+C
**Why it happens:** rimraf needs explicit `signal` option to respect cancellation
**How to avoid:** Always pass signal to rimraf calls
**Warning signs:** Files still being deleted after "Cancelled" message

```typescript
// WRONG
await rimraf(paths, { glob: true });

// RIGHT
await rimraf(paths, { glob: true, signal: options.signal });
```

### Pitfall 2: Using fs.rm Instead of rimraf for Abort Support

**What goes wrong:** Can't cancel file operations mid-execution
**Why it happens:** Node's built-in fs.rm doesn't support AbortSignal
**How to avoid:** Use rimraf for all deletions needing cancellation
**Warning signs:** Hanging on Ctrl+C during large directory deletions

### Pitfall 3: Spinner State After Error

**What goes wrong:** Spinner keeps running after error thrown
**Why it happens:** Error thrown before spinner.stop() called
**How to avoid:** Always stop spinner in finally block or catch
**Warning signs:** Spinner animation continues after error message

```typescript
const s = clack.spinner();
try {
  s.start('Working...');
  await riskyOperation();
  s.stop('Done!');
} catch (error) {
  s.stop(`Failed: ${error.message}`);
  throw error;
}
```

### Pitfall 4: Double Ctrl+C Behavior

**What goes wrong:** User presses Ctrl+C twice and nothing happens, or process hangs
**Why it happens:** First Ctrl+C starts graceful shutdown, second is ignored
**How to avoid:** Remove SIGINT handler after first trigger; second Ctrl+C forces exit
**Warning signs:** User has to use kill -9 to stop process

```typescript
const sigintHandler = () => {
  controller.abort();
  process.off('SIGINT', sigintHandler); // Allow force exit
};
process.on('SIGINT', sigintHandler);
```

### Pitfall 5: Race Condition in Fail-Fast

**What goes wrong:** Multiple tasks fail simultaneously, multiple error messages shown
**Why it happens:** Abort signal not propagated fast enough
**How to avoid:** Check abort signal before starting any task work
**Warning signs:** Multiple "Failed" messages in output

### Pitfall 6: Concurrency Too High for I/O

**What goes wrong:** EMFILE (too many open files) errors
**Why it happens:** Concurrency limit set too high for file operations
**How to avoid:** Use reasonable default (4-8), let OS handle buffering
**Warning signs:** Intermittent "EMFILE" or "ENFILE" errors

## Code Examples

Verified patterns from official sources:

### p-limit Basic Usage

```typescript
// Source: https://github.com/sindresorhus/p-limit
import pLimit from 'p-limit';

const limit = pLimit(4);

const tasks = paths.map(path =>
  limit(() => rimraf(path, { signal }))
);

await Promise.all(tasks);
```

### p-limit with Dynamic Concurrency Check

```typescript
// Source: https://github.com/sindresorhus/p-limit
import pLimit from 'p-limit';

const limit = pLimit(4);

console.log(limit.activeCount);  // Currently running
console.log(limit.pendingCount); // Queued

// Clear pending if we need to abort
limit.clearQueue();
```

### AbortSignal.any() for Combined Signals

```typescript
// Source: https://nodejs.org/api/globals.html#static-method-abortsignalanyiterable
const userAbort = new AbortController();
const timeoutSignal = AbortSignal.timeout(30000);

// Combined: abort if user cancels OR timeout
const combined = AbortSignal.any([userAbort.signal, timeoutSignal]);

await rimraf(path, { signal: combined });
```

### rimraf with Filter and Signal

```typescript
// Source: https://github.com/isaacs/rimraf
import { rimraf } from 'rimraf';

const result = await rimraf('/path/to/delete', {
  glob: true,
  signal: abortController.signal,
  filter: (path) => !path.includes('.git'),
});
```

### SIGINT Handler with Cleanup

```typescript
// Source: https://nodejs.org/api/process.html
let isShuttingDown = false;
const controller = new AbortController();

process.on('SIGINT', () => {
  if (isShuttingDown) {
    // Second Ctrl+C: force exit
    process.exit(1);
  }
  isShuttingDown = true;
  controller.abort();
});
```

### clack.spinner with Dynamic Message

```typescript
// Source: https://bomb.sh/docs/clack/packages/prompts/
import * as clack from '@clack/prompts';

const s = clack.spinner();
s.start('Starting cleanup...');

// Update message as tasks complete
s.message('Cleaning caches... (1/5)');
s.message('Cleaning caches... (2/5)');

// Final stop
s.stop('Cleanup complete!');
```

### User-Friendly Error Translation

```typescript
// Source: Custom pattern per CONTEXT.md decisions
function translateError(error: Error): string {
  // Translate technical errors to plain language
  if (error.message.includes('ENOENT')) {
    return 'Directory not found';
  }
  if (error.message.includes('EACCES')) {
    return 'Permission denied - try running with sudo';
  }
  if (error.message.includes('EBUSY')) {
    return 'Files are in use by another process';
  }
  if (error.message.includes('EPERM')) {
    return 'Operation not permitted';
  }
  // Fallback: generic message without stack trace
  return 'An unexpected error occurred';
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual promise queuing | p-limit | 2018+ | Clean API, tested edge cases |
| process.kill for cancel | AbortController | Node 16+ (2021) | Standard, composable, library support |
| Custom async pools | p-queue / p-limit | 2018+ | Well-tested, maintained |
| Multiple ora spinners | Single spinner with status | 2023+ | Simpler, more reliable |

**Deprecated/outdated:**
- **async.parallelLimit**: Old callback-based API; use p-limit with promises
- **Custom SIGINT handlers without AbortController**: Non-composable; use AbortController pattern
- **rimraf < 5.0**: No abort signal support; use rimraf 6.x

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal concurrency number for file operations**
   - What we know: 4-8 is commonly recommended; rimraf has built-in retry for EMFILE
   - What's unclear: Best default for this specific use case
   - Recommendation: Use 4 as default; matches typical user expectations

2. **AbortSignal.any() Node.js version requirement**
   - What we know: AbortSignal.any() requires Node.js 20+
   - What's unclear: Project requires Node.js 22+, so this is fine
   - Recommendation: Safe to use AbortSignal.any()

3. **clack.tasks() vs custom parallel implementation**
   - What we know: clack.tasks() runs sequentially only
   - What's unclear: Whether future clack versions will add parallel support
   - Recommendation: Use clack.tasks() for sequential mode; custom implementation for parallel

## Sources

### Primary (HIGH confidence)
- https://github.com/sindresorhus/p-limit - Official p-limit documentation (v7.2.0)
- https://github.com/isaacs/rimraf - Official rimraf documentation (v6.0.1)
- https://bomb.sh/docs/clack/packages/prompts/ - Official @clack/prompts documentation
- https://nodejs.org/api/process.html - Node.js process signal documentation
- https://betterstack.com/community/guides/scaling-nodejs/understanding-abortcontroller/ - AbortController comprehensive guide

### Secondary (MEDIUM confidence)
- https://blog.appsignal.com/2025/02/12/managing-asynchronous-operations-in-nodejs-with-abortcontroller.html - AbortController patterns
- https://dev.to/yusadolat/nodejs-graceful-shutdown-a-beginners-guide-40b6 - SIGINT handling best practices

### Tertiary (LOW confidence)
- None - all findings verified with primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - p-limit and rimraf are well-documented, stable libraries
- Architecture: HIGH - Patterns follow established Node.js conventions, verified with official docs
- Pitfalls: HIGH - Based on official documentation warnings and community experience

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - stable libraries, no expected major changes)
