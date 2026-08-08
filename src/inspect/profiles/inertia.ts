import { Detail, type Profile, type Resolver } from '../detail.js';
import type { Inspector } from '../probe.js';

const CLIENT = /^@inertiajs\/(react|vue3|vue|svelte)$/;

const adapter = Detail.dependency(CLIENT);

const version: Resolver = (probe) =>
	probe.installed('inertiajs/inertia-laravel') ?? installedClient(probe);

export const inertia: Profile = {
	section: 'Inertia',
	when: (probe) => version(probe) ?? adapter(probe),
	details: { Version: version, Adapter: adapter },
};

function installedClient(probe: Inspector): string | null {
	const name = adapter(probe);

	return typeof name === 'string' ? probe.installed(name) : null;
}
