# Examples

Runnable commands, each written the way a real one would be. Point `SMITH_HOME` at this
directory and smith will discover them:

```sh
SMITH_HOME=$PWD/examples node smith list
SMITH_HOME=$PWD/examples node smith deploy staging --dry
```

They are not part of the published package. They are typechecked, so they cannot rot.

`greet`, `move`, `files:size` and `health` do real work. `deploy` and `db:seed` only
illustrate the shape of a command — there is nothing here to ship or seed.

## What each one shows

| Command | Shows |
| --- | --- |
| `greet` | Options and flags, no arguments at all |
| `move` | Two required arguments, where order matters |
| `deploy` | A required argument, an optional one with a default, and `spin` |
| `files:size` | `rest`, collecting however many paths you pass, with a progress bar |
| `db:seed` | `maybe` for an argument whose default is only known at run time |
| `health` | `details` with a tone, colouring the value rather than the row |

## Things worth copying

**Declare arguments, don't index them.** `this.argument('branch')` is typed and appears in
`--help`; a positional read by number is neither.

```ts
readonly arguments = {
	environment: argument('Where to ship it'),
	branch: optional('main', 'Branch to ship'),
};
```

**Defaults must be literals.** Command classes are constructed during discovery, so a
default that reads git or the filesystem runs for every command on every invocation — and
if it throws, the command silently disappears from `list`. When the default is only known
at run time, use `maybe` and resolve it in `handle`, as `db:seed` does:

```ts
const seeder = this.argument('seeder') ?? everySeeder();
```

**A `rest` argument must come last**, and there can only be one. Anything you don't declare
is an error rather than being quietly ignored, so a command that accepts arbitrary trailing
input has to say so.
