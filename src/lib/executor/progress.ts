/**
 * Progress display for task execution
 *
 * Provides aggregate spinner progress during parallel task execution.
 * Uses a single @clack/prompts spinner with dynamic status updates.
 */

import * as clack from "@clack/prompts";

/**
 * Progress display class for task execution feedback
 *
 * Manages a single spinner showing aggregate progress of tasks.
 * Updates spinner message as tasks complete, shows final summary.
 */
export class ProgressDisplay {
	private spinner = clack.spinner();
	private completed = 0;
	private total = 0;
	private failed = 0;
	private baseMessage = "Cleaning up";

	/**
	 * Start the progress display
	 * @param total Total number of tasks to execute
	 * @param message Optional base message (default: "Cleaning up")
	 */
	start(total: number, message?: string): void {
		this.total = total;
		this.completed = 0;
		this.failed = 0;
		this.baseMessage = message ?? "Cleaning up";

		this.spinner.start(this.formatMessage());
	}

	/**
	 * Update progress after a task completes
	 * @param taskTitle Title of the completed task (for logging, not displayed in aggregate)
	 * @param success Whether the task succeeded
	 */
	update(taskTitle: string, success: boolean): void {
		this.completed++;
		if (!success) {
			this.failed++;
		}
		this.spinner.message(this.formatMessage());
	}

	/**
	 * Stop the spinner with a completion message
	 * @param totalTime Total execution time in milliseconds
	 */
	stop(totalTime: number): void {
		if (this.failed > 0) {
			this.spinner.stop(
				`Completed with ${this.failed} error${this.failed > 1 ? "s" : ""}`,
			);
		} else {
			this.spinner.stop(`Done in ${this.formatTime(totalTime)}`);
		}
	}

	/**
	 * Stop the spinner with a cancellation message
	 */
	cancel(): void {
		this.spinner.stop("Cancelled");
	}

	/**
	 * Format the progress message
	 * Example: "Cleaning up... (3/10)"
	 */
	private formatMessage(): string {
		return `${this.baseMessage}... (${this.completed}/${this.total})`;
	}

	/**
	 * Format time as human-readable string
	 * Shows ms for < 1000ms, otherwise shows seconds with 1 decimal
	 */
	private formatTime(ms: number): string {
		if (ms < 1000) {
			return `${Math.round(ms)}ms`;
		}
		return `${(ms / 1000).toFixed(1)}s`;
	}
}
