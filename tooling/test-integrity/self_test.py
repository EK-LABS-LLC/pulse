#!/usr/bin/env python3

import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

sys.dont_write_bytecode = True

SCRIPT = Path(__file__).with_name("check.py")
SPEC = importlib.util.spec_from_file_location("test_integrity", SCRIPT)
assert SPEC and SPEC.loader
test_integrity = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = test_integrity
SPEC.loader.exec_module(test_integrity)
Artifact = test_integrity.Artifact


class VerifyTests(unittest.TestCase):
    def test_accepts_moves(self) -> None:
        before = [Artifact("file", "old", "100644", 3, "abc")]
        after = [Artifact("file", "new", "100644", 3, "abc")]
        self.assertEqual(test_integrity.verify(after, before), [])

    def test_rejects_edits(self) -> None:
        before = [Artifact("file", "test", "100644", 3, "abc")]
        after = [Artifact("file", "test", "100644", 3, "def")]
        self.assertEqual(len(test_integrity.verify(after, before)), 2)

    def test_rejects_duplicates(self) -> None:
        before = [Artifact("file", "test", "100644", 3, "abc")]
        after = before + [Artifact("file", "copy", "100644", 3, "abc")]
        self.assertEqual(len(test_integrity.verify(after, before)), 1)

    def test_extracts_cfg_test_module(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "crates/pulse-cli/src/lib.rs"
            source.parent.mkdir(parents=True)
            source.write_text("#[cfg(test)]\nmod tests {\n    #[test]\n    fn works() {}\n}\n")
            artifacts = test_integrity.rust_test_modules(root)
        self.assertEqual(len(artifacts), 1)
        self.assertEqual(artifacts[0].kind, "rust-cfg-test")

    def test_extracts_nested_cfg_test_module(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "crates/pulse-cli/src/lib.rs"
            source.parent.mkdir(parents=True)
            source.write_text(
                "mod outer {\n"
                "    #[cfg(test)]\n"
                "    mod tests {\n"
                "        #[test]\n"
                "        fn works() {}\n"
                "    }\n"
                "}\n"
            )
            artifacts = test_integrity.rust_test_modules(root)
        self.assertEqual(len(artifacts), 1)
        self.assertEqual(artifacts[0].kind, "rust-cfg-test")

    def test_extracts_root_test_function(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "crates/pulse-cli/src/lib.rs"
            source.parent.mkdir(parents=True)
            source.write_text("#[test]\nfn works() {}\n")
            artifacts = test_integrity.rust_test_modules(root)
        self.assertEqual(len(artifacts), 1)
        self.assertEqual(artifacts[0].kind, "rust-test-function")

    def test_runner_class_changes_for_uncollectable_move(self) -> None:
        before = [
            Artifact(
                "server-bun-test",
                "apps/server/tests/example.test.ts",
                "100644",
                3,
                "abc",
            )
        ]
        after = [
            Artifact(
                "server-uncollected",
                "apps/server/tests/example.txt",
                "100644",
                3,
                "abc",
            )
        ]
        self.assertEqual(len(test_integrity.verify(after, before)), 2)

    def test_rejects_bun_excluded_move(self) -> None:
        self.assertEqual(
            test_integrity.test_file_kind(
                Path("apps/server/node_modules/example.test.ts")
            ),
            "uncollected",
        )

    def test_rejects_inline_rust_test_move(self) -> None:
        before = [Artifact("rust-cfg-test", "src/lib.rs#0", "inline", 3, "abc")]
        after = [Artifact("rust-cfg-test", "src/unused.rs#0", "inline", 3, "abc")]
        self.assertEqual(len(test_integrity.verify(after, before)), 2)

    def test_rejects_disabled_rust_ancestor(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "crates/pulse-cli/src/lib.rs"
            source.parent.mkdir(parents=True)
            test_module = "#[cfg(test)]\nmod tests {\n    #[test]\n    fn works() {}\n}\n"
            source.write_text(test_module)
            before = test_integrity.rust_test_modules(root)
            source.write_text("#[cfg(any())]\nmod dormant {\n" + test_module + "}\n")
            after = test_integrity.rust_test_modules(root)
        self.assertEqual(len(test_integrity.verify(after, before)), 2)

    def test_discovers_runner_configuration(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            config = root / ".cargo/config.toml"
            config.parent.mkdir(parents=True)
            config.write_text('[target."cfg(unix)"]\nrunner = "true"\n')
            self.assertIn(
                Path(".cargo/config.toml"),
                test_integrity.product_test_files(root),
            )
            artifact = test_integrity.file_artifact(root, Path(".cargo/config.toml"))
        self.assertEqual(artifact.kind, "cargo-runner-config")


if __name__ == "__main__":
    unittest.main()
