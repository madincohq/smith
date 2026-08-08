import type { Described } from '../output/help.js';
import type { Section } from '../output/terminal.js';

export interface Renders {
	readonly message: string;
	render(command: Described): Section[];
}

export function renders(reason: unknown): reason is Renders {
	return reason instanceof Error && typeof (reason as Partial<Renders>).render === 'function';
}
