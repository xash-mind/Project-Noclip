from __future__ import annotations

import importlib.util
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


def main() -> None:
    profile = load_profile_module()
    install_retention_aware_metrics(profile)
    profile.main()


if __name__ == '__main__':
    main()
