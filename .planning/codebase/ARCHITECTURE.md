# Architecture

**Analysis Date:** 2026-01-31

## Pattern Overview

**Overall:** Layered CLI application with clear separation between CLI handler, core logic, and utility functions.

**Key Characteristics:**
- Command-driven CLI using yargs for argument parsing
- Functional programming patterns with async operations
- Modular library layer with specialized concerns (file system, git, manifest parsing)
- Pattern matching via ts-pattern for type-safe branching
- Filter-based deletion using rimraf with ignore file support

## Layers

**Presentation Layer (CLI):**
- Purpose: Handle user interaction, command parsing, and output formatting
- Location: `src/cli.ts`
- Contains: Command definitions, argument validation, spinner/progress UI, ASCII art display
- Depends on: Core nuke functions, project initialization, tree visualization
- Used by: Direct execution as binary entry point

**Core Business Logic Layer:**
- Purpose: Implement the primary functionality of file/directory deletion
- Location: `src/nuke.ts`
- Contains: `nukeEverything()`, `nukeNodeModules()`, `nukeCache()`, `nukeBuilds()` functions
- Depends on: rimraf for deletion, ignore-file helpers, utility functions
- Used by: CLI layer for all deletion operations

**Project Initialization Layer:**
- Purpose: Initialize projects with .nukeignore and .gitignore configuration
- Location: `src/lib/project.ts`
- Contains: Project detection, initialization logic, ignore file caching
- Depends on: File system utilities, manifest readers
- Used by: CLI layer before executing nuke operations

**Manifest & Detection Layer:**
- Purpose: Read and parse project configuration files to validate workspace root
- Location: `src/lib/manifest/`
- Contains: lockfile detection, package.json parsing, pnpm workspace parsing, type definitions
- Depends on: Node fs/promises, YAML parser, ts-pattern
- Used by: Project initialization and workspace detection

**Utility Layers:**
- **File System Utilities** (`src/lib/fs.ts`): Basic file existence checking
- **Git Utilities** (`src/lib/git.ts`): Check for uncommitted changes via git status
- **Tree Visualization** (`src/lib/tree.ts`): Convert file paths to tree structure for console display
- **Glob & Array Utilities** (`src/lib/utils.ts`): Glob pattern generation, array deduplication
- **UI Utilities** (`src/lib/ascii.ts`): Pre-rendered ASCII art assets

**Public API Layer:**
- Purpose: Expose core functionality for programmatic use
- Location: `src/index.ts`
- Contains: Re-exports of nuke functions for library consumers
- Used by: External packages that import nuka-code as a library

## Data Flow

**Initialization Flow:**

1. User runs CLI command
2. CLI checks if git repository has uncommitted changes (via `isGitDirty()`)
3. If dirty and not forced, throw error requiring commit
4. Call `initialize()` to setup project
5. Detect project root via lockfile presence
6. Prompt user if needed to confirm root directory
7. Create `.nukeignore` and update `.gitignore`

**Deletion Flow:**

1. User specifies nuke type (all, node_modules, cache, build)
2. Match command type to appropriate nuke function via `ts-pattern`
3. Get glob patterns via `getNukeXGlob()` functions
4. Create ignore helper from `.nukeignore` file
5. Pass globs and filter function to rimraf
6. rimraf iterates files, filter excludes ignored paths
7. Delete matched files
8. Return array of deleted paths

**List Command Flow:**

1. User runs `nuke list` command
2. Get all applicable glob patterns
3. If `--glob` flag set, display raw patterns
4. Otherwise, use glob library to find matching files
5. Filter results through ignore helper
6. Convert file list to tree structure
7. Print tree with colors and ASCII symbols

**State Management:**
- Minimal state: ignore file cache in `src/lib/project.ts` (ignoreFileCache variable)
- Project state persisted via `.nukeignore` file in project root
- Working directory context maintained through process.cwd() parameter passing

## Key Abstractions

**Ignore File Helper:**
- Purpose: Encapsulate ignore logic and check if paths should be excluded
- Examples: `src/lib/project.ts` (readIgnoreFile), `src/nuke.ts` (createIgnoreFileHelper)
- Pattern: Uses ignore package to parse .nukeignore rules and test paths

**Glob Pattern Generation:**
- Purpose: Abstract knowledge of what directories to delete
- Examples: `getNukeNodeModulesGlob()`, `getNukeCacheGlob()`, `getNukeBuildsGlob()`
- Pattern: Functions return arrays of glob patterns; `toDeepGlob()` utility converts simple paths to patterns that match at any depth

**Manifest Detection:**
- Purpose: Validate project type and locate project root
- Examples: `hasLockfile()`, `readPackageJson()`, `hasWorkspaces()`
- Pattern: Functions check for specific files/formats to determine project type

**Tree Structure:**
- Purpose: Convert flat file paths to hierarchical tree for visualization
- Examples: `toTree()` converts path array to TreeNode structure, `printNode()` renders recursively
- Pattern: Recursive tree building with ANSI color support

## Entry Points

**CLI Entry Point:**
- Location: `src/cli.ts`
- Triggers: When invoked as `nuka-code` or `nuke` command (via package.json bin field)
- Responsibilities: Parse arguments, display UI, manage user interaction flow, execute nuke operations

**Library Entry Point:**
- Location: `src/index.ts`
- Triggers: When imported via `import { nukeEverything } from 'nuka-code'`
- Responsibilities: Re-export core functions for programmatic use (main, module exports in package.json)

**Default Command:**
- Name: "it" (or "*" for default)
- Triggers: Running `nuke` without subcommand
- Responsibilities: Execute nuke operation with optional type and force flags

## Error Handling

**Strategy:** Fail-fast with informative error messages, primarily through consola library.

**Patterns:**
- Git dirty check: Throw error if changes uncommitted (unless `--force`)
- Missing package.json: Throw error with clear directory requirement
- File read failures: Return null instead of throwing (graceful degradation)
- Glob/rimraf errors: Propagate via Promise rejection
- Failed file operations: Caught in try-catch, return null or false

## Cross-Cutting Concerns

**Logging:**
- Framework: consola library
- Pattern: `consola.start()`, `consola.success()`, `consola.warn()`, `consola.info()` for status messages
- Spinner: yocto-spinner for async operation progress

**Validation:**
- Git dirty check before operations
- Package.json existence requirement (can't run outside project)
- Lockfile detection for root directory confirmation
- Ignore file validation (returns null if missing/invalid)

**Styling:**
- Framework: chalk library
- Pattern: Color-coded output (red for items to delete, cyan for root, gray for tree structure)
- ASCII art: Pre-loaded from `src/lib/ascii.ts`, conditionally displayed based on terminal width

---

*Architecture analysis: 2026-01-31*
