import { readFile } from "node:fs/promises";
import path from "node:path";
import { match } from "ts-pattern";
import type { PackageJson } from "./types";

/**
 * Reads the package.json file at the given path and returns null if it fails.
 * @param filePath - The path to the package.json file.
 * @returns The parsed package.json object or null if the file cannot be read or parsed.
 */
export async function readPackageJson(
	filePath: string,
): Promise<PackageJson | null> {
	try {
		return await readPackageJsonOrThrow(filePath);
	} catch (error) {
		return null;
	}
}

/**
 * Reads the package.json file at the given path and throws an error if it fails.
 * @param filePath - The path to the package.json file.
 * @returns The parsed package.json object.
 * @throws An error if the package.json file cannot be read or parsed.
 */
export async function readPackageJsonOrThrow(
	filePath: string,
): Promise<PackageJson> {
	const finalPath = match(filePath)
		.when(
			(p) => p.endsWith("/package.json"),
			(p) => p,
		)
		.otherwise((p) => `${p}/package.json`);
	const packageJson = await readFile(finalPath, "utf8");
	return JSON.parse(packageJson);
}

/**
 * Checks if a dependency is present in the package.json file.
 * @param packageJson - The package.json file to check.
 * @param dependency - The dependency to check for.
 * @returns An object with the types of the dependency and whether it is present.
 */
export function hasDependency(
	packageJson: PackageJson,
	dependency: string,
): boolean {
	const devDeps = packageJson.devDependencies
		? Object.keys(packageJson.devDependencies)
		: [];
	const prodDeps = packageJson.dependencies
		? Object.keys(packageJson.dependencies)
		: [];

	return devDeps.includes(dependency) || prodDeps.includes(dependency);
}

if (import.meta.vitest) {
	const { expect, vi, describe, beforeEach, beforeAll, it } = import.meta
		.vitest;

	describe("package.json", () => {
		beforeAll(() => {
			vi.mock("node:fs/promises", () => ({
				readFile: vi.fn(),
			}));
		});

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it("readPackageJson returns package.json object", async () => {
			const mockPackageJson = {
				name: "test-project",
				version: "1.0.0",
				dependencies: {
					"test-dep": "^1.0.0",
				},
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

		it("readPackageJson returns null if file does not exist or errored", async () => {
			vi.mocked(readFile).mockRejectedValueOnce(new Error("File not found"));

			const result = await readPackageJson("/test/project/does-not-exist.json");
			expect(result).toBeNull();
		});

		it("readPackageJsonOrThrow throws error if file does not exist or errored", async () => {
			vi.mocked(readFile).mockRejectedValueOnce(new Error("File not found"));

			await expect(
				readPackageJsonOrThrow("/test/project/does-not-exist.json"),
			).rejects.toThrow("File not found");
		});
	});

	describe("hasDependency", () => {
		it("returns true if dependency is present in devDependencies", () => {
			const packageJson = {
				devDependencies: {
					"test-dep": "^1.0.0",
				},
			};

			const result = hasDependency(packageJson, "test-dep");
			expect(result).toBe(true);
		});

		it("returns true if dependency is present in dependencies", () => {
			const packageJson = {
				dependencies: {
					"test-dep": "^1.0.0",
				},
			};

			const result = hasDependency(packageJson, "test-dep");
			expect(result).toBe(true);
		});

		it("returns false if dependency is not present in devDependencies", () => {
			const packageJson = {
				devDependencies: {
					"test-dep": "^1.0.0",
				},
			};

			const result = hasDependency(packageJson, "not-a-dep");
			expect(result).toBe(false);
		});

		it("returns false if dependency is not present in dependencies", () => {
			const packageJson = {
				dependencies: {
					"test-dep": "^1.0.0",
				},
			};

			const result = hasDependency(packageJson, "not-a-dep");
			expect(result).toBe(false);
		});

		it("returns false if both dependencies and devDependencies are undefined", () => {
			const packageJson = {};

			const result = hasDependency(packageJson, "test-dep");
			expect(result).toBe(false);
		});
	});
}
