/**
 * Detects the root directory of a project based on the provided file paths.
 */
export async function inferRootDirectory(
	filePaths: string[],
): Promise<string | null> {
	if (filePaths.length === 0) {
		return null;
	}

	// Get the directory paths for each file
	const dirPaths = filePaths.map((path) => {
		const lastSlashIndex = path.lastIndexOf("/");
		return lastSlashIndex === -1 ? "" : path.substring(0, lastSlashIndex);
	});

	// If all paths are in the same directory, return that directory
	const firstDir = dirPaths[0];
	if (dirPaths.every((dir) => dir === firstDir)) {
		return firstDir;
	}

	// If paths are in different directories, return root
	return "/";
}

if (import.meta.vitest) {
	const { test, expect, describe } = import.meta.vitest;

	describe("inferRootDirectory", () => {
		test("inferRootDirectory returns root directory", async () => {
			const result1 = await inferRootDirectory([
				"/test/project/package.json",
				"/test/project/README.md",
			]);
			expect(result1).toBe("/test/project");
			const result2 = await inferRootDirectory([
				"/test/project/package.json",
				"/test/project/README.md",
				"/test/foobar.ts",
				"/test/barfoo/baz.ts",
				"/bar/foo/baz.ts",
				"/bar/foo/baz.ts",
			]);
			expect(result2).toBe("/");
		});

		test("inferRootDirectory returns null if no file paths are provided", async () => {
			const result = await inferRootDirectory([]);
			expect(result).toBeNull();
		});
	});
}

/**
 * Remove duplicates from an array.
 * @param array - The array to remove duplicates from.
 * @returns The array with duplicates removed.
 */
export function unique<T>(array: T[]): T[] {
	return Array.from(new Set(array));
}

/**
 * Convert file paths to glob patterns to include ALL files matching (deep vs root level)
 * @param filePaths - The file paths to convert.
 * @returns The glob patterns.
 */
export function toDeepGlob(filePaths: string[]) {
	return unique(
		filePaths.flatMap((filePath) => {
			if (filePath.includes("node_modules")) {
				return [filePath, `**/${filePath}`];
			}

			return [filePath, `**/[!node_modules]**/${filePath}`];
		}),
	);
}

if (import.meta.vitest) {
	const { test, expect, describe } = import.meta.vitest;

	describe("toDeepGlob", () => {
		test("toDeepGlob returns the correct glob patterns", () => {
			const result = toDeepGlob(["test/project/package.json"]);
			expect(result).toBe([
				"test/project/package.json",
				"**/[!node_modules]**/test/project/package.json",
			]);
		});
	});
}
