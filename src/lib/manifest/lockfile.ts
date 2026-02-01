import path from "node:path";
import { LOCKS } from "package-manager-detector/constants";

/**
 * Set of all known lockfile names from package-manager-detector
 */
const LOCKFILE_NAMES = new Set(Object.keys(LOCKS));

/**
 * Checks if a file path is a known lockfile or lock-related config.
 * Recognizes: pnpm-lock.yaml, yarn.lock, package-lock.json,
 * npm-shrinkwrap.json, bun.lock, bun.lockb, deno.lock, pnpm-workspace.yaml
 */
export function isLockfile(filePath: string): boolean {
	return LOCKFILE_NAMES.has(path.basename(filePath));
}

if (import.meta.vitest) {
	const { it, expect, describe } = import.meta.vitest;

	describe("isLockfile", () => {
		it.each([
			"pnpm-lock.yaml",
			"yarn.lock",
			"package-lock.json",
			"npm-shrinkwrap.json",
			"bun.lock",
			"bun.lockb",
			"deno.lock",
			"pnpm-workspace.yaml",
		])("returns true for %s", (filePath) => {
			expect(isLockfile(filePath)).toBe(true);
		});

		it.each(["package.json", "README.md", "LICENSE", ".gitignore"])(
			"returns false for %s",
			(filePath) => {
				expect(isLockfile(filePath)).toBe(false);
			},
		);

		it("handles full paths correctly", () => {
			expect(isLockfile("/some/path/yarn.lock")).toBe(true);
			expect(isLockfile("./relative/package-lock.json")).toBe(true);
			expect(isLockfile("project/bun.lock")).toBe(true);
		});
	});
}

/**
 * Checks if the file paths contain a lockfile.
 * @param filePaths - The file paths to check.
 * @returns True if the file paths contain a lockfile, false otherwise.
 */
export function hasLockfile(filePaths: string[]): boolean {
	return filePaths.some((filePath) => {
		return isLockfile(filePath);
	});
}

if (import.meta.vitest) {
	const { it, expect, describe } = import.meta.vitest;

	describe("hasLockfile", () => {
		it("returns true if file paths contain any lockfile", () => {
			expect(hasLockfile(["src/index.ts", "pnpm-lock.yaml"])).toBe(true);
			expect(hasLockfile(["src/index.ts", "bun.lock"])).toBe(true);
			expect(hasLockfile(["deno.lock", "package.json"])).toBe(true);
		});

		it("returns false if no lockfile present", () => {
			expect(hasLockfile(["src/index.ts", "package.json"])).toBe(false);
		});

		it("returns false for empty array", () => {
			expect(hasLockfile([])).toBe(false);
		});
	});
}
