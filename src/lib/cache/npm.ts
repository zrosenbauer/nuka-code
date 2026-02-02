/**
 * npm cache cleanup task factory
 *
 * Creates a Task that executes `npm cache clean --force`.
 * The --force flag is required since npm v5.
 */

import type {
	Task,
	TaskDescription,
	TaskExecuteOptions,
	TaskResult,
} from "#/lib/executor";
import { runCacheCommand } from "./utils";

/**
 * Create a task for npm cache cleanup
 *
 * @returns Task that executes `npm cache clean --force`
 */
export function createNpmCacheTask(): Task {
	return {
		id: "npm-cache-clean",
		title: "npm cache",
		parallelSafe: false,

		async execute(options: TaskExecuteOptions): Promise<TaskResult> {
			return runCacheCommand("npm", ["cache", "clean", "--force"], options);
		},

		describe(): TaskDescription {
			return {
				action: "Would run",
				target: "npm cache clean --force",
			};
		},
	};
}
