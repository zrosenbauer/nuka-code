/**
 * Cache cleanup task factory
 *
 * Creates cache cleanup tasks from detection results.
 * Maps detected package managers to their appropriate cache cleanup commands.
 */

import type { DetectionResult } from "#/lib/detection";
import type { Task } from "#/lib/executor";
import { createNpmCacheTask } from "./npm";
import { createYarnCacheTask } from "./yarn";

/**
 * Create cache cleanup tasks based on detection result
 *
 * Uses the `agent` field from detection to select the correct cache command:
 * - 'npm' -> npm cache clean --force
 * - 'yarn' -> yarn cache clean (Classic v1)
 * - 'yarn@berry' -> yarn cache clean --all (v2+)
 *
 * @param detection - Detection result from Phase 2 detection module
 * @returns Array of cache cleanup tasks (empty if no PM detected)
 */
export function createCacheCleanupTasks(detection: DetectionResult): Task[] {
	const tasks: Task[] = [];

	if (detection.primary === null) {
		return tasks;
	}

	const { agent } = detection.primary;

	if (agent === "npm") {
		tasks.push(createNpmCacheTask());
	} else if (agent === "yarn") {
		tasks.push(createYarnCacheTask("classic"));
	} else if (agent === "yarn@berry") {
		tasks.push(createYarnCacheTask("berry"));
	}

	return tasks;
}
