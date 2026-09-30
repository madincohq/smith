export class Collection<T> implements Iterable<T> {
	private readonly items: T[];

	constructor(items: Iterable<T> = []) {
		this.items = Array.from(items);
	}

	[Symbol.iterator](): Iterator<T> {
		return this.items[Symbol.iterator]();
	}

	toArray(): T[] {
		return [...this.items];
	}

	map<U>(callback: (item: T, index: number) => U): Collection<U> {
		return new Collection(this.items.map(callback));
	}

	filter<S extends T>(predicate: (item: T, index: number) => item is S): Collection<S>;
	filter(predicate: (item: T, index: number) => boolean): Collection<T>;
	filter(predicate: (item: T, index: number) => boolean): Collection<T> {
		return new Collection(this.items.filter(predicate));
	}

	reject(predicate: (item: T, index: number) => boolean): Collection<T> {
		return new Collection(this.items.filter((item, index) => !predicate(item, index)));
	}

	each(callback: (item: T, index: number) => void): this {
		this.items.forEach(callback);
		return this;
	}

	first(): T | null {
		return this.items.length === 0 ? null : this.items[0]!;
	}

	last(): T | null {
		return this.items.length === 0 ? null : this.items.at(-1)!;
	}

	contains(predicate: (item: T, index: number) => boolean): boolean {
		return this.items.some(predicate);
	}

	isEmpty(): boolean {
		return this.items.length === 0;
	}

	count(): number {
		return this.items.length;
	}

	pluck<K extends keyof T>(key: K): Collection<T[K]> {
		return this.map((item) => item[key]);
	}
}
