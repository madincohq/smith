import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Spinner } from '@/output/spinner';

function harness(interactive: boolean) {
	const written: string[] = [];

	return { written, spinner: new Spinner({ write: (text) => void written.push(text), interactive }) };
}

describe('start', () => {
	it('writes the label once when the stream is not interactive', () => {
		const { written, spinner } = harness(false);
		spinner.start('Starting Chromium');

		expect(written).toEqual(['Starting Chromium\n']);
	});

	it('writes one line per phase when the stream is not interactive', () => {
		const { written, spinner } = harness(false);
		spinner.start('Starting Chromium').update('Reading the sheet');

		expect(written).toEqual(['Starting Chromium\n', 'Reading the sheet\n']);
	});

	it('draws a frame immediately when the stream is interactive', () => {
		const { written, spinner } = harness(true);
		spinner.start('Starting Chromium');
		spinner.stop();

		expect(written[0]).toContain('Starting Chromium');
		expect(written[0]).toContain('⠋');
	});
});

describe('stop', () => {
	it('clears the line', () => {
		const { written, spinner } = harness(true);
		spinner.start('Starting Chromium').stop();

		expect(written.at(-1)).toBe('\r\x1b[2K');
	});

	it('does nothing when the spinner never started', () => {
		const { written, spinner } = harness(true);
		spinner.stop();

		expect(written).toEqual([]);
	});

	it('is safe to call twice', () => {
		const { written, spinner } = harness(true);
		spinner.start('Starting Chromium').stop().stop();

		expect(written.filter((text) => text === '\r\x1b[2K')).toHaveLength(1);
	});
});

describe('animation', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('advances through the frames', () => {
		const { written, spinner } = harness(true);
		spinner.start('Working');

		vi.advanceTimersByTime(240);
		spinner.stop();

		expect(written[1]).toContain('⠙');
		expect(written[2]).toContain('⠹');
	});

	it('keeps the latest label while spinning', () => {
		const { written, spinner } = harness(true);
		spinner.start('Starting Chromium').update('Reading the sheet');

		vi.advanceTimersByTime(80);
		spinner.stop();

		expect(written.at(-2)).toContain('Reading the sheet');
	});

	it('shows elapsed time once a phase is slow', () => {
		const { written, spinner } = harness(true);
		spinner.start('Reading the sheet');

		vi.advanceTimersByTime(4200);
		spinner.stop();

		expect(written.at(-2)).toContain('Reading the sheet 4.2s');
	});

	it('stays quiet about time for a fast phase', () => {
		const { written, spinner } = harness(true);
		spinner.start('Reading the sheet');

		vi.advanceTimersByTime(240);
		spinner.stop();

		expect(written.at(-2)).toMatch(/Reading the sheet$/);
	});

	it('restarts the clock for a new phase', () => {
		const { written, spinner } = harness(true);
		spinner.start('Starting Chromium');

		vi.advanceTimersByTime(4000);
		spinner.update('Reading the sheet');
		spinner.stop();

		expect(written.at(-2)).toMatch(/Reading the sheet$/);
	});

	it('stops the timer once stopped', () => {
		const { written, spinner } = harness(true);
		spinner.start('Working').stop();

		const drawn = written.length;
		vi.advanceTimersByTime(800);

		expect(written).toHaveLength(drawn);
	});
});

describe('run', () => {
	it('passes the result through', async () => {
		const { spinner } = harness(false);

		await expect(spinner.run('Working', () => 42)).resolves.toBe(42);
	});

	it('awaits an async task', async () => {
		const { spinner } = harness(false);

		await expect(spinner.run('Working', async () => 'done')).resolves.toBe('done');
	});

	it('stops the spinner when the task throws', async () => {
		const { written, spinner } = harness(true);

		await expect(
			spinner.run('Working', () => {
				throw new Error('boom');
			})
		).rejects.toThrow('boom');

		expect(written.at(-1)).toBe('\r\x1b[2K');
	});
});
