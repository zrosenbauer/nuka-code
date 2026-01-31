# Testing Patterns

**Analysis Date:** 2026-01-31

## Test Framework

**Runner:**
- Vitest 3.2.2
- Config: `vitest.config.ts`
- Environment: Node.js

**Assertion Library:**
- Vitest built-in expect API

**Run Commands:**
```bash
pnpm test              # Run all tests in watch mode
pnpm test:coverage    # Run tests with coverage report
```

**Configuration:**
The vitest config in `vitest.config.ts`:
```typescript
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    includeSource: ["src/**/*.ts"],
    environment: "node",
  },
  define: {
    "import.meta.vitest": "undefined",
  },
});
```

## Test File Organization

**Location:**
- Colocated with source files (not in separate test directory)
- Tests live in the same `.ts` file as source code

**Naming:**
- No special naming convention since tests are colocated
- Test blocks use `import.meta.vitest` guard

**Structure:**
```
src/lib/project.ts          # Contains both source and tests
src/lib/utils.ts            # Contains both source and tests
src/lib/manifest/lockfile.ts # Contains both source and tests
```

## Test Structure

**Suite Organization:**
Tests use standard vitest block structure. Example from `src/lib/utils.ts:27-53`:

```typescript
if (import.meta.vitest) {
  const { test, expect, describe } = import.meta.vitest;

  describe("inferRootDirectory", () => {
    test("inferRootDirectory returns root directory", async () => {
      const result1 = await inferRootDirectory([
        "/test/project/package.json",
        "/test/project/README.md",
      ]);
      expect(result1).toBe("/test/project");
    });

    test("inferRootDirectory returns null if no file paths are provided", async () => {
      const result = await inferRootDirectory([]);
      expect(result).toBeNull();
    });
  });
}
```

**Patterns:**
- Import destructure only needed exports: `const { test, expect, describe } = import.meta.vitest;`
- Use `describe()` to group related tests
- Use `test()` or `it()` for individual test cases
- Test names are descriptive action + expected result format

## Setup and Teardown

**Hooks Used:**
- `beforeAll()` - Setup before all tests in suite
- `beforeEach()` - Setup before each test
- `vi.clearAllMocks()` - Clear mock state between tests

**Setup Example from `src/lib/manifest/package-json.ts:60-73`:**
```typescript
describe("package.json", () => {
  beforeAll(() => {
    vi.mock("node:fs/promises", () => ({
      readFile: vi.fn(),
    }));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });
  // ... tests follow
});
```

## Mocking

**Framework:** Vitest's built-in mocking via `vi` object

**Mocking Patterns:**

1. **Module mocking:**
```typescript
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));
```

2. **Function mocking:**
```typescript
vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(mockPackageJson));
vi.mocked(readFile).mockRejectedValueOnce(new Error("File not found"));
```

3. **Call verification:**
```typescript
expect(readFile).toHaveBeenCalledWith("/test/project/package.json", "utf8");
```

**What to Mock:**
- File system operations (`node:fs/promises`)
- External dependencies with side effects
- Child processes

**What NOT to Mock:**
- Local utility functions (test real implementation)
- Type definitions
- Path manipulation (use real paths)

## Fixtures and Factories

**Test Data:**
Test data created inline rather than in factory files. Example from `src/lib/manifest/package-json.ts:76-82`:

```typescript
const mockPackageJson = {
  name: "test-project",
  version: "1.0.0",
  dependencies: {
    "test-dep": "^1.0.0",
  },
};
```

**Location:**
- Defined in `beforeAll()` or within test blocks
- No separate fixtures directory
- Objects created for each test scenario

## Coverage

**Requirements:** Not enforced (no minimum configured)

**View Coverage:**
```bash
pnpm test:coverage
```

This generates v8 coverage reports via `@vitest/coverage-v8`.

## Test Types

**Unit Tests:**
- Test individual functions in isolation
- Mock external dependencies
- Verify function behavior with specific inputs
- Example: `src/lib/utils.ts` tests for `inferRootDirectory()`, `toDeepGlob()`

**Integration Tests:**
- Test file system operations with real files
- Example: `src/lib/fs.ts:22-28` tests `exists()` function against actual `package.json`
```typescript
test("returns true if file exists", async () => {
  const rootDir = path.join(import.meta.dirname, "..", "..");
  const result = await exists(path.join(rootDir, "package.json"));
  expect(result).toBe(true);
});
```

**E2E Tests:**
- Not present in codebase
- CLI functionality tested via unit/integration tests

## Common Patterns

**Async Testing:**
Tests use `async/await` with async test functions:
```typescript
test("inferRootDirectory returns root directory", async () => {
  const result = await inferRootDirectory([...]);
  expect(result).toBe("/test/project");
});
```

**Error Testing:**
Test error conditions by catching and asserting:
```typescript
it("readPackageJsonOrThrow throws error if file does not exist", async () => {
  vi.mocked(readFile).mockRejectedValueOnce(new Error("File not found"));
  await expect(
    readPackageJsonOrThrow("/test/project/does-not-exist.json")
  ).rejects.toThrow("File not found");
});
```

**Parametrized Tests:**
Use `it.each()` for testing multiple scenarios:
```typescript
it.each(["pnpm-lock.yaml", "yarn.lock", "package-lock.json"])(
  "returns true if file path is %s",
  (filePath) => {
    const result = isLockfile(filePath);
    expect(result).toBe(true);
  },
);
```

## Test Examples from Codebase

**Simple Function Testing** (`src/lib/manifest/lockfile.ts:12-31`)
```typescript
describe("isLockfile", () => {
  it.each(["pnpm-lock.yaml", "yarn.lock", "package-lock.json"])(
    "returns true if file path is %s",
    (filePath) => {
      const result = isLockfile(filePath);
      expect(result).toBe(true);
    },
  );

  it.each(["package.json", "README.md", "LICENSE"])(
    "returns false if file path is %s",
    (filePath) => {
      const result = isLockfile(filePath);
      expect(result).toBe(false);
    },
  );
});
```

**Mocked Module Testing** (`src/lib/manifest/package-json.ts:75-94`)
```typescript
it("readPackageJson returns package.json object", async () => {
  const mockPackageJson = {
    name: "test-project",
    version: "1.0.0",
    dependencies: { "test-dep": "^1.0.0" },
  };

  vi.mocked(readFile).mockResolvedValueOnce(
    JSON.stringify(mockPackageJson),
  );

  const result = await readPackageJson("/test/project/package.json");
  expect(result).toEqual(mockPackageJson);
  expect(readFile).toHaveBeenCalledWith(
    "/test/project/package.json",
    "utf8",
  );
});
```

**Null/Falsy Testing** (`src/lib/manifest/package-json.ts:96-101`)
```typescript
it("readPackageJson returns null if file does not exist or errored", async () => {
  vi.mocked(readFile).mockRejectedValueOnce(new Error("File not found"));

  const result = await readPackageJson("/test/project/does-not-exist.json");
  expect(result).toBeNull();
});
```

## Test Coverage Status

**Tests Present For:**
- `src/lib/utils.ts` - Full coverage of utility functions
- `src/lib/fs.ts` - Coverage of file existence checks
- `src/lib/manifest/lockfile.ts` - Full coverage of lockfile detection
- `src/lib/manifest/package-json.ts` - Full coverage with mocking
- `src/lib/manifest/workspaces.ts` - Tests for workspace detection

**Untested Areas:**
- `src/cli.ts` - CLI command handling (no unit tests for yargs commands)
- `src/nuke.ts` - Nuke operations (would require file system setup)
- `src/lib/project.ts` - Project initialization (complex file system interactions)
- `src/lib/git.ts` - Git operations (external process calls)
- `src/lib/tree.ts` - Tree rendering (visual output)
- `src/lib/ascii.ts` - ASCII art rendering (large constant file)

---

*Testing analysis: 2026-01-31*
