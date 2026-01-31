# Coding Conventions

**Analysis Date:** 2026-01-31

## Naming Patterns

**Files:**
- Lowercase with hyphens: `lockfile.ts`, `package-json.ts`, `tree.ts`
- Utility files: `utils.ts`, `fs.ts`, `git.ts`
- Index files for re-exports: `index.ts`
- CLI entry point: `cli.ts`
- Feature modules: `nuke.ts`, `project.ts`, `ascii.ts`

**Functions:**
- camelCase: `readIgnoreFile()`, `isInitialized()`, `nukeEverything()`, `inferRootDirectory()`
- Verbs for actions: `nuke*`, `read*`, `check*`, `create*`, `has*`, `is*`
- Async functions are standard practice

**Variables:**
- camelCase for all variables: `ignoreFileCache`, `runId`, `sortedPaths`, `currentDepth`
- Constants in UPPER_SNAKE_CASE: `DIR_CACHE`, `FILE_IGNORE`, `FILE_GITIGNORE`
- Generic type parameters use PascalCase: `<T>`
- Private/internal functions use lowercase with leading underscore pattern avoided; use camelCase

**Types:**
- PascalCase for types and interfaces: `TreeOptions`, `TreeNode`, `PackageJson`, `PnpmWorkspace`
- Type exports use `export type` syntax: `export type PackageJson = TF.PackageJson;`
- Use `interface` for object shapes, `type` for unions/aliases

## Code Style

**Formatting:**
- Tool: Biome 1.9.4
- Indent style: tabs (configured in `biome.json`)
- Quote style: double quotes for JavaScript/TypeScript
- Enabled import organization

**Linting:**
- Tool: Biome with recommended rules enabled
- Configuration: `biome.json`
- Run with: `pnpm check` (check mode) or `pnpm fix` (fix mode)
- CI mode: `pnpm check:ci`

**Code Style Rules:**
- Use double quotes for strings
- Tab indentation throughout codebase
- Biome auto-formats and organizes imports on save/fix
- Recommended linting rules enforced (no custom rule overrides)

## Import Organization

**Order (handled by Biome):**
1. Node built-in modules: `import { readFile } from "node:fs/promises"`
2. External packages: `import chalk from "chalk"`
3. Path aliases (from `#/`): `import { nukeCache } from "#/nuke"`
4. Type imports: `import type { PackageJson } from "./types"`

**Path Aliases:**
- Configured in `tsconfig.json`: `"#/*": ["./src/*"]`
- Use `#/` prefix for all internal imports
- Examples:
  - `#/lib/project` → `src/lib/project`
  - `#/nuke` → `src/nuke`
  - `#/lib/manifest` → `src/lib/manifest`

## Error Handling

**Patterns:**
- Use try-catch for async operations (see `src/lib/project.ts:19-30`)
- Silent catch with early return for optional reads: `catch (error) { return null; }`
- Throw errors with descriptive messages for validation: `throw new Error("descriptive message")`
- Example from `src/lib/project.ts:61-63`:
  ```typescript
  if (!packageJson) {
    throw new Error(
      "No package.json found in current working directory, please run this command in the root of your project."
    );
  }
  ```

**Error Messages:**
- Use clear, user-facing language
- Include guidance on resolution when applicable
- Use console logging (consola) for warnings/errors in CLI code

## Logging

**Framework:** consola (imported as `import consola from "consola"`)

**Patterns:**
- `consola.start()` - Start a task
- `consola.success()` - Success message
- `consola.info()` - Informational message
- `consola.warn()` - Warning message
- `consola.error()` - Error message
- `consola.prompt()` - User interaction with type "confirm"
- Standard `console.log()` for output formatting

**Usage Example from `src/cli.ts`:**
```typescript
consola.start("Pushing the button...");
consola.info("You have 5 seconds to reconsider...");
if (result) {
  consola.success("You successfully nuked your project, good job!");
} else {
  consola.info("Well this is awkward... nothing was nuked. Maybe you should try again?");
}
```

## Comments

**When to Comment:**
- JSDoc comments required for all exported functions
- Explain "why" not "what" for complex logic
- Use inline comments sparingly for non-obvious code

**JSDoc/TSDoc:**
- Required format for exported functions and public APIs
- Include `@param` for parameters with types
- Include `@returns` for return values
- Example from `src/lib/project.ts:13-16`:
  ```typescript
  /**
   * Get the ignore file for the project.
   * @param filePath - The path to the project.
   * @returns The ignore file for the project.
   */
  ```

## Function Design

**Size:** Functions stay under 100 lines; larger operations broken into smaller helpers

**Parameters:**
- Use default parameters for optional/standard values: `filePath = process.cwd()`
- Destructuring for multiple related options preferred
- Type parameters explicitly defined

**Return Values:**
- Async functions return Promises: `Promise<string | null>`, `Promise<boolean>`
- Functions returning file operations use `Promise` pattern
- Try-catch patterns use nullable returns for graceful failures

## Module Design

**Exports:**
- Use named exports for functions and types
- Export patterns:
  - `export async function name() {}`
  - `export type Name = {}`
  - `export function name() {}`

**Barrel Files:**
- Used in `src/lib/manifest/index.ts` for re-exporting
- Pattern: `export { functionName } from "./module"`
- Simplifies external imports

**File Organization:**
- Each module handles one concern
- Test code colocated in same file using `if (import.meta.vitest)`
- Utility functions exported for reuse

## Pattern Matching

**ts-pattern Usage:**
- Imported as: `import { P, match } from "ts-pattern"`
- Used extensively for type-safe pattern matching
- Example from `src/cli.ts:31-41`:
  ```typescript
  match(cli.terminalWidth())
    .with(P.number, (s) => s > 100, () => ascii.logo)
    .with(P.number, (s) => s >= 80, () => ascii.logoSmall)
    .otherwise(() => `☢️ ${chalk.bold.green("Nuka-Code")}`)
  ```
- Common in CLI argument handling and type discrimination

## Testing Conventions

**Test Location:**
- Colocated with source code using `if (import.meta.vitest)` blocks
- No separate test files directory
- Tests run via vitest with `includeSource: ["src/**/*.ts"]`

**Test Organization:**
- Use `describe()` for test suites
- Use `test()` or `it()` for individual tests
- Setup hooks: `beforeAll()`, `beforeEach()`
- Cleanup: `vi.clearAllMocks()`

See `TESTING.md` for comprehensive testing patterns.

---

*Convention analysis: 2026-01-31*
