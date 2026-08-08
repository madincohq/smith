import { Detail, type Profile } from '../detail.js';

const ADAPTER = /^@astrojs\/(cloudflare|node|vercel|netlify|deno)$/;

export const astro: Profile = {
	section: 'Astro',
	when: Detail.version('astro'),
	details: {
		Version: Detail.version('astro'),
		Adapter: Detail.dependency(ADAPTER),
		Pages: Detail.count('src/pages/**/*.{astro,md,mdx}'),
		Components: Detail.count('src/components/**/*.astro'),
		Layouts: Detail.count('src/layouts/**/*.astro'),
		Content: Detail.count('src/content/**/*.{md,mdx}'),
	},
};
