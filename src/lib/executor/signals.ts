/**
 * Signal handling for task execution
 *
 * Provides SIGINT (Ctrl+C) handling with AbortController integration
 * for immediate cancellation of running tasks.
 */

/**
 * Signal handler interface for cancellation support
 */
export interface SignalHandler {
	/** AbortSignal to pass to tasks for cancellation */
	signal: AbortSignal;
	/** Programmatically trigger abort (for fail-fast) */
	abort(): void;
	/** Remove SIGINT listener (cleanup) */
	cleanup(): void;
}

/**
 * Creates a signal handler for SIGINT (Ctrl+C) handling
 *
 * The handler:
 * - Creates an AbortController for cancellation signaling
 * - Registers a SIGINT handler that triggers abort
 * - Removes itself after first trigger (allows second Ctrl+C to force exit)
 * - Does NOT call process.exit() (lets natural flow complete)
 *
 * @returns SignalHandler with signal, abort, and cleanup methods
 */
export function createSignalHandler(): SignalHandler {
	const controller = new AbortController();
	let isCleanedUp = false;

	// Handler that triggers abort on SIGINT
	const sigintHandler = (): void => {
		controller.abort();
		// Remove handler to allow second Ctrl+C to force exit
		process.off("SIGINT", sigintHandler);
		isCleanedUp = true;
	};

	// Register the SIGINT handler
	process.on("SIGINT", sigintHandler);

	return {
		signal: controller.signal,

		abort(): void {
			controller.abort();
		},

		cleanup(): void {
			// Only remove if not already removed by SIGINT trigger
			if (!isCleanedUp) {
				process.off("SIGINT", sigintHandler);
				isCleanedUp = true;
			}
		},
	};
}
