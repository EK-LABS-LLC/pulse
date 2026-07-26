#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "tree-sitter==0.25.2",
#   "tree-sitter-rust==0.24.0",
# ]
# ///

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path

from tree_sitter import Language, Parser
import tree_sitter_rust

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = Path(__file__).with_name("baseline.json")
RUST_ROOT = Path("crates/pulse-cli")
EXCLUDED_PARTS = {".git", "__pycache__", "dist", "node_modules", "target"}


@dataclass(frozen=True)
class Artifact:
    kind: str
    path: str
    mode: str
    bytes: int
    sha256: str

    @property
    def identity(self) -> tuple[str, str, str, str, int]:
        bound_path = self.path if self.kind.startswith("rust-") else ""
        return self.kind, bound_path, self.mode, self.sha256, self.bytes


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def file_mode(path: Path) -> str:
    return "100755" if os.access(path, os.X_OK) else "100644"


def file_artifact(root: Path, path: Path) -> Artifact:
    data = (root / path).read_bytes()
    return Artifact(
        test_file_kind(path),
        path.as_posix(),
        file_mode(root / path),
        len(data),
        sha256(data),
    )


def is_excluded(path: Path) -> bool:
    return bool(EXCLUDED_PARTS.intersection(path.parts))


def test_file_kind(path: Path) -> str:
    value = path.as_posix()

    if is_excluded(path):
        return "uncollected"
    if value in {"apps/server/.env.test", "apps/server/scripts/run-e2e.sh"}:
        return "server-harness"
    if value.startswith("apps/server/tests/"):
        if value.endswith(".test.ts"):
            return "server-bun-test"
        if value == "apps/server/tests/setup.ts":
            return "server-bun-support"
        if value.startswith("apps/server/tests/bootstrap/") and value.endswith(".sh"):
            return "server-bootstrap-test"
        return "server-uncollected"
    if value.startswith("apps/server/") and value.endswith(".test.ts"):
        return "server-bun-test"
    if value.startswith("crates/pulse-cli/tests/"):
        return "cli-cargo-test" if value.endswith(".rs") else "cli-uncollected"
    if value.startswith("crates/pulse-cli/e2e/"):
        return "cli-e2e"
    if value.startswith("sdks/typescript/tests/"):
        if value.endswith(".test.ts"):
            return "typescript-bun-test"
        if value.endswith("test-server.ts"):
            return "typescript-test-support"
        return "typescript-uncollected"
    if value.startswith("sdks/python/tests/"):
        name = path.name
        if name.startswith("test_") and name.endswith(".py"):
            return "python-pytest"
        return "python-uncollected"
    if value.startswith(".cargo/"):
        return "cargo-runner-config"
    if value in {
        "sdks/python/pytest.ini",
        "sdks/python/setup.cfg",
        "sdks/python/tox.ini",
    }:
        return "pytest-runner-config"
    return "uncollected"


def product_test_files(root: Path) -> list[Path]:
    paths: set[Path] = set()

    server = root / "apps/server"
    paths.update(
        path.relative_to(root)
        for path in server.rglob("*.test.ts")
        if not is_excluded(path.relative_to(root))
    )
    paths.update(
        path.relative_to(root)
        for path in (server / "tests").rglob("*")
        if path.is_file() and not is_excluded(path.relative_to(root)) and path.suffix != ".pyc"
    )
    paths.add(Path("apps/server/.env.test"))
    paths.add(Path("apps/server/scripts/run-e2e.sh"))

    for candidate in (
        Path(".cargo/config"),
        Path(".cargo/config.toml"),
        Path("sdks/python/pytest.ini"),
        Path("sdks/python/setup.cfg"),
        Path("sdks/python/tox.ini"),
    ):
        if (root / candidate).is_file():
            paths.add(candidate)

    for directory in (
        "crates/pulse-cli/e2e",
        "crates/pulse-cli/tests",
        "sdks/typescript/tests",
        "sdks/python/tests",
    ):
        paths.update(
            path.relative_to(root)
            for path in (root / directory).rglob("*")
            if path.is_file()
            and not is_excluded(path.relative_to(root))
            and path.suffix != ".pyc"
        )

    return sorted(paths)


def rust_test_modules(root: Path) -> list[Artifact]:
    parser = Parser(Language(tree_sitter_rust.language()))
    artifacts: list[Artifact] = []

    for path in sorted((root / RUST_ROOT).rglob("*.rs")):
        source = path.read_bytes()
        tree = parser.parse(source)
        if tree.root_node.has_error:
            raise ValueError(f"Rust parser error in {path.relative_to(root)}")

        relative = path.relative_to(root).as_posix()
        test_index = 0

        def visit(parent, ancestor_context: bytes = b"") -> None:
            nonlocal test_index
            attributes = []
            for node in parent.named_children:
                if node.type == "attribute_item":
                    attributes.append(node)
                    continue

                normalized = [
                    re.sub(rb"\s+", b"", source[item.start_byte : item.end_byte])
                    for item in attributes
                ]
                is_cfg_test = node.type == "mod_item" and any(
                    b"cfg(test)" in item for item in normalized
                )
                is_test_function = node.type == "function_item" and any(
                    item == b"#[test]" or item.endswith(b"::test]")
                    for item in normalized
                )

                if is_cfg_test or is_test_function:
                    start = attributes[0].start_byte
                    data = source[start : node.end_byte]
                    protected = (
                        ancestor_context + b"\0" + data if ancestor_context else data
                    )
                    kind = "rust-cfg-test" if is_cfg_test else "rust-test-function"
                    artifacts.append(
                        Artifact(
                            kind,
                            f"{relative}#{test_index}",
                            "inline",
                            len(protected),
                            sha256(protected),
                        )
                    )
                    test_index += 1
                else:
                    context = ancestor_context
                    if node.type == "mod_item":
                        body = node.child_by_field_name("body")
                        if body is not None:
                            start = attributes[0].start_byte if attributes else node.start_byte
                            header = source[start : body.start_byte]
                            context = (
                                ancestor_context + b"\0" + header
                                if ancestor_context
                                else header
                            )
                    visit(node, context)

                attributes = []

        visit(tree.root_node)

    return artifacts


def discover(root: Path = ROOT) -> list[Artifact]:
    artifacts = [file_artifact(root, path) for path in product_test_files(root)]
    artifacts.extend(rust_test_modules(root))
    return sorted(artifacts, key=lambda artifact: (artifact.kind, artifact.path))


def aggregate(artifacts: list[Artifact]) -> str:
    counts = Counter(artifact.identity for artifact in artifacts)
    payload = json.dumps(
        sorted((*identity, count) for identity, count in counts.items()),
        separators=(",", ":"),
    ).encode()
    return sha256(payload)


def write_manifest(artifacts: list[Artifact], path: Path = MANIFEST) -> None:
    payload = {
        "version": 1,
        "artifact_count": len(artifacts),
        "aggregate_sha256": aggregate(artifacts),
        "artifacts": [asdict(artifact) for artifact in artifacts],
    }
    path.write_text(json.dumps(payload, indent=2) + "\n")


def load_manifest(path: Path = MANIFEST) -> tuple[dict, list[Artifact]]:
    payload = json.loads(path.read_text())
    if payload.get("version") != 1:
        raise ValueError(f"Unsupported manifest version: {payload.get('version')}")
    return payload, [Artifact(**artifact) for artifact in payload["artifacts"]]


def verify(current: list[Artifact], expected: list[Artifact]) -> list[str]:
    errors = []
    current_counts = Counter(artifact.identity for artifact in current)
    expected_counts = Counter(artifact.identity for artifact in expected)

    for identity, count in sorted((expected_counts - current_counts).items()):
        matches = [artifact.path for artifact in expected if artifact.identity == identity]
        errors.append(f"missing or changed ({count}): {', '.join(matches)}")

    for identity, count in sorted((current_counts - expected_counts).items()):
        matches = [artifact.path for artifact in current if artifact.identity == identity]
        errors.append(f"new, changed, or duplicated ({count}): {', '.join(matches)}")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--manifest", type=Path, default=MANIFEST)
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        return subprocess.run(
            [sys.executable, str(Path(__file__).with_name("self_test.py"))],
            check=False,
        ).returncode

    try:
        root = args.root.resolve()
        current = discover(root)
        if args.write:
            write_manifest(current, args.manifest)
            print(f"Wrote {args.manifest} with {len(current)} artifacts.")
            return 0

        payload, expected = load_manifest(args.manifest)
        errors = verify(current, expected)
        if aggregate(expected) != payload["aggregate_sha256"]:
            errors.append("baseline aggregate does not match its artifact records")
        if len(expected) != payload["artifact_count"]:
            errors.append("baseline artifact count does not match its artifact records")
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError) as error:
        print(f"test-integrity: {error}", file=sys.stderr)
        return 1

    if errors:
        for error in errors:
            print(f"test-integrity: {error}", file=sys.stderr)
        return 1

    print(f"Test integrity verified: {len(current)} immutable artifacts.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
