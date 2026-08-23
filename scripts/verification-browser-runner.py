from __future__ import annotations

import argparse
import json
import os
import runpy
import subprocess
import sys
import traceback
from pathlib import Path
from typing import Any

from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.remote.webdriver import WebDriver


FAILURE_PRODUCT = "PRODUCT_FAILURE"
FAILURE_HARNESS = "TEST_HARNESS_FAILURE"
FAILURE_HEADLESS = "HEADLESS_RENDERER_LIMITATION"
FAILURE_LEGACY = "LEGACY_EXPECTATION_FAILURE"
FAILURE_PERFORMANCE = "PERFORMANCE_REGRESSION"


def git_head() -> str:
    return subprocess.run(
        ["git", "rev-parse", "HEAD"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()


def version() -> str:
    return Path("VERSION").read_text(encoding="utf-8").strip()


def classify_exception(error: BaseException) -> str:
    if isinstance(error, (AssertionError, TimeoutException)):
        return FAILURE_PRODUCT
    if isinstance(error, WebDriverException):
        return FAILURE_HARNESS
    if isinstance(error, (ImportError, ModuleNotFoundError, SyntaxError, NameError, AttributeError, TypeError)):
        return FAILURE_HARNESS
    if isinstance(error, SystemExit):
        return FAILURE_HARNESS
    return FAILURE_HARNESS


def write_report(path: Path, report: dict[str, Any]) -> None:
    path.mkdir(parents=True, exist_ok=True)
    (path / "verification-result.json").write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Run one browser verification task with explicit evidence classification.")
    parser.add_argument("--task", required=True)
    parser.add_argument("--category", required=True)
    parser.add_argument("--artifact-dir", required=True)
    parser.add_argument("--screenshot-policy", choices=("blocking", "functional-tolerant"), required=True)
    parser.add_argument("--allow-missing", action="store_true")
    parser.add_argument("script")
    parser.add_argument("script_args", nargs="*")
    args = parser.parse_args()

    artifact_dir = Path(args.artifact_dir)
    target = Path(args.script).resolve()
    actual_head = git_head()
    expected_head = os.environ.get("NOCLIP_BRANCH_HEAD_SHA", actual_head).strip()
    pr_merge_sha = os.environ.get("NOCLIP_PR_MERGE_SHA", "").strip() or None
    current_version = version()

    report: dict[str, Any] = {
        "task": args.task,
        "category": args.category,
        "status": "RUNNING",
        "classification": None,
        "branchHeadSha": actual_head,
        "expectedBranchHeadSha": expected_head,
        "prMergeSha": pr_merge_sha,
        "version": current_version,
        "screenshotPolicy": args.screenshot_policy,
        "screenshotLimitations": [],
    }

    if actual_head != expected_head:
        report.update(
            status="FAILED",
            classification=FAILURE_HARNESS,
            error=f"Exact-head mismatch: checked out {actual_head}, expected branch head {expected_head}",
        )
        write_report(artifact_dir, report)
        raise SystemExit(report["error"])

    print(f"BRANCH_HEAD_SHA={actual_head}")
    print(f"PR_MERGE_SHA={pr_merge_sha or 'none'}")
    print(f"VERSION={current_version}")

    if not target.is_file():
        if args.allow_missing:
            report.update(status="SKIPPED_NOT_PRESENT", classification=None, reason=f"Optional acceptance script not present: {target}")
            write_report(artifact_dir, report)
            print(report["reason"])
            return
        report.update(status="FAILED", classification=FAILURE_HARNESS, error=f"Missing verification script: {target}")
        write_report(artifact_dir, report)
        raise SystemExit(report["error"])

    original_save_screenshot = WebDriver.save_screenshot
    if args.screenshot_policy == "functional-tolerant":
        def tolerant_save_screenshot(self: WebDriver, filename: str) -> bool:
            try:
                return bool(original_save_screenshot(self, filename))
            except TimeoutException as error:
                warning = {
                    "classification": FAILURE_HEADLESS,
                    "file": filename,
                    "error": error.msg,
                }
                report["screenshotLimitations"].append(warning)
                print(
                    f"{FAILURE_HEADLESS}: screenshot {filename} timed out; "
                    "already-passed functional assertions remain valid"
                )
                return False

        WebDriver.save_screenshot = tolerant_save_screenshot

    try:
        sys.argv = [str(target), *args.script_args]
        runpy.run_path(str(target), run_name="__main__")
    except BaseException as error:
        classification = classify_exception(error)
        report.update(
            status="FAILED",
            classification=classification,
            error=f"{type(error).__name__}: {error}",
            traceback="".join(traceback.format_exception(type(error), error, error.__traceback__))[-12000:],
        )
        write_report(artifact_dir, report)
        print(f"{classification}: {report['error']}", file=sys.stderr)
        raise
    finally:
        WebDriver.save_screenshot = original_save_screenshot

    report["status"] = "PASSED"
    if report["screenshotLimitations"]:
        report["classification"] = FAILURE_HEADLESS
    write_report(artifact_dir, report)
    print(f"{args.task}: {report['status']}")
    if report["classification"]:
        print(f"evidence classification: {report['classification']}")


if __name__ == "__main__":
    main()
