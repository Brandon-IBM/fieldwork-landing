# Fieldwork

A small, dependency-free product website for **https://edge.fncai.org**. Semantic HTML, CSS, native JavaScript modules, and self-hosted IBM Plex fonts. No framework, analytics, API requests, credentials, or production connections.

## Local preview

Use Node.js 20 or newer. No package installation is necessary.

```sh
npm run dev
```

Open **http://localhost:5173**. Choose another port with `npm run dev -- --port 3000`.

```sh
npm test
npm run build
npm run preview
```

The production preview serves `dist/` at **http://localhost:4173**. The local servers bind to the loopback interface. Opening `index.html` directly with `file://` will not load browser JavaScript modules; use a server.

## What the demonstration does

1. **Discover:** inspect eight fictional Northstar Electric work items and their supporting evidence. The initial duration is 180 hours / 8 items = **22.5 hours**.
2. **Engineer review:** open **Review metric definition**, review the fictional operating procedure, choose active maintenance time, and approve with a rationale. The corrected definition excludes 44 hours of documented authorized holds: (180 − 44) / 8 = **17 hours**. Engineers can also explicitly retain the elapsed-time definition.
3. **Model:** inspect entities, fields, the selected formula, and the engineer's decision record.
4. **Build:** inspect or download the corresponding SQL and implementation plan.
5. **Validate:** review local evidence checks, inspect the artifacts in the sign-off dialog, and explicitly approve the example outputs. Changing the definition invalidates previous output approval. Reset returns the entire example to its initial state.

All results are deterministic. State lives only in page memory and resets on reload. Observations, inferences, engineer decisions, and approval status are labeled separately. Nothing invokes an AI model, executes SQL, deploys artifacts, or contacts a customer system.

**Reference limitation:** no `fieldwork-1.0.0.edgeappx`, actual application screenshots, or real demo video was supplied. This interface is an original guided illustration of the capabilities described in the brief, not a verified reproduction of the Edge application. Northstar Electric records, operating procedure, identifiers, schema, SQL, and plans were authored for this public synthetic example. Validate fidelity against the actual application before describing this as its exact interface. No internal Edge code or IBM materials are included. Native Edge AI reviews are mentioned as a product capability and are not simulated.

## Cloudflare Pages

### Git integration

1. Push this directory to your Git repository.
2. In Cloudflare, open **Workers & Pages → Create application → Pages → Connect to Git** and select the repository.
3. Configure:

   | Setting | Value |
   | --- | --- |
   | Framework preset | None |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | Repository root |
   | Node.js version | 22 or newer (set `NODE_VERSION=22` if needed) |

4. Deploy and check the assigned `*.pages.dev` preview. No application environment variables or secrets are needed.

### Direct upload

Run `npm run build`, create a Pages project using **Direct Upload**, and upload the **contents of `dist/`**. Alternatively, with a separately installed and authenticated Wrangler CLI:

```sh
npx wrangler pages deploy dist --project-name fieldwork
```

Deploy only `dist/`. The build uses an explicit list of public files and does not copy tests, scripts, notes, environment files, or application archives. Keep confidential reference material outside this repository and outside `assets/`.

### Custom domain: edge.fncai.org

1. In the Pages project's **Custom domains**, choose **Set up a custom domain** and enter `edge.fncai.org`.
2. If `fncai.org` uses Cloudflare nameservers, accept the proposed DNS record. Otherwise, add the CNAME Cloudflare supplies at the current DNS provider: name `edge`, target `<your-project>.pages.dev`.
3. Remove any conflicting A, AAAA, or CNAME record for `edge` if necessary. Preserve unrelated DNS records.
4. Wait for domain verification and the TLS certificate to become active, then check `https://edge.fncai.org`.
5. If desired, create a Cloudflare redirect from the production `*.pages.dev` hostname to the custom domain. Keep branch preview hostnames usable.

Canonical metadata, Open Graph URL, sitemap, and robots already target `https://edge.fncai.org/`. `_headers` applies the production Content Security Policy and other HTTP headers. The local preview does not emulate Cloudflare's `_headers`; verify headers after deployment. Cloudflare serves `404.html` for missing paths, rather than falling back to a single-page application.

## Add the real narrated video

The video section and **Watch demo** action stay hidden while `demoVideo` is `null` in `config.js`.

1. Put an approved, publishable MP4/WebM, optional poster, English WebVTT captions, and accessible HTML transcript in `assets/demo/`. Remove confidential details before publishing.
2. Replace the null export in `config.js`:

   ```js
   export const demoVideo = {
     src: '/assets/demo/fieldwork-demo.mp4',
     poster: '/assets/demo/fieldwork-demo-poster.webp',
     captions: '/assets/demo/fieldwork-demo.en.vtt',
     transcript: '/assets/demo/transcript.html',
   };
   ```

3. Rebuild and redeploy. The real video, captions, transcript link, and **Watch demo** action are revealed together. Playback requires a user action; audio never autoplays. The poster is optional. All other entries are required for the section to appear.

Local media is simplest. If hosting media elsewhere, use HTTPS and update `media-src` / `img-src` in `_headers` to allow only the specific media origins. Cross-origin captions also need appropriate CORS headers and `crossorigin="anonymous"` on the video. Do not embed an external iframe without deliberately updating `frame-src`.

## Source map

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, navigation, workflow, definition review dialog, optional video slot |
| `styles.css` | Responsive layout, technical interface, focus states, reduced motion support |
| `scenario.js` | Public synthetic records, duration calculations, SQL and plan generation |
| `app.js` | Stage selection, evidence inspection, engineer review, artifact download, approval |
| `config.js` | Optional real video configuration |
| `assets/` | Original favicon and self-hosted fonts with SIL Open Font Licenses |
| `scripts/` | Local server and allowlisted static build |
| `tests/` | Evidence arithmetic and artifact consistency checks |

IBM Plex Sans and IBM Plex Mono are distributed under SIL OFL 1.1; see `assets/fonts/OFL-sans.txt` and `OFL-mono.txt`. Fonts are self-hosted and require no Google requests. The site draws on technical interface conventions; it contains no IBM logos and implies no IBM endorsement.

## Verification

`npm test` verifies the eight records, both metric definitions, and the SQL/plan correction.

The finished site was checked in headless Chrome using temporary Playwright and axe-core tools outside the project:

- All four stages checked for horizontal overflow at 320, 360, 390, 700, 768, 900, 1024, 1440, and 1920 pixels.
- All eight evidence records, the 22.5 → 17 hour correction, model/SQL/plan propagation, both artifact downloads, explicit output approval, approval invalidation, and reset verified.
- Keyboard modal focus, Escape, focus restoration, and reduced motion checked.
- No automated WCAG 2 A/AA or WCAG 2.1 AA violations across all four stages and the definition dialog at 390 and 1440 pixels. Automated checks do not replace a full manual accessibility audit.

Browser tooling is not a production dependency. The website requires none.
