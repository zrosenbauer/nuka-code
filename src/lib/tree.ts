import path from "node:path";
import pc from "picocolors";

interface TreeOptions {
	trailingSlash: boolean;
	lineAscii: boolean;
}

const DEFAULT_OPTIONS: TreeOptions = {
	trailingSlash: false,
	lineAscii: false,
};

const SYMBOLS_ANSI = {
	BRANCH: pc.gray("├── "),
	EMPTY: "",
	INDENT: "    ",
	LAST_BRANCH: pc.gray("└── "),
	VERTICAL: pc.gray("│   "),
};

const SYMBOLS_ASCII = {
	BRANCH: pc.gray("|-- "),
	EMPTY: "",
	INDENT: "    ",
	LAST_BRANCH: pc.gray("`-- "),
	VERTICAL: pc.gray("|   "),
};

interface TreeNode {
	name: string;
	path: string;
	isDirectory: boolean;
	children?: TreeNode[];
}

/**
 * Convert a list of file paths into a tree structure.
 * @param filePaths - The list of file paths to convert.
 * @returns The tree structure.
 */
export function toTree(filePaths: string[]): TreeNode {
	// Sort paths to ensure consistent output
	const sortedPaths = [...filePaths].sort();

	// Create root node
	const root: TreeNode = {
		name: "<root>",
		path: "",
		isDirectory: true,
		children: [],
	};

	// Process each path
	for (const filePath of sortedPaths) {
		const parts = filePath.split(path.sep);
		let current = root;

		// Build the tree structure
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			const isLast = i === parts.length - 1;
			const currentPath = parts.slice(0, i + 1).join(path.sep);

			// Find or create the node
			let node = current.children?.find((child) => child.name === part);
			if (!node) {
				node = {
					name: part,
					path: currentPath,
					isDirectory: !isLast || i < parts.length - 1, // A node is a directory if it's not the last part OR if it has children
					children: [], // Always create children array for potential future children
				};
				current.children?.push(node);
			} else if (!isLast) {
				// If this node already exists and it's not the last part, ensure it's marked as a directory
				node.isDirectory = true;
				if (!node.children) {
					node.children = [];
				}
			}

			current = node;
		}
	}

	// Clean up empty children arrays
	function cleanupEmptyChildren(node: TreeNode): TreeNode {
		if (node.children) {
			const filteredChildren = node.children
				.map((child) => cleanupEmptyChildren(child))
				.filter((child) => child.children?.length !== 0);

			return {
				...node,
				children: filteredChildren.length > 0 ? filteredChildren : undefined,
			};
		}
		return node;
	}

	return cleanupEmptyChildren(root);
}

function printNode(
	node: TreeNode,
	currentDepth: number,
	precedingSymbols: string,
	options: TreeOptions,
	isLast: boolean,
): string[] {
	const lines: string[] = [];
	const SYMBOLS = options.lineAscii ? SYMBOLS_ASCII : SYMBOLS_ANSI;

	// Handle current node
	const line: string[] = [precedingSymbols];
	if (currentDepth >= 1) {
		line.push(isLast ? SYMBOLS.LAST_BRANCH : SYMBOLS.BRANCH);
	}
	line.push(
		node.name === "<root>"
			? `${pc.cyan("<root>")}`
			: `${pc.red(node.name)}`,
	);
	if (node.isDirectory && options.trailingSlash) {
		line.push("/");
	}
	lines.push(line.join(""));

	// Handle children
	if (node.children) {
		const children = node.children;
		children.forEach((child, index) => {
			const isChildLast = index === children.length - 1;
			const childLines = printNode(
				child,
				currentDepth + 1,
				precedingSymbols + (isLast ? SYMBOLS.INDENT : SYMBOLS.VERTICAL),
				options,
				isChildLast,
			);
			lines.push(...childLines);
		});
	}

	return lines;
}

export function printTree(
	filePaths: string[],
	options: Partial<TreeOptions> = {},
) {
	const combinedOptions = { ...DEFAULT_OPTIONS, ...options };
	const tree = toTree(filePaths);
	console.log(printNode(tree, 0, "", combinedOptions, true).join("\n"));
}
