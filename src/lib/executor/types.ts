/**
 * Executor type definitions
 *
 * Type contracts for task execution, results, and configuration.
 * Used by the executor and cleanup modules.
 */

/**
 * Execution mode for task scheduling
 * - 'auto': parallel-safe tasks run concurrently, CLI commands run sequentially
 * - 'sequential': all tasks run serially (exposed via --sequential flag)
 */
export type ExecutionMode = "auto" | "sequential";

/**
 * Description of what a task will do (for dry-run mode)
 */
export interface TaskDescription {
	/** What this task will do (e.g., "delete", "run") */
	action: string;
	/** Target of the action (path, command, etc.) */
	target: string;
}

/**
 * Result of executing a task
 */
export interface TaskResult {
	/** Whether the task completed successfully */
	success: boolean;
	/** Human-readable message for display */
	message: string;
	/** Optional detailed info (e.g., paths deleted) - hidden by default */
	details?: string[];
	/** True if task found nothing to do */
	noop: boolean;
}

/**
 * Task execution options passed to the execute method
 */
export interface TaskExecuteOptions {
	/** Abort signal for cancellation */
	signal: AbortSignal;
	/** Optional callback for progress updates */
	onProgress?: (message: string) => void;
}

/**
 * A single cleanup operation that knows how to execute and describe itself
 */
export interface Task {
	/** Unique identifier for the task */
	id: string;
	/** Human-readable title for progress display */
	title: string;
	/** Whether this task is safe to run in parallel with others */
	parallelSafe: boolean;

	/**
	 * Execute the task, respecting the abort signal
	 * @param options Execution options including signal and progress callback
	 * @returns Promise resolving to the task result
	 */
	execute(options: TaskExecuteOptions): Promise<TaskResult>;

	/**
	 * Return what this task would do without executing (for dry-run)
	 * @returns Description of the task action
	 */
	describe(): TaskDescription;
}

/**
 * Options for the task executor
 */
export interface ExecutorOptions {
	/** Execution mode: auto separates parallel-safe/sequential, sequential runs all serially */
	mode: ExecutionMode;
	/** Concurrency limit for parallel tasks (auto mode only) */
	concurrency: number;
	/** Dry-run mode: describe tasks without executing */
	dryRun: boolean;
	/** Abort signal for cancellation */
	signal?: AbortSignal;
}

/**
 * Summary of execution results
 */
export interface ExecutionSummary {
	/** Results from all executed tasks */
	results: TaskResult[];
	/** Total execution time in milliseconds */
	totalTime: number;
	/** Whether execution was cancelled */
	cancelled: boolean;
}
