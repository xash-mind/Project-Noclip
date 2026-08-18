from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'scripts/arch-locator-smoke.py'
text = path.read_text(encoding='utf-8')
old = """def wait_for_text(driver: webdriver.Chrome, selector: str, fragment: str, timeout: float = 30.0) -> str:
    return str(wait_for(driver, lambda current: (value := text_content(current, selector)) if fragment in value else False, timeout=timeout, message=fragment))
"""
new = """def wait_for_text(driver: webdriver.Chrome, selector: str, fragment: str, timeout: float = 30.0) -> str:
    def predicate(current: webdriver.Chrome) -> str | bool:
        value = text_content(current, selector)
        return value if fragment in value else False

    return str(wait_for(driver, predicate, timeout=timeout, message=fragment))
"""
if text.count(old) != 1:
    raise RuntimeError('arch-locator-smoke.py: wait_for_text shape drifted')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Arch lifecycle recovery v6 real-browser wait predicate fixed.')
