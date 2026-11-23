import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'dist');
// Explicit publication list: never copy archives, environment files, tests, or source notes.
const publicFiles = ['index.html', 'styles.css', 'app.js', 'scenario.js', 'config.js', 'assets', '_headers', 'robots.txt', 'sitemap.xml', '404.html'];
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of publicFiles) {
  await stat(join(root, file));
  await cp(join(root, file), join(output, file), { recursive: true });
}
console.log('Built static website → dist/');
