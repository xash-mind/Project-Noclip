from __future__ import annotations

from typing import Literal

PRODUCT_FAILURE = "PRODUCT_FAILURE"
TEST_HARNESS_FAILURE = "TEST_HARNESS_FAILURE"
HEADLESS_RENDERER_LIMITATION = "HEADLESS_RENDERER_LIMITATION"
LEGACY_EXPECTATION_FAILURE = "LEGACY_EXPECTATION_FAILURE"
PERFORMANCE_REGRESSION = "PERFORMANCE_REGRESSION"

FailureClassification = Literal[
    "PRODUCT_FAILURE",
    "TEST_HARNESS_FAILURE",
    "HEADLESS_RENDERER_LIMITATION",
    "LEGACY_EXPECTATION_FAILURE",
    "PERFORMANCE_REGRESSION",
]

HARNESS_EXCEPTION_NAMES = {
    "AttributeError",
    "ImportError",
    "ModuleNotFoundError",
    "NameError",
    "SyntaxError",
    "SystemExit",
    "TypeError",
    "WebDriverException",
}


def classify_failure(
    exception_name: str,
    *,
    phase: str = "browser",
    screenshot_timeout: bool = False,
    legacy_expectation: bool = False,
    performance_regression: bool = False,
) -> FailureClassification:
    if performance_regression:
        return PERFORMANCE_REGRESSION
    if legacy_expectation:
        return LEGACY_EXPECTATION_FAILURE
    if screenshot_timeout:
        return HEADLESS_RENDERER_LIMITATION
    if exception_name in {"AssertionError", "TimeoutException"} and phase in {"product", "browser", "visual"}:
        return PRODUCT_FAILURE
    if exception_name in HARNESS_EXCEPTION_NAMES:
        return TEST_HARNESS_FAILURE
    return TEST_HARNESS_FAILURE
