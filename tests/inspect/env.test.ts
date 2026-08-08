import { describe, expect, it } from 'vitest';
import { env } from '@/inspect/env';

describe('env', () => {
	it('reads the values a dotenv file declares', () => {
		expect(env('APP_ENV=local\nDB_CONNECTION=pgsql')).toEqual({
			APP_ENV: 'local',
			DB_CONNECTION: 'pgsql',
		});
	});

	it('reads nothing from a file that is not there', () => {
		expect(env(null)).toEqual({});
	});

	it('ignores comments and blank lines', () => {
		expect(env('# a note\n\nAPP_ENV=local\n')).toEqual({ APP_ENV: 'local' });
	});

	it('ignores an export prefix', () => {
		expect(env('export APP_ENV=local')).toEqual({ APP_ENV: 'local' });
	});

	it('tolerates spaces around the equals sign', () => {
		expect(env('APP_ENV = local')).toEqual({ APP_ENV: 'local' });
	});

	it('strips the quotes around a quoted value', () => {
		expect(env('APP_NAME="Radio Sud Est"')).toEqual({ APP_NAME: 'Radio Sud Est' });
		expect(env("APP_NAME='Radio Sud Est'")).toEqual({ APP_NAME: 'Radio Sud Est' });
	});

	it('keeps a hash that is inside a quoted value', () => {
		expect(env('APP_KEY="a#b"')).toEqual({ APP_KEY: 'a#b' });
	});

	it('drops a trailing comment from an unquoted value', () => {
		expect(env('APP_ENV=local # the default')).toEqual({ APP_ENV: 'local' });
	});

	it('reads an empty value as empty', () => {
		expect(env('APP_URL=')).toEqual({ APP_URL: '' });
	});

	it('ignores a line that declares nothing', () => {
		expect(env('this is not a declaration')).toEqual({});
	});
});
