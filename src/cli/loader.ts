export async function loader(): Promise<void> {
	process.env.JITI_TSCONFIG_PATHS ??= 'true';

	await import('jiti/register');
}
