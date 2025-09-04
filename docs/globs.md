# Globs

Nuka-Code uses glob patterns to determine what to nuke. You can find the list of supported globs below.

> [!TIP]
> If certain files or directories in the globs should not be nuked, you can add a `.nukeignore` file to your project to exclude them.

## node_modules

The directory(s) where your project's dependencies are installed.

- `node_modules`
- `**/node_modules`
- `.pnp.cjs`
- `.pnp.loader.mjs`

## build

The directory(s) where your project's build artifacts are stored, such as `dist`, `out`, `build`, `bundle`, etc.

- `dist`
- `**/[!node_modules]**/dist`
- `out`
- `**/[!node_modules]**/out`
- `output`
- `**/[!node_modules]**/output`
- `outputs`
- `**/[!node_modules]**/outputs`
- `bundle`
- `**/[!node_modules]**/bundle`
- `.output`
- `**/[!node_modules]**/.output`
- `.outputs`
- `**/[!node_modules]**/.outputs`
- `.build`
- `**/[!node_modules]**/.build`
- `.vercel`
- `**/[!node_modules]**/.vercel`
- `.next`
- `**/[!node_modules]**/.next`
- `.nuxt`
- `**/[!node_modules]**/.nuxt`
- `.svelte-kit`
- `**/[!node_modules]**/.svelte-kit`
- `.vinxi`
- `**/[!node_modules]**/.vinxi`
- `.vuepress/dist`
- `**/[!node_modules]**/.vuepress/dist`
- `storybook-static`
- `**/[!node_modules]**/storybook-static`
- `coverage`
- `**/[!node_modules]**/coverage`
- `public/build`
- `**/[!node_modules]**/public/build`

## cache

The directory(s) where your project's cache is stored, such as `.turbo`, `.vite`, `.next`, etc.

- `.turbo`
- `**/[!node_modules]**/.turbo`
- `.nx/cache`
- `**/[!node_modules]**/.nx/cache`
