export const SCENE_SCROLL_VH = 128;
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

// Add a little extra reading distance after Discover, Model, Build, and Validate.
let cursor = 0;
export const SCENE_TIMINGS = Object.freeze(SCENES.map((scene, index) => {
  const hold = SCENES[index + 1]?.stage !== scene.stage ? 0.24 : 0;
  const timing = { start: cursor, duration: 1 + hold, hold };
  cursor = Math.round((cursor + timing.duration) * 100) / 100;
  return Object.freeze({ ...timing, end: cursor });
}));
export const TIMELINE_LENGTH = cursor;
export const getSceneRestPosition = index => SCENE_TIMINGS[index].end - 0.14;

// Each scene completes its animation before the final reading hold and handoff.
export function getSceneFrame(position) {
  const bounded = clamp(Number.isFinite(position) ? position : 0, 0, TIMELINE_LENGTH);
  const found = SCENE_TIMINGS.findIndex(timing => bounded < timing.end);
  const index = found === -1 ? SCENES.length - 1 : found;
  const phase = bounded - SCENE_TIMINGS[index].start;
  return { index, phase, progress: clamp(phase / 0.78), scene: SCENES[index] };
}

export function revisedMean(progress) {
  const amount = clamp((progress - 0.12) / 0.7);
  const eased = 1 - (1 - amount) ** 3;
  return Math.round((22.5 - 5.5 * eased) * 10) / 10;
}
