import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, SCENE_TIMINGS, TIMELINE_LENGTH, getSceneFrame, getSceneRestPosition, revisedMean } from '../story-timeline.js';

test('the demo completes each scene before handing off to the next workflow stage', () => {
  for (let index = 0; index < SCENES.length; index++) {
    const timing = SCENE_TIMINGS[index];
    assert.equal(getSceneFrame(timing.start).index, index);
    assert.equal(getSceneFrame(timing.start).progress, 0);
    assert.ok(getSceneFrame(timing.start + 0.78).progress > 0.999);
    assert.equal(getSceneFrame(getSceneRestPosition(index)).index, index);
  }
  assert.equal(getSceneFrame(4.9).scene.stage, 'discover');
  assert.equal(getSceneFrame(5.24).scene.stage, 'model');
  assert.equal(getSceneFrame(6.48).scene.stage, 'build');
  assert.equal(getSceneFrame(7.72).scene.stage, 'validate');
});

test('each of the four main stages holds its completed scene before continuing', () => {
  const ends = SCENE_TIMINGS.flatMap((timing, index) => timing.hold ? [index] : []);
  assert.deepEqual(ends.map(index => SCENES[index].stage), ['discover', 'model', 'build', 'validate']);
  for (const index of ends) {
    const timing = SCENE_TIMINGS[index];
    for (const position of [timing.start + 1, timing.end - 0.01]) {
      const frame = getSceneFrame(position);
      assert.equal(frame.index, index);
      assert.equal(frame.progress, 1);
    }
  }
  assert.equal(TIMELINE_LENGTH, 8.96);
});

test('scrolling backward restores earlier scenes and their original metric', () => {
  const forward = [0.2, 1.6, 3.5, 4.2, 4.8, 5.8, 7.9].map(getSceneFrame);
  const backward = [7.9, 5.8, 4.8, 4.2, 3.5, 1.6, 0.2].map(getSceneFrame).reverse();
  assert.deepEqual(backward, forward);
  assert.equal(revisedMean(0), 22.5);
  assert.equal(revisedMean(0.82), 17);
  assert.equal(revisedMean(1), 17);
});

test('the timeline clamps restored scroll positions and completes at the final scene', () => {
  assert.equal(getSceneFrame(-1).index, 0);
  assert.equal(getSceneFrame(Number.NaN).index, 0);
  assert.equal(getSceneFrame(100).index, 7);
  assert.equal(getSceneFrame(100).progress, 1);
});
