import { Spinner } from './spinner.js';
import { Progress, type ProgressBar } from './progress.js';
import { detail, leader, type Detail, type Tone } from './detail.js';
import { Color, Style, ink, type Ink } from './ansi.js';

const DEFAULT_COLUMNS = 80;
const MARGIN = 1;
const INDENT = 2;

const GREEN = ink(Color.green);
const YELLOW = ink(Color.yellow);
const RED = ink(Color.red);
const HEADING = ink(Color.green, Style.bold);
const LEADER = ink(Style.dim);

const TONES: Record<Tone, Ink> = {
	good: ink(Color.green, Style.bold),
	warn: ink(Color.yellow, Style.bold),
};

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
		return this.writeLine(this.sinks.out, text);
	}

	info(text = ''): this {
		return this.line(this.paint(GREEN, text));
	}

	comment(text = ''): this {
		return this.line(this.paint(YELLOW, text));
	}

	warn(text = ''): this {
		return this.alert(YELLOW, text);
	}

	error(text = ''): this {
		return this.alert(RED, text);
	}

	newLine(count = 1): this {
		this.sinks.out('\n'.repeat(count));
		return this;
	}

	/**
	 * Write a label and a value, separated by a dotted leader.
	 */
	detail(label: string, value: string): this {
		const dots = (text: string) => this.paint(LEADER, text);

		return this.line(detail({ label, value }, this.width(0), { dots }));
	}

	/**
	 * Write a heading with its own leader, over indented rows.
	 */
	details(heading: string, rows: Detail[]): this {
		const width = this.width(INDENT);
		const dots = (text: string) => this.paint(LEADER, text);
		const label = (text: string) => this.paint(HEADING, text);

		this.indented(leader(heading, width, { label, dots }));

		for (const row of rows) {
			this.indented(detail(row, width, { dots, value: this.toned(row.tone) }));
		}

		return this;
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

	private writeLine(to: Writer, text: string): this {
		to(`${text}\n`);
		return this;
	}

	private alert(ink: Ink, text: string): this {
		return this.writeLine(this.sinks.err, this.paint(ink, text));
	}

	private indented(text: string): this {
		return this.line(`${' '.repeat(INDENT)}${text}`);
	}

	private toned(tone: Tone | undefined): ((text: string) => string) | undefined {
		return tone === undefined ? undefined : (text) => this.paint(TONES[tone], text);
	}

	private get columns(): number {
		return this.sinks.columns() || DEFAULT_COLUMNS;
	}

	private width(indent: number): number | null {
		return this.sinks.aligned ? this.columns - indent - MARGIN : null;
	}

	private paint(ink: Ink, text: string): string {
		return this.sinks.decorated && text ? ink(text) : text;
	}
}
