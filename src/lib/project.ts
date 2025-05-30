import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { cp } from "node:fs/promises";
import path from "node:path";
import consola from "consola";
import { exists } from "#/lib/fs";
import { hasLockfile, readPackageJson } from "#/lib/node-manifest";

const DIR_CACHE = ".nuke";
const FILE_IGNORE = ".nukeignore";
const FILE_GITIGNORE = ".gitignore";

let ignoreFileCache: string | null = null;
/**
 * Get the ignore file for the project.
 * @param filePath - The path to the project.
 * @returns The ignore file for the project.
 */
export async function readIgnoreFile(filePath = process.cwd()) {
	try {
		if (ignoreFileCache) {
			return ignoreFileCache;
		}

		const ignoreFile = path.join(filePath, FILE_IGNORE);
		ignoreFileCache = await readFile(ignoreFile, "utf8");
		return ignoreFileCache;
	} catch (error) {
		return null;
	}
}

/**
 * Check if there are existing backups.
 * @param rootDir - The root directory of the project.
 * @returns True if there are existing backups, false otherwise.
 */
export async function hasExistingBackups(rootDir = process.cwd()) {
	try {
		const backupDir = path.join(rootDir, DIR_CACHE);
		const existingBackups = await readdir(backupDir);
		return existingBackups.length > 0;
	} catch (error) {
		return false;
	}
}

/**
 * @todo implement this
 * Create a backup of the files.
 * @param filePaths - The paths to the files to backup.
 * @param rootDir - The root directory of the project.
 */
export async function backup(
	filePaths: string[],
	runId: number,
	rootDir = process.cwd(),
) {
	if (!(await exists(rootDir))) {
		throw new Error("Unable to create backup, file does not exist");
	}

	const backupDir = path.join(rootDir, DIR_CACHE, `backup-${runId}`);

	if (!(await exists(backupDir))) {
		await mkdir(backupDir, { recursive: true });
	}

	const backups = filePaths.map(async (filePath) => {
		const backupFilePath = path.join(backupDir, filePath);
		await cp(filePath, `${backupFilePath}/`, { recursive: true });
	});

	await Promise.all(backups);
}

/**
 * Clean the backup directory.
 * @param rootDir - The root directory of the project.
 */
export async function cleanBackup(rootDir = process.cwd()) {
	const backupDir = path.join(rootDir, DIR_CACHE);
	await rm(backupDir, { recursive: true });
	await mkdir(backupDir, { recursive: true });
}

/**
 * Check if the project is initialized.
 * @param filePath - The path to the project.
 * @returns True if the project is initialized, false otherwise.
 */
export async function isInitialized(filePath = process.cwd()) {
	const ignoreFile = path.join(filePath, FILE_IGNORE);
	// const cacheDir = path.join(filePath, DIR_CACHE);

	return await exists(ignoreFile);
	// return (await exists(ignoreFile)) && (await exists(cacheDir));
}

/**
 * Initialize the project.
 * @param filePath - The path to the project.
 * @param force - Whether to force initialize the project.
 */
export async function initialize(
	filePath = process.cwd(),
	force = false,
): Promise<boolean> {
	const cacheDir = path.join(filePath, DIR_CACHE);
	const ignoreFile = path.join(filePath, FILE_IGNORE);
	const gitignoreFile = path.join(filePath, FILE_GITIGNORE);

	if (!(await exists(cacheDir))) {
		const packageJson = await readPackageJson(
			path.join(process.cwd(), "package.json"),
		);

		if (!packageJson) {
			throw new Error(
				"No package.json found in current working directory, please run this command in the root of your project.",
			);
		}

		const root = await (async () => {
			if (force === true) {
				return true;
			}

			const root = await isRoot();
			if (!root) {
				consola.info(
					`Uh oh! You don't have a ${DIR_CACHE} directory in your current working directory.`,
				);

				return await consola.prompt("Are you in the root of your project?", {
					type: "confirm",
					default: false,
				});
			}

			return root;
		})();

		if (root && !(await isInitialized(filePath))) {
			consola.info("Initializing project...");

			// if (!(await exists(cacheDir))) {
			// 	await mkdir(cacheDir);
			// }

			if (!(await exists(ignoreFile))) {
				await writeFile(
					ignoreFile,
					"# Add your project's ignore patterns here for the files you DO NOT want to nuke",
				);
			}
			await appendToGitignore(gitignoreFile);
			return true;
		}
	}
	return false;
}

async function appendToGitignore(gitignoreFile: string) {
	const nukeIgnoreContents = `
# Nuke (nuka-cola)
.nuke
!.nukeignore
`.trim();

	if (!(await exists(gitignoreFile))) {
		consola.info("No .gitignore file found, creating one...");
		await writeFile(gitignoreFile, `${nukeIgnoreContents}\n`);
	}

	const gitignoreContents = await readFile(gitignoreFile, "utf8");

	if (gitignoreContents.includes(".nuke")) {
		return;
	}

	await writeFile(
		gitignoreFile,
		`${gitignoreContents}\n${nukeIgnoreContents}\n`,
	);
}

async function isRoot(filePath = process.cwd()) {
	const allFilePaths = await readdir(filePath);
	return hasLockfile(allFilePaths);
}
