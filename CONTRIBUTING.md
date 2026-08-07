# Contributing

Small package, small process.

## Getting started

```sh
git clone git@github.com:madincohq/smith.git
cd smith
pnpm install
pnpm build
```

The repo runs on itself. Its own commands live in `commands/`:

```sh
node smith list
node smith inspire
```

## Checks

```sh
pnpm typecheck   # src and tests
pnpm test        # vitest, watching
pnpm test:run    # vitest, once
pnpm build       # tsc to dist/, plus the stubs
```

Run `typecheck` before `test`. Vitest strips types rather than checking them, so a type
error will run happily as a runtime bug. CI runs both, in that order, on Node 22 and 24.

## Layout

```
bin/        the CLI entry point
src/        the library, published as @madinco/smith
src/cli/    directory resolution, init, and the run loop the binary calls
commands/   this repo's own commands, for dogfooding
tests/      mirrors src/
```

The library knows nothing about where commands live. That is `src/cli/`'s job, so a
project can build its own kernel without inheriting global resolution.

## Conventions

- Tests mirror the source path. `src/output/help.ts` becomes `tests/output/help.test.ts`.
  No colocated tests, no `__tests__`.
- Tests import through `@` for the barrel and `@/…` for internals, never a relative path.
- `src` compiles under `moduleResolution: NodeNext`, so its relative imports carry `.js`
  extensions. Tests use Bundler resolution via `tests/tsconfig.json`, matching vitest.
- [Conventional Commits](https://www.conventionalcommits.org).
- Tabs, single quotes, no comments unless the code genuinely cannot say it.

## Pull requests

One change per pull request. Tests for anything that changes behaviour. Have
`pnpm typecheck && pnpm test:run && pnpm build` passing before you open it.

## Reporting a bug

Include the smith version, your Node version, whether the command was global or
project-local, and what `smith list` prints.

## Security

Email oss@madinco.com. Please do not open a public issue.
