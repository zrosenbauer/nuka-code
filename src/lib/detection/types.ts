/**
 * Package manager name without version specifier
 */
export type AgentName = "npm" | "yarn" | "pnpm" | "bun" | "deno";

/**
 * Agent identifier with optional version specifier
 * - 'yarn' = Classic (v1)
 * - 'yarn@berry' = v2+
 * - 'pnpm@6' = pnpm 6.x
 * - 'pnpm' = pnpm 7+
 */
export type Agent =
	| "npm"
	| "yarn"
	| "yarn@berry"
	| "pnpm"
	| "pnpm@6"
	| "bun"
	| "deno";

/**
 * Information about a detected lockfile
 */
export interface LockfileInfo {
	/** Lockfile filename (e.g., 'yarn.lock', 'bun.lock') */
	name: string;
	/** Full path to the lockfile */
	path: string;
	/** Package manager that owns this lockfile */
	packageManager: AgentName;
}

/**
 * Result of package manager detection
 */
export interface DetectionResult {
	/** Primary detected package manager, null if none found */
	primary: {
		/** Package manager name */
		name: AgentName;
		/** Agent identifier with version (use for cache command decisions) */
		agent: Agent;
		/** Version string if available (from packageManager field) */
		version?: string;
	} | null;

	/** All lockfiles found in the directory */
	lockfiles: LockfileInfo[];

	/** True if multiple package managers detected (migration scenario) */
	hasMultipleLockfiles: boolean;

	/** Bun lockfile format if bun detected, null otherwise */
	bunLockfileFormat: "text" | "binary" | null;
}
