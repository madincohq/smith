import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, parse, resolve } from 'node:path';

const MANIFEST = 'package.json';
const DEFAULT_COMMANDS = 'src/console/commands';

interface Manifest {
	type?: string;
	smith?: { commands?: string };
}

export interface Project {
	readonly root: string;
	readonly commands: string;
	readonly module: boolean;
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
	for (let directory = resolve(cwd); ; directory = dirname(directory)) {
		if (existsSync(join(directory, MANIFEST))) return directory;
		if (directory === parse(directory).root) return null;
	}
}

function describe(root: string): Project {
	const manifest = read(root);
	const declared = manifest.smith?.commands ?? DEFAULT_COMMANDS;

	return {
		root,
		commands: isAbsolute(declared) ? declared : join(root, declared),
		module: manifest.type === 'module',
	};
}

function read(root: string): Manifest {
	try {
		return JSON.parse(readFileSync(join(root, MANIFEST), 'utf8')) as Manifest;
	} catch {
		return {};
	}
}
