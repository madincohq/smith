import { describe, expect, it } from 'vitest';
import { Transaction, type Step } from '@/utils/transaction';

describe('Transaction', () => {
	it('runs each up step in order', async () => {
		const events: string[] = [];

		await WhenRunning([
			{ up: () => { events.push('first'); } },
			{ up: async () => { events.push('second'); } },
		]);

		expect(events).toEqual(['first', 'second']);
	});

	it('rolls back the failing step and earlier steps in reverse order', async () => {
		const events: string[] = [];
		const failure = new Error('publish failed');

		await expect(WhenRunning([
			{ up: () => { events.push('version'); }, down: () => { events.push('restore version'); } },
			{ up: () => { events.push('publish'); throw failure; }, down: () => { events.push('restore publish'); } },
			{ up: () => { events.push('push'); } },
		])).rejects.toBe(failure);

		expect(events).toEqual(['version', 'publish', 'restore publish', 'restore version']);
	});

	it('continues rollback when one down step fails', async () => {
		const events: string[] = [];
		const failure = new Error('up failed');
		const rollbackFailure = new Error('down failed');

		await expect(WhenRunning([
			{ up: () => {}, down: () => { events.push('first down'); } },
			{ up: () => { throw failure; }, down: () => { throw rollbackFailure; } },
		])).rejects.toMatchObject({ errors: [failure, rollbackFailure] });

		expect(events).toEqual(['first down']);
	});
});

function WhenRunning(steps: Step[]): Promise<void> {
	return new Transaction().run(steps);
}
