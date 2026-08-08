import { Detail, type Profile, type Resolver, type Row } from '../detail.js';
import { env } from '../env.js';
import type { Inspector } from '../probe.js';

const ROUTES = ['bootstrap/cache/routes-v7.php', 'bootstrap/cache/routes.php'];

const ENABLED = ['true', '1', 'on', 'yes'];

interface Composer {
	require?: Record<string, string>;
	config?: { platform?: { php?: string } };
}

const version = Detail.version('laravel/framework');

const php: Resolver = (probe) => {
	const composer = probe.json<Composer>('composer.json');

	return composer?.config?.platform?.php ?? composer?.require?.php ?? null;
};

const routes: Resolver = (probe) => cached(ROUTES.some((path) => probe.exists(path)));

const debug: Resolver = (probe) => {
	const declared = settings(probe).APP_DEBUG;

	if (declared === undefined) return null;

	return ENABLED.includes(declared.toLowerCase()) ? { value: 'ENABLED', tone: 'warn' } : 'OFF';
};

const url: Resolver = (probe) => setting(probe, 'APP_URL')?.replace(/^https?:\/\//, '') ?? null;

export const laravel: Profile = {
	section: 'Laravel',
	when: version,
	details: {
		Version: version,
		PHP: php,
		Environment: (probe) => setting(probe, 'APP_ENV'),
		'Debug Mode': debug,
		URL: url,
		Timezone: (probe) => setting(probe, 'APP_TIMEZONE'),
		Locale: (probe) => setting(probe, 'APP_LOCALE'),
		Config: Detail.status('bootstrap/cache/config.php', 'CACHED', 'NOT CACHED'),
		Events: Detail.status('bootstrap/cache/events.php', 'CACHED', 'NOT CACHED'),
		Routes: routes,
		Database: (probe) => setting(probe, 'DB_CONNECTION'),
		'Cache store': (probe) => setting(probe, 'CACHE_STORE') ?? setting(probe, 'CACHE_DRIVER'),
		Queue: (probe) => setting(probe, 'QUEUE_CONNECTION'),
		Mail: (probe) => setting(probe, 'MAIL_MAILER'),
		Session: (probe) => setting(probe, 'SESSION_DRIVER'),
		Broadcasting: (probe) => setting(probe, 'BROADCAST_CONNECTION'),
		'public/storage': Detail.status('public/storage', 'LINKED', 'NOT LINKED'),
		Models: Detail.count('app/Models/**/*.php'),
		Migrations: Detail.count('database/migrations/*.php'),
	},
};

function settings(probe: Inspector): Record<string, string> {
	return env(probe.text('.env'));
}

function setting(probe: Inspector, key: string): string | null {
	return settings(probe)[key] ?? null;
}

function cached(compiled: boolean): Row {
	return compiled ? { value: 'CACHED', tone: 'good' } : { value: 'NOT CACHED', tone: 'warn' };
}
