import { describe, expect, expectTypeOf, it } from 'vitest';
import { Collection } from '@';

describe('Collection', () => {
	it('constructs from values', () => {
		const numbers = new Collection([1, 2, 3]);

		expect(numbers.toArray()).toEqual([1, 2, 3]);
	});

	it('iterates in order', () => {
		const numbers = new Collection([1, 2, 3]);

		expect([...numbers]).toEqual([1, 2, 3]);
	});

	it('maps values into a collection', () => {
		const numbers = new Collection([1, 2]);
		const doubled = numbers.map((number) => number * 2);

		expect(doubled).toBeInstanceOf(Collection);
		expect(doubled.toArray()).toEqual([2, 4]);
	});

	it('filters values into a collection', () => {
		const numbers = new Collection([1, 2, 3]);
		const even = numbers.filter((number) => number % 2 === 0);

		expect(even).toBeInstanceOf(Collection);
		expect(even.toArray()).toEqual([2]);
	});

	it('narrows types with a filter predicate', () => {
		const values = new Collection<string | number>(['one', 2]);
		const names = values.filter((value): value is string => typeof value === 'string');

		expectTypeOf(names).toEqualTypeOf<Collection<string>>();
	});

	it('rejects values into a collection', () => {
		const numbers = new Collection([1, 2, 3]);
		const odd = numbers.reject((number) => number % 2 === 0);

		expect(odd).toBeInstanceOf(Collection);
		expect(odd.toArray()).toEqual([1, 3]);
	});

	it('visits each value', () => {
		const numbers = new Collection([1, 2]);
		const visited: number[] = [];

		numbers.each((number) => { visited.push(number); });

		expect(visited).toEqual([1, 2]);
	});

	it('returns the same collection from each', () => {
		const numbers = new Collection([1]);

		expect(numbers.each(() => {})).toBe(numbers);
	});

	it('returns the first value', () => {
		expect(new Collection([1, 2]).first()).toBe(1);
	});

	it('returns null when there is no first value', () => {
		expect(new Collection<number>().first()).toBeNull();
	});

	it('preserves an undefined first value', () => {
		expect(new Collection([undefined, 1]).first()).toBeUndefined();
	});

	it('returns the last value', () => {
		expect(new Collection([1, 2]).last()).toBe(2);
	});

	it('returns null when there is no last value', () => {
		expect(new Collection<number>().last()).toBeNull();
	});

	it('preserves an undefined last value', () => {
		expect(new Collection([1, undefined]).last()).toBeUndefined();
	});

	it('finds a value using a predicate', () => {
		const files = new Collection([{ name: 'notes.md' }, { name: 'SKILL.md' }]);

		expect(files.contains((file) => file.name === 'SKILL.md')).toBe(true);
	});

	it('returns false when no value matches', () => {
		const files = new Collection([{ name: 'notes.md' }]);

		expect(files.contains((file) => file.name === 'SKILL.md')).toBe(false);
	});

	it('reports an empty collection', () => {
		expect(new Collection<number>().isEmpty()).toBe(true);
	});

	it('reports a nonempty collection', () => {
		expect(new Collection([1]).isEmpty()).toBe(false);
	});

	it('counts values', () => {
		expect(new Collection([1, 2]).count()).toBe(2);
	});

	it('plucks a property into a collection', () => {
		const files = new Collection([{ name: 'one.md' }, { name: 'two.md' }]);
		const names = files.pluck('name');

		expect(names).toBeInstanceOf(Collection);
		expect(names.toArray()).toEqual(['one.md', 'two.md']);
	});

	it('preserves the inferred property type when plucking', () => {
		const files = new Collection([{ name: 'one.md', size: 1 }]);

		expectTypeOf(files.pluck('name')).toEqualTypeOf<Collection<string>>();
		expectTypeOf(files.pluck('size')).toEqualTypeOf<Collection<number>>();
	});

	it('chains transformations after plucking', () => {
		const files = new Collection([{ name: 'one.md' }, { name: 'two.txt' }]);

		expect(files.pluck('name').filter((name) => name.endsWith('.md')).toArray()).toEqual(['one.md']);
	});
});
