export interface Step {
	up(): void | Promise<void>;
	down?(): void | Promise<void>;
}

export class Transaction {
	async run(steps: readonly Step[]): Promise<void> {
		const completed: Step[] = [];

		for (const step of steps) {
			try {
				await step.up();
				completed.push(step);
			} catch (reason) {
				const failures: unknown[] = [];

				// Include the failing step: its up action may have changed state before throwing.
				for (const attempted of [step, ...completed.reverse()]) {
					try {
						await attempted.down?.();
					} catch (failure) {
						failures.push(failure);
					}
				}

				if (failures.length > 0) {
					throw new AggregateError([reason, ...failures], 'Transaction failed and rollback was incomplete');
				}

				throw reason;
			}
		}
	}
}
