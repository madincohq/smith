const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const CLEAR = '\r\x1b[2K';
const INTERVAL = 80;
const SLOW = 1000;

type Writer = (text: string) => void;

export interface SpinnerOptions {
	write?: Writer;
	interactive?: boolean;
	interval?: number;
}

function noop(): void {}

export class Spinner {
	private timer: ReturnType<typeof setInterval> | null = null;
	private index = 0;
	private label = '';
	private startedAt = 0;
	private readonly write: Writer;
	private readonly interactive: boolean;
	private readonly interval: number;

	constructor(options: SpinnerOptions = {}) {
		this.write = options.write ?? noop;
		this.interactive = options.interactive ?? false;
		this.interval = options.interval ?? INTERVAL;
	}

	start(label: string): this {
		if (label !== this.label) this.startedAt = Date.now();
		this.label = label;

		if (!this.interactive) {
			this.write(`${label}\n`);
			return this;
		}

		this.draw();
		this.timer ??= setInterval(() => this.draw(), this.interval);

		return this;
	}

	update(label: string): this {
		return this.start(label);
	}

	stop(): this {
		if (this.timer === null) return this;

		clearInterval(this.timer);
		this.timer = null;
		this.write(CLEAR);

		return this;
	}

	async run<T>(label: string, task: () => Promise<T> | T): Promise<T> {
		this.start(label);

		try {
			return await task();
		} finally {
			this.stop();
		}
	}

	private draw(): void {
		this.write(`${CLEAR}${FRAMES[this.index]} ${this.label}${this.elapsed()}`);
		this.index = (this.index + 1) % FRAMES.length;
	}

	private elapsed(): string {
		const spent = Date.now() - this.startedAt;

		return spent >= SLOW ? ` ${(spent / 1000).toFixed(1)}s` : '';
	}
}
