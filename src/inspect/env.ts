const DECLARATION = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;

const QUOTED = /^(['"])([\s\S]*)\1$/;

export function env(contents: string | null): Record<string, string> {
	const values: Record<string, string> = {};

	if (contents === null) return values;

	for (const line of contents.split(/\r?\n/)) {
		const declaration = DECLARATION.exec(line);

		if (declaration === null) continue;

		const [, key = '', raw = ''] = declaration;

		values[key] = read(raw.trim());
	}

	return values;
}

function read(raw: string): string {
	const quoted = QUOTED.exec(raw);

	if (quoted !== null) return quoted[2] ?? '';

	return (raw.split(/\s+#/)[0] ?? '').trim();
}
