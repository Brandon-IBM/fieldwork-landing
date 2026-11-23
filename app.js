import { workItems, calculateMetrics, generateSQL, generatePlan } from './scenario.js';
import { demoVideo } from './config.js';

const state = { stage: 'discover', definition: 'elapsed', reviewed: false, rationale: '', selectedId: workItems[0].id, artifact: 'sql', outputApproved: false };
const content = document.querySelector('#stage-content');
const dialog = document.querySelector('#review-dialog');
const reviewForm = document.querySelector('#review-form');
const announcement = document.querySelector('#announcement');
const stageNames = { discover: 'Discovery findings', model: 'Technical model', build: 'Implementation artifacts', validate: 'Validation & approval' };
let reviewOpener = null;

const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const activeDefinition = () => state.definition === 'active';
const definitionName = () => activeDefinition() ? 'Active maintenance time' : 'Total elapsed time';
const announce = message => { announcement.textContent = message; };

function toolbar(context) {
  return `<div class="stage-toolbar"><div class="stage-heading-group"><h4 id="stage-heading" tabindex="-1">${stageNames[state.stage]}</h4><span class="count-badge">${state.stage === 'discover' ? '08 ITEMS' : ({ model: '02 ENTITIES', build: '02 ARTIFACTS', validate: '05 CHECKS' }[state.stage])}</span></div><span class="stage-context">${context}</span></div>`;
}

function reviewSummary() {
  return `<div class="review-summary"><div class="review-label ${state.reviewed ? 'approved' : ''}">${icon(state.reviewed ? 'check' : 'lock')}${state.reviewed ? 'Definition reviewed by engineer' : 'A definition needs your review'}</div><p>${state.reviewed ? `${definitionName()}. ${activeDefinition() ? 'Authorized holds excluded.' : 'Authorized holds included.'}` : 'Should authorized holds count as active maintenance?'}</p><button class="review-button" data-review>${state.reviewed ? 'Review definition' : 'Review metric definition'}${icon('arrow')}</button></div>`;
}

function renderDiscover() {
  const metrics = calculateMetrics(state.definition);
  const selected = workItems.find(item => item.id === state.selectedId);
  return `${toolbar('Evidence before assumptions')}
    <div class="stage-body discovery-grid">
      <div class="analysis-panel">
        <div class="metric-row"><div class="metric-block"><span class="metric-label">Mean maintenance duration</span><div class="metric-value ${activeDefinition() ? 'metric-revised' : ''}" id="duration-metric">${metrics.mean}<span class="metric-unit">h</span>${activeDefinition() ? '<span class="metric-original">22.5 h</span>' : ''}</div><span class="metric-footnote">${activeDefinition() ? 'Revised · authorized holds excluded' : 'Initial · authorized holds included'}</span></div><div class="metric-block"><span class="metric-label">Work items reviewed</span><div class="metric-value">08<span class="metric-unit">/ 08</span></div><span class="metric-footnote">Completed maintenance records</span></div></div>
        <table class="data-table"><caption>Where is maintenance time going?</caption><thead><tr><th scope="col">Work item</th><th scope="col">Asset</th><th scope="col" class="number">${activeDefinition() ? 'Active' : 'Elapsed'}</th><th scope="col" class="number">Hold</th></tr></thead><tbody>
          ${workItems.map(item => `<tr class="${state.selectedId === item.id ? 'is-selected' : ''}"><td><button class="item-button" data-item="${item.id}" aria-label="View evidence for ${item.id}, ${item.asset}" aria-pressed="${state.selectedId === item.id}">${item.id}</button></td><td>${item.asset}</td><td class="number">${activeDefinition() ? item.elapsed - item.hold : item.elapsed} h</td><td class="number">${item.hold} h</td></tr>`).join('')}
        </tbody><tfoot><tr><td colspan="2">Total · 8 work items</td><td class="number">${metrics.total} h</td><td class="number">44 h</td></tr></tfoot></table>
        <p class="table-note">Select a work item to inspect its evidence. All durations are synthetic.</p>
      </div>
      <aside class="evidence-panel" aria-label="Supporting evidence">
        <div class="panel-topline"><span>Supporting evidence</span>${icon('file')}</div>
        <div class="evidence-section" id="selected-evidence"><span class="evidence-type">OBSERVATION · ${selected.id}</span><p>${selected.task}. <strong>${selected.elapsed} hours elapsed</strong>, including ${selected.hold} hours of authorized hold.</p><div class="evidence-record"><span>Hold reason</span></div><p>${selected.reason}.</p><span class="evidence-source">maintenance_work_items.csv · row ${workItems.indexOf(selected) + 1}</span></div>
        <div class="evidence-section"><span class="evidence-type inference">INFERENCE · DEFINITION GAP</span><p>Elapsed time may overstate active maintenance. The eight records include <strong>44 hours of authorized holds</strong>.</p><span class="evidence-source">Requires engineer interpretation.</span></div>
        ${reviewSummary()}
      </aside>
    </div>`;
}

function renderModel() {
  return `${toolbar('Decisions made explicit')}
    <div class="stage-body technical-grid"><div>
      <p class="stage-lede">Separate work items from hold events. Keep the duration definition traceable to an engineer decision.</p>
      <div class="model-diagram" role="img" aria-label="Work item entity has one to many authorized hold events, linked by work item ID.">
        <div class="entity"><div class="entity-title">${icon('file')} Work item</div><div class="entity-field">work_item_id <span>PK</span></div><div class="entity-field">asset_id <span>FK</span></div><div class="entity-field">elapsed_hours <span>decimal</span></div><div class="entity-field">status <span>text</span></div></div>
        <div class="entity-connector"></div>
        <div class="entity"><div class="entity-title">${icon('file')} Authorized hold</div><div class="entity-field">hold_id <span>PK</span></div><div class="entity-field">work_item_id <span>FK</span></div><div class="entity-field">duration_hours <span>decimal</span></div><div class="entity-field">hold_reason <span>text</span></div></div>
      </div>
      <div class="formula"><p class="formula-label">${state.reviewed ? 'Engineer-reviewed' : 'Proposed'} duration definition</p><code>${activeDefinition() ? 'active_hours = elapsed_hours − authorized_hold_hours' : 'duration_hours = elapsed_hours'}</code></div>
      <p class="assumption-note">${icon('lock')}Normalize non-overlapping hold events per work item before calculating duration. Confirm this mapping against the target schema.</p>
    </div><aside class="evidence-panel" aria-label="Model decisions">
      <div class="panel-topline"><span>Decision record</span>${icon('model')}</div>
      <div class="evidence-section"><span class="evidence-type">OBSERVATION · PROCEDURE §4.2</span><p>Authorized holds pause active maintenance while awaiting approved access or isolation.</p><span class="evidence-source">NE-MNT-004 · synthetic procedure</span></div>
      <div class="evidence-section"><span class="evidence-type inference">${state.reviewed ? 'ENGINEER DECISION' : 'INFERENCE · PROPOSED MODEL'}</span><p>${state.reviewed ? escapeHTML(state.rationale) : 'Model holds separately to support both elapsed and active duration metrics.'}</p><span class="evidence-source">${state.reviewed ? 'Human review recorded in this session.' : 'Review the definition before approval.'}</span></div>
      ${reviewSummary()}
    </aside></div>`;
}

function highlightedSQL() {
  return generateSQL(state.definition).split('\n').map(line => line.startsWith('--') ? `<span class="code-comment">${escapeHTML(line)}</span>` : escapeHTML(line).replace(/\b(WITH|AS|SELECT|FROM|WHERE|COUNT|AVG)\b/g, '<span class="code-keyword">$1</span>')).join('\n');
}

function renderBuild() {
  return `${toolbar('Generated for review. Never executed.')}
    <div class="stage-body technical-grid"><div>
      <div class="artifact-tabs" role="group" aria-label="Implementation artifacts"><button class="artifact-tab ${state.artifact === 'sql' ? 'is-selected' : ''}" data-artifact="sql" aria-pressed="${state.artifact === 'sql'}">maintenance_duration.sql</button><button class="artifact-tab ${state.artifact === 'plan' ? 'is-selected' : ''}" data-artifact="plan" aria-pressed="${state.artifact === 'plan'}">implementation.md</button></div>
      ${state.artifact === 'sql' ? `<pre class="artifact-code" tabindex="0" aria-label="Generated SQL for human review"><code>${highlightedSQL()}</code></pre>` : `<ol class="plan-list"><li><strong>Confirm source mappings</strong>Map eight completed work items and normalized hold events.</li><li><strong>Review the duration definition</strong>${definitionName()}. ${activeDefinition() ? 'Exclude authorized holds.' : 'Include authorized holds.'}</li><li><strong>Review generated SQL</strong>Confirm the target dialect and non-overlapping hold totals.</li><li><strong>Reconcile and approve</strong>Expect ${calculateMetrics(state.definition).mean} hours across eight items. Obtain engineer approval before external execution.</li></ol>`}
      <div class="artifact-footer"><span>Illustrative artifact · no database connection</span><button class="text-button" data-download>Download ${state.artifact === 'sql' ? 'SQL' : 'plan'} ${icon('download')}</button></div>
    </div><aside class="evidence-panel" aria-label="Artifact review">
      <div class="panel-topline"><span>Artifact review</span>${icon('build')}</div>
      <div class="evidence-section"><span class="evidence-type">INPUTS · TRACEABLE</span><p>8 work items. 44 hours of holds. ${state.reviewed ? 'Engineer-reviewed definition.' : 'Duration definition awaiting review.'}</p><span class="evidence-source">Source → definition → generated artifact</span></div>
      <div class="evidence-section"><span class="evidence-type inference">EXECUTION STATUS</span><p>SQL generated for review only. No database execution or deployment occurs.</p><span class="evidence-source">Native Edge AI reviews belong in the product.</span></div>
      <div class="review-summary"><div class="review-label ${state.reviewed ? 'approved' : ''}">${icon(state.reviewed ? 'check' : 'lock')}${state.reviewed ? 'Definition reviewed' : 'Definition review required'}</div><p>Inspect both artifacts, then continue to validation.</p><button class="review-button" data-next-validate>Review validation ${icon('arrow')}</button></div>
    </aside></div>`;
}

function renderValidate() {
  const metrics = calculateMetrics(state.definition);
  const sourceValid = workItems.every(item => item.hold >= 0 && item.hold <= item.elapsed);
  const checks = [
    { text: 'Eight unique source records', pass: new Set(workItems.map(item => item.id)).size === 8 },
    { text: 'Hold duration within elapsed time', pass: sourceValid },
    { text: `${metrics.total} h ÷ 8 items = ${metrics.mean} h mean`, pass: metrics.mean === metrics.total / 8 },
    { text: 'Duration definition reviewed by engineer', pass: state.reviewed },
    { text: 'Generated outputs approved by engineer', pass: state.outputApproved },
  ];
  const passing = checks.filter(check => check.pass).length;
  return `${toolbar('Local checks on synthetic data')}
    <div class="stage-body technical-grid"><div>
      <div class="validation-summary">${icon('validate')}<div><strong>${passing} of 5 checks complete</strong><small>${state.outputApproved ? 'Example outputs approved. No execution performed.' : 'Human review closes the loop.'}</small></div></div>
      <ul class="validation-checks">${checks.map(check => `<li class="${check.pass ? '' : 'pending'}">${icon(check.pass ? 'check' : 'lock')}<span>${check.text}</span><span class="check-status ${check.pass ? '' : 'pending'}">${check.pass ? 'PASS' : 'REVIEW'}</span></li>`).join('')}</ul>
      <p class="approval-note">These checks validate this fixed dataset and its arithmetic. They do not verify SQL execution, live integrations, or production readiness.</p>
    </div><aside class="evidence-panel" aria-label="Engineer approval">
      <div class="panel-topline"><span>Engineer sign-off</span>${icon('lock')}</div>
      <div class="evidence-section"><span class="evidence-type">RECONCILIATION · ${activeDefinition() ? 'REVISED' : 'INITIAL'}</span><p>${metrics.elapsed} elapsed hours${activeDefinition() ? ` − ${metrics.holds} authorized hold hours` : ''} = <strong>${metrics.total} hours</strong>. Across 8 items: <strong>${metrics.mean} hours mean</strong>.</p><span class="evidence-source">${definitionName()} · synthetic records</span></div>
      <div class="evidence-section"><span class="evidence-type inference">APPROVAL SCOPE</span><p>Approve the generated SQL and implementation plan as reviewable example outputs. Execution remains outside this preview.</p></div>
      <div class="review-summary"><div class="review-label ${state.outputApproved ? 'approved' : ''}">${icon(state.outputApproved ? 'check' : 'lock')}${state.outputApproved ? 'Engineer approval recorded' : 'Human approval required'}</div><p>${state.reviewed ? 'Inspect the generated artifacts before sign-off.' : 'Review the metric definition to enable approval.'}</p>${state.outputApproved ? `<div class="approval-stamp">${icon('check')}EXAMPLE OUTPUTS APPROVED</div>` : `<button class="review-button" ${state.reviewed ? 'data-approve-outputs' : 'data-review'}>${state.reviewed ? 'Review & approve outputs' : 'Review metric definition'}${icon('arrow')}</button>`}</div>
    </aside></div>`;
}

function render() {
  content.innerHTML = ({ discover: renderDiscover, model: renderModel, build: renderBuild, validate: renderValidate })[state.stage]();
  document.querySelectorAll('[data-stage]').forEach(button => {
    const selected = button.dataset.stage === state.stage;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function setStage(stage, scroll = false) {
  if (!Object.hasOwn(stageNames, stage)) return;
  state.stage = stage;
  render();
  announce(`${stageNames[stage]}. ${state.reviewed ? 'Engineer-reviewed definition.' : 'Duration definition awaiting engineer review.'}`);
  if (scroll) {
    document.querySelector('#demo').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    document.querySelector('#stage-heading').focus({ preventScroll: true });
  }
}

function openReview(opener) {
  reviewOpener = opener;
  reviewForm.elements.definition.value = state.reviewed ? state.definition : 'active';
  reviewForm.elements.rationale.value = state.rationale || 'Authorized holds pause active maintenance. Exclude documented hold time from this metric.';
  reviewForm.elements.rationale.setCustomValidity('');
  dialog.showModal();
}

// Keep Tab cycling within the modal, including browsers that otherwise focus browser chrome.
function containDialogFocus(event) {
  if (event.key !== 'Tab') return;
  const focusable = [...event.currentTarget.querySelectorAll('button, input, textarea, a[href], [tabindex="0"]')]
    .filter(element => !element.disabled && element.getClientRects().length);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
dialog.addEventListener('keydown', containDialogFocus);

document.addEventListener('click', event => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.stage) setStage(target.dataset.stage, target.dataset.scroll === 'true');
  else if (target.hasAttribute('data-item')) {
    state.selectedId = target.dataset.item;
    render();
    document.querySelector(`[data-item="${state.selectedId}"]`).focus({ preventScroll: true });
    const item = workItems.find(record => record.id === state.selectedId);
    announce(`${item.id}: ${item.elapsed} hours elapsed, ${item.hold} hours of authorized hold. ${item.reason}.`);
  } else if (target.hasAttribute('data-review')) openReview(target);
  else if (target.hasAttribute('data-close-dialog')) dialog.close();
  else if (target.dataset.artifact) {
    state.artifact = target.dataset.artifact;
    render();
    document.querySelector(`[data-artifact="${state.artifact}"]`).focus({ preventScroll: true });
    announce(`${state.artifact === 'sql' ? 'Generated SQL' : 'Implementation plan'} displayed.`);
  } else if (target.hasAttribute('data-next-validate')) {
    setStage('validate');
    document.querySelector('#stage-heading').focus({ preventScroll: true });
  } else if (target.hasAttribute('data-download')) downloadArtifact();
  else if (target.hasAttribute('data-approve-outputs')) openApproval();
});

reviewForm.addEventListener('submit', event => {
  event.preventDefault();
  const rationale = reviewForm.elements.rationale.value.trim();
  if (!rationale) {
    reviewForm.elements.rationale.setCustomValidity('Enter your reason for the selected definition.');
    reviewForm.elements.rationale.reportValidity();
    return;
  }
  state.definition = reviewForm.elements.definition.value;
  state.rationale = rationale;
  state.reviewed = true;
  state.outputApproved = false;
  dialog.close();
  render();
  const focusTarget = document.querySelector('[data-review]') || document.querySelector('#stage-heading');
  focusTarget.focus({ preventScroll: true });
  announce(`Engineer approved ${definitionName().toLowerCase()}. Mean duration is ${calculateMetrics(state.definition).mean} hours.${activeDefinition() ? ' Revised from 22.5 hours, excluding 44 hours of authorized holds.' : ''} Model and artifacts updated. Output approval is required.`);
});
reviewForm.elements.rationale.addEventListener('input', () => reviewForm.elements.rationale.setCustomValidity(''));
reviewForm.addEventListener('change', event => {
  if (event.target.name !== 'definition') return;
  const activeRationale = 'Authorized holds pause active maintenance. Exclude documented hold time from this metric.';
  const elapsedRationale = 'Retain authorized holds to measure total elapsed maintenance time, including approved pauses.';
  if ([activeRationale, elapsedRationale].includes(reviewForm.elements.rationale.value)) {
    reviewForm.elements.rationale.value = event.target.value === 'active' ? activeRationale : elapsedRationale;
  }
});
dialog.addEventListener('close', () => { if (reviewOpener?.isConnected) reviewOpener.focus({ preventScroll: true }); });
dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });

document.querySelector('#reset-preview').addEventListener('click', () => {
  Object.assign(state, { stage: 'discover', definition: 'elapsed', reviewed: false, rationale: '', selectedId: workItems[0].id, artifact: 'sql', outputApproved: false });
  render();
  announce('Preview reset. Initial mean duration: 22.5 hours. Engineer reviews cleared.');
});

document.querySelector('#open-example').addEventListener('click', () => {
  setStage('discover', true);
  openReview(document.querySelector('[data-review]'));
});

function downloadArtifact() {
  const sql = state.artifact === 'sql';
  const blob = new Blob([sql ? generateSQL(state.definition) : generatePlan(state.definition)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = sql ? 'maintenance_duration.sql' : 'implementation.md';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce(`Synthetic ${sql ? 'SQL' : 'implementation plan'} downloaded for review. No SQL was executed.`);
}

// A separate, explicit human approval. Native Edge AI reviews are not simulated here.
function openApproval() {
  if (!state.reviewed) return;
  const approvalDialog = document.createElement('dialog');
  approvalDialog.className = 'review-dialog';
  approvalDialog.setAttribute('aria-labelledby', 'approval-title');
  approvalDialog.innerHTML = `<form method="dialog"><div class="dialog-header"><span class="eyebrow">ENGINEER SIGN-OFF · SYNTHETIC EXAMPLE</span><button type="submit" value="cancel" class="icon-button" aria-label="Close output approval">${icon('close')}</button></div><h2 id="approval-title">Review the outputs.</h2><p>${definitionName()} · ${calculateMetrics(state.definition).mean} h mean. Approval applies only to these synthetic artifacts.</p><pre class="artifact-code" tabindex="0" aria-label="SQL awaiting approval"><code>${highlightedSQL()}</code></pre><p class="approval-note">Plan: map sources → normalize holds → review SQL → reconcile the mean → obtain engineer approval before any external execution.</p><label class="radio-option"><input type="checkbox" name="reviewed" required><span><strong>I reviewed the SQL and implementation plan.</strong><small>This records example approval only. Nothing is executed or deployed.</small></span></label><div class="dialog-actions"><button type="button" class="button button-secondary" data-cancel-approval>Cancel</button><button class="button button-primary" type="submit" value="approve">Approve example outputs ${icon('check')}</button></div></form>`;
  document.body.append(approvalDialog);
  approvalDialog.addEventListener('keydown', containDialogFocus);
  // The close button must remain usable before the required checkbox is checked.
  approvalDialog.querySelector('[value="cancel"]').formNoValidate = true;
  approvalDialog.querySelector('[data-cancel-approval]').addEventListener('click', () => approvalDialog.close('cancel'));
  approvalDialog.addEventListener('close', () => {
    const approved = approvalDialog.returnValue === 'approve';
    if (approved) {
      state.outputApproved = true;
      render();
      announce('Engineer approved the synthetic outputs. All five local checks complete. Nothing has been executed or deployed.');
    }
    approvalDialog.remove();
    (document.querySelector('[data-approve-outputs]') || document.querySelector('#stage-heading')).focus({ preventScroll: true });
  }, { once: true });
  approvalDialog.showModal();
}

// Only an explicitly configured real video reveals the player and Watch demo action.
if (demoVideo?.src && demoVideo?.captions && demoVideo?.transcript) {
  const video = document.querySelector('#demo-video');
  video.src = demoVideo.src;
  if (demoVideo.poster) video.poster = demoVideo.poster;
  const track = document.createElement('track');
  Object.assign(track, { kind: 'captions', src: demoVideo.captions, srclang: 'en', label: 'English', default: true });
  video.append(track);
  const transcript = document.createElement('a');
  transcript.href = demoVideo.transcript;
  transcript.textContent = 'Read the video transcript';
  document.querySelector('#video-transcript').append(transcript);
  document.querySelector('#video-demo').hidden = false;
  document.querySelector('#watch-demo').hidden = false;
}

render();
