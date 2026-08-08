import { Spinner } from './spinner.js';
import { Progress, type ProgressBar } from './progress.js';
import { detail } from './detail.js';

const DEFAULT_COLUMNS = 80;
const MARGIN = 1;

const RED = 31;
const GREEN = 32;
const YELLOW = 33;
const DIM = 2;

type Writer = (text: string) => void;

export interface Section {
	title: string;
	lines: string[];
}

export interface Sinks {
	out: Writer;
	err: Writer;
	columns?: () => number;
	decorated?: boolean;
	aligned?: boolean;
	interactive?: boolean;
}

export class Terminal {
	private readonly sinks: Required<Sinks>;

	constructor(sinks: Sinks) {
		this.sinks = {
			out: sinks.out,
			err: sinks.err,
			columns: sinks.columns ?? (() => DEFAULT_COLUMNS),
			decorated: sinks.decorated ?? false,
			aligned: sinks.aligned ?? false,
			interactive: sinks.interactive ?? false,
		};
	}

	static standard(): Terminal {
		return new Terminal({
			out: (text) => void process.stdout.write(text),
			err: (text) => void process.stderr.write(text),
			columns: () => process.stdout.columns ?? DEFAULT_COLUMNS,
			decorated: Boolean(process.stdout.isTTY) && !process.env.NO_COLOR,
			aligned: Boolean(process.stdout.isTTY),
			interactive: Boolean(process.stderr.isTTY),
		});
	}

	static silent(): Terminal {
		return new Terminal({ out: () => {}, err: () => {} });
	}

	line(text = ''): this {
		this.sinks.out(`${text}\n`);
		return this;
	}

	info(text = ''): this {
		return this.line(this.paint(GREEN, text));
	}

	comment(text = ''): this {
		return this.line(this.paint(YELLOW, text));
	}

	warn(text = ''): this {
		this.sinks.err(`${this.paint(YELLOW, text)}\n`);
		return this;
	}

	error(text = ''): this {
		this.sinks.err(`${this.paint(RED, text)}\n`);
		return this;
	}

	newLine(count = 1): this {
		this.sinks.out('\n'.repeat(count));
		return this;
	}

	detail(label: string, value: string): this {
		return this.line(detail({ label, value }, this.width, (dots) => this.paint(DIM, dots)));
	}

	sections(sections: Section[]): this {
		sections.forEach((section, index) => {
			if (index > 0) this.newLine();

			this.comment(`${section.title}:`);
			for (const line of section.lines) this.line(`  ${line}`);
		});

		return this;
	}

	progress(total: number): ProgressBar {
		return Progress.of(total, { write: this.sinks.err, columns: this.columns }).start();
	}

	spinner(): Spinner {
		return new Spinner({ write: this.sinks.err, interactive: this.sinks.interactive });
	}

	spin<T>(label: string, task: () => Promise<T> | T): Promise<T> {
		return this.spinner().run(label, task);
	}

	private get columns(): number {
		return this.sinks.columns() || DEFAULT_COLUMNS;
	}

	private get width(): number | null {
		return this.sinks.aligned ? this.columns - MARGIN : null;
	}

	private paint(code: number, text: string): string {
		return this.sinks.decorated && text ? `\x1b[${code}m${text}\x1b[0m` : text;
	}
}
