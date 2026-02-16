import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const html = readFileSync(resolve(__dirname, '../../../index.html'), 'utf-8');

describe('index.html', () => {
	it('uses relative paths for static asset link hrefs (subpath-safe)', () => {
		// Match all <link> href values
		const linkHrefs = [...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map((m) => m[1]);

		expect(linkHrefs.length).toBeGreaterThan(0);

		for (const href of linkHrefs) {
			expect(href, `href="${href}" should not start with /`).not.toMatch(/^\//);
		}
	});
});
