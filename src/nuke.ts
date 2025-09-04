import path from "node:path";
import ignore from "ignore";
import { rimraf } from "rimraf";
import { readIgnoreFile } from "#/lib/project";
import { toDeepGlob, unique } from "#/lib/utils";

/**
 * Nuke everything.
 * @param rootDir - The root directory of the project.
 * @returns The paths to the directories that should be nuked.
 */
export async function nukeEverything(rootDir = process.cwd()) {
	const runId = Date.now();
	const cache = await nukeCache(rootDir, runId);
	const builds = await nukeBuilds(rootDir, runId);
	const nodeModules = await nukeNodeModules(rootDir, runId);
	return {
		cache,
		builds,
		node_modules: nodeModules,
	};
}

/**
 * Nuke the node_modules directories.
 * @param rootDir - The root directory of the project.
 * @returns The paths to the node_modules directories that should be nuked.
 */
export async function nukeNodeModules(
	rootDir = process.cwd(),
	runId = Date.now(),
) {
	const ignoreHelper = await createIgnoreFileHelper(rootDir);
	return await rimraf(getNukeNodeModulesGlob(), {
		glob: true,
		filter: async (filePath) => {
			return !ignoreHelper.test(path.relative(rootDir, filePath)).ignored;
		},
	});
}

/**
 * Nuke the cache directories.
 * @param rootDir - The root directory of the project.
 * @returns The paths to the cache directories that should be nuked.
 */
export async function nukeCache(rootDir = process.cwd(), runId = Date.now()) {
	const ignoreHelper = await createIgnoreFileHelper(rootDir);
	return await rimraf(getNukeCacheGlob(), {
		glob: true,
		filter: async (filePath) => {
			return !ignoreHelper.test(path.relative(rootDir, filePath)).ignored;
		},
	});
}

/**
 * Nuke the build directories.
 * @param rootDir - The root directory of the project.
 * @returns The paths to the build directories that should be nuked.
 */
export async function nukeBuilds(rootDir = process.cwd(), runId = Date.now()) {
	const ignoreHelper = await createIgnoreFileHelper(rootDir);
	return await rimraf(getNukeBuildsGlob(), {
		glob: true,
		filter: async (filePath) => {
			return !ignoreHelper.test(path.relative(rootDir, filePath)).ignored;
		},
	});
}

/**
 * Nuke everything.
 * @returns The glob patterns to the directories that should be nuked.
 */
export function getNukeEverythingGlob() {
	return unique([
		...getNukeNodeModulesGlob(),
		...getNukeCacheGlob(),
		...getNukeBuildsGlob(),
	]);
}

/**
 * Get the glob patterns to the node_modules.
 * @returns The glob patterns to the directories that should be nuked.
 */
export function getNukeNodeModulesGlob() {
	return [
		// Deeply nested node_modules
		"node_modules",
		"**/node_modules",

		// Yarn 2+
		".pnp.cjs",
		".pnp.loader.mjs",
	];
}

/**
 * Get the glob patterns to the cache.
 * @returns The glob patterns to the directories that should be nuked.
 */
export function getNukeCacheGlob() {
	return toDeepGlob([".turbo", ".nx/cache"]);
}

/**
 * Get the glob patterns to the builds.
 * @returns The glob patterns to the directories that should be nuked.
 */
export function getNukeBuildsGlob() {
	return toDeepGlob([
		// Build artifacts
		"dist",
		"out",
		"output",
		"outputs",
		"bundle",
		".output",
		".outputs",
		".build",

		// Frameworks
		".vercel",
		".next",
		".nuxt",
		".svelte-kit",
		".vinxi",
		".vuepress/dist",
		"storybook-static",
		"coverage",
		"public/build",
	]);
}

/**
 * Create a helper to check if a file is ignored.
 * @param rootDir - The root directory of the project.
 * @returns The ignore file helper.
 */
export async function createIgnoreFileHelper(rootDir = process.cwd()) {
	const ignoreFile = await readIgnoreFile(rootDir);
	return ignore().add(ignoreFile ?? "");
}
