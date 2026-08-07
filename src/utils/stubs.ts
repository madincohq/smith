import { readFileSync } from 'node:fs';

export type Replacements = Record<string, string>;

const BUILT_IN = new URL('../stubs/', import.meta.url);

export const Stubs = {
	read(name: string, base = BUILT_IN): string {
		return readFileSync(new URL(`${name}.stub`, base), 'utf8');
	},

	render(template: string, replacements: Replacements): string {
		return template.replace(
			/\{\{\s*(\w+)\s*\}\}/g,
			(match, key: string) => replacements[key] ?? match
		);
	},
};
