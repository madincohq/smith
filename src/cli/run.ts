import { MakeCommand } from '../commands/make.js';
import { Kernel } from '../kernel.js';
import { Terminal } from '../output/terminal.js';
import { InitCommand } from './init.js';
import { directories, locate, target } from './resolve.js';

export async function run(argv: string[], cwd: string): Promise<number> {
	const location = locate(cwd);
	const context = { cwd, project: location.project?.root ?? null };

	const kernel = Kernel.make(Terminal.standard(), context)
		.add(new MakeCommand(target(location)))
		.add(new InitCommand(location));

	for (const directory of directories(location)) await kernel.discover(directory);

	return kernel.handle(argv);
}
