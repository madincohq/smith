# Examples

These are runnable commands, each written the way you would write a real one. Point
`SMITH_HOME` at this directory and smith will discover them:

```sh
SMITH_HOME=$PWD/examples node smith list
SMITH_HOME=$PWD/examples node smith greet world --loud
```

They are not part of the published package, and they are typechecked, so they cannot fall
out of date.

The `greet`, `move`, `files:size` and `health` commands do real work. The `deploy` and
`db:seed` commands only illustrate the shape of a command, since there is nothing here to
ship or seed.

## What each one shows

| Command | Shows |
| --- | --- |
| `greet` | One required argument and a flag. This is the example from the main README |
| `move` | Two required arguments, where the order matters |
| `deploy` | A required argument, an optional one with a default, and `spin` |
| `files:size` | `rest`, which collects however many paths you pass, with a progress bar |
| `db:seed` | `maybe`, for an argument whose default is only known at run time |
| `health` | `details` with a tone, which colours the value rather than the row |

## Things worth copying

### Declare your arguments

You should declare arguments rather than reading positionals by index. A declared argument
is typed, and it appears in the command's help output.

```ts
readonly arguments = {
	environment: argument('Where to ship it'),
	branch: optional('main', 'Branch to ship'),
};
```

### Keep your defaults literal

Command classes are constructed while smith is discovering them, so a default that reads
git or the filesystem will run for every command on every invocation. Worse, if it throws,
the command will disappear from `smith list` rather than reporting an error.

When a default is only known at run time, use `maybe` and resolve it inside `handle`, as
`db:seed` does:

```ts
const seeder = this.argument('seeder') ?? everySeeder();
```

### Declare anything you want to collect

A `rest` argument must come last, and you may only have one. Any argument you have not
declared is rejected, so a command that accepts arbitrary trailing input has to say so.
