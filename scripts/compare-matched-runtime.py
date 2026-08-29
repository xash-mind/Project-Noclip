from __future__ import annotations

import argparse
import json
import statistics
from pathlib import Path
from typing import Any

MEDIAN_LIMIT_PCT = 5.0
P95_LIMIT_PCT = 5.0
P99_LIMIT_PCT = 10.0
MIN_MATCHED_RUNS = 5
MIN_FRAME_SAMPLES = 10
POSITION_TOLERANCE_METERS = 0.05


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def scenario_map(evidence: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {str(entry["scenario"]): entry for entry in evidence["scenarios"]}


def pct_delta(candidate: float, baseline: float) -> float:
    if baseline <= 0:
        raise SystemExit(f"TEST_HARNESS_FAILURE: non-positive baseline metric {baseline}")
    return (candidate / baseline - 1.0) * 100.0


def median(values: list[float]) -> float:
    return float(statistics.median(values))


def metric_summary(
    run_names: list[str],
    candidate_values: list[float],
    baseline_values: list[float],
) -> dict[str, Any]:
    pair_deltas = [pct_delta(candidate, baseline) for baseline, candidate in zip(baseline_values, candidate_values, strict=True)]
    matched_pairs = [
        {
            "run": run_name,
            "baseline": baseline,
            "candidate": candidate,
            "deltaPct": delta,
        }
        for run_name, baseline, candidate, delta in zip(
            run_names,
            baseline_values,
            candidate_values,
            pair_deltas,
            strict=True,
        )
    ]
    baseline_median = median(baseline_values)
    candidate_median = median(candidate_values)
    return {
        "aggregation": "median-of-same-host-pair-deltas",
        "baselineMedian": baseline_median,
        "candidateMedian": candidate_median,
        "independentMedianDeltaPct": pct_delta(candidate_median, baseline_median),
        "deltaPct": median(pair_deltas),
        "baselineRange": [min(baseline_values), max(baseline_values)],
        "candidateRange": [min(candidate_values), max(candidate_values)],
        "pairDeltaRangePct": [min(pair_deltas), max(pair_deltas)],
        "baselineRuns": baseline_values,
        "candidateRuns": candidate_values,
        "pairDeltasPct": pair_deltas,
        "matchedPairs": matched_pairs,
    }


def close_position(left: dict[str, Any], right: dict[str, Any]) -> bool:
    return (
        abs(float(left["x"]) - float(right["x"])) <= POSITION_TOLERANCE_METERS
        and abs(float(left["z"]) - float(right["z"])) <= POSITION_TOLERANCE_METERS
        and abs(float(left["yaw"]) - float(right["yaw"])) <= 0.05
        and abs(float(left["pitch"]) - float(right["pitch"])) <= 0.05
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare same-host Wave 5/Wave 6 runtime scenario evidence.")
    parser.add_argument("--root", default="artifacts/matched")
    parser.add_argument("--output", default="artifacts/matched-runtime-comparison.json")
    parser.add_argument("--baseline-sha", required=True)
    parser.add_argument("--candidate-sha", required=True)
    args = parser.parse_args()

    root = Path(args.root)
    run_dirs = sorted(path for path in root.glob("run-*") if path.is_dir())
    pairs: list[tuple[str, dict[str, Any], dict[str, Any]]] = []
    for run_dir in run_dirs:
        baseline_path = run_dir / "baseline" / "runtime-performance-matched.json"
        candidate_path = run_dir / "candidate" / "runtime-performance-matched.json"
        if baseline_path.is_file() and candidate_path.is_file():
            pairs.append((run_dir.name, load(baseline_path), load(candidate_path)))

    if len(pairs) < MIN_MATCHED_RUNS:
        raise SystemExit(f"TEST_HARNESS_FAILURE: expected at least {MIN_MATCHED_RUNS} matched pairs, found {len(pairs)}")

    expected_contract: dict[str, Any] | None = None
    scenario_names: list[str] | None = None
    per_run: list[dict[str, Any]] = []
    for run_name, baseline, candidate in pairs:
        if baseline.get("commitSha") != args.baseline_sha:
            raise SystemExit(f"TEST_HARNESS_FAILURE: {run_name} baseline SHA {baseline.get('commitSha')} != {args.baseline_sha}")
        if candidate.get("commitSha") != args.candidate_sha:
            raise SystemExit(f"TEST_HARNESS_FAILURE: {run_name} candidate SHA {candidate.get('commitSha')} != {args.candidate_sha}")
        if baseline.get("environment") != candidate.get("environment"):
            raise SystemExit(f"TEST_HARNESS_FAILURE: {run_name} renderer environments differ")
        if baseline.get("measurementContract") != candidate.get("measurementContract"):
            raise SystemExit(f"TEST_HARNESS_FAILURE: {run_name} measurement contracts differ")
        if str(baseline.get("matchRunId")) != str(candidate.get("matchRunId")):
            raise SystemExit(f"TEST_HARNESS_FAILURE: {run_name} match-run identities differ")
        contract = baseline.get("measurementContract", {})
        if expected_contract is None:
            expected_contract = contract
        elif contract != expected_contract:
            raise SystemExit(f"TEST_HARNESS_FAILURE: {run_name} does not match the other pair contracts")
        if int(contract.get("minimumFrameSamples", 0)) < MIN_FRAME_SAMPLES:
            raise SystemExit(f"TEST_HARNESS_FAILURE: {run_name} minimum frame-sample contract is too small")

        baseline_scenarios = scenario_map(baseline)
        candidate_scenarios = scenario_map(candidate)
        names = list(baseline_scenarios)
        if scenario_names is None:
            scenario_names = names
        if set(names) != set(candidate_scenarios) or set(names) != set(scenario_names):
            raise SystemExit(f"TEST_HARNESS_FAILURE: {run_name} scenario sets differ")

        pair_record: dict[str, Any] = {
            "run": run_name,
            "matchRunId": baseline.get("matchRunId"),
            "scenarios": {},
        }
        for name in scenario_names:
            base_scenario = baseline_scenarios[name]
            cand_scenario = candidate_scenarios[name]
            if int(base_scenario.get("sampleCount", 0)) < MIN_FRAME_SAMPLES:
                raise SystemExit(f"TEST_HARNESS_FAILURE: {run_name} baseline {name} has only {base_scenario.get('sampleCount')} rAF samples")
            if int(cand_scenario.get("sampleCount", 0)) < MIN_FRAME_SAMPLES:
                raise SystemExit(f"TEST_HARNESS_FAILURE: {run_name} candidate {name} has only {cand_scenario.get('sampleCount')} rAF samples")
            if not close_position(base_scenario["startSnapshot"], cand_scenario["startSnapshot"]):
                raise SystemExit(
                    f"TEST_HARNESS_FAILURE: {run_name} {name} starts differ: "
                    f"baseline={base_scenario['startSnapshot']} candidate={cand_scenario['startSnapshot']}"
                )
            if base_scenario.get("browserExceptions") or cand_scenario.get("browserExceptions"):
                raise SystemExit(f"PRODUCT_FAILURE: browser exception in {run_name} {name}")
            if base_scenario.get("visibilityDiagnostics", {}).get("activeShadowInvariant") is not True:
                raise SystemExit(f"PRODUCT_FAILURE: baseline active/shadow invariant failed in {run_name} {name}")
            if cand_scenario.get("visibilityDiagnostics", {}).get("activeShadowInvariant") is not True:
                raise SystemExit(f"PRODUCT_FAILURE: candidate active/shadow invariant failed in {run_name} {name}")
            pair_record["scenarios"][name] = {
                "baselineSampleCount": base_scenario["sampleCount"],
                "candidateSampleCount": cand_scenario["sampleCount"],
                "baselineMovementMeters": base_scenario.get("movementDistanceMeters"),
                "candidateMovementMeters": cand_scenario.get("movementDistanceMeters"),
            }
        per_run.append(pair_record)

    assert scenario_names is not None
    scenario_results: dict[str, Any] = {}
    regressions: list[dict[str, Any]] = []
    metric_limits = {
        "medianFrameTimeMs": MEDIAN_LIMIT_PCT,
        "p95FrameTimeMs": P95_LIMIT_PCT,
        "p99FrameTimeMs": P99_LIMIT_PCT,
    }
    run_names = [run_name for run_name, _, _ in pairs]

    for name in scenario_names:
        metric_results: dict[str, Any] = {}
        for metric, limit in metric_limits.items():
            baseline_values = [float(scenario_map(base)[name][metric]) for _, base, _ in pairs]
            candidate_values = [float(scenario_map(candidate)[name][metric]) for _, _, candidate in pairs]
            result = metric_summary(run_names, candidate_values, baseline_values)
            result["limitPct"] = limit
            result["pass"] = result["deltaPct"] <= limit
            metric_results[metric] = result
            if not result["pass"]:
                regressions.append({"scenario": name, "metric": metric, **result})

        baseline_movement = [float(scenario_map(base)[name].get("movementDistanceMeters", 0.0)) for _, base, _ in pairs]
        candidate_movement = [float(scenario_map(candidate)[name].get("movementDistanceMeters", 0.0)) for _, _, candidate in pairs]
        scenario_results[name] = {
            "metrics": metric_results,
            "movementDistanceMeters": {
                "baselineMedian": median(baseline_movement),
                "candidateMedian": median(candidate_movement),
                "baselineRange": [min(baseline_movement), max(baseline_movement)],
                "candidateRange": [min(candidate_movement), max(candidate_movement)],
            },
        }

    report = {
        "schemaVersion": 2,
        "evidenceKind": "matched-runtime-comparison",
        "aggregation": "median-of-same-host-pair-deltas",
        "baselineSha": args.baseline_sha,
        "candidateSha": args.candidate_sha,
        "matchedRuns": len(pairs),
        "measurementContract": expected_contract,
        "thresholdsPct": {"median": MEDIAN_LIMIT_PCT, "p95": P95_LIMIT_PCT, "p99": P99_LIMIT_PCT},
        "perRunValidation": per_run,
        "scenarios": scenario_results,
        "regressions": regressions,
        "status": "PASS" if not regressions else "PERFORMANCE_REGRESSION",
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    if regressions:
        raise SystemExit(f"PERFORMANCE_REGRESSION: {len(regressions)} matched scenario threshold breach(es)")
    print("matched-runtime-comparison: PASSED")


if __name__ == "__main__":
    main()
