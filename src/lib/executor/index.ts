/**
 * Executor module public API
 *
 * Provides task execution infrastructure with parallel/sequential modes,
 * progress display, signal handling, and cancellation support.
 */

// Type exports
export type {
	Task,
	TaskResult,
	TaskDescription,
	TaskExecuteOptions,
	ExecutorOptions,
	ExecutionMode,
	ExecutionSummary,
} from "./types";

// Signal handling exports
export { createSignalHandler, type SignalHandler } from "./signals";

// Progress display exports
export { ProgressDisplay } from "./progress";

// Main executor export
export { execute } from "./executor";
