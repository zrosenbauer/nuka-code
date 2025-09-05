import path from "node:path";
import { match } from "ts-pattern";

export function isLockfile(filePath: string) {
	return match(path.basename(filePath))
		.with("pnpm-lock.yaml", () => true)
		.with("yarn.lock", () => true)
		.with("package-lock.json", () => true)
		.otherwise(() => false);
}

if (import.meta.vitest) {
	const { it, expect, describe } = import.meta.vitest;

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
}

/**
 * Checks if the file paths contain a lockfile.
 * @param filePaths - The file paths to check.
 * @returns True if the file paths contain a lockfile, false otherwise.
 */
export function hasLockfile(filePaths: string[]) {
	return filePaths.some((filePath) => {
		return isLockfile(filePath);
	});
}

if (import.meta.vitest) {
	const { it, expect, describe } = import.meta.vitest;

	describe("hasLockfile", () => {
		it("returns true if file paths contain pnpm-lock.yaml", () => {
			const filePaths = ["src/index.ts", "pnpm-lock.yaml", "package.json"];
			const result = hasLockfile(filePaths);
			expect(result).toBe(true);
		});

		it("returns true if file paths contain yarn.lock", () => {
			const filePaths = ["src/index.ts", "yarn.lock", "package.json"];
			const result = hasLockfile(filePaths);
			expect(result).toBe(true);
		});

		it("returns true if file paths contain package-lock.json", () => {
			const filePaths = ["src/index.ts", "package-lock.json", "package.json"];
			const result = hasLockfile(filePaths);
			expect(result).toBe(true);
		});

		it("returns false if file paths do not contain any lockfile", () => {
			const filePaths = ["src/index.ts", "package.json", "README.md"];
			const result = hasLockfile(filePaths);
			expect(result).toBe(false);
		});

		it("returns false for empty array", () => {
			const filePaths: string[] = [];
			const result = hasLockfile(filePaths);
			expect(result).toBe(false);
		});
	});
}
