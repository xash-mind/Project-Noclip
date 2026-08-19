from __future__ import annotations

import importlib.util
import statistics
from pathlib import Path
from types import ModuleType
from typing import Any


def load_profile_module() -> ModuleType:
    path = Path(__file__).with_name('profile-production.py')
    spec = importlib.util.spec_from_file_location('project_noclip_profile_production', path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f'Unable to load {path}')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def install_retention_aware_metrics(profile: ModuleType) -> None:
    original_current_metrics = profile.current_metrics

    def current_metrics(driver: Any) -> dict[str, Any]:
        metrics = dict(original_current_metrics(driver))
        diagnostics = driver.execute_script(
            "return window.__projectNoclipRenderSettings?.diagnostics?.() ?? null;"
        )
        if isinstance(diagnostics, dict) and isinstance(diagnostics.get('activeCells'), (int, float)):
            retained = metrics.get('loadedCells')
            if retained is not None:
                metrics['retainedCells'] = retained
            metrics['loadedCells'] = int(diagnostics['activeCells'])
            metrics['activeRenderCells'] = int(diagnostics['activeCells'])
            metrics['activeOmnis'] = int(diagnostics.get('activeOmnis', 0))
            metrics['shadowedOmnis'] = int(diagnostics.get('shadowedOmnis', 0))
        return metrics

    profile.current_metrics = current_metrics


def install_stable_draw_call_sampling(profile: ModuleType) -> None:
    original_sample_static = profile.sample_static

    def next_frame_draw_calls(driver: Any) -> int | None:
        value = driver.execute_async_script(
            """
            const done = arguments[arguments.length - 1];
            requestAnimationFrame(() => {
              const text = document.querySelector('[data-ui="metrics"]')?.textContent ?? '';
              const match = text.match(/^draw calls\s+(\d+)$/m);
              done(match ? Number(match[1]) : null);
            });
            """
        )
        return int(value) if isinstance(value, (int, float)) else None

    def stable_draw_calls(driver: Any) -> tuple[int, list[int], list[int]]:
        observed: list[int] = []
        positive: list[int] = []
        for _ in range(12):
            value = next_frame_draw_calls(driver)
            if value is None:
                continue
            observed.append(value)
            if value <= 0:
                continue
            positive.append(value)
            if len(positive) < 3:
                continue
            recent = positive[-3:]
            centre = float(statistics.median(recent))
            tolerance = max(3, int(round(centre * 0.05)))
            if max(recent) - min(recent) <= tolerance:
                return int(round(centre)), observed, recent
        raise AssertionError(
            'draw-call metric did not reach a stable positive three-frame plateau; '
            f'observed={observed}'
        )

    def sample_static(driver: Any, name: str, warnings: list[str]) -> dict[str, Any]:
        sample = dict(original_sample_static(driver, name, warnings))
        draw_calls, observed, stable_window = stable_draw_calls(driver)
        world_metrics = dict(sample['worldMetricsAfter'])
        world_metrics['drawCalls'] = draw_calls
        sample['worldMetricsAfter'] = world_metrics
        sample['drawCallSamples'] = observed
        sample['drawCallStableWindow'] = stable_window
        return sample

    profile.sample_static = sample_static


def main() -> None:
    profile = load_profile_module()
    install_retention_aware_metrics(profile)
    install_stable_draw_call_sampling(profile)
    profile.main()


if __name__ == '__main__':
    main()
