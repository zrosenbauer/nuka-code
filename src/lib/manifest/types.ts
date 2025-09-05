import type * as TF from "type-fest";

export type PackageJson = TF.PackageJson;

export type PnpmWorkspace = {
	packages?: string[];
	catalog?: Record<string, string>;
};
