import fs from "node:fs/promises";
import path from "node:path";
import { LOCKS } from "package-manager-detector/constants";
import { detect as pmDetect } from "package-manager-detector/detect";
import type { Agent, AgentName, DetectionResult, LockfileInfo } from "./types";

/**
 * Check if a file exists
 */
async function exists(filepath: string): Promise<boolean> {
	try {
		await fs.access(filepath);
		return true;
	} catch {
		return false;
	}
}

/**
 * Detect all lockfiles in a directory
 */
export async function detectAllLockfiles(cwd: string): Promise<LockfileInfo[]> {
	const results: LockfileInfo[] = [];

	for (const [filename, pm] of Object.entries(LOCKS)) {
		const filepath = path.join(cwd, filename);
		if (await exists(filepath)) {
			results.push({
				name: filename,
				path: filepath,
				packageManager: pm as AgentName,
			});
		}
	}

	return results;
}

/**
 * Detect Bun lockfile format
 * - 'text' = bun.lock (new format, Bun 1.2+)
 * - 'binary' = bun.lockb (legacy format)
 * - null = no bun lockfile
 */
export async function detectBunLockfileFormat(
	cwd: string,
): Promise<"text" | "binary" | null> {
	// bun.lock (text) takes precedence over bun.lockb (binary)
	if (await exists(path.join(cwd, "bun.lock"))) {
		return "text";
	}
	if (await exists(path.join(cwd, "bun.lockb"))) {
		return "binary";
	}
	return null;
}

/**
 * Detect package manager for a directory
 *
 * Uses package-manager-detector for primary detection, extended with:
 * - Multi-lockfile detection for migration scenarios
 * - Bun lockfile format detection
 */
export async function detect(
	cwd: string = process.cwd(),
): Promise<DetectionResult> {
	// Detect primary package manager using all strategies
	const pmResult = await pmDetect({
		cwd,
	});

	// Detect all lockfiles for migration scenario awareness
	const lockfiles = await detectAllLockfiles(cwd);

	// Detect bun lockfile format if applicable
	const bunLockfileFormat =
		pmResult?.name === "bun" ? await detectBunLockfileFormat(cwd) : null;

	// Count unique package managers (bun.lock and bun.lockb count as one)
	const uniquePMs = new Set(lockfiles.map((l) => l.packageManager));

	return {
		primary: pmResult
			? {
					name: pmResult.name as AgentName,
					agent: pmResult.agent as Agent,
					version: pmResult.version,
				}
			: null,
		lockfiles,
		hasMultipleLockfiles: uniquePMs.size > 1,
		bunLockfileFormat,
	};
}
