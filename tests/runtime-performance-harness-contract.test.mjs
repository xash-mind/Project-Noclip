import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const matchedHarness = await readFile(new URL('../scripts/matched-runtime-scenarios.py', import.meta.url), 'utf8');
const comparator = await readFile(new URL('../scripts/compare-matched-runtime.py', import.meta.url), 'utf8');
const workflow = await readFile(new URL('../.github/workflows/renderer-diagnostics.yml', import.meta.url), 'utf8');

const WAVE5_BASE = '4c16a3770d7f29476626062cda6dd13850aa805b';

test('matched runtime harness isolates scenarios under deterministic world controls', () => {
  assert.ok(matchedHarness.includes('fresh browser and fresh deterministic Journey per scenario'));
  assert.ok(matchedHarness.includes('driver = profiler.build_driver()'));
  assert.ok(matchedHarness.includes('driver.set_script_timeout(max(120.0, SAMPLE_SECONDS + 60.0))'));
  assert.ok(matchedHarness.includes("FIXED_SEED = os.environ.get(\"NOCLIP_MATCHED_RUNTIME_SEED\", \"threshold-001\")"));
  assert.ok(matchedHarness.includes("FIXED_WORLD_DAY = float(os.environ.get(\"NOCLIP_MATCHED_RUNTIME_WORLD_DAY\", \"40\"))"));
  assert.ok(matchedHarness.includes("FIXED_EXPOSURE = float(os.environ.get(\"NOCLIP_MATCHED_RUNTIME_EXPOSURE\", \"10\"))"));
  assert.ok(matchedHarness.includes('Date.now = () => fixedNow;'));
  assert.ok(matchedHarness.includes("(\"standing-ordinary\", [(\"ordinary-level-0\", \"nearest\")], False, False)"));
  assert.ok(matchedHarness.includes("(\"pillar-field\", [(\"pillar-field\", \"interior\")], False, False)"));
  assert.ok(matchedHarness.includes("(\"arch-rooms\", [(\"arch-rooms\", \"core\")], False, False)"));
});

test('matched runtime harness refuses low-resolution percentile evidence without reducing product workload', () => {
  assert.ok(matchedHarness.includes('MIN_FRAME_SAMPLES < 10'));
  assert.ok(matchedHarness.includes("TEST_HARNESS_FAILURE: matched runtime evidence requires at least 10 rAF samples per scenario"));
  assert.ok(matchedHarness.includes('requestedSampleSeconds'));
  assert.ok(matchedHarness.includes('minimumFrameSamples'));
  for (const forbidden of [
    'renderScale',
    'MAX_ACTIVE_FIXTURE_LIGHTS',
    'postProcessing',
    'disable lights',
    'lower graphics'
  ]) {
    assert.equal(matchedHarness.includes(forbidden), false, `matched verifier must not tune ${forbidden}`);
  }
});

test('matched comparison keeps cleanup thresholds, validates like-for-like starts and preserves same-host pairing', () => {
  assert.ok(comparator.includes('MEDIAN_LIMIT_PCT = 5.0'));
  assert.ok(comparator.includes('P95_LIMIT_PCT = 5.0'));
  assert.ok(comparator.includes('P99_LIMIT_PCT = 10.0'));
  assert.ok(comparator.includes('THRESHOLD_EPSILON_PCT = 1e-9'));
  assert.ok(comparator.includes('MIN_MATCHED_RUNS = 5'));
  assert.ok(comparator.includes('MIN_FRAME_SAMPLES = 10'));
  assert.ok(comparator.includes('close_position(base_scenario["startSnapshot"], cand_scenario["startSnapshot"])'));
  assert.ok(comparator.includes('str(baseline.get("matchRunId")) != str(candidate.get("matchRunId"))'));
  assert.ok(comparator.includes('pair_deltas = [pct_delta(candidate, baseline)'));
  assert.ok(comparator.includes('"aggregation": "median-of-same-host-pair-deltas"'));
  assert.ok(comparator.includes('"deltaPct": median(pair_deltas)'));
  assert.ok(comparator.includes('result["deltaPct"] <= limit + THRESHOLD_EPSILON_PCT'));
  assert.ok(comparator.includes('"independentMedianDeltaPct"'));
  assert.ok(comparator.includes('"matchedPairs": matched_pairs'));
  assert.ok(comparator.includes('PERFORMANCE_REGRESSION'));
});

test('renderer diagnostics executes five same-host Wave 5/Wave 6 pairs with the exact cleanup baseline', () => {
  assert.ok(workflow.includes(`NOCLIP_WAVE5_PERFORMANCE_BASE_SHA: ${WAVE5_BASE}`));
  assert.ok(workflow.includes('pair: [1, 2, 3, 4, 5]'));
  assert.ok(workflow.includes('git worktree add --detach "$BASE_DIR" "$NOCLIP_WAVE5_PERFORMANCE_BASE_SHA"'));
  assert.ok(workflow.includes('python "$CANDIDATE_DIR/scripts/matched-runtime-scenarios.py"'));
  assert.ok(workflow.includes('NOCLIP_MATCHED_RUNTIME_SAMPLE_SECONDS="45.0"'));
  assert.ok(workflow.includes('NOCLIP_MATCHED_RUNTIME_MIN_FRAME_SAMPLES="10"'));
  assert.ok(workflow.includes('if (( PAIR % 2 == 1 )); then'));
  assert.ok(workflow.includes('run_candidate'));
  assert.ok(workflow.includes('run_baseline'));
  assert.ok(workflow.includes('needs: matched-runtime-pairs'));
});
