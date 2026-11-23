export const SCENE_SCROLL_VH = 112;
export const SCENES = Object.freeze([
  { id: 'problem', stage: 'discover', title: 'Start with the work.', caption: 'Northstar Electric needs to understand its maintenance delays.', status: 'Engagement context' },
  { id: 'evidence', stage: 'discover', title: 'Find the evidence.', caption: 'Eight source records. Observations first, inferences clearly marked.', status: '8 synthetic source records' },
  { id: 'initial', stage: 'discover', title: 'A number needs a definition.', caption: 'The initial 22.5-hour mean includes authorized holds.', status: 'Initial definition · holds included' },
  { id: 'review', stage: 'discover', title: 'The engineer corrects the definition.', caption: 'A scripted human review excludes documented authorized holds.', status: 'Scripted engineer review' },
  { id: 'revised', stage: 'discover', title: 'Same evidence. A clearer metric.', caption: 'Remove 44 hold hours. The revised mean is 17 hours.', status: 'Revised definition · holds excluded' },
  { id: 'model', stage: 'model', title: 'Make the decision explicit.', caption: 'The reviewed definition becomes a traceable technical model.', status: 'Model follows the engineer decision' },
  { id: 'build', stage: 'build', title: 'Turn the model into artifacts.', caption: 'Reviewable SQL and an implementation plan. Nothing is executed.', status: 'Generated artifacts · no execution' },
  { id: 'validate', stage: 'validate', title: 'Check the work. Keep the human.', caption: 'Reconcile the evidence, review the outputs, and record engineer sign-off.', status: 'Scripted example handoff · no deployment' },
].map(Object.freeze));

export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

// Each scene completes its animation before the final reading hold and handoff.
export function getSceneFrame(position) {
  const bounded = clamp(Number.isFinite(position) ? position : 0, 0, SCENES.length);
  const index = Math.min(SCENES.length - 1, Math.floor(bounded));
  const phase = bounded - index;
  return { index, phase, progress: clamp(phase / 0.78), scene: SCENES[index] };
}

export function revisedMean(progress) {
  const amount = clamp((progress - 0.12) / 0.7);
  const eased = 1 - (1 - amount) ** 3;
  return Math.round((22.5 - 5.5 * eased) * 10) / 10;
}
