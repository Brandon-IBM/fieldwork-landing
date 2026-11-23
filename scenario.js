/** Fictional public demonstration data. No customer or internal application data. */
export const workItems = Object.freeze([
  { id: 'WO-1041', asset: 'Switchgear S-04', task: 'Inspection', elapsed: 28, hold: 8, reason: 'Awaiting isolation permit' },
  { id: 'WO-1042', asset: 'Transformer T-12', task: 'Oil service', elapsed: 18, hold: 4, reason: 'Approved access window' },
  { id: 'WO-1043', asset: 'Feeder F-07', task: 'Relay replacement', elapsed: 24, hold: 6, reason: 'Awaiting isolation permit' },
  { id: 'WO-1044', asset: 'Breaker B-03', task: 'Contact repair', elapsed: 20, hold: 4, reason: 'Approved safety clearance' },
  { id: 'WO-1045', asset: 'Motor M-09', task: 'Bearing replacement', elapsed: 30, hold: 10, reason: 'Approved access window' },
  { id: 'WO-1046', asset: 'Panel P-02', task: 'Thermal inspection', elapsed: 14, hold: 2, reason: 'Approved safety clearance' },
  { id: 'WO-1047', asset: 'Relay R-06', task: 'Protection test', elapsed: 26, hold: 6, reason: 'Awaiting isolation permit' },
  { id: 'WO-1048', asset: 'UPS U-01', task: 'Battery service', elapsed: 20, hold: 4, reason: 'Approved access window' },
].map(Object.freeze));

export function calculateMetrics(definition = 'elapsed', items = workItems) {
  if (!['elapsed', 'active'].includes(definition)) throw new Error('Unknown duration definition');
  if (!items.length) throw new Error('A metric requires work items');
  const elapsed = items.reduce((total, item) => total + item.elapsed, 0);
  const holds = items.reduce((total, item) => total + item.hold, 0);
  const total = definition === 'active' ? elapsed - holds : elapsed;
  return { count: items.length, elapsed, holds, total, mean: total / items.length };
}

// Generated illustration only. Never executed by this website.
export function generateSQL(definition = 'elapsed') {
  const expression = definition === 'active' ? 'elapsed_hours - authorized_hold_hours' : 'elapsed_hours';
  return `-- Northstar Electric / synthetic example\n-- Review required. This SQL has not been executed.\n-- Inputs: normalized, non-overlapping duration totals.\nWITH reviewed_items AS (\n  SELECT\n    work_item_id,\n    ${expression} AS duration_hours\n  FROM maintenance_work_items\n  WHERE status = 'completed'\n)\nSELECT\n  COUNT(*) AS work_item_count,\n  AVG(duration_hours) AS mean_duration_hours\nFROM reviewed_items;\n`;
}

export function generatePlan(definition = 'elapsed') {
  const metrics = calculateMetrics(definition);
  return `# Northstar Electric — Implementation plan\n\nSynthetic guided example. No production connection.\n\n1. Review the eight source records and operating procedure NE-MNT-004 §4.2.\n2. Approve the ${definition === 'active' ? 'active maintenance' : 'total elapsed'} duration definition.\n3. Map work items, assets, elapsed time, and authorized holds.\n4. Review maintenance_duration.sql in the target SQL dialect.\n5. Verify normalized hold intervals do not overlap and stay within elapsed time.\n6. Reconcile ${metrics.total} hours / 8 work items = ${metrics.mean} hours mean.\n7. Obtain engineer approval before any external execution or deployment.\n\nSQL has not been executed. Deployment is outside this demonstration.\n`;
}
