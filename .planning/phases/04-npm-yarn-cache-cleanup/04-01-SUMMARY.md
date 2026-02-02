---
phase: 04-npm-yarn-cache-cleanup
plan: 01
subsystem: cache
tags: [npm, yarn, child_process, spawn, cache-cleanup]

# Dependency graph
requires:
  - phase: 02-detection
    provides: DetectionResult with agent field distinguishing yarn/yarn@berry
  - phase: 03-execution-infrastructure
    provides: Task interface, TaskResult, TaskExecuteOptions types
provides:
  - Cache module at src/lib/cache/ with task factories
  - createNpmCacheTask() for npm cache clean --force
  - createYarnCacheTask() for yarn cache clean (classic/berry)
  - createCacheCleanupTasks() to generate tasks from DetectionResult
affects: [05-pnpm-bun-cache-cleanup, 06-cli-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Task factory pattern for cache cleanup commands
    - spawn with shell:true for PATH resolution
    - AbortSignal propagation for cancellation

key-files:
  created:
    - src/lib/cache/types.ts
    - src/lib/cache/utils.ts
    - src/lib/cache/npm.ts
    - src/lib/cache/yarn.ts
    - src/lib/cache/tasks.ts
    - src/lib/cache/index.ts
  modified: []

key-decisions:
  - "Use spawn with shell:true for PATH resolution and AbortSignal support"
  - "Capture stderr only for error reporting, ignore stdout"
  - "All cache tasks marked parallelSafe: false for sequential execution"

patterns-established:
  - "Task factory pattern: createXxxCacheTask() returns Task object"
  - "Detection-to-task mapping via agent field from DetectionResult"

# Metrics
duration: 4min
completed: 2026-02-02
---

# Phase 4 Plan 1: Cache Module Implementation Summary

**npm and yarn cache cleanup tasks using spawn with shell:true, abort signal support, and Detection-to-Task factory pattern**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-02T03:56:10Z
- **Completed:** 2026-02-02T03:59:41Z
- **Tasks:** 2
- **Files created:** 6

## Accomplishments
- Created cache module with YarnVersion type and runCacheCommand utility
- Implemented createNpmCacheTask() for npm cache clean --force
- Implemented createYarnCacheTask() supporting both Classic and Berry versions
- Created createCacheCleanupTasks() factory that maps DetectionResult to cache tasks

## Task Commits

Each task was committed atomically:

1. **Task 1: Create cache module types and command runner utility** - `128b73b` (feat)
2. **Task 2: Create npm and yarn task factories** - `101bcf7` (feat)

## Files Created/Modified
- `src/lib/cache/types.ts` - YarnVersion type definition
- `src/lib/cache/utils.ts` - runCacheCommand helper using spawn with shell:true
- `src/lib/cache/npm.ts` - createNpmCacheTask() factory
- `src/lib/cache/yarn.ts` - createYarnCacheTask() factory for classic/berry
- `src/lib/cache/tasks.ts` - createCacheCleanupTasks() from DetectionResult
- `src/lib/cache/index.ts` - Public API exports

## Decisions Made
- Used spawn with shell:true for PATH resolution and proper signal handling
- Capture stderr for error reporting, ignore stdout (cache commands produce minimal output)
- All tasks marked parallelSafe: false per CONTEXT.md for sequential execution

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Minor linting fixes applied by pre-commit hook (string concatenation converted to template literals). No functional changes required.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Cache module infrastructure ready for Phase 5 (pnpm/bun cache cleanup)
- Task factories follow established pattern for adding new package managers
- Ready for Phase 6 CLI integration

---
*Phase: 04-npm-yarn-cache-cleanup*
*Completed: 2026-02-02*
