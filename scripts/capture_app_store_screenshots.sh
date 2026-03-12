#!/bin/zsh
set -euo pipefail

ROOT="/Users/joseca/Documents/Investigacion y newsletter"
PROJECT="$ROOT/ios/GacetaIOS.xcodeproj"
SPEC="$ROOT/ios/project.yml"
SCHEME="GacetaIOS"
DERIVED_DATA="/tmp/GacetaIOS-app-store-shots"

export ROOT PROJECT SPEC SCHEME DERIVED_DATA

python3 <<'PY'
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(os.environ["ROOT"])
PROJECT = Path(os.environ["PROJECT"])
SPEC = Path(os.environ["SPEC"])
SCHEME = os.environ["SCHEME"]
DERIVED_DATA = Path(os.environ["DERIVED_DATA"])
BUNDLE_ID = "com.yosoymx.gacetaejecentral"
IPHONE_OUTPUT = ROOT / "release/app-store/ios/screenshots/iphone-6.9"
IPAD_OUTPUT = ROOT / "release/app-store/ios/screenshots/ipad-13"

SHOTS = [
    ("01-portada", "gacetaeje://inicio"),
    ("02-ruta", "gacetaeje://ruta"),
    ("03-biblioteca", "gacetaeje://biblioteca"),
    ("04-comunidad", "gacetaeje://comunidad"),
    ("05-soporte", "gacetaeje://contacto"),
]

TARGETS = [
    ("iphone", "iPhone 16 Pro Max", "com.apple.CoreSimulator.SimRuntime.iOS-18-5", IPHONE_OUTPUT),
    ("ipad", "iPad Pro 13-inch (M4)", "com.apple.CoreSimulator.SimRuntime.iOS-18-5", IPAD_OUTPUT),
]


def run(cmd, *, env=None, timeout=120, check=True, capture_output=False):
    print("RUN", " ".join(map(str, cmd)), flush=True)
    return subprocess.run(
        [str(part) for part in cmd],
        env=env,
        timeout=timeout,
        check=check,
        capture_output=capture_output,
        text=True,
    )


def wait_for_simctl():
    for _ in range(24):
        proc = run(
            ["xcrun", "simctl", "list", "devices", "available", "-j"],
            timeout=15,
            check=False,
            capture_output=True,
        )
        if proc.returncode == 0 and proc.stdout.strip():
            return json.loads(proc.stdout)
        time.sleep(2)
    raise RuntimeError("CoreSimulator no respondió a tiempo.")


def find_device(payload, *, name, runtime):
    for device in payload["devices"].get(runtime, []):
        if device.get("isAvailable") and device.get("name") == name:
            return device["udid"]
    raise RuntimeError(f"No encontré {name} en {runtime}.")


def build_app():
    run(["xcodegen", "generate", "--spec", SPEC], timeout=120)
    if DERIVED_DATA.exists():
        subprocess.run(["rm", "-rf", str(DERIVED_DATA)], check=True)
    run(
        [
            "xcodebuild",
            "-project",
            PROJECT,
            "-scheme",
            SCHEME,
            "-configuration",
            "Debug",
            "-destination",
            "generic/platform=iOS Simulator",
            "-sdk",
            "iphonesimulator",
            "-derivedDataPath",
            DERIVED_DATA,
            "build",
        ],
        timeout=900,
    )
    app = DERIVED_DATA / "Build/Products/Debug-iphonesimulator/GacetaIOS.app"
    if not app.exists():
        raise RuntimeError("No encontré GacetaIOS.app compilada para simulador.")
    return app


def prepare_device(udid, app_path):
    run(["xcrun", "simctl", "boot", udid], check=False, timeout=30)
    run(["xcrun", "simctl", "bootstatus", udid, "-b"], timeout=120)
    run(["xcrun", "simctl", "uninstall", udid, BUNDLE_ID], check=False, timeout=30)
    run(["xcrun", "simctl", "install", udid, app_path], timeout=60)
    run(
        [
            "xcrun",
            "simctl",
            "status_bar",
            udid,
            "override",
            "--time",
            "9:41",
            "--dataNetwork",
            "wifi",
            "--wifiBars",
            "3",
            "--cellularMode",
            "active",
            "--cellularBars",
            "4",
            "--batteryState",
            "charged",
            "--batteryLevel",
            "100",
        ],
        timeout=30,
    )


def capture_set(udid, output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)
    for file in output_dir.glob("*.png"):
        file.unlink()
    for name, url in SHOTS:
        out = output_dir / f"{name}.png"
        launch_env = os.environ.copy()
        launch_env["SIMCTL_CHILD_USE_BUNDLED_COMMUNITY_FIXTURES"] = "1"
        launch_env["SIMCTL_CHILD_APP_STORE_SCREENSHOT_MODE"] = "1"
        launch_env["SIMCTL_CHILD_SCREENSHOT_ROUTE"] = url
        run(
            ["xcrun", "simctl", "launch", "--terminate-running-process", udid, BUNDLE_ID],
            env=launch_env,
            timeout=60,
        )
        time.sleep(4)
        run(["xcrun", "simctl", "io", udid, "screenshot", out], timeout=30)
        print("CAPTURED", out, flush=True)
        time.sleep(1)
    run(["xcrun", "simctl", "status_bar", udid, "clear"], check=False, timeout=15)


app_path = build_app()
payload = wait_for_simctl()

for _, name, runtime, output in TARGETS:
    udid = find_device(payload, name=name, runtime=runtime)
    prepare_device(udid, app_path)
    capture_set(udid, output)

print("Screenshots listos en:")
print(f"  {IPHONE_OUTPUT}")
print(f"  {IPAD_OUTPUT}")
PY
