import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Directory, File, Symlink, SymlinkConflict } from '@';

let root = '';

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'smith-symlink-'));
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

describe('Symlink', () => {
	it('normalizes its path and exposes its name', () => {
		const path = GivenPath(['unmade', '..', 'shortcut']);
		const expectedPath = GivenPath(['shortcut']);
		const link = GivenSymlink(path);

		expect(link.path).toBe(expectedPath);
		expect(link.name).toBe('shortcut');
	});

	it('does not touch the filesystem when constructed', () => {
		const path = GivenPath(['unmade', 'shortcut']);
		const link = GivenSymlink(path);

		expect(WhenCheckingPathExists(link.path)).toBe(false);
	});

	it('returns its parent directory', () => {
		const path = GivenPath(['cedar', 'shortcut']);
		const parentPath = GivenPath(['cedar']);
		const link = GivenSymlink(path);
		const parent = WhenGettingParentOf(link);

		expect(parent).toBeInstanceOf(Directory);
		expect(parent.path).toBe(parentPath);
	});

	it('exists when a symlink is present', () => {
		const sourcePath = GivenPath(['source.txt']);
		const linkPath = GivenPath(['shortcut']);
		const source = GivenExistingFile(sourcePath, 'hello');
		const link = GivenExistingSymlink(linkPath, source.path);

		expect(WhenCheckingExistenceOf(link)).toBe(true);
	});

	it('does not exist when its path is missing', () => {
		const path = GivenPath(['missing']);
		const link = GivenSymlink(path);

		expect(WhenCheckingExistenceOf(link)).toBe(false);
	});

	it('does not mistake a regular file for a symlink', () => {
		const path = GivenPath(['source.txt']);
		const file = GivenExistingFile(path, 'hello');
		const link = GivenSymlink(file.path);

		expect(WhenCheckingExistenceOf(link)).toBe(false);
	});

	it('does not exist below a regular file', () => {
		const path = GivenPath(['source.txt']);
		const file = GivenExistingFile(path, 'hello');
		const childPath = join(file.path, 'child');
		const link = GivenSymlink(childPath);

		expect(WhenCheckingExistenceOf(link)).toBe(false);
	});

	it('is not broken when its target exists', () => {
		const sourcePath = GivenPath(['source.txt']);
		const linkPath = GivenPath(['shortcut']);
		const source = GivenExistingFile(sourcePath, 'hello');
		const link = GivenExistingSymlink(linkPath, source.path);

		expect(WhenCheckingBrokennessOf(link)).toBe(false);
	});

	it('still exists when its target is missing', () => {
		const linkPath = GivenPath(['shortcut']);
		const targetPath = GivenPath(['missing.txt']);
		const link = GivenExistingSymlink(linkPath, targetPath);

		expect(WhenCheckingExistenceOf(link)).toBe(true);
	});

	it('is broken when its target is missing', () => {
		const linkPath = GivenPath(['shortcut']);
		const targetPath = GivenPath(['missing.txt']);
		const link = GivenExistingSymlink(linkPath, targetPath);

		expect(WhenCheckingBrokennessOf(link)).toBe(true);
	});

	it('resolves a relative target from its parent directory', () => {
		const directoryPath = GivenPath(['links']);
		const linkPath = GivenPath(['links', 'shortcut']);
		const targetPath = GivenPath(['source.txt']);
		GivenExistingDirectory(directoryPath);
		const link = GivenExistingSymlink(linkPath, '../source.txt');

		expect(WhenGettingTargetPathOf(link)).toBe(targetPath);
	});

	it('reports the target path of a broken symlink', () => {
		const linkPath = GivenPath(['shortcut']);
		const targetPath = GivenPath(['missing.txt']);
		const link = GivenExistingSymlink(linkPath, targetPath);

		expect(WhenGettingTargetPathOf(link)).toBe(targetPath);
	});

	it('recognizes the source it points to', () => {
		const sourcePath = GivenPath(['source.txt']);
		const linkPath = GivenPath(['shortcut']);
		const source = GivenExistingFile(sourcePath, 'hello');
		const link = GivenExistingSymlink(linkPath, source.path);

		expect(WhenCheckingWhether(link, source)).toBe(true);
	});

	it('does not match a different source', () => {
		const sourcePath = GivenPath(['source.txt']);
		const otherPath = GivenPath(['other.txt']);
		const linkPath = GivenPath(['shortcut']);
		const source = GivenExistingFile(sourcePath, 'hello');
		const other = GivenFile(otherPath);
		const link = GivenExistingSymlink(linkPath, source.path);

		expect(WhenCheckingWhether(link, other)).toBe(false);
	});

	it('does not point to a source when the symlink is missing', () => {
		const sourcePath = GivenPath(['source.txt']);
		const linkPath = GivenPath(['missing']);
		const source = GivenFile(sourcePath);
		const link = GivenSymlink(linkPath);

		expect(WhenCheckingWhether(link, source)).toBe(false);
	});

	it('links to a file source', () => {
		const sourcePath = GivenPath(['source.txt']);
		const source = GivenExistingFile(sourcePath, 'hello');
		const link = GivenDirectory(root).symlink('shortcut.txt');

		const result = WhenLinking(link, source);

		expect(result).toBe(link);
		expect(result.pointsTo(source)).toBe(true);
	});

	it('links to a directory source', () => {
		const sourcePath = GivenPath(['source']);
		const source = GivenExistingDirectory(sourcePath);
		const link = GivenDirectory(root).symlink('shortcut');

		const result = WhenLinking(link, source);

		expect(result).toBe(link);
		expect(result.pointsTo(source)).toBe(true);
	});

	it('creates a broken link when the source is missing', () => {
		const source = GivenFile(GivenPath(['missing-source.txt']));
		const link = GivenDirectory(root).symlink('shortcut.txt');

		WhenLinking(link, source);

		expect(link.isBroken()).toBe(true);
	});

	it('accepts the same link a second time', () => {
		const sourcePath = GivenPath(['missing-source.txt']);
		const source = GivenFile(sourcePath);
		const link = GivenDirectory(root).symlink('shortcut.txt');
		WhenLinking(link, source);

		const second = WhenLinking(link, source);

		expect(second).toBe(link);
		expect(second.pointsTo(source)).toBe(true);
		expect(readlinkSync(link.path)).toBe(source.path);
	});

	it('reports a conflicting symlink and preserves it', () => {
		const oldSourcePath = GivenPath(['old.txt']);
		const sourcePath = GivenPath(['new.txt']);
		const oldSource = GivenFile(oldSourcePath);
		const source = GivenFile(sourcePath);
		const link = GivenDirectory(root).symlink('shortcut.txt');
		GivenExistingSymlink(link.path, oldSource.path);

		const error = WhenLinkingFails(link, source);

		expect(error).toBeInstanceOf(SymlinkConflict);
		expect(error).toMatchObject({ destinationPath: link.path, existingEntry: 'symlink', sourcePath: source.path });
		expect(readlinkSync(link.path)).toBe(oldSource.path);
	});

	it('reports a conflicting file and preserves its contents', () => {
		const destinationPath = GivenPath(['shortcut.txt']);
		const sourcePath = GivenPath(['source.txt']);
		const destination = GivenExistingFile(destinationPath, 'keep me');
		const source = GivenFile(sourcePath);
		const link = GivenDirectory(root).symlink('shortcut.txt');

		const error = WhenLinkingFails(link, source);

		expect(error).toBeInstanceOf(SymlinkConflict);
		expect(error).toMatchObject({ destinationPath: link.path, existingEntry: 'file', sourcePath: source.path });
		expect(readFileSync(destination.path, 'utf8')).toBe('keep me');
	});

	it('reports a conflicting directory and preserves its children', () => {
		const destinationPath = GivenPath(['shortcut']);
		const sourcePath = GivenPath(['source']);
		const destination = GivenExistingDirectory(destinationPath);
		const childPath = join(destination.path, 'child.txt');
		const child = GivenExistingFile(childPath, 'keep me');
		const source = GivenDirectory(sourcePath);
		const link = GivenDirectory(root).symlink('shortcut');

		const error = WhenLinkingFails(link, source);

		expect(error).toBeInstanceOf(SymlinkConflict);
		expect(error).toMatchObject({ destinationPath: link.path, existingEntry: 'directory', sourcePath: source.path });
		expect(readFileSync(child.path, 'utf8')).toBe('keep me');
		expect(lstatSync(destination.path).isDirectory()).toBe(true);
	});
});

function GivenPath(segments: string[]): string {
	return [root, ...segments].join(sep);
}

function GivenSymlink(path: string): Symlink {
	return new Symlink(path);
}

function GivenFile(path: string): File {
	return new File(path);
}

function GivenDirectory(path: string): Directory {
	return new Directory(path);
}

function GivenExistingFile(path: string, contents: string): File {
	writeFileSync(path, contents);
	return GivenFile(path);
}

function GivenExistingDirectory(path: string): Directory {
	mkdirSync(path, { recursive: true });
	return GivenDirectory(path);
}

function GivenExistingSymlink(path: string, target: string): Symlink {
	symlinkSync(target, path);
	return GivenSymlink(path);
}

function WhenGettingParentOf(link: Symlink): Directory {
	return link.parent();
}

function WhenCheckingExistenceOf(link: Symlink): boolean {
	return link.exists();
}

function WhenCheckingBrokennessOf(link: Symlink): boolean {
	return link.isBroken();
}

function WhenGettingTargetPathOf(link: Symlink): string {
	return link.targetPath();
}

function WhenCheckingWhether(link: Symlink, source: File | Directory): boolean {
	return link.pointsTo(source);
}

function WhenLinking(link: Symlink, source: File | Directory): Symlink {
	return link.to(source);
}

function WhenLinkingFails(link: Symlink, source: File | Directory): unknown {
	try {
		WhenLinking(link, source);
	} catch (error) {
		return error;
	}
	throw new Error('Expected linking to fail');
}

function WhenCheckingPathExists(path: string): boolean {
	return existsSync(path);
}
