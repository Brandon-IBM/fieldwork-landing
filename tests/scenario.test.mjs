import test from 'node:test';
import assert from 'node:assert/strict';
import { workItems, calculateMetrics, generateSQL, generatePlan } from '../scenario.js';

test('all eight synthetic evidence records reconcile with both documented duration metrics', () => {
  assert.equal(workItems.length, 8);
  assert.equal(new Set(workItems.map(item => item.id)).size, 8);
  assert.ok(workItems.every(item => item.elapsed > 0 && item.hold >= 0 && item.hold <= item.elapsed));
  assert.deepEqual(calculateMetrics('elapsed'), { count: 8, elapsed: 180, holds: 44, total: 180, mean: 22.5 });
  assert.deepEqual(calculateMetrics('active'), { count: 8, elapsed: 180, holds: 44, total: 136, mean: 17 });
});

test('the engineer correction propagates into downloadable SQL and the implementation plan', () => {
  assert.doesNotMatch(generateSQL('elapsed'), /elapsed_hours - authorized_hold_hours/);
  assert.match(generateSQL('active'), /elapsed_hours - authorized_hold_hours AS duration_hours/);
  assert.match(generateSQL('active'), /has not been executed/);
  assert.match(generatePlan('elapsed'), /180 hours \/ 8 work items = 22.5 hours mean/);
  assert.match(generatePlan('active'), /136 hours \/ 8 work items = 17 hours mean/);
  assert.match(generatePlan('active'), /Obtain engineer approval/);
});

test('the calculation rejects empty evidence or an undefined duration policy', () => {
  assert.throws(() => calculateMetrics('active', []));
  assert.throws(() => calculateMetrics('unknown'));
});
