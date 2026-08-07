import { describe, expect, it } from 'vitest';
import { Stubs } from '@/utils/stubs';

describe('read', () => {
	it('reads a template that ships with the package', () => {
		expect(Stubs.read('command')).toContain('extends Command');
	});

	it('throws for a template that does not exist', () => {
		expect(() => Stubs.read('nope')).toThrow();
	});
});

describe('render', () => {
	it('replaces a placeholder', () => {
		expect(Stubs.render('class {{ class }} {}', { class: 'OgCommand' })).toBe('class OgCommand {}');
	});

	it('replaces every occurrence', () => {
		expect(Stubs.render('{{ name }} and {{ name }}', { name: 'og' })).toBe('og and og');
	});

	it('tolerates missing whitespace', () => {
		expect(Stubs.render('{{name}}', { name: 'og' })).toBe('og');
	});

	it('leaves an unknown placeholder alone', () => {
		expect(Stubs.render('{{ name }} {{ other }}', { name: 'og' })).toBe('og {{ other }}');
	});
});
