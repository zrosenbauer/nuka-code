#!/usr/bin/env node

import * as clack from "@clack/prompts";
import { glob } from "glob";
import pc from "picocolors";
import { P, match } from "ts-pattern";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import ascii from "#/lib/ascii";
import { isGitDirty } from "#/lib/git";
import { initialize, isInitialized } from "#/lib/project";
import { printTree } from "#/lib/tree";
import {
	createIgnoreFileHelper,
	getNukeEverythingGlob,
	nukeBuilds,
	nukeCache,
	nukeEverything,
	nukeNodeModules,
} from "#/nuke";

const cli = yargs(hideBin(process.argv));

cli
	.scriptName("nuke")
	.version()
	.wrap(Math.min(100, cli.terminalWidth()))
	.usage(
		[
			match(cli.terminalWidth())
				.with(
					P.number,
					(s) => s > 100,
					() => ascii.logo,
				)
				.with(
					P.number,
					(s) => s >= 80,
					() => ascii.logoSmall,
				)
				.otherwise(() => `☢️ ${pc.bold(pc.green("Nuka-Code"))}`),
			match(cli.terminalWidth())
				.with(
					P.number,
					(s) => s >= 80,
					() =>
						"\n--------------------------------------------------------------------------\n",
				)
				.otherwise(() => "---------------------------------------------\n"),
			`${pc.bold(pc.green("nuke"))} - A CLI tool for ${pc.italic("nuking")} your non-essentials aka your node_modules, cache, and build directories.`,
		].join("\n"),
	)
	.option("no-fun", {
		type: "boolean",
		description: "Do not print ascii art to the console",
		default: false,
	})
	.option("verbose", {
		alias: "V",
		type: "boolean",
		description: "Run with verbose output",
		default: false,
	})
	.showHelpOnFail(false)
	.fail((msg, err, yargs) => {
		clack.log.error(err.message);
		process.exit(1);
	})
	.command(
		["*", "it"],
		`Time to ${pc.bold("NUKE IT")}! Drop the nuke on your project`,
		(yargs) => {
			return yargs
				.positional("type", {
					describe: "The type of nuke to perform",
					choices: ["all", "node_modules", "cache", "build"] as const,
					default: "all",
				})
				.positional("force", {
					describe:
						"DANGER: Bypassing safety checks is not recommended by Vault-Tec",
					type: "boolean",
					default: false,
				});
		},
		async (argv) => {
			clack.log.step("Pushing the button...");
			clack.log.info("You have 5 seconds to reconsider...");
			let i = 0;
			while (i < 5) {
				clack.log.info(`${5 - i} seconds remaining...`);
				await new Promise((resolve) => setTimeout(resolve, 1000));
				i++;
			}

			if (await isGitDirty()) {
				if (argv.force === true) {
					clack.log.warn(
						"You have unsaved changes, but you are forcing the nuke... good luck!",
					);
				} else {
					throw new Error("You have unsaved changes, please commit them first");
				}
			}

			// MUST be after dirty check cause we add files...
			await initialize();

			const s = clack.spinner();
			try {
				s.start("Nuking your project... brace for impact!");

				const result = await match(argv.type)
					.with("all", () => nukeEverything(process.cwd()))
					.with("node_modules", () => nukeNodeModules(process.cwd()))
					.with("cache", () => nukeCache(process.cwd()))
					.with("build", () => nukeBuilds(process.cwd()))
					.otherwise(() => Promise.resolve(false));

				s.stop("Nuke complete!");

				if (result) {
					if (argv.noFun !== true) {
						console.log(ascii.vaultBoy2);
					}
					clack.log.success("You successfully nuked your project, good job!");
				} else {
					clack.log.info(
						"Well this is awkward... nothing was nuked. Maybe you should try again?",
					);
				}
			} catch (error) {
				s.stop("Nuke failed!");
				throw error;
			}
		},
	)
	.command(
		"list",
		"List all the files that would be nuked",
		(yargs) => {
			return yargs
				.positional("type", {
					describe: "The type of nuke to perform",
					choices: ["all", "node_modules", "cache", "build"],
					default: "all",
				})
				.option("glob", {
					describe: "Show the glob patterns instead of the files",
					type: "boolean",
					default: false,
				});
		},
		async (argv) => {
			const globbed = getNukeEverythingGlob();
			if (argv.glob) {
				clack.log.info("The following globs will be nuked:\n");
				printList(globbed, (g) => pc.cyan(g));
				console.log(
					"\n  (this does not include what is ignored in your .nukeignore file)",
				);
			} else {
				clack.log.info("The following files & directories will be nuked:\n");
				const finalGlobbed = globbed.map((g) => {
					if (argv.verbose) {
						return `${g}/**/*`;
					}
					return g;
				});

				const found = await glob(finalGlobbed, {
					root: process.cwd(),
					includeChildMatches: argv.verbose,
				});
				const ignoreHelper = await createIgnoreFileHelper(process.cwd());
				printTree(ignoreHelper.filter(found));
			}
		},
	)
	.command("init", "Initialize the project", async (argv) => {
		if (await isInitialized(process.cwd())) {
			clack.log.success("Project already initialized");
			return;
		}

		await initialize(process.cwd(), true);
		clack.log.success("Project initialized");
	})
	.parse();

function printList(items: string[], transform = (i: string) => i) {
	console.log(items.map((i) => `  • ${pc.red(transform(i))}`).join("\n"));
}
