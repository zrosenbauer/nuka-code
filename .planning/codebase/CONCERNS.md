# Codebase Concerns

**Analysis Date:** 2026-01-31

## Tech Debt

**Global Ignore File Cache:**
- Issue: Single global cache variable `ignoreFileCache` in `src/lib/project.ts` (line 12) caches the ignore file contents for the entire application lifecycle without invalidation mechanism
- Files: `src/lib/project.ts`
- Impact: If `.nukeignore` file is modified during CLI execution (edge case but possible in automation), the changes won't be reflected. Multiple concurrent CLI processes may experience inconsistent behavior due to module-level cache
- Fix approach: Remove global cache or implement cache invalidation. Consider per-directory caching if needed, or pass ignore file helpers through dependency injection

**Hardcoded Git Check with Silent Failures:**
- Issue: `isGitDirty()` in `src/lib/git.ts` swallows all errors and returns `false` if git command fails
- Files: `src/lib/git.ts` (lines 15-16)
- Impact: If git is not installed or repository is corrupted, the check silently passes, allowing nuke to proceed when it should fail. Users won't know why their data is being deleted
- Fix approach: Distinguish between "not a git repo" and "git command failed". Log warnings when git check fails unexpectedly

**Silent Error Handling in Package.json Reading:**
- Issue: `readPackageJson()` in `src/lib/manifest/package-json.ts` returns `null` on any error without logging
- Files: `src/lib/manifest/package-json.ts` (lines 14-18)
- Impact: If package.json is malformed JSON, missing, or inaccessible, the error is silently swallowed. Critical errors cannot be distinguished from legitimate "not found" cases
- Fix approach: Add logging for actual errors. Return typed result indicating error type (file not found vs parse error vs permission denied)

**Unsafe Process Path Handling:**
- Issue: `exec()` command in `src/lib/git.ts` receives `cwd` parameter but doesn't validate it
- Files: `src/lib/git.ts` (line 13)
- Impact: If an attacker controls the cwd path or git repository, they could potentially exploit git command injection (low risk given context, but worth noting)
- Fix approach: Validate cwd path is within expected bounds, use escaped arguments instead of string concatenation for commands

## Security Considerations

**File System Access Control:**
- Risk: `nukeEverything()` and related functions use glob patterns and `rimraf()` to delete files. While `.nukeignore` provides filtering, patterns are user-defined
- Files: `src/nuke.ts`, `src/lib/project.ts`
- Current mitigation: `.nukeignore` files prevent deletion of specified patterns. Safety check requires git to be clean before nuking
- Recommendations: Add warning when using `--force` flag about potential data loss. Document `.nukeignore` more thoroughly. Consider adding dry-run mode by default with confirmation

**Command Execution in Git Check:**
- Risk: Using `exec()` for git status could be exploited if repository path contains malicious characters
- Files: `src/lib/git.ts`
- Current mitigation: Command is hardcoded, not user-provided
- Recommendations: Use git library instead of shell execution (e.g., `simple-git` or `isomorphic-git`)

**Environment-Based Secrets:**
- Risk: No explicit handling of environment variables that might contain secrets
- Files: All CLI files
- Current mitigation: CLI operates on local filesystem, not external APIs
- Recommendations: If integration with external services is added in future, ensure credentials are never logged to console

## Fragile Areas

**Tree Building Logic:**
- Files: `src/lib/tree.ts`
- Why fragile: Complex recursive tree building with multiple edge cases (line 71 has conditional logic that's hard to reason about). Cleanup process (lines 88-102) manipulates tree structure in place
- Safe modification: Add comprehensive tests for edge cases like deep nesting, files with similar names, mixed file/directory paths
- Test coverage: Some tests exist but don't cover all edge cases like empty directories or deeply nested structures

**Platform-Specific Path Handling:**
- Files: `src/lib/tree.ts` (line 56 uses `path.sep`), `src/lib/utils.ts` (lines 13-14 use hardcoded `/` for path splitting)
- Why fragile: `inferRootDirectory()` in `src/lib/utils.ts` hardcodes `/` for path separation (line 24), which won't work on Windows
- Safe modification: Use `path` module consistently across all files instead of string manipulation
- Test coverage: No tests for Windows paths

**Glob Pattern Generation with Negative Assertions:**
- Files: `src/lib/utils.ts` (line 76)
- Why fragile: Glob pattern `**/[!node_modules]**/${filePath}` relies on negative character class assertions which may not work consistently across all glob implementations
- Safe modification: Test glob patterns with actual `glob` library across different inputs
- Test coverage: Limited - only basic tests exist for `toDeepGlob()`

**Manifest Parsing with YAML:**
- Files: `src/lib/manifest/pnpm.ts`
- Why fragile: `readPnpmWorkspace()` doesn't validate the YAML structure after parsing. If workspace file is malformed but valid YAML, it could return unexpected structure
- Safe modification: Add schema validation after parsing, use zod or similar for runtime type checking
- Test coverage: Minimal tests - only happy path tested

## Performance Bottlenecks

**Ignore File Filtering on Every File:**
- Problem: Each file deletion in `nukeNodeModules()`, `nukeCache()`, and `nukeBuilds()` calls the async filter function (lines 36-38, 51-52, 66-67 in `src/nuke.ts`)
- Files: `src/nuke.ts`
- Cause: `rimraf()` is called with a filter function that calls `ignoreHelper.test()` on every matched file
- Improvement path: Pre-compile glob patterns into a single efficient filter, or batch-process ignore checks rather than calling per-file

**Synchronous File System Operations in Initialization:**
- Problem: `initialize()` function performs multiple sequential I/O operations without parallelization
- Files: `src/lib/project.ts` (lines 47-100)
- Cause: `readPackageJson()`, `readdir()`, `writeFile()`, and `readFile()` are awaited sequentially
- Improvement path: Use `Promise.all()` for operations that can run in parallel (checking package.json and reading .gitignore)

**Tree Building Without Memoization:**
- Problem: `toTree()` in `src/lib/tree.ts` rebuilds entire tree structure from scratch on every call
- Files: `src/lib/tree.ts`
- Cause: No caching mechanism for computed tree structures
- Improvement path: If tree is built multiple times, implement memoization. Currently not an issue as it's called once per command

## Scaling Limits

**Memory Usage with Large Projects:**
- Current capacity: Will load entire directory tree into memory when using `list` command with verbose flag
- Limit: Projects with millions of files could exhaust memory (unlikely for typical projects)
- Scaling path: Implement streaming output for file listing instead of building complete tree in memory

**Single Thread Execution:**
- Current capacity: All operations run sequentially, single node process
- Limit: Very large monorepos with hundreds of workspaces could take minutes to process
- Scaling path: Use worker threads or fork processes for parallel deletion, though this adds complexity

## Known Bugs

**Glob Pattern Bug with Nested Workspaces:**
- Symptoms: `**/[!node_modules]**/` pattern may not correctly match deeply nested workspace structures
- Files: `src/lib/utils.ts` (line 76)
- Trigger: Using nuke in monorepo with 3+ levels of nesting
- Workaround: Manually add patterns to `.nukeignore` for specific paths

**Git Check Doesn't Handle Shallow Clones:**
- Symptoms: `git status --short` may fail or hang in shallow git clones
- Files: `src/lib/git.ts`
- Trigger: Running in CI environment with shallow clone
- Workaround: Use `--force` flag to bypass git check

## Missing Critical Features

**No Dry-Run Mode:**
- Problem: Cannot preview what will be deleted without actually deleting it (except using `list` command separately)
- Blocks: Users can't safely test `.nukeignore` patterns before running nuke
- Priority: Medium - `list` command partially addresses this but requires separate invocation

**No Atomic Transactions:**
- Problem: If deletion fails partway through (e.g., permission denied), some files are already deleted
- Blocks: Can't guarantee consistent state if nuke is interrupted
- Priority: Low - rimraf already handles this as well as possible, but worth documenting

**No Output Redirection Options:**
- Problem: All output goes to stdout/stderr, no option to log to file
- Blocks: Automation and CI integration harder to debug
- Priority: Low - workaround: redirect terminal output

## Test Coverage Gaps

**No Integration Tests:**
- What's not tested: Actual filesystem operations with multiple workspaces, real `.nukeignore` patterns
- Files: Core functionality in `src/nuke.ts` depends on real filesystem access through `rimraf()`
- Risk: Patterns that work in unit tests might fail in real projects
- Priority: High

**Platform-Specific Testing:**
- What's not tested: Windows path handling, case-insensitive filesystems
- Files: `src/lib/utils.ts`, `src/lib/tree.ts`
- Risk: Tool may behave differently on Windows but issues won't be caught in CI
- Priority: High

**Error Path Testing:**
- What's not tested: Permission denied errors, missing parent directories, circular symlinks
- Files: `src/lib/fs.ts`, `src/lib/project.ts`
- Risk: Edge cases could crash or behave unexpectedly
- Priority: Medium

**Package Manager Edge Cases:**
- What's not tested: Malformed `package.json`, `pnpm-workspace.yaml` with invalid syntax
- Files: `src/lib/manifest/package-json.ts`, `src/lib/manifest/pnpm.ts`
- Risk: Silent failures or crashes on non-standard configurations
- Priority: Medium

---

*Concerns audit: 2026-01-31*
