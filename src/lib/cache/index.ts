/**
 * Cache cleanup module public API
 *
 * Provides task factories for npm and yarn cache cleanup operations.
 * Integrates with Phase 2 detection and Phase 3 executor infrastructure.
 */

// Main factory export
export { createCacheCleanupTasks } from "./tasks";

// Individual task factories
export { createNpmCacheTask } from "./npm";
export { createYarnCacheTask } from "./yarn";

// Type exports
export type { YarnVersion } from "./types";
