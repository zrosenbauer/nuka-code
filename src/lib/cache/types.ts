/**
 * Cache module type definitions
 */

/**
 * Yarn version for cache command selection
 * - 'classic': Yarn v1 (uses `yarn cache clean`)
 * - 'berry': Yarn v2+ (uses `yarn cache clean --all`)
 */
export type YarnVersion = "classic" | "berry";
