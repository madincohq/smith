const FILL = '█';
const TRACK = '░';
const CLEAR = '\r\x1b[2K';
const MIN_BAR = 10;
const MAX_BAR = 30;
const LABEL_ROOM = 20;
const DEFAULT_COLUMNS = 80;

type Writer = (text: string) => void;

export interface ProgressOptions {
	write?: Writer;
	columns?: number;
}

function noop(): void {}

function truncate(text: string, max: number): string {
	if (text.length <= max) return text;
	return max > 1 ? `${text.slice(0, max - 1)}…` : '';
}

export class ProgressBar {
	private done = 0;
	private label = '';
	private closed = false;
	private readonly write: Writer;
	private readonly columns: number;

	constructor(
		readonly total: number,
		options: ProgressOptions = {}
	) {
		this.write = options.write ?? noop;
		this.columns = Math.max(MIN_BAR + LABEL_ROOM, options.columns ?? DEFAULT_COLUMNS);
	}

	get completed(): number {
		return this.done;
	}

	start(): this {
		if (!this.closed) this.write(this.frame());
		return this;
	}

	advance(label = ''): this {
		if (this.closed) return this;
		this.done = Math.min(this.done + 1, this.total);
		this.label = label;
		this.write(this.frame());
		return this;
	}

	finish(summary = ''): void {
		if (this.closed) return;
		this.closed = true;
		this.write(summary ? `${CLEAR}${summary}\n` : '\n');
	}

	frame(): string {
		const counts = `${this.done}/${this.total}`;
		const width = this.barWidth(counts);
		const ratio = this.total > 0 ? this.done / this.total : 1;
		const filled = Math.round(width * ratio);
		const head = `[${FILL.repeat(filled)}${TRACK.repeat(width - filled)}] ${counts}`;
		const room = this.columns - head.length - 1;
		const label = this.label && room > 1 ? ` ${truncate(this.label, room)}` : '';

		return `${CLEAR}${head}${label}`;
	}

	private barWidth(counts: string): number {
		const chrome = counts.length + 3;
		return Math.max(MIN_BAR, Math.min(MAX_BAR, this.columns - chrome - LABEL_ROOM));
	}
}

export const Progress = {
	of(total: number, options: ProgressOptions = {}): ProgressBar {
		return new ProgressBar(total, options);
	},
};
