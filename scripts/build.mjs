import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
// Explicit publication list: never copy archives, environment files, tests, or source notes.
const publicFiles = ['index.html', 'styles.css', 'app.js', 'story.js', 'story-timeline.js', 'scenario.js', 'config.js', 'assets', '_headers', 'robots.txt', 'sitemap.xml', '404.html'];

export async function buildSite({
  output = join(root, 'dist'),
  basePath = process.env.SITE_BASE_PATH || '',
  siteUrl = process.env.SITE_URL || 'https://edge.fncai.org/',
} = {}) {
  const base = basePath.replace(/^\/+|\/+$/g, '');
  const prefix = base ? `/${base}` : '';
  const publicUrl = `${siteUrl.replace(/\/+$/g, '')}/`;

  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const file of publicFiles) {
    await stat(join(root, file));
    await cp(join(root, file), join(output, file), { recursive: true });
  }

  // GitHub project sites live under /<repository>/; custom domains use the root.
  // Only rewrite public output, keeping the source and default Cloudflare build intact.
  for (const file of ['index.html', '404.html', 'styles.css', 'config.js', 'robots.txt', 'sitemap.xml']) {
    const destination = join(output, file);
    let source = await readFile(destination, 'utf8');
    if (file.endsWith('.html')) source = source.replace(/((?:href|src)=")\/(?!\/)/g, `$1${prefix}/`);
    if (file.endsWith('.css')) source = source.replace(/url\((['"]?)\/(?!\/)/g, `url($1${prefix}/`);
    if (file === 'config.js') source = source.replace(/(['"])\/assets\//g, `$1${prefix}/assets/`);
    source = source.replaceAll('https://edge.fncai.org/', publicUrl);
    await writeFile(destination, source);
  }
  await writeFile(join(output, '.nojekyll'), '');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildSite();
  console.log('Built static website → dist/');
}
