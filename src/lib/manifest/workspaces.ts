import { P, match } from "ts-pattern";
import type { PackageJson, PnpmWorkspace } from "./types";

/**
 * Checks if the package.json file has workspaces.
 * @param packageJson - The package.json file to check.
 * @returns True if the package.json file has workspaces, false otherwise.
 */
export function hasWorkspaces(
	packageJson: PackageJson | PnpmWorkspace,
): boolean {
	return match(packageJson)
		.with({ workspaces: P.nullish }, () => false)
		.with({ packages: P.nullish }, () => false)
		.with({ workspaces: P.array() }, ({ workspaces }) => workspaces.length > 0)
		.with({ packages: P.array() }, ({ packages }) => packages.length > 0)
		.with(
			{ workspaces: P.shape({ packages: P.array() }) },
			({ workspaces }) => workspaces.packages.length > 0,
		)
		.otherwise(() => false);
}

if (import.meta.vitest) {
	const { it, expect, describe } = import.meta.vitest;

	describe("hasWorkspaces > package.json", () => {
		it("returns true if workspaces is an array", () => {
			const packageJson = {
				workspaces: ["packages/*"],
			};

			const result = hasWorkspaces(packageJson);
			expect(result).toBe(true);
		});

		it("returns true if workspaces is an object with packages", () => {
			const packageJson = {
				workspaces: {
					packages: ["packages/*"],
				},
			};

			const result = hasWorkspaces(packageJson);
			expect(result).toBe(true);
		});

		it("returns false if workspaces is not an array or object", () => {
			const packageJson = {
				workspaces: undefined,
			} as PackageJson;

			const result = hasWorkspaces(packageJson);
			expect(result).toBe(false);
		});

		it("returns false if workspaces array is empty", () => {
			const packageJson = {
				workspaces: [],
			};

			const result = hasWorkspaces(packageJson);
			expect(result).toBe(false);
		});

		it("returns false if workspaces object has empty packages array", () => {
			const packageJson = {
				workspaces: {
					packages: [],
				},
			};

			const result = hasWorkspaces(packageJson);
			expect(result).toBe(false);
		});
	});
}
