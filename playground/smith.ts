import { fileURLToPath } from 'node:url';
import { Kernel, Terminal } from '@madinco/smith';
import { WorkspaceCheckCommand } from './commands/check.js';
import { WorkspaceConfigureCommand } from './commands/configure.js';
import { WorkspaceCreateCommand, WorkspaceInspectCommand, WorkspaceLinkCommand } from './commands/workspace.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const kernel = Kernel.make(Terminal.standard(), { cwd: root, project: root })
	.add(new WorkspaceCheckCommand())
	.add(new WorkspaceConfigureCommand())
	.add(new WorkspaceCreateCommand())
	.add(new WorkspaceInspectCommand())
	.add(new WorkspaceLinkCommand());

process.exitCode = await kernel.handle(process.argv.slice(2));
