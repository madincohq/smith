<p align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="https://raw.githubusercontent.com/madincohq/brand/main/logo/mark/madinco-on-dark.png"
    >
    <img
      src="https://raw.githubusercontent.com/madincohq/brand/main/logo/mark/madinco.png"
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
smith make:command deploy:staging --description "Ship the staging build"
```

```ts
import { Command, flag, option } from '@madinco/smith';

export class DeployStagingCommand extends Command {
	readonly name = 'deploy:staging';
	readonly description = 'Ship the staging build';

	readonly options = {
		branch: option('main', 'Branch to deploy', 'b'),
		dry: flag('Print what would happen and stop'),
	};

	async handle(): Promise<number> {
		const target = this.argument() ?? this.option('branch');

		if (this.project === null) {
			this.error('Run this inside a project.');
			return Command.INVALID;
		}

		await this.spin(`Deploying ${target}`, () => ship(target));

		this.info('Done.');

		return Command.SUCCESS;
	}
}
```

`this.project` is the project root, or `null` outside one. `this.cwd` is where the
command was invoked, which is not the same thing when you run from a subdirectory.

## Running a command

```sh
smith deploy:staging feature/checkout --branch=main --dry
```

`feature/checkout` is `this.argument()`, positional and optional. `--branch=main` is
`this.option('branch')`, and accepts `-b main` because the option declared a short form.
`--dry` is a flag, true when present and false otherwise.

`smith` on its own lists every command it found. `smith deploy:staging --help` prints one
command's description, usage and options.

## Output

`line`, `info`, `comment`, `warn`, `error`, `newLine`, `sections` for text.
`spin(label, task)` for indeterminate work, `progress(total)` for a bar. Both write to
stderr and degrade to plain lines when the output is not a TTY.

## Exit codes

Return one from `handle`. `Command.SUCCESS` (0), `Command.FAILURE` (1),
`Command.INVALID` (2). A thrown error becomes `FAILURE`, an unknown option becomes
`INVALID`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bugs and ideas go in
[issues](https://github.com/madincohq/smith/issues). For anything security related,
email oss@madinco.com rather than opening an issue.

## License

MIT. See [LICENSE](LICENSE).
