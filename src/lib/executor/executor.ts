/**
 * Core task executor
 *
 * Implements task execution with parallel/sequential modes, fail-fast error handling,
 * dry-run support, and cancellation via AbortController.
 */

import * as clack from "@clack/prompts";
import pLimit from "p-limit";

import { ProgressDisplay } from "./progress";
import type {
	ExecutionSummary,
	ExecutorOptions,
	Task,
	TaskResult,
} from "./types";

/** Default concurrency limit for parallel file operations */
const DEFAULT_CONCURRENCY = 4;

/**
 * Translate technical errors to user-friendly messages
 * @param error The error to translate
 * @returns User-friendly error message
 */
function translateError(error: Error): string {
	const message = error.message;

	if (message.includes("ENOENT")) {
		return "Directory not found";
	}
	if (message.includes("EACCES")) {
		return "Permission denied - try running with sudo";
	}
	if (message.includes("EBUSY")) {
		return "Files are in use by another process";
	}
	if (message.includes("EPERM")) {
		return "Operation not permitted";
	}

	return "An unexpected error occurred";
}

/**
 * Execute a dry-run, describing tasks without executing them
 * @param tasks Tasks to describe
 * @returns Empty execution summary
 */
function executeDryRun(tasks: Task[]): ExecutionSummary {
	clack.log.info("Dry run - no changes will be made:");

	for (const task of tasks) {
		const desc = task.describe();
		clack.log.step(`${desc.action}: ${desc.target}`);
	}

	return {
		results: tasks.map(() => ({
			success: true,
			message: "Dry run",
			noop: true,
		})),
		totalTime: 0,
		cancelled: false,
	};
}

/**
 * Execute tasks in parallel with concurrency control
 * @param tasks Tasks to execute (all should be parallelSafe=true)
 * @param options Executor options
 * @param progress Progress display instance
 * @returns Array of task results
 */
async function executeParallel(
	tasks: Task[],
	options: ExecutorOptions,
	progress: ProgressDisplay,
): Promise<TaskResult[]> {
	const limit = pLimit(options.concurrency || DEFAULT_CONCURRENCY);

	// Internal controller for fail-fast behavior
	const internalController = new AbortController();

	// Combine user signal with fail-fast signal using AbortSignal.any() (Node 20+)
	const combinedSignal = options.signal
		? AbortSignal.any([options.signal, internalController.signal])
		: internalController.signal;

	const results: TaskResult[] = [];
	let hasFailure = false;

	const promises = tasks.map((task) =>
		limit(async () => {
			// Check for abort before starting
			if (combinedSignal.aborted) {
				const result: TaskResult = {
					success: false,
					message: "Cancelled",
					noop: false,
				};
				progress.update(task.title, false);
				return result;
			}

			try {
				const result = await task.execute({
					signal: combinedSignal,
				});

				// Log warning for noop tasks per CONTEXT.md
				if (result.noop) {
					clack.log.warn(`${task.title}: nothing to clean`);
				}

				if (!result.success && !hasFailure) {
					// Fail-fast: cancel remaining tasks
					hasFailure = true;
					internalController.abort();
				}

				progress.update(task.title, result.success);
				return result;
			} catch (error) {
				// Fail-fast on error
				if (!hasFailure) {
					hasFailure = true;
					internalController.abort();
				}

				const result: TaskResult = {
					success: false,
					message: translateError(error as Error),
					noop: false,
				};
				progress.update(task.title, false);
				return result;
			}
		}),
	);

	const promiseResults = await Promise.all(promises);
	results.push(...promiseResults);

	return results;
}

/**
 * Execute tasks sequentially
 * @param tasks Tasks to execute
 * @param options Executor options
 * @param progress Progress display instance
 * @returns Array of task results
 */
async function executeSequentially(
	tasks: Task[],
	options: ExecutorOptions,
	progress: ProgressDisplay,
): Promise<TaskResult[]> {
	const results: TaskResult[] = [];

	for (const task of tasks) {
		// Check for abort before starting
		if (options.signal?.aborted) {
			results.push({
				success: false,
				message: "Cancelled",
				noop: false,
			});
			progress.update(task.title, false);
			continue;
		}

		try {
			const result = await task.execute({
				signal: options.signal ?? new AbortController().signal,
			});

			// Log warning for noop tasks per CONTEXT.md
			if (result.noop) {
				clack.log.warn(`${task.title}: nothing to clean`);
			}

			progress.update(task.title, result.success);
			results.push(result);

			// Fail-fast: stop on first failure
			if (!result.success) {
				// Mark remaining tasks as cancelled
				for (let i = results.length; i < tasks.length; i++) {
					results.push({
						success: false,
						message: "Cancelled (fail-fast)",
						noop: false,
					});
				}
				break;
			}
		} catch (error) {
			const result: TaskResult = {
				success: false,
				message: translateError(error as Error),
				noop: false,
			};
			progress.update(task.title, false);
			results.push(result);

			// Fail-fast: mark remaining as cancelled
			for (let i = results.length; i < tasks.length; i++) {
				results.push({
					success: false,
					message: "Cancelled (fail-fast)",
					noop: false,
				});
			}
			break;
		}
	}

	return results;
}

/**
 * Execute tasks according to the specified mode
 *
 * @param tasks Array of tasks to execute
 * @param options Executor configuration options
 * @returns ExecutionSummary with results, timing, and cancellation status
 *
 * @example
 * ```typescript
 * const tasks: Task[] = [
 *   { id: 'nm', title: 'node_modules', parallelSafe: true, execute, describe },
 *   { id: 'cache', title: 'Cache clear', parallelSafe: false, execute, describe },
 * ];
 *
 * const summary = await execute(tasks, {
 *   mode: 'auto',
 *   concurrency: 4,
 *   dryRun: false,
 *   signal: abortController.signal,
 * });
 * ```
 */
export async function execute(
	tasks: Task[],
	options: ExecutorOptions,
): Promise<ExecutionSummary> {
	// Handle dry-run mode early
	if (options.dryRun) {
		return executeDryRun(tasks);
	}

	const startTime = Date.now();
	const progress = new ProgressDisplay();
	const allResults: TaskResult[] = [];
	let cancelled = false;

	// Check for cancellation before starting
	if (options.signal?.aborted) {
		return {
			results: tasks.map(() => ({
				success: false,
				message: "Cancelled",
				noop: false,
			})),
			totalTime: 0,
			cancelled: true,
		};
	}

	progress.start(tasks.length);

	try {
		if (options.mode === "sequential") {
			// Sequential mode: all tasks run serially
			const results = await executeSequentially(tasks, options, progress);
			allResults.push(...results);
		} else {
			// Auto mode: parallel-safe tasks first, then sequential-only
			const parallelTasks = tasks.filter((t) => t.parallelSafe);
			const sequentialTasks = tasks.filter((t) => !t.parallelSafe);

			// Run parallel-safe tasks first
			if (parallelTasks.length > 0) {
				const parallelResults = await executeParallel(
					parallelTasks,
					options,
					progress,
				);
				allResults.push(...parallelResults);
			}

			// Check if parallel tasks triggered fail-fast
			const hasParallelFailure = allResults.some((r) => !r.success);

			// Run sequential-only tasks (unless already failed/cancelled)
			if (
				sequentialTasks.length > 0 &&
				!hasParallelFailure &&
				!options.signal?.aborted
			) {
				const sequentialResults = await executeSequentially(
					sequentialTasks,
					options,
					progress,
				);
				allResults.push(...sequentialResults);
			} else if (
				sequentialTasks.length > 0 &&
				(hasParallelFailure || options.signal?.aborted)
			) {
				// Mark sequential tasks as cancelled if parallel failed
				for (const task of sequentialTasks) {
					allResults.push({
						success: false,
						message: "Cancelled (fail-fast)",
						noop: false,
					});
				}
			}
		}

		// Check if execution was cancelled
		cancelled = options.signal?.aborted ?? false;

		if (cancelled) {
			progress.cancel();
		} else {
			const totalTime = Date.now() - startTime;
			progress.stop(totalTime);
		}

		return {
			results: allResults,
			totalTime: Date.now() - startTime,
			cancelled,
		};
	} catch (error) {
		// Handle unexpected errors during execution
		progress.cancel();
		return {
			results:
				allResults.length > 0
					? allResults
					: tasks.map(() => ({
							success: false,
							message: translateError(error as Error),
							noop: false,
						})),
			totalTime: Date.now() - startTime,
			cancelled: true,
		};
	}
}
