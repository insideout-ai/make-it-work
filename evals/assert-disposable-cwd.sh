#!/usr/bin/env bash
# Source this before a fixture copies files or changes Git state.
eval_plugin_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
eval_fixture_cwd="$(pwd -P)"
case "$eval_fixture_cwd/" in
  /tmp/*|/private/tmp/*|/var/folders/*|/private/var/folders/*) ;;
  *)
    echo "fixture.sh: refusing to seed outside a temporary directory: $eval_fixture_cwd" >&2
    exit 1
    ;;
esac
case "$eval_fixture_cwd/" in
  "$eval_plugin_root/"*)
    echo "fixture.sh: refusing to seed inside the plugin checkout: $eval_fixture_cwd" >&2
    echo "fixture.sh: use a disposable directory created with mktemp -d." >&2
    exit 1
    ;;
esac
