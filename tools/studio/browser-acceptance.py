from __future__ import annotations

import json
import os
import secrets
import shutil
import subprocess
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Callable

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

ROOT = Path(__file__).resolve().parents[2]
BASE_URL = "http://127.0.0.1:4311"
ORIGIN = "http://127.0.0.1:5173"
TOKEN = secrets.token_hex(24)
MATERIAL_SOURCE = ROOT / "src/presentation/definitions/level0-materials.json"
FEATURE_SOURCE = ROOT / "src/presentation/definitions/level0-features.json"
ARTIFACT_DIR = ROOT / "artifacts/studio-browser"
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def http_json(path: str, *, method: str = "GET", body: dict[str, Any] | None = None, bridge: bool = False) -> Any:
    headers = {"Content-Type": "application/json"}
    if bridge:
        headers.update({"Origin": ORIGIN, "X-Noclip-Studio-Token": TOKEN})
    request = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=None if body is None else json.dumps(body).encode("utf-8"),
        headers=headers,
        method=method,
    )
    with urllib.request.urlopen(request, timeout=5) as response:
        payload = response.read().decode("utf-8")
        return json.loads(payload) if payload else None


def wait_server(process: subprocess.Popen[str]) -> None:
    for _ in range(80):
        if process.poll() is not None:
            output = process.stdout.read() if process.stdout else ""
            raise AssertionError(f"Studio server exited before acceptance journey.\n{output}")
        try:
            http_json("/api/bootstrap")
            return
        except (OSError, urllib.error.URLError):
            time.sleep(0.1)
    raise AssertionError("Studio server did not become ready")


def build_driver() -> webdriver.Chrome:
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1500,1050")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    chrome_binary = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if chrome_binary:
        options.binary_location = chrome_binary
    return webdriver.Chrome(options=options)


def wait_for(driver: webdriver.Chrome, predicate: Callable[[webdriver.Chrome], Any], timeout: float = 25.0, message: str = "condition") -> Any:
    try:
        return WebDriverWait(driver, timeout).until(predicate)
    except TimeoutException as error:
        raise AssertionError(f"Timed out waiting for {message}") from error


def text(driver: webdriver.Chrome, selector: str) -> str:
    return str(driver.execute_script("const n=document.querySelector(arguments[0]);return n?n.textContent||'':'';", selector) or "")


def wait_text(driver: webdriver.Chrome, selector: str, fragment: str, timeout: float = 25.0) -> str:
    def containing_text(current: webdriver.Chrome) -> str | bool:
        current_text = text(current, selector)
        return current_text if fragment in current_text else False

    return str(wait_for(driver, containing_text, timeout, f"{selector} containing {fragment}"))


def click(driver: webdriver.Chrome, selector: str) -> None:
    wait_for(driver, lambda current: current.find_element(By.CSS_SELECTOR, selector), message=selector)
    driver.execute_script("document.querySelector(arguments[0]).click();", selector)


def set_input(driver: webdriver.Chrome, selector: str, value: str, event: str = "input") -> None:
    driver.execute_script(
        """
        const element=document.querySelector(arguments[0]);
        if(!element) throw new Error(`Missing ${arguments[0]}`);
        element.value=arguments[1];
        element.dispatchEvent(new Event(arguments[2],{bubbles:true}));
        """,
        selector,
        value,
        event,
    )


def value(driver: webdriver.Chrome, selector: str) -> str:
    return str(driver.execute_script("const n=document.querySelector(arguments[0]);return n?n.value:'';", selector) or "")


def select_target(driver: webdriver.Chrome, target_id: str) -> None:
    selector = f'[data-target="{target_id}"]'
    click(driver, selector)
    wait_text(driver, "#target-id", target_id)


def alternate_number(driver: webdriver.Chrome, selector: str) -> str:
    current, minimum, maximum, step = driver.execute_script(
        """
        const e=document.querySelector(arguments[0]);
        return [Number(e.value), Number(e.min), Number(e.max), Number(e.step || 0.01)];
        """,
        selector,
    )
    delta = step if step > 0 else 0.01
    candidate = current + delta
    if maximum == maximum and candidate > maximum:  # NaN-safe finite check
        candidate = current - delta
    if minimum == minimum and candidate < minimum:
        candidate = current + delta * 2
    if abs(candidate - current) < 1e-12:
        candidate = current + 0.01
    return f"{candidate:.6f}".rstrip("0").rstrip(".")


class MockRuntime:
    def __init__(self) -> None:
        self.stop = threading.Event()
        self.thread = threading.Thread(target=self.run, daemon=True)
        self.last_command = 0
        self.selected = "feature.medium-bucket"
        self.parameters: dict[str, dict[str, Any]] = {}
        self.assets: dict[str, dict[str, str]] = {}
        self.contexts: dict[str, dict[str, Any]] = {}

    def canonical_context(self, target_id: str) -> dict[str, Any]:
        packet = http_json(f"/api/context?target={urllib.parse.quote(target_id)}&mode=CHANGE")
        return packet["context"]

    def ensure_context(self, target_id: str) -> dict[str, Any]:
        context = self.contexts.get(target_id)
        if context is None:
            context = self.canonical_context(target_id)
            self.contexts[target_id] = context
        return context

    def apply(self, command: dict[str, Any]) -> None:
        target_id = command.get("targetId") or self.selected
        if target_id != self.selected:
            self.selected = target_id
            self.ensure_context(target_id)
        kind = command.get("type")
        payload = command.get("payload") or {}
        if kind == "preview-parameters":
            self.parameters.setdefault(target_id, {}).update(payload.get("parameters") or {})
        elif kind == "preview-assets":
            self.assets.setdefault(target_id, {}).update(payload.get("assetSlots") or {})
        elif kind == "clear-preview":
            self.parameters.pop(target_id, None)
            self.assets.pop(target_id, None)
        elif kind == "clear-all-previews":
            self.parameters.clear()
            self.assets.clear()
        self.last_command = max(self.last_command, int(command.get("id", 0)))

    def publish(self) -> None:
        context = self.ensure_context(self.selected)
        representation = context["representation"]
        representation["activePreviewOverrides"] = dict(self.parameters.get(self.selected, {}))
        representation["activeAssetSlotOverrides"] = dict(self.assets.get(self.selected, {}))
        http_json(
            "/api/bridge/state",
            method="POST",
            bridge=True,
            body={
                "clientId": "studio-browser-acceptance",
                "connectedAt": "browser-acceptance",
                "selectedTargetId": self.selected,
                "generationVersion": "gen3-v1",
                "regionId": "ordinary-level-0",
                "conditionIds": [],
                "developmentContext": context,
                "previewState": {"parameters": self.parameters, "assetSlots": self.assets, "bindings": {}},
                "diagnostics": ["Studio browser acceptance mock runtime"]
            },
        )

    def run(self) -> None:
        self.ensure_context(self.selected)
        while not self.stop.is_set():
            try:
                commands = http_json(f"/api/bridge/commands?after={self.last_command}", bridge=True)
                for command in commands:
                    self.apply(command)
                self.publish()
            except Exception as error:
                if not self.stop.is_set():
                    print(f"[Studio browser] mock runtime retry: {error}")
            self.stop.wait(0.08)

    def start(self) -> None:
        self.thread.start()

    def close(self) -> None:
        self.stop.set()
        self.thread.join(timeout=2)


def main() -> None:
    branch = subprocess.run(["git", "branch", "--show-current"], cwd=ROOT, text=True, capture_output=True, check=True).stdout.strip()
    if branch != "agent/dev9-7-studio-completion":
        raise AssertionError(f"Studio browser acceptance requires agent/dev9-7-studio-completion, got {branch or 'detached HEAD'}")

    material_before = MATERIAL_SOURCE.read_bytes()
    feature_before = FEATURE_SOURCE.read_bytes()
    server = subprocess.Popen(
        ["node", "tools/studio/server.mjs"],
        cwd=ROOT,
        env={**os.environ, "NOCLIP_STUDIO_TOKEN": TOKEN},
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    runtime = MockRuntime()
    driver: webdriver.Chrome | None = None
    checks: list[str] = []
    try:
        wait_server(server)
        runtime.start()
        driver = build_driver()
        driver.set_page_load_timeout(45)
        driver.get(BASE_URL)
        wait_text(driver, "h1", "NOCLIP STUDIO")
        wait_text(driver, "#runtime-state", "connected")

        select_target(driver, "material.level-0-wallpaper")
        wait_text(driver, "#where-used", "Ordinary sparse pillars")
        wait_text(driver, "#scope-note", "A-A1")
        saturation_selector = '[data-param-number="saturation"]'
        saved_saturation = value(driver, saturation_selector)
        set_input(driver, saturation_selector, alternate_number(driver, saturation_selector))
        wait_text(driver, "#editor-state", "unsaved")
        click(driver, "#preview")
        wait_text(driver, "#preview-state", "Active")
        wait_text(driver, "#authoring-status", "temporary runtime preview")
        click(driver, "#revert-preview")
        wait_text(driver, "#preview-state", "None")
        assert value(driver, saturation_selector) == saved_saturation
        checks.append("M-W1 saturation preview/revert and usage context")

        select_target(driver, "material.arch-pale-wallpaper")
        color_selector = '[data-param-color-text="pierColor"]'
        saved_color = value(driver, color_selector)
        temporary_color = "#112233" if saved_color.lower() != "#112233" else "#223344"
        set_input(driver, color_selector, temporary_color)
        click(driver, "#preview")
        wait_text(driver, "#preview-state", "Active")
        wait_text(driver, "#scope-note", "does not change normal Arch Room wallpaper")
        click(driver, "#revert-preview")
        wait_text(driver, "#preview-state", "None")
        assert value(driver, color_selector).lower() == saved_color.lower()
        checks.append("M-A1 typed colour preview/revert and M-W1 separation")

        select_target(driver, "material.level-0-carpet")
        carpet_selector = '[data-param-color-text="ordinaryTint"]'
        carpet_saved = value(driver, carpet_selector)
        set_input(driver, carpet_selector, "#334455" if carpet_saved.lower() != "#334455" else "#445566")
        click(driver, "#preview")
        wait_text(driver, "#preview-state", "Active")
        click(driver, "#revert-preview")
        wait_text(driver, "#preview-state", "None")
        checks.append("carpet typed tint preview/revert")

        select_target(driver, "material.level-0-wallpaper")
        family_selector = '[data-asset-slot="familyA"]'
        saved_family = value(driver, family_selector)
        compatible_families = driver.execute_script(
            """
            const input=document.querySelector(arguments[0]);
            return [...input.list.options].map((option)=>option.value).filter((id)=>id && id!==arguments[1]);
            """,
            family_selector,
            saved_family,
        )
        if not compatible_families:
            raise AssertionError("M-W1 Family A needs at least one different compatible runtime-ready Asset for acceptance")
        replacement_family = str(compatible_families[0])

        click(driver, '[data-tab="assets"]')
        wait_text(driver, "#assets-panel", "Asset Library")
        set_input(driver, "#asset-search", replacement_family)
        wait_text(driver, "#asset-list", replacement_family)
        click(driver, '[data-use-target="material.level-0-wallpaper"][data-use-slot="familyA"]')
        wait_text(driver, "#target-id", "material.level-0-wallpaper")
        assert value(driver, family_selector) == saved_family, "Use for… must navigate without changing the binding"
        set_input(driver, family_selector, replacement_family, event="change")
        wait_text(driver, "#editor-state", "unsaved")
        click(driver, "#preview")
        wait_text(driver, "#preview-state", "Active")
        click(driver, "#revert-preview")
        wait_text(driver, "#preview-state", "None")
        assert value(driver, family_selector) == saved_family
        checks.append("Asset used/compatible navigation plus value-agnostic replacement preview/revert")

        select_target(driver, "architecture.a-a1")
        wait_text(driver, "#read-only-explanation", "Generation 3 topology")
        assert driver.find_element(By.ID, "preview").get_attribute("disabled") is not None
        checks.append("read-only world-law explanation")

        select_target(driver, "feature.medium-bucket")
        rim_selector = '[data-param-number="rimHeightRatio"]'
        rim_new = float(alternate_number(driver, rim_selector))
        set_input(driver, rim_selector, f"{rim_new:.6f}".rstrip("0").rstrip("."))
        click(driver, "#save")
        wait_for(driver, lambda current: not current.find_element(By.ID, "receipt-panel").get_attribute("hidden"), timeout=90, message="ChangeReceipt after Save to Project")
        wait_text(driver, "#receipt-summary", "Canonical source changed", timeout=90)
        written = json.loads(FEATURE_SOURCE.read_text("utf-8"))
        bucket = next(item for item in written["representations"] if item["id"] == "bucket.default")
        assert abs(float(bucket["parameters"]["rimHeightRatio"]) - rim_new) < 1e-9
        click(driver, "#revert-change")
        wait_for(driver, lambda current: current.find_element(By.ID, "receipt-panel").get_attribute("hidden") is not None, timeout=45, message="targeted revert")
        assert FEATURE_SOURCE.read_bytes() == feature_before, "Targeted revert must restore the exact canonical Feature source"
        checks.append("harmless Save to Project, ChangeReceipt, restart-readable source, targeted revert")

        assert MATERIAL_SOURCE.read_bytes() == material_before, "Browser acceptance must never persist M-W1/M-A1 visual values"
        severe = [entry for entry in driver.get_log("browser") if entry.get("level") == "SEVERE" and "favicon.ico" not in entry.get("message", "")]
        if severe:
            raise AssertionError(f"Studio browser emitted severe console errors: {severe}")
        driver.save_screenshot(str(ARTIFACT_DIR / "studio-completion.png"))
        (ARTIFACT_DIR / "report.json").write_text(json.dumps({"checks": checks}, indent=2) + "\n", "utf-8")
        print("[Studio browser] PASS")
        for item in checks:
            print(f"  - {item}")
    finally:
        if driver is not None:
            driver.quit()
        runtime.close()
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
        if FEATURE_SOURCE.read_bytes() != feature_before:
            FEATURE_SOURCE.write_bytes(feature_before)
        if MATERIAL_SOURCE.read_bytes() != material_before:
            MATERIAL_SOURCE.write_bytes(material_before)


if __name__ == "__main__":
    import urllib.parse
    main()
