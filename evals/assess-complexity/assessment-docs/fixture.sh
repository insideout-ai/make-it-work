#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
git init -q -b main
git config user.name Fixture
git config user.email fixture@example.test
printf 'make-it-work/\n' > .gitignore
printf '# Example\n\nThis is a local example.\n' > README.md
git add .
git commit -qm base
git switch -qc feature
printf '\nSpelling and onboarding prose clarified.\n' >> README.md
