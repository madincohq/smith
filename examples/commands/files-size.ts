import { statSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { Command, rest, flag } from '@madinco/smith';

export class FilesSizeCommand extends Command {
	readonly name = 'files:size';
	readonly description = 'Report the size of the given files';

	readonly arguments = {
		paths: rest('Files to measure'),
	};

	readonly options = {
		total: flag('Print the total as well'),
	};

	handle(): number {
		const paths = this.argument('paths');

		if (paths.length === 0) {
			this.comment('Pass some paths, as in "files:size package.json README.md".');

			return Command.SUCCESS;
		}

		const bar = this.progress(paths.length);
		let total = 0;

		for (const path of paths) {
			bar.advance(basename(path));
			total += statSync(resolve(this.cwd, path)).size;
		}

		bar.finish();

		this.details(
			'Sizes',
			paths.map((path) => ({
				label: basename(path),
				value: `${statSync(resolve(this.cwd, path)).size} bytes`,
			}))
		);

		if (this.option('total')) this.newLine().detail('Total', `${total} bytes`);

		return Command.SUCCESS;
	}
}
