import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSite } from '../scripts/build.mjs';

test('GitHub Pages project build resolves assets, nested 404s, and metadata under the repository path', async t => {
  const output = await mkdtemp(join(tmpdir(), 'fieldwork-pages-test-'));
  t.after(() => rm(output, { recursive: true, force: true }));
  await buildSite({ output, basePath: '/fieldwork-landing/', siteUrl: 'https://brandon-ibm.github.io/fieldwork-landing' });

  const html = await readFile(join(output, 'index.html'), 'utf8');
  const missing = await readFile(join(output, '404.html'), 'utf8');
  const css = await readFile(join(output, 'styles.css'), 'utf8');
  const config = await readFile(join(output, 'config.js'), 'utf8');
  assert.match(html, /src="\/fieldwork-landing\/app\.js"/);
  assert.match(html, /href="\/fieldwork-landing\/styles\.css"/);
  assert.match(html, /href="\/fieldwork-landing\/assets\/fonts\//);
  assert.match(html, /id="start-demo" href="#demo"/);
  assert.match(html, /rel="canonical" href="https:\/\/brandon-ibm\.github\.io\/fieldwork-landing\/"/);
  assert.match(css, /url\('\/fieldwork-landing\/assets\/fonts\//);
  assert.match(config, /src: '\/fieldwork-landing\/assets\/demo\//);
  assert.match(missing, /href="\/fieldwork-landing\/styles\.css"/);
  assert.match(missing, /href="\/fieldwork-landing\/"/);
  for (const file of ['robots.txt', 'sitemap.xml']) {
    assert.match(await readFile(join(output, file), 'utf8'), /https:\/\/brandon-ibm\.github\.io\/fieldwork-landing\//);
  }
  await access(join(output, '.nojekyll'));
  await access(join(output, 'story.js'));
  await access(join(output, 'story-timeline.js'));
  for (const file of ['README.md', 'package.json', '.github', 'scripts', 'tests']) {
    await assert.rejects(access(join(output, file)));
  }
});

test('the root build retains custom-domain URLs and working absolute assets', async t => {
  const output = await mkdtemp(join(tmpdir(), 'fieldwork-root-test-'));
  t.after(() => rm(output, { recursive: true, force: true }));
  await buildSite({ output, basePath: '/', siteUrl: 'https://edge.fncai.org/' });
  const html = await readFile(join(output, 'index.html'), 'utf8');
  const css = await readFile(join(output, 'styles.css'), 'utf8');
  assert.match(html, /src="\/app\.js"/);
  assert.match(html, /href="\/styles\.css"/);
  assert.match(html, /rel="canonical" href="https:\/\/edge\.fncai\.org\/"/);
  assert.match(css, /url\('\/assets\/fonts\//);
  assert.doesNotMatch(html, /fieldwork-landing\//);
});
