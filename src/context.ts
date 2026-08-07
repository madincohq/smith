export interface Context {
	readonly cwd: string;
	readonly project: string | null;
}

export function detached(): Context {
	return { cwd: process.cwd(), project: null };
}
