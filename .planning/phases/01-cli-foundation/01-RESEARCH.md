# Phase 1: CLI Foundation - Research

**Researched:** 2026-01-31
**Domain:** CLI user interaction, terminal output, spinners, logging
**Confidence:** HIGH

## Summary

This research investigates how to replace chalk, consola, and yocto-spinner with @clack/prompts for the nuka-code CLI. The goal is to create a modern, consistent CLI experience using a single library for all user interaction patterns.

@clack/prompts v1.0.0 (released January 2026) provides a complete solution for CLI interfaces including spinners, logging, prompts, and styled output. It internally uses picocolors for terminal colors, making it a comprehensive replacement for all three current dependencies.

The migration is straightforward because:
1. @clack/prompts provides `log.info()`, `log.warn()`, `log.error()`, `log.success()` to replace consola
2. @clack/prompts provides `spinner()` with `.start()`, `.stop()`, `.error()`, `.cancel()` to replace yocto-spinner
3. picocolors (a dependency of @clack/prompts) provides color functions to replace chalk, or clack's built-in styling can be used

**Primary recommendation:** Install @clack/prompts and picocolors, then systematically replace each usage of chalk, consola, and yocto-spinner with clack equivalents.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @clack/prompts | 1.0.0 | CLI prompts, spinners, logging, styled output | De facto standard for modern CLI UX; used by 58k+ projects; 80% smaller than alternatives; comprehensive API |
| picocolors | 1.1.1 | Terminal string styling (colors, bold, italic) | Smallest and fastest color library; 14x smaller than chalk; @clack/prompts uses it internally |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @clack/core | 1.0.0 | Unstyled prompt primitives | Only if you need custom styled prompts (NOT needed for this migration) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @clack/prompts | inquirer | inquirer is larger, more complex; clack is modern and simpler |
| picocolors | chalk | chalk is 14x larger; picocolors has equivalent features |
| picocolors | kleur | kleur is slightly larger; picocolors is more widely adopted |

**Installation:**
```bash
pnpm add @clack/prompts picocolors
pnpm remove chalk consola yocto-spinner
```

## Architecture Patterns

### Recommended Project Structure

The existing structure is adequate. The key changes are import replacements:

```
src/
├── cli.ts           # Main CLI entry - update all imports
├── lib/
│   ├── tree.ts      # Update chalk imports to picocolors
│   └── project.ts   # Update consola imports to clack
```

### Pattern 1: Unified CLI Output

**What:** Use @clack/prompts for all user-facing output
**When to use:** Any CLI message, progress indicator, or user interaction
**Example:**
```typescript
// Source: https://bomb.sh/docs/clack/packages/prompts/
import * as clack from '@clack/prompts';

// Logging
clack.log.info('Processing files...');
clack.log.warn('File not found, skipping...');
clack.log.error('Failed to delete file');
clack.log.success('Successfully nuked 42 files');
clack.log.step('Step 1 of 3: Scanning...');

// Spinner for long operations
const s = clack.spinner();
s.start('Nuking your project...');
// ... do work ...
s.stop('Nuked successfully!');
// or on error:
s.error('Failed to nuke');
// or on cancel:
s.cancel('Operation cancelled');
```

### Pattern 2: Colors with picocolors

**What:** Use picocolors for inline text styling
**When to use:** When you need colored text within messages
**Example:**
```typescript
// Source: https://github.com/alexeyraspopov/picocolors
import pc from 'picocolors';

const message = `${pc.bold(pc.green('nuke'))} - A CLI tool for ${pc.italic('nuking')} your non-essentials`;
const errorPath = pc.red('/node_modules');
const successPath = pc.green('/dist');
```

### Pattern 3: Intro/Outro Framing

**What:** Use clack's intro/outro to frame CLI sessions
**When to use:** At the start and end of CLI commands
**Example:**
```typescript
// Source: https://bomb.sh/docs/clack/packages/prompts/
import { intro, outro } from '@clack/prompts';

intro('Nuka-Code - Starting nuke operation');
// ... command logic ...
outro('Nuke complete!');
```

### Pattern 4: User Prompts with Cancellation

**What:** Handle user prompts with proper cancellation detection
**When to use:** Any interactive prompt (confirm, text input, select)
**Example:**
```typescript
// Source: https://bomb.sh/docs/clack/packages/prompts/
import { confirm, isCancel, cancel } from '@clack/prompts';

const shouldContinue = await confirm({
  message: 'Are you in the root of your project?',
});

if (isCancel(shouldContinue)) {
  cancel('Operation cancelled.');
  process.exit(0);
}
```

### Anti-Patterns to Avoid

- **Mixing output libraries:** Don't use console.log alongside clack.log - use clack exclusively for consistent styling
- **Ignoring cancellation:** Always check `isCancel()` after prompts to handle Ctrl+C gracefully
- **Spinner without error handling:** Always wrap spinner operations in try/catch and call `s.error()` on failure
- **Multiple spinners:** Only one spinner can be active at a time - don't create nested spinners

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Colored terminal output | Custom ANSI escape codes | picocolors | Handles NO_COLOR, Windows compatibility, edge cases |
| Loading spinners | Custom interval-based animation | clack.spinner() | Handles TTY detection, graceful cleanup, cross-platform |
| Progress messages | Custom console.log wrappers | clack.log.* | Consistent styling, proper newline handling |
| User prompts | readline-based prompts | clack.confirm/text/select | Handles cancellation, validation, accessibility |

**Key insight:** Terminal output is deceptively complex - proper handling requires TTY detection, color support detection, Windows compatibility, and signal handling. @clack/prompts handles all of this.

## Common Pitfalls

### Pitfall 1: Spinner Not Stopping on Errors

**What goes wrong:** Spinner keeps running after an error, cluttering output
**Why it happens:** Error thrown before `spinner.stop()` is called
**How to avoid:** Always use try/catch/finally with spinner
**Warning signs:** Spinner animation continues after error message appears

```typescript
const s = spinner();
try {
  s.start('Working...');
  await riskyOperation();
  s.stop('Done!');
} catch (error) {
  s.error('Failed');
  throw error;
}
```

### Pitfall 2: Color Support in Non-TTY Environments

**What goes wrong:** Color codes appear as gibberish in CI logs or piped output
**Why it happens:** ANSI codes sent to non-color-supporting terminal
**How to avoid:** picocolors automatically handles this via `NO_COLOR` and `FORCE_COLOR` env vars
**Warning signs:** Raw escape codes like `\x1b[32m` in output

### Pitfall 3: Windows Terminal Compatibility

**What goes wrong:** Unicode spinners don't display correctly on Windows
**Why it happens:** Windows console has limited Unicode support
**How to avoid:** @clack/prompts handles this automatically with fallback characters
**Warning signs:** Question marks or boxes instead of spinner characters

### Pitfall 4: Forgetting isCancel Checks

**What goes wrong:** CLI continues executing after user presses Ctrl+C during prompt
**Why it happens:** Prompts return a cancel symbol instead of throwing
**How to avoid:** Always check `isCancel()` after every prompt
**Warning signs:** Unexpected behavior or "undefined" values after cancelled prompts

```typescript
const result = await text({ message: 'Enter name:' });
if (isCancel(result)) {
  cancel('Cancelled');
  process.exit(0);
}
// Now safe to use result
```

### Pitfall 5: Consola Prompt Migration

**What goes wrong:** consola.prompt() works differently than clack prompts
**Why it happens:** consola internally uses clack but with different API
**How to avoid:** Replace consola.prompt() with direct clack prompt calls
**Warning signs:** Type errors or unexpected prompt behavior

```typescript
// OLD: consola.prompt('Are you sure?', { type: 'confirm' })
// NEW: clack.confirm({ message: 'Are you sure?' })
```

## Code Examples

Verified patterns from official sources:

### Replacing chalk Usage (from cli.ts)

```typescript
// Source: https://github.com/alexeyraspopov/picocolors

// BEFORE (chalk):
import chalk from 'chalk';
const usage = `${chalk.bold.green('nuke')} - A CLI tool for ${chalk.italic('nuking')}`;
const item = chalk.cyan(g);

// AFTER (picocolors):
import pc from 'picocolors';
const usage = `${pc.bold(pc.green('nuke'))} - A CLI tool for ${pc.italic('nuking')}`;
const item = pc.cyan(g);
```

### Replacing consola Usage (from cli.ts)

```typescript
// Source: https://bomb.sh/docs/clack/packages/prompts/

// BEFORE (consola):
import consola from 'consola';
consola.start('Pushing the button...');
consola.info('You have 5 seconds...');
consola.warn('You have unsaved changes...');
consola.error(err.message);
consola.success('You successfully nuked your project!');

// AFTER (clack):
import * as clack from '@clack/prompts';
clack.log.step('Pushing the button...');
clack.log.info('You have 5 seconds...');
clack.log.warn('You have unsaved changes...');
clack.log.error(err.message);
clack.log.success('You successfully nuked your project!');
```

### Replacing yocto-spinner Usage (from cli.ts)

```typescript
// Source: https://bomb.sh/docs/clack/packages/prompts/

// BEFORE (yocto-spinner):
import yoctoSpinner from 'yocto-spinner';
const spinner = yoctoSpinner({ text: 'Nuking...' }).start();
// ... work ...
spinner.success();

// AFTER (clack):
import { spinner } from '@clack/prompts';
const s = spinner();
s.start('Nuking...');
// ... work ...
s.stop('Nuked!');
```

### Replacing consola.prompt (from project.ts)

```typescript
// Source: https://bomb.sh/docs/clack/packages/prompts/

// BEFORE (consola):
import consola from 'consola';
const root = await consola.prompt('Are you in the root of your project?', {
  type: 'confirm',
  default: false,
});

// AFTER (clack):
import { confirm, isCancel, cancel } from '@clack/prompts';
const root = await confirm({
  message: 'Are you in the root of your project?',
  initialValue: false,
});
if (isCancel(root)) {
  cancel('Operation cancelled.');
  process.exit(0);
}
```

### Tree Component Color Migration (from tree.ts)

```typescript
// Source: https://github.com/alexeyraspopov/picocolors

// BEFORE (chalk):
import chalk from 'chalk';
const SYMBOLS_ANSI = {
  BRANCH: chalk.gray('--- '),
  LAST_BRANCH: chalk.gray('--- '),
  VERTICAL: chalk.gray('|   '),
};

// AFTER (picocolors):
import pc from 'picocolors';
const SYMBOLS_ANSI = {
  BRANCH: pc.gray('--- '),
  LAST_BRANCH: pc.gray('--- '),
  VERTICAL: pc.gray('|   '),
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| chalk for colors | picocolors | 2022+ | 14x smaller bundle, faster |
| inquirer for prompts | @clack/prompts | 2023+ | 80% smaller, modern UX |
| ora/yocto-spinner for spinners | @clack/prompts spinner | 2023+ | Unified library, consistent styling |
| consola for logging | @clack/prompts log | 2026 | Single dependency for all CLI needs |

**Deprecated/outdated:**
- chalk: Still works but picocolors is now preferred for new projects
- inquirer: Complex API, larger bundle; clack is the modern alternative
- ora: Still maintained but clack provides spinners with integrated logging

## Open Questions

Things that couldn't be fully resolved:

1. **Timer indicator for spinner**
   - What we know: clack spinner supports `indicator: 'timer'` option
   - What's unclear: Whether this should be used for long-running nuke operations
   - Recommendation: Keep default 'dots' for consistency; timer adds complexity

2. **Custom spinner frames**
   - What we know: clack supports custom frames array
   - What's unclear: Whether custom nuke-themed frames would be appropriate
   - Recommendation: Use defaults; custom frames add maintenance burden

## Sources

### Primary (HIGH confidence)
- npm @clack/prompts v1.0.0 - Package info, exports, dependencies
- https://bomb.sh/docs/clack/packages/prompts/ - Official API documentation
- https://github.com/alexeyraspopov/picocolors - Official picocolors documentation
- https://github.com/bombshell-dev/clack - Official clack repository

### Secondary (MEDIUM confidence)
- https://www.clack.cc/ - Official clack website with examples
- https://pheralb.dev/post/clack-prompts - Verified tutorial with working examples
- https://www.jamesperkins.dev/post/cli-with-clack - Additional usage examples

### Tertiary (LOW confidence)
- None - all findings verified with primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - npm registry and official docs confirm @clack/prompts 1.0.0 is stable and current
- Architecture: HIGH - Patterns verified from official documentation
- Pitfalls: MEDIUM - Based on GitHub issues and community reports

**Research date:** 2026-01-31
**Valid until:** 2026-03-01 (30 days - stable library with recent 1.0 release)
