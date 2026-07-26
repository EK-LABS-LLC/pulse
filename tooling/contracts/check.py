#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# ///

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTRACT = ROOT / "contracts/otel/pulse-attributes.json"
DIRECTORIES = (
    ROOT / "apps/server",
    ROOT / "crates/pulse-cli/src",
    ROOT / "sdks/typescript/src",
    ROOT / "sdks/python/src",
)
ATTRIBUTE = re.compile(rb"""["'](pulse\.[a-z0-9_.]+)["']""")
NON_ATTRIBUTES = {"pulse.db", "pulse.spans.ingest"}


def main() -> int:
    payload = json.loads(CONTRACT.read_text())
    entries = payload.get("attributes", [])
    declared = [entry.get("name") for entry in entries]

    if payload.get("schema") != 1 or not declared:
        print("Invalid OTEL attribute contract", file=sys.stderr)
        return 1
    if len(declared) != len(set(declared)) or declared != sorted(declared):
        print("OTEL attributes must be unique and sorted", file=sys.stderr)
        return 1

    used = set()
    paths = []
    for source_root in DIRECTORIES:
        for path in source_root.rglob("*"):
            if (
                path.suffix in {".rs", ".ts", ".py"}
                and path.is_file()
                and "tests" not in path.parts
                and not path.name.endswith(".test.ts")
            ):
                paths.append(path)
    for path in paths:
        used.update(match.decode() for match in ATTRIBUTE.findall(path.read_bytes()))
    used -= NON_ATTRIBUTES

    undeclared = sorted(used - set(declared))
    unused = sorted(set(declared) - used)
    if undeclared or unused:
        if undeclared:
            print(f"Undeclared OTEL attributes: {', '.join(undeclared)}", file=sys.stderr)
        if unused:
            print(f"Unused OTEL attributes: {', '.join(unused)}", file=sys.stderr)
        return 1

    print(f"OTEL contract verified: {len(declared)} attributes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
