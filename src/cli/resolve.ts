import { readFileSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { Files } from '../utils/files.js';

const MANIFEST = 'package.json';
const DEFAULT_COMMANDS = 'src/console/commands';
const BIN = join('node_modules', '@madinco', 'smith', 'bin', 'smith.js');

interface Manifest {
	type?: string;
	smith?: { commands?: string };
}

export interface Project {
	readonly root: string;
	readonly commands: string;
}

export interface Location {
	readonly cwd: string;
	readonly home: string;
	readonly global: string;
	readonly project: Project | null;
}

export function locate(cwd: string): Location {
	const home = globalHome();
	const root = findRoot(cwd);

	return {
		cwd,
		home,
		global: join(home, 'commands'),
		project: root === null ? null : describe(root),
	};
}

export function directories(location: Location): string[] {
	return location.project === null
		? [location.global]
		: [location.global, location.project.commands];
}

export function binary(cwd: string): string | null {
	const directory = Files.containing(cwd, BIN);

	return directory === null ? null : realpathSync(join(directory, BIN));
}

export function target(location: Location): string {
	return location.project === null ? location.global : location.project.commands;
}

function globalHome(): string {
	const { SMITH_HOME, XDG_CONFIG_HOME } = process.env;

	if (SMITH_HOME) return resolve(SMITH_HOME);
	if (XDG_CONFIG_HOME) return join(resolve(XDG_CONFIG_HOME), 'smith');

	return join(homedir(), '.config', 'smith');
}

function findRoot(cwd: string): string | null {
	return Files.containing(cwd, MANIFEST);
}

function describe(root: string): Project {
	const manifest = read(root);
	const declared = manifest.smith?.commands ?? DEFAULT_COMMANDS;

	return {
		root,
		commands: isAbsolute(declared) ? declared : join(root, declared),
	};
}

function read(root: string): Manifest {
	try {
		return JSON.parse(readFileSync(join(root, MANIFEST), 'utf8')) as Manifest;
	} catch {
		return {};
	}
}
