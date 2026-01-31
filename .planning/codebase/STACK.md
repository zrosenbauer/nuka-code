# Technology Stack

**Analysis Date:** 2026-01-31

## Languages

**Primary:**
- TypeScript 5.8.3 - All source code, configuration, and build scripts
- JavaScript - Build output (transpiled to CommonJS and ESM)

## Runtime

**Environment:**
- Node.js 22.0.0+ (minimum requirement specified in `package.json`)
- Current tested version: 24.4.1

**Package Manager:**
- pnpm 10.15.1
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**
- None - This is a utility library/CLI application built with pure Node.js APIs

**Testing:**
- Vitest 3.2.2 - Test runner and framework
- @vitest/coverage-v8 3.2.4 - Code coverage reporting

**Build/Dev:**
- tsup 8.5.0 - TypeScript bundler for building CJS and ESM outputs
- Biome 1.9.4 - Linter, formatter, and organizer (replaces ESLint/Prettier)
- tsx 4.19.4 - TypeScript execution for scripts
- Turbo 2.5.4 - Monorepo task runner (configured but single package repo)

## Key Dependencies

**Critical:**
- rimraf 6.0.1 - Core functionality: recursive file deletion with glob support
- glob 11.0.2 - File pattern matching for deletion targets
- ignore 7.0.5 - `.gitignore`/`.nukeignore` parsing and filtering
- yargs 18.0.0 - CLI argument parsing and command handling

**Utilities:**
- chalk 5.6.0 - Terminal color output for CLI
- consola 3.4.2 - Logging/console output management
- ts-pattern 5.8.0 - Pattern matching for type-safe control flow
- remeda 2.30.0 - Functional utility library
- yaml 2.8.1 - YAML parsing (used for pnpm workspace config)
- yocto-spinner 1.0.0 - Loading spinner for CLI feedback

**Development Only:**
- @changesets/cli 2.29.6 - Changelog and version management
- @joggr/tempo 0.13.4 - Time/date utilities for docs generation
- @tsconfig/node24 24.0.1 - TypeScript config preset for Node.js 24
- @types/node 24.2.1 - TypeScript type definitions for Node.js
- @types/yargs 17.0.33 - TypeScript types for yargs
- type-fest 4.41.0 - Utility TypeScript types
- vite-tsconfig-paths 5.1.4 - Plugin for tsconfig path aliases in Vitest
- husky 9.1.7 - Git hooks for pre-commit checks

## Configuration

**Environment:**
- No external environment variables required
- Configuration files are Git-checked and static

**Build:**
- `tsup.config.ts` - Defines build entry points (`src/index.ts`, `src/cli.ts`), output format (CJS + ESM), and tree-shaking
- `vitest.config.ts` - Configures test runner with Node.js environment and inline source testing
- `biome.json` - Linting and formatting rules (tabs, double quotes, git-aware)
- `tsconfig.json` - Extends `@tsconfig/node24`, uses path alias `#/*` for `./src/*`
- `turbo.json` - Task definitions for build, test, check, fix, and types

**Output:**
- Primary: `dist/index.js` (CommonJS), `dist/index.mjs` (ESM)
- Types: `dist/index.d.ts` (ESM), `dist/index.d.cts` (CommonJS)
- CLI entry: `dist/cli.js`

## Platform Requirements

**Development:**
- Node.js 22.0.0 or higher
- pnpm 10.15.1 (or compatible)
- Git (required for `.git` checks during CLI operations)
- Terminal/shell (for CLI usage and color output)

**Production:**
- Node.js 22.0.0 or higher
- Deployable as npm package via `npm` or `pnpm`
- Callable as CLI command: `nuka-code` or `nuke`
- Can be used as library import in other Node.js projects

## Package Exports

**CLI Binary:**
- Accessible via `nuka-code` or `nuke` commands (defined in `bin` field)

**Library Exports:**
- Main entry: `dist/index.js` (CJS) / `dist/index.mjs` (ESM)
- TypeScript definitions included in package
- Exports re-exported from `src/index.ts`: Primary export is `nukeEverything` and related functions

---

*Stack analysis: 2026-01-31*
