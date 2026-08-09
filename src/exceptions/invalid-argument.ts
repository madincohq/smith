import { usage, type Described } from '../output/help.js';
import type { Section } from '../output/terminal.js';

export class InvalidArgument extends Error {
	render(command: Described): Section[] {
		return usage(command);
	}
}
