import { describe, expect, it } from 'vitest';
import { Progress } from '@';

const CLEAR = '\r\x1b[2K';

function recorder() {
	const frames: string[] = [];
	return { frames, write: (text: string) => frames.push(text) };
}

describe('Progress', () => {
	it('starts empty', () => {
		const bar = Progress.of(4, { columns: 60 });
		expect(bar.frame()).toContain('0/4');
		expect(bar.frame()).not.toContain('█');
	});

	it('fills proportionally', () => {
		const bar = Progress.of(4, { columns: 60 });
		bar.advance();
		bar.advance();

		const filled = (bar.frame().match(/█/g) ?? []).length;
		const track = (bar.frame().match(/░/g) ?? []).length;
		expect(filled).toBe(track);
	});

	it('counts completions', () => {
		const bar = Progress.of(3, { columns: 60 });
		bar.advance();
		expect(bar.completed).toBe(1);
		expect(bar.frame()).toContain('1/3');
	});

	it('never advances past the total', () => {
		const bar = Progress.of(2, { columns: 60 });
		bar.advance();
		bar.advance();
		bar.advance();

		expect(bar.completed).toBe(2);
		expect(bar.frame()).toContain('2/2');
	});

	it('shows a full bar for an empty total', () => {
		const bar = Progress.of(0, { columns: 60 });
		expect(bar.frame()).toContain('0/0');
		expect(bar.frame()).not.toContain('░');
	});

	it('appends the label', () => {
		const bar = Progress.of(2, { columns: 60 });
		bar.advance('concepts/api-first');
		expect(bar.frame()).toContain('concepts/api-first');
	});

	it('truncates a label that would overflow the terminal', () => {
		const bar = Progress.of(2, { columns: 40 });
		bar.advance('a'.repeat(200));

		expect(bar.frame()).toContain('…');
		expect(bar.frame().replace(CLEAR, '').length).toBeLessThanOrEqual(40);
	});

	it('writes a frame on every advance', () => {
		const sink = recorder();
		const bar = Progress.of(2, { columns: 60, write: sink.write });
		bar.start();
		bar.advance();
		bar.advance();

		expect(sink.frames).toHaveLength(3);
	});

	it('closes with a newline', () => {
		const sink = recorder();
		Progress.of(1, { write: sink.write }).finish();
		expect(sink.frames).toEqual(['\n']);
	});

	it('closes with a summary when given one', () => {
		const sink = recorder();
		Progress.of(1, { write: sink.write }).finish('44 images written');
		expect(sink.frames[0]).toContain('44 images written');
		expect(sink.frames[0]?.endsWith('\n')).toBe(true);
	});

	it('ignores advances after finishing', () => {
		const sink = recorder();
		const bar = Progress.of(2, { write: sink.write });
		bar.finish();
		bar.advance();

		expect(bar.completed).toBe(0);
		expect(sink.frames).toHaveLength(1);
	});

	it('ignores a second finish', () => {
		const sink = recorder();
		const bar = Progress.of(1, { write: sink.write });
		bar.finish();
		bar.finish();

		expect(sink.frames).toHaveLength(1);
	});
});
