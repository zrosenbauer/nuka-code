# Phase 4: npm/yarn Cache Cleanup - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Execute cache cleanup commands for npm and yarn (Classic + Berry). Uses Phase 2 detection to identify which package managers are present, and Phase 3 executor to run cleanup commands. This phase implements the actual cleanup logic and integrates it with the CLI.

</domain>

<decisions>
## Implementation Decisions

### Command Invocation
- Use `child_process.spawn` with `shell: true` — respects user's PATH, simple and reliable
- Trust detection: if lockfile exists, assume PM is available. Fail at execution if not installed
- Auto-detect yarn version: check for `.yarnrc.yml` (Berry) or run `yarn --version` to determine Classic vs Berry
- Auto-run: detect and clean immediately without confirmation prompts — user already invoked `nuke`

### Error Handling
- Fail fast: stop immediately on first cache cleanup failure (do not continue with remaining)
- No retry: fail immediately, user can re-run manually
- Error reporting: friendly message plus stderr for debugging (e.g., "npm cache clean failed" + actual error)
- Exit code: non-zero (1) on any failure — standard CLI behavior for CI/scripts

### Dry-run Output
- Show commands that would run (e.g., "Would run: npm cache clean --force")
- Skip cache size calculation — that's Phase 8 (UX Enhancements)
- Use clack styling (log.info/step) for consistent look with rest of CLI
- Include summary at end: "Would execute N cache cleanup commands"

### Feedback & Progress
- Spinner shows current command: "Cleaning npm cache..." then "Cleaning yarn cache..."
- Per-command success feedback: "✓ npm cache cleaned", "✓ yarn cache cleaned"
- Final summary: "Cleaned N caches" or "Cache cleanup failed" with error details

### Cache Commands
- npm: `npm cache clean --force`
- yarn Classic (v1): `yarn cache clean`
- yarn Berry (v2+): `yarn cache clean --all`

### Claude's Discretion
- Exact spinner text formatting
- How to structure the cleanup module (file organization)
- Whether to capture/log stdout from cache commands
- Timeout handling for slow cache operations

</decisions>

<specifics>
## Specific Ideas

- Integrate with Phase 3 executor infrastructure for task execution
- Use Phase 2 detection module to identify which PMs need cleanup
- Cache cleanup tasks should be marked as sequential (not parallel) since they may share resources

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-npm-yarn-cache-cleanup*
*Context gathered: 2026-02-01*
