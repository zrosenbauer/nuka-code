import { readFile } from "node:fs/promises";
import path from "node:path";
import { match } from "ts-pattern";
import YAML from "yaml";
import type { PnpmWorkspace } from "./types";

/**
 * Reads the pnpm workspace file at the given path and returns the workspace object.
 * @param filePath - The path to the pnpm workspace file.
 * @returns The workspace object.
 */
export async function readPnpmWorkspace(
	filePath: string,
): Promise<PnpmWorkspace> {
	const finalPath = match(filePath)
		.when(
			(p) => p.endsWith("/pnpm-workspace.yaml"),
			(p) => p,
		)
		.when(
			(p) => p.endsWith("/pnpm-workspace.yml"),
			(p) => p,
		)
		.otherwise((p) => `${p}/pnpm-workspace.yaml`);

	const workspace = await readFile(path.resolve(finalPath), "utf8");
	return YAML.parse(workspace);
}

if (import.meta.vitest) {
	const { it, expect, describe, beforeAll, beforeEach, vi } = import.meta
		.vitest;

	describe("readPnpmWorkspace", () => {
		beforeAll(() => {
			vi.mock("node:fs/promises", () => ({
				readFile: vi.fn(),
			}));
		});

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it("reads the pnpm workspace file", async () => {
			const mockWorkspace = `
packages:
  - "packages/*"
  - "apps/*"
      `.trim();

			vi.mocked(readFile).mockResolvedValueOnce(mockWorkspace);

			const workspace = await readPnpmWorkspace("pnpm-workspace.yaml");
			expect(workspace).toBeDefined();
		});
	});
}
