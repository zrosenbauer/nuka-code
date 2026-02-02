/**
 * yarn cache cleanup task factory
 *
 * Creates Tasks for Yarn cache cleanup, handling both Classic (v1) and Berry (v2+).
 * - Classic: `yarn cache clean`
 * - Berry: `yarn cache clean --all`
 */

import type {
	Task,
	TaskDescription,
	TaskExecuteOptions,
	TaskResult,
} from "#/lib/executor";
import type { YarnVersion } from "./types";
import { runCacheCommand } from "./utils";

/**
 * Create a task for yarn cache cleanup
 *
 * @param version - Yarn version: 'classic' for v1, 'berry' for v2+
 * @returns Task that executes the appropriate yarn cache clean command
 */
export function createYarnCacheTask(version: YarnVersion): Task {
	const command =
		version === "berry" ? ["cache", "clean", "--all"] : ["cache", "clean"];

	const displayCommand =
		version === "berry" ? "yarn cache clean --all" : "yarn cache clean";

	return {
		id: `yarn-${version}-cache-clean`,
		title: "yarn cache",
		parallelSafe: false,

		async execute(options: TaskExecuteOptions): Promise<TaskResult> {
			return runCacheCommand("yarn", command, options);
		},

		describe(): TaskDescription {
			return {
				action: "Would run",
				target: displayCommand,
			};
		},
	};
}
