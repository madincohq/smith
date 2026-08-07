#!/usr/bin/env node
import { register } from 'tsx/esm/api';

register();

const { run } = await import('../dist/cli/run.js');

process.exit(await run(process.argv.slice(2), process.cwd()));
