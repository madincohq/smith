## Commands

- **Command**: a named unit of work that reads its inputs, writes output, and returns an exit code.
- **Argument**: a positional input to a command. It can be required, optional, or collect the rest.
- **Option**: a named input to a command, such as a flag, a string or a number.
- **Exit code**: the result of a command. Success, failure (the work failed) or invalid (the command was misused).
- **Context**: where a command runs: the current directory and the project root.

## Running

- **Kernel**: registers commands, dispatches to the right one, and turns errors into output.
- **Discovery**: finding and loading commands from the command directories.
- **Location**: where smith looks for commands, globally and in the project.
- **Renderable error**: an error that explains itself by showing the command's usage.

## Output

- **Terminal**: the one channel for everything a command prints or asks.
- **Detail**: a label and a value joined by a dotted leader.
- **Progress bar**: feedback for a task with a known number of steps.
- **Spinner**: feedback for a task of unknown length.

## Filesystem

- **File**: a path to a regular file.
- **Directory**: a path to a folder, and the starting point for paths inside it.
- **Symlink**: a path to a link. It's created idempotently and never overwrites.
- **Query**: a lazy lookup of a directory's direct children.
- **Collection**: an in-memory list with fluent helpers.

## Scaffolding & inspection

- **Stub**: a template with placeholders, used to generate files.
- **Probe**: a cached, read-only look at a project's files.
- **Profile**: a declarative description of what to report about a framework.
