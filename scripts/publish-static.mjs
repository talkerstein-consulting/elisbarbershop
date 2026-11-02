import { access, cp, readdir } from 'node:fs/promises';

// Hostinger's PHP/HTML Git deployment copies this branch directly to public_html.
// Keep the built static site at the branch root alongside the Astro sources.
const output = new URL('../dist/', import.meta.url);
const root = new URL('../', import.meta.url);
await access(new URL('index.html', output));
for (const entry of await readdir(output)) {
  await cp(new URL(entry, output), new URL(entry, root), { recursive: true });
}
console.log('Published Astro HTML and public assets to the Hostinger Git web root.');
