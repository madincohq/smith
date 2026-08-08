import { describe, expect, it } from 'vitest';
import { inspect } from '@/inspect/detail';
import type { Inspector } from '@/inspect/probe';
import { laravel } from '@/inspect/profiles/laravel';

interface Setup {
	composer?: Record<string, unknown>;
	present?: string[];
	counts?: Record<string, number>;
	version?: string;
	env?: string;
}

function probing(setup: Setup = {}): Inspector {
	return {
		text: (path: string) => (path === '.env' ? (setup.env ?? null) : null),
		json: <T>(path: string) => (path === 'composer.json' ? ((setup.composer ?? {}) as T) : null),
		exists: (path: string) => (setup.present ?? []).includes(path),
		files: () => [],
		count: (pattern: string) => setup.counts?.[pattern] ?? 0,
		installed: (name: string) =>
			name === 'laravel/framework' ? (setup.version ?? null) : null,
	};
}

function entries(setup: Setup = {}): Record<string, string> {
	const report = inspect([laravel], probing({ version: '13.16.1', ...setup }))[0];

	return Object.fromEntries((report?.entries ?? []).map((entry) => [entry.label, entry.value]));
}

describe('laravel', () => {
	describe('matching', () => {
		it('reports a section when the framework is installed', () => {
			expect(inspect([laravel], probing({ version: '13.16.1' }))[0]?.section).toBe('Laravel');
		});

		it('reports nothing for a project that is not laravel', () => {
			expect(inspect([laravel], probing())).toEqual([]);
		});
	});

	describe('versions', () => {
		it('reports the framework version composer installed', () => {
			expect(entries().Version).toBe('13.16.1');
		});

		it('reports the php version the project requires', () => {
			expect(entries({ composer: { require: { php: '^8.2' } } }).PHP).toBe('^8.2');
		});

		it('prefers the platform php composer is pinned to', () => {
			const composer = { require: { php: '^8.2' }, config: { platform: { php: '8.4.1' } } };

			expect(entries({ composer }).PHP).toBe('8.4.1');
		});
	});

	describe('caches', () => {
		it('reports each cache as not cached when nothing is compiled', () => {
			expect(entries()).toMatchObject({
				Config: 'NOT CACHED',
				Events: 'NOT CACHED',
				Routes: 'NOT CACHED',
			});
		});

		it('reports a cache as cached once its file is compiled', () => {
			expect(entries({ present: ['bootstrap/cache/config.php'] }).Config).toBe('CACHED');
		});

		it('recognises the versioned route cache laravel writes', () => {
			expect(entries({ present: ['bootstrap/cache/routes-v7.php'] }).Routes).toBe('CACHED');
		});

		it('recognises an unversioned route cache too', () => {
			expect(entries({ present: ['bootstrap/cache/routes.php'] }).Routes).toBe('CACHED');
		});

		it('warns about a cache that is missing and approves one that is there', () => {
			const report = inspect([laravel], probing({ version: '13.16.1' }))[0];
			const tones = Object.fromEntries(
				(report?.entries ?? []).map((entry) => [entry.label, entry.tone])
			);

			expect(tones.Config).toBe('warn');
			expect(tones.Version).toBeUndefined();
		});
	});

	describe('storage', () => {
		it('reports the public storage link as missing when it is not there', () => {
			expect(entries()['public/storage']).toBe('NOT LINKED');
		});

		it('reports the public storage link once it exists', () => {
			expect(entries({ present: ['public/storage'] })['public/storage']).toBe('LINKED');
		});
	});

	describe('environment', () => {
		const env = [
			'APP_ENV=local',
			'APP_DEBUG=true',
			'APP_URL=https://mcn.localhost',
			'APP_TIMEZONE=UTC',
			'APP_LOCALE=fr',
			'DB_CONNECTION=pgsql',
			'CACHE_STORE=database',
			'QUEUE_CONNECTION=database',
			'MAIL_MAILER=smtp',
			'SESSION_DRIVER=database',
			'BROADCAST_CONNECTION=log',
		].join('\n');

		it('reports the settings the project declares', () => {
			expect(entries({ env })).toMatchObject({
				Environment: 'local',
				Timezone: 'UTC',
				Locale: 'fr',
				Database: 'pgsql',
				'Cache store': 'database',
				Queue: 'database',
				Mail: 'smtp',
				Session: 'database',
				Broadcasting: 'log',
			});
		});

		it('reports the url without its scheme, the way laravel does', () => {
			expect(entries({ env }).URL).toBe('mcn.localhost');
		});

		it('warns when debug mode is on', () => {
			const report = inspect([laravel], probing({ version: '13.16.1', env }))[0];
			const debug = report?.entries.find((entry) => entry.label === 'Debug Mode');

			expect(debug).toEqual({ label: 'Debug Mode', value: 'ENABLED', tone: 'warn' });
		});

		it('says debug mode is off without making a fuss about it', () => {
			const off = entries({ env: 'APP_DEBUG=false' });

			expect(off['Debug Mode']).toBe('OFF');
		});

		it('reads the cache store from the older key when that is what is set', () => {
			expect(entries({ env: 'CACHE_DRIVER=redis' })['Cache store']).toBe('redis');
		});

		it('leaves every settings row out when there is no dotenv file', () => {
			expect(entries()).not.toHaveProperty('Environment');
			expect(entries()).not.toHaveProperty('Database');
			expect(entries()).not.toHaveProperty('Debug Mode');
		});
	});

	describe('code', () => {
		it('counts the models and the migrations', () => {
			const counts = { 'app/Models/**/*.php': 34, 'database/migrations/*.php': 61 };

			expect(entries({ counts })).toMatchObject({ Models: '34', Migrations: '61' });
		});

		it('leaves out the counts that find nothing', () => {
			expect(entries()).not.toHaveProperty('Models');
		});
	});
});
