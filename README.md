<p align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="https://raw.githubusercontent.com/madincohq/brand/refs/heads/main/logo/mark/madinco-on-dark.png"
    >
    <img
      src="https://raw.githubusercontent.com/madincohq/brand/refs/heads/main/logo/mark/madinco.png"
      alt="Madinco"
      width="72"
    >
  </picture>
</p>

<h1 align="center">@madinco/smith</h1>

<p align="center">
  An Artisan-style command runner for Node.<br>
  Write commands as small TypeScript classes and run them anywhere on your machine,
  or scoped to a project.
</p>

<p align="center">
  <a href="https://github.com/madincohq/smith/actions/workflows/ci.yml">
    <img src="https://github.com/madincohq/smith/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
  <a href="https://www.npmjs.com/package/@madinco/smith">
    <img src="https://img.shields.io/npm/v/@madinco/smith" alt="npm version">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/npm/l/@madinco/smith" alt="License">
  </a>
</p>

## Install

Globally, so your commands work anywhere:

```sh
pnpm add -g @madinco/smith
```

Or into a project, for commands that belong to it:

```sh
pnpm add -D @madinco/smith
```

## Set up

```sh
smith init            # creates the command directory for wherever you are
smith init --global   # forces the global one, even inside a project
smith init --shim     # also writes ./smith so "node smith" works in the project
```

## Where commands come from

Two directories, loaded in this order:

1. `~/.config/smith/commands` (override with `SMITH_HOME`, or `XDG_CONFIG_HOME`)
2. `<project>/src/console/commands`, when a `package.json` is found at or above the current directory

A project command shadows a global one with the same name. Discovery recurses into
subdirectories and skips anything starting with `.` or `_`, plus `*.test.*`.

Point a project somewhere else in its `package.json`:

```json
{ "smith": { "commands": "console/commands" } }
```

## Writing a command

```sh
smith make:command greet --description "Say hello to someone"
```

```ts
import { Command, argument, flag } from '@madinco/smith';

export class GreetCommand extends Command {
	readonly name = 'greet';
	readonly description = 'Say hello to someone';

	readonly arguments = {
		name: argument('Who to greet'),
	};

	readonly options = {
		loud: flag('Shout it'),
	};

	handle(): number {
		const greeting = `Hello, ${this.argument('name')}`;

		this.info(this.option('loud') ? greeting.toUpperCase() : greeting);

		return Command.SUCCESS;
	}
}
```

Within a command, `this.project` contains the project root, or `null` when you are not
inside a project. `this.cwd` contains the directory you ran the command from, which will
differ from the project root when you run smith from a subdirectory.

## Arguments and options

You may declare the arguments and options a command accepts using the `arguments` and
`options` properties. Smith uses these declarations to type the values you read back, and
to build the command's help output.

```ts
readonly arguments = {
	target: argument('Required'),
	branch: optional('main', 'Optional, with a default'),
	comment: maybe('Optional, undefined when absent'),
	files: rest('Collects the remainder, and must come last'),
};

readonly options = {
	quality: number(75, 'A number', 'q'),
	name: option('world', 'A string'),
	dry: flag('True when present'),
};
```

Each value is typed from its declaration, so `this.argument('files')` returns a `string[]`
and `this.option('quality')` returns a `number`. Requesting a name you have not declared
will not compile.

Any argument you have not declared is rejected. A mistyped argument, or a glob that matched
more files than you expected, will fail rather than being silently ignored.

## Running a command

```sh
smith greet world --loud
```

Here, `world` is `this.argument('name')` and `--loud` is `this.option('loud')`.

Running `smith` on its own lists every command it found. Running `smith greet --help`
prints that command's description, usage, arguments and options.

## Filesystem

Smith has small models for files, directories and symlinks. Creating one never touches the
disk; only methods such as `exists()` or `read()` do.

```ts
import { Directory } from '@madinco/smith';

const project = new Directory(this.cwd);

project.file('package.json').read();
project.directory('src').exists();
project.symlink('current').to(project.directory('projects/demo'));
```

`to()` creates the link, does nothing if the same link is already there, and throws a
`SymlinkConflict` rather than replace anything else at that path.

### Queries

`files()`, `folders()` and `symlinks()` look at the direct children of a directory.

```ts
project.directory('src').files().withExtension('ts').count();
project.directory('skills').folders().containingFile('SKILL.md').get();
project.symlinks().broken().exists();
project.symlinks().pointingTo(project.directory('projects/demo')).first();
```

When you only need a number or a yes/no, ask the query with `count()`, `first()` or
`exists()`. Call `get()` when you want the entries themselves. A missing directory simply
has no matches.

### Collections

`get()` returns a `Collection`. Queries read from disk; collections work with what was
read.

```ts
const files = project.files().withExtension('md').get();

files.reject((file) => file.name.startsWith('.')).pluck('name').each((name) => console.log(name));
files.contains((file) => file.name === 'SKILL.md');
```

Collections are iterable and provide `map`, `filter`, `reject`, `each`, `first`,
`last`, `contains`, `isEmpty`, `count`, and `pluck`. `map`, `filter`, `reject`, and
`pluck` return new collections. Use `toArray()` when you need a plain array.

## Transactions

`Transaction` runs up steps in order. If one throws, it runs the down steps in reverse
order, including the failing step in case it changed state before throwing.

```ts
import { Transaction } from '@madinco/smith';

await new Transaction().run([
	{ up: () => prepare(), down: () => restore() },
	{ up: () => publish() },
]);
```

Provide a down step for each reversible action. Down steps should tolerate an action
that failed partway through. If any rollback fails, Smith throws an `AggregateError`
containing the original failure and rollback failures.

## Output

`line`, `info`, `comment`, `warn`, `error`, `newLine`, `sections` for text.

The `detail` method prints a label and a value separated by a line of dots. The `details`
method groups several of those rows beneath a heading, and each row may carry a `tone` of
`good` or `warn` to colour its value. When the output is piped, both fall back to
`label: value`.

`spin(label, task)` for indeterminate work, `progress(total)` for a bar. Both write to
stderr and degrade to plain lines when the output is not a TTY.

## Asking questions

```ts
const name = await this.ask('Project name?', 'demo');

if (!await this.confirm(`Create ${name}?`)) return Command.SUCCESS;
```

`ask` returns the answer, or the fallback when the answer is empty. `confirm` accepts `y`
or `yes` and defaults to no, unless you pass `true` as the second argument. When there is
no terminal to ask, both return their fallback.

## Generating files

`Stubs` renders templates with `{{ key }}` placeholders, and `Files` writes the result,
creating directories as needed.

```ts
import { Files, Stubs } from '@madinco/smith';

const template = Stubs.read('project', new URL('../stubs/', import.meta.url));

Files.write([{
	path: project.file('project.json').path,
	contents: Stubs.render(template, { name: 'demo' }),
}]);
```

`Stubs.read('project', base)` reads `project.stub` from that folder. `Files.existing()`
tells you which of those paths already exist, so you can refuse to overwrite them.

## Exit codes

Return one from `handle`. `Command.SUCCESS` (0), `Command.FAILURE` (1),
`Command.INVALID` (2). A thrown error becomes `FAILURE`, an unknown option becomes
`INVALID`.

## Examples

`examples/` holds runnable commands for arguments, options and output. See its
[README](examples/README.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bugs and ideas go in
[issues](https://github.com/madincohq/smith/issues). For anything security related,
email oss@madinco.com rather than opening an issue.

## License

MIT. See [LICENSE](LICENSE).
