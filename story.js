import { workItems, generateSQL } from './scenario.js';
import { SCENES, SCENE_TIMINGS, SCENE_SCROLL_VH, TIMELINE_LENGTH, clamp, getSceneFrame, getSceneRestPosition, revisedMean } from './story-timeline.js';

const story = document.querySelector('.scroll-story');
const pin = document.querySelector('.story-pin');
const canvas = document.querySelector('#story-canvas');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const title = document.querySelector('#story-title');
const caption = document.querySelector('#story-caption');
const chapter = document.querySelector('#story-chapter');
const previous = document.querySelector('#story-prev');
const next = document.querySelector('#story-next');
const dots = [...document.querySelectorAll('[data-story-scene]')];
const menu = [...document.querySelectorAll('[data-story-stage]')];
let currentIndex = -1;
let displayedPosition = 0;
let targetPosition = 0;
let frameRequest = 0;
let start = 0;
let sceneDistance = 1;
let reveals = [];
let suspended = false;

const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const reveal = (delay, html, className = '') => `<div class="story-reveal ${className}" data-reveal="${delay}">${html}</div>`;

const renderers = {
  problem: () => `<div class="story-problem"><div><p class="story-kicker">ENG—024 / MAINTENANCE OPERATIONS</p><h3>Where is maintenance<br> time going?</h3><p class="story-body-copy">Completed work does not always mean<br> continuous work.</p>${reveal(0.12, '<span class="story-source-label">ENGAGEMENT QUESTION</span><p>Separate active maintenance from approved pauses.</p>', 'story-question')}</div><div class="story-record-stack"><div class="story-record-count"><strong>08</strong><span>completed<br>work items</span></div><div class="story-record-grid">${workItems.map((item, i) => reveal(0.08 + i * 0.065, `<span>${item.id}</span><strong>${item.elapsed} h</strong>`, 'story-record-chip')).join('')}</div>${reveal(0.64, '<span class="story-source-label">SOURCE</span> maintenance_work_items.csv', 'story-file-reference')}</div></div>`,

  evidence: () => `<div class="story-evidence"><div class="story-source-table"><p class="story-kicker">DISCOVERY / SOURCE EVIDENCE</p><table><caption>Eight completed maintenance work items</caption><thead><tr><th scope="col">Work item</th><th scope="col">Asset</th><th scope="col">Elapsed</th><th scope="col">Hold</th></tr></thead><tbody>${workItems.map((item, i) => `<tr class="story-reveal" data-reveal="${i * 0.065}"><td>${item.id}</td><td>${item.asset}</td><td>${item.elapsed} h</td><td>${item.hold} h</td></tr>`).join('')}</tbody></table></div><div class="story-evidence-aside">${reveal(0.3, '<span class="story-source-label">OBSERVATION</span><strong>44 hours on hold.</strong><p>Documented authorized holds appear across all eight records.</p>', 'story-finding')}${reveal(0.62, '<span class="story-source-label is-inference">INFERENCE</span><strong>Elapsed may overstate active.</strong><p>The duration definition needs an engineer’s review.</p>', 'story-finding')}</div></div>`,

  initial: () => `<div class="story-metric-scene"><p class="story-kicker">INITIAL METRIC / AUTHORIZED HOLDS INCLUDED</p><div class="story-big-metric">22.5<span>h</span></div><p class="story-metric-caption">Mean maintenance duration</p>${reveal(0.12, '<span><strong>180 h</strong> elapsed</span><span>÷</span><span><strong>8</strong> work items</span>', 'story-equation')}${reveal(0.32, '<div class="story-duration-bar"><span class="story-active-segment"></span><span class="story-hold-segment"></span></div><div class="story-bar-key"><span><i></i>136 h active maintenance</span><span><i></i>44 h authorized holds</span></div>', 'story-duration')}${reveal(0.62, '<span class="story-source-label is-inference">DEFINITION GAP</span><p>Are approved pauses really maintenance time?</p>', 'story-definition-gap')}</div>`,

  review: () => `<div class="story-review-scene"><p class="story-kicker">HUMAN REVIEW / SCRIPTED ENGINEER DECISION</p>${reveal(0, '<span class="story-source-label">SYNTHETIC PROCEDURE · NE-MNT-004 §4.2</span><p>“An authorized hold pauses active maintenance while awaiting approved access or isolation.”</p>', 'story-procedure')}<div class="story-definition-options"><div class="story-definition-option story-definition-original"><span class="story-radio"></span><div><strong>Total elapsed time</strong><span>Includes authorized holds</span></div><span>22.5 h</span></div>${reveal(0.16, '<span class="story-radio"></span><div><strong>Active maintenance time</strong><span>Excludes documented authorized holds</span></div><span>17 h</span>', 'story-definition-option story-definition-corrected')}</div>${reveal(0.42, '<span class="story-source-label">ENGINEER RATIONALE</span><p>Exclude documented holds from active maintenance.</p>', 'story-rationale')}${reveal(0.7, `${icon('check')} Engineer decision recorded <span>Scripted example</span>`, 'story-decision-recorded')}</div>`,

  revised: () => `<div class="story-metric-scene is-revised"><p class="story-kicker">REVISED METRIC / AUTHORIZED HOLDS EXCLUDED</p><div class="story-metric-comparison"><span class="story-old-metric">22.5 h</span>${icon('arrow')}<div class="story-big-metric"><output id="story-metric">22.5</output><span>h</span></div></div><p class="story-metric-caption">Mean active maintenance duration</p>${reveal(0.12, '<span><strong>180</strong> elapsed</span><span>−</span><span><strong>44</strong> on hold</span><span>÷ <strong>8</strong> items</span>', 'story-equation')}${reveal(0.24, '<div class="story-duration-bar"><span class="story-active-segment"></span><span class="story-hold-segment" id="story-removing-holds"></span></div><div class="story-bar-key"><span><i></i>136 h active maintenance</span><span>44 h excluded</span></div>', 'story-duration')}${reveal(0.68, `${icon('check')} (180 − 44) ÷ 8 = 17 h <span>Engineer-reviewed definition · scripted</span>`, 'story-reconciliation')}</div>`,

  model: () => `<div class="story-model-scene"><p class="story-kicker">TECHNICAL MODEL / TRACEABLE DECISIONS</p><div class="story-model-diagram">${reveal(0, '<div class="story-entity-title">Work item <span>01</span></div><span>work_item_id <small>PK</small></span><span>asset_id <small>FK</small></span><span>elapsed_hours <small>decimal</small></span><span>status <small>text</small></span>', 'story-entity')}<div class="story-model-link"><span id="story-model-connection"></span><small>1 : n</small></div>${reveal(0.2, '<div class="story-entity-title">Authorized hold <span>02</span></div><span>hold_id <small>PK</small></span><span>work_item_id <small>FK</small></span><span>duration_hours <small>decimal</small></span><span>hold_reason <small>text</small></span>', 'story-entity')}</div>${reveal(0.42, '<span class="story-source-label">REVIEWED DURATION DEFINITION</span><code>active_hours = elapsed_hours − authorized_hold_hours</code>', 'story-model-formula')}${reveal(0.68, `${icon('lock')} Normalize non-overlapping hold events before calculating duration.`, 'story-model-assumption')}</div>`,

  build: () => {
    const sql = generateSQL('active').split('\n').filter(line => line && !line.startsWith('--'));
    return `<div class="story-build-scene"><div class="story-sql"><div class="story-artifact-title">${icon('build')} maintenance_duration.sql <span>REVIEWABLE</span></div><pre aria-label="Scripted generated SQL, never executed"><code>${sql.map((line, i) => `<span class="story-code-line story-reveal" data-reveal="${i * 0.035}">${escapeHTML(line).replace(/\b(WITH|AS|SELECT|FROM|WHERE|COUNT|AVG)\b/g, '<b>$1</b>')}</span>`).join('')}</code></pre></div><div class="story-plan"><p class="story-kicker">IMPLEMENTATION.MD</p>${reveal(0.2, '<span>01</span><div><strong>Map the sources.</strong><p>Eight work items and normalized hold events.</p></div>', 'story-plan-step')}${reveal(0.4, '<span>02</span><div><strong>Review the SQL.</strong><p>Confirm schema, dialect, and duration definition.</p></div>', 'story-plan-step')}${reveal(0.6, '<span>03</span><div><strong>Reconcile. Then approve.</strong><p>136 hours across 8 items. Engineer sign-off required.</p></div>', 'story-plan-step')}${reveal(0.78, `${icon('lock')} No SQL execution. No deployment.`, 'story-no-execution')}</div></div>`;
  },

  validate: () => `<div class="story-validation-scene"><div><p class="story-kicker">VALIDATION / EVIDENCE TO HANDOFF</p><div class="story-validation-checks">${[
    '8 unique source records',
    'Hold durations within elapsed time',
    '136 h ÷ 8 items = 17 h mean',
    'Engineer-reviewed definition · scripted',
    'Engineer output sign-off · scripted',
  ].map((check, i) => reveal(i * 0.15, `${icon('check')}<span>${check}</span><small>${i < 3 ? 'PASS' : 'REVIEWED'}</small>`, 'story-validation-check')).join('')}</div></div>${reveal(0.34, `<span class="story-source-label">RECONCILED</span><div class="story-handoff-number">17<span>h</span></div><p>Mean active maintenance</p>${reveal(0.78, `${icon('check')} Ready for engineer handoff.<small>Scripted approval. Nothing executed.</small>`, 'story-handoff-approved')}`, 'story-handoff')}</div>`,
};

function showScene(index) {
  currentIndex = index;
  const scene = SCENES[index];
  title.textContent = scene.title;
  caption.textContent = scene.caption;
  chapter.textContent = `${String(index + 1).padStart(2, '0')} / 08 · ${scene.stage.toUpperCase()}`;
  document.querySelector('#story-status').textContent = scene.status;
  document.querySelector('#story-position').textContent = `${String(index + 1).padStart(2, '0')} / 08`;
  canvas.innerHTML = renderers[scene.id]();
  canvas.dataset.scene = scene.id;
  reveals = [...canvas.querySelectorAll('[data-reveal]')];
  previous.disabled = index === 0;
  next.setAttribute('aria-label', index === SCENES.length - 1 ? 'Finish demo' : 'Next demo scene');
  for (const button of menu) {
    const selected = button.dataset.storyStage === scene.stage;
    button.classList.toggle('is-selected', selected);
    if (selected) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  }
  for (const [i, button] of dots.entries()) {
    button.classList.toggle('is-current', i === index);
    if (i === index) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  }
}

function paint(position) {
  const frame = getSceneFrame(position);
  if (frame.index !== currentIndex) showScene(frame.index);
  const progress = reducedMotion.matches ? 1 : frame.progress;
  canvas.dataset.progress = progress.toFixed(3);
  for (const element of reveals) {
    const amount = reducedMotion.matches ? 1 : clamp((progress - Number(element.dataset.reveal)) / 0.18);
    const eased = 1 - (1 - amount) ** 3;
    element.style.opacity = String(eased);
    if (element.tagName !== 'TR') element.style.transform = `translateY(${(1 - eased) * 20}px)`;
  }
  canvas.classList.toggle('engineer-selected', progress > 0.46);
  const metric = canvas.querySelector('#story-metric');
  if (metric) metric.textContent = String(revisedMean(progress));
  const holds = canvas.querySelector('#story-removing-holds');
  if (holds) holds.style.transform = `scaleX(${1 - clamp((progress - 0.12) / 0.7)})`;
  const connection = canvas.querySelector('#story-model-connection');
  if (connection) connection.style.transform = `scaleX(${clamp((progress - 0.13) / 0.3)})`;
  for (const [index, button] of dots.entries()) {
    button.firstElementChild.style.transform = `scaleX(${index < frame.index ? 1 : index === frame.index ? progress : 0})`;
  }
}

function tick() {
  frameRequest = 0;
  const difference = targetPosition - displayedPosition;
  displayedPosition = reducedMotion.matches || Math.abs(difference) < 0.001 ? targetPosition : displayedPosition + difference * 0.16;
  paint(displayedPosition);
  if (Math.abs(targetPosition - displayedPosition) > 0.001) frameRequest = requestAnimationFrame(tick);
}

function requestPaint() {
  if (suspended || reducedMotion.matches) return;
  targetPosition = clamp((scrollY - start) / sceneDistance, 0, TIMELINE_LENGTH);
  if (!frameRequest) frameRequest = requestAnimationFrame(tick);
}

function measure() {
  start = story.getBoundingClientRect().top + scrollY;
  sceneDistance = pin.getBoundingClientRect().height * SCENE_SCROLL_VH / 100;
  requestPaint();
}

function goToScene(index) {
  const bounded = clamp(index, 0, SCENES.length - 1);
  if (reducedMotion.matches) {
    displayedPosition = targetPosition = getSceneRestPosition(bounded);
    paint(displayedPosition);
  } else {
    measure();
    scrollTo({ top: start + getSceneRestPosition(bounded) * sceneDistance, behavior: 'smooth' });
  }
  document.querySelector('#announcement').textContent = `Demo scene ${bounded + 1} of 8. ${SCENES[bounded].title} ${SCENES[bounded].caption}`;
}

for (const button of dots) button.addEventListener('click', () => goToScene(Number(button.dataset.storyScene)));
for (const button of menu) button.addEventListener('click', () => goToScene(SCENES.findIndex(scene => scene.stage === button.dataset.storyStage)));
previous.addEventListener('click', () => goToScene(currentIndex - 1));
next.addEventListener('click', () => {
  if (currentIndex < SCENES.length - 1) goToScene(currentIndex + 1);
  else document.querySelector('.human-section').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
});
pin.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight') { event.preventDefault(); next.click(); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); previous.click(); }
});

function configureMotion() {
  story.classList.toggle('is-reduced', reducedMotion.matches);
  document.documentElement.classList.toggle('has-scroll-story', !reducedMotion.matches);
  if (reducedMotion.matches) {
    cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    paint(getSceneRestPosition(Math.max(0, currentIndex)));
  }
  measure();
}

// Pause offscreen. Native page scrolling drives the synthetic sequence;
// it never touches the separate hands-on workspace's review or approval state.
new IntersectionObserver(entries => {
  suspended = !entries[0].isIntersecting;
  if (!suspended) requestPaint();
}).observe(story);
addEventListener('scroll', requestPaint, { passive: true });
let resizeRequest;
addEventListener('resize', () => {
  cancelAnimationFrame(resizeRequest);
  resizeRequest = requestAnimationFrame(measure);
});
reducedMotion.addEventListener('change', configureMotion);
document.querySelector('#start-demo').addEventListener('click', event => {
  event.preventDefault();
  measure();
  if (reducedMotion.matches) {
    displayedPosition = targetPosition = getSceneRestPosition(0);
    paint(displayedPosition);
  }
  scrollTo({ top: start, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  pin.focus({ preventScroll: true });
});
story.style.setProperty('--story-track-height', `${TIMELINE_LENGTH * SCENE_SCROLL_VH}svh`);
document.querySelectorAll('.story-beat').forEach((beat, index) => {
  beat.style.setProperty('--scene-length', `${SCENE_TIMINGS[index].duration * SCENE_SCROLL_VH}svh`);
  beat.style.setProperty('--scene-rest', `${(SCENE_TIMINGS[index].duration - 0.14) * SCENE_SCROLL_VH}svh`);
});
story.classList.add('story-ready');
paint(0);
configureMotion();
document.fonts.ready.then(measure);
