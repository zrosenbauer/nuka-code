/**
 * Cache module utilities
 *
 * Provides shell command execution for cache cleanup operations.
 */

import { spawn } from "node:child_process";
import type { TaskExecuteOptions, TaskResult } from "#/lib/executor";

/**
 * Execute a cache cleanup command via shell
 *
 * Uses spawn with shell:true for PATH resolution and AbortSignal support.
 * Captures stderr for error reporting while ignoring stdout.
 *
 * @param command - The command to run (e.g., 'npm', 'yarn')
 * @param args - Command arguments (e.g., ['cache', 'clean', '--force'])
 * @param options - Task execution options including abort signal
 * @returns Promise resolving to TaskResult
 */
export async function runCacheCommand(
	command: string,
	args: string[],
	options: TaskExecuteOptions,
): Promise<TaskResult> {
	return new Promise((resolve) => {
		const child = spawn(command, args, {
			shell: true,
			stdio: ["ignore", "pipe", "pipe"],
			signal: options.signal,
		});

		let stderr = "";

		child.stderr?.on("data", (data: Buffer) => {
			stderr += data.toString();
		});

		child.on("error", (err: Error) => {
			if (err.name === "AbortError") {
				resolve({ success: false, message: "Cancelled", noop: false });
			} else {
				// Command not found or spawn error
				const errorDetail = stderr ? stderr.trim() : err.message;
				resolve({
					success: false,
					message: `${command} cache clean failed: ${errorDetail}`,
					noop: false,
				});
			}
		});

		child.on("close", (code: number | null) => {
			if (code === 0) {
				resolve({
					success: true,
					message: `${command} cache cleaned`,
					noop: false,
				});
			} else {
				const errorSuffix = stderr ? `: ${stderr.trim()}` : "";
				resolve({
					success: false,
					message: `${command} cache clean failed${errorSuffix}`,
					noop: false,
				});
			}
		});
	});
}
