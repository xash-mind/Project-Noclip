from __future__ import annotations

import os
import subprocess
from pathlib import Path

from verification_contract import (
    HEADLESS_RENDERER_LIMITATION,
    LEGACY_EXPECTATION_FAILURE,
    PERFORMANCE_REGRESSION,
    PRODUCT_FAILURE,
    TEST_HARNESS_FAILURE,
    classify_failure,
)

ROOT = Path(__file__).resolve().parents[1]
MODERN_WORKFLOWS = (
    ROOT / ".github/workflows/ci.yml",
    ROOT / ".github/workflows/feature-acceptance.yml",
    ROOT / ".github/workflows/visual-regression.yml",
    ROOT / ".github/workflows/renderer-diagnostics.yml",
)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    checks: list[str] = []

    require(classify_failure("AssertionError", phase="product") == PRODUCT_FAILURE, "product assertion must remain blocking")
    checks.append("genuine product assertion -> PRODUCT_FAILURE")

    require(classify_failure("TypeError") == TEST_HARNESS_FAILURE, "Python/Selenium harness error must be separate")
    checks.append("harness exception -> TEST_HARNESS_FAILURE")

    require(
        classify_failure("TimeoutException", screenshot_timeout=True) == HEADLESS_RENDERER_LIMITATION,
        "screenshot timeout must be distinguishable from functional failure",
    )
    checks.append("screenshot timeout -> HEADLESS_RENDERER_LIMITATION")

    require(classify_failure("AssertionError", legacy_expectation=True) == LEGACY_EXPECTATION_FAILURE, "legacy expectation classification missing")
    checks.append("obsolete expectation -> LEGACY_EXPECTATION_FAILURE")

    require(classify_failure("AssertionError", performance_regression=True) == PERFORMANCE_REGRESSION, "performance classification missing")
    checks.append("performance threshold failure -> PERFORMANCE_REGRESSION")

    current_head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip()
    expected_head = os.environ.get("NOCLIP_BRANCH_HEAD_SHA", "").strip()
    if expected_head:
        require(current_head == expected_head, f"exact-head mismatch: {current_head} != {expected_head}")
    checks.append(f"exact branch head recorded as {current_head}")

    version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    require(bool(version), "VERSION must be non-empty")
    checks.append(f"VERSION derived from VERSION file ({version})")

    for path in MODERN_WORKFLOWS:
        require(path.is_file(), f"missing modern workflow: {path.name}")
        text = path.read_text(encoding="utf-8")
        require("0.3.0-dev.9.5" not in text, f"modern workflow {path.name} hard-codes the historical Dev.9.5 version")
        require("NOCLIP_BRANCH_HEAD_SHA" in text, f"modern workflow {path.name} does not expose exact branch head")
    checks.append("modern workflows contain no hard-coded Dev.9.5 VERSION expectation")

    core = (ROOT / ".github/workflows/ci.yml").read_text(encoding="utf-8")
    require("selenium" not in core.lower(), "core correctness must not install browser infrastructure")
    require("npm run preview" not in core, "core correctness must not launch browser preview")
    checks.append("core correctness is browser-independent")

    features = (ROOT / ".github/workflows/feature-acceptance.yml").read_text(encoding="utf-8")
    for job in ("gameplay-functional:", "character-creator:", "inventory-ui:", "studio-authoring:"):
        require(job in features, f"feature acceptance missing independent job {job}")
    checks.append("gameplay, Character Creator, Inventory and Studio acceptance are independent jobs")

    visual = (ROOT / ".github/workflows/visual-regression.yml").read_text(encoding="utf-8")
    require("--screenshot-policy blocking" in visual, "visual regression screenshots must block")
    checks.append("visual screenshot policy is blocking")

    diagnostics = (ROOT / ".github/workflows/renderer-diagnostics.yml").read_text(encoding="utf-8")
    require("runtime-performance-evidence.json" in diagnostics, "renderer diagnostics must emit comparable performance evidence")
    checks.append("renderer/performance diagnostics are independent and emit reusable evidence")

    print("Verification contract PASS")
    for check in checks:
        print(f"  - {check}")


if __name__ == "__main__":
    main()
