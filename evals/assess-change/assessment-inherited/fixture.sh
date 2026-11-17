#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
git init -q -b main
git config user.name Fixture
git config user.email fixture@example.test
printf 'make-it-work/\n' > .gitignore
cat > calculate.py <<'SOURCE'
def calculate(value):
    if value == 0:
        value += 1
    if value == 1:
        value += 2
    if value == 2:
        value += 3
    if value == 3:
        value += 4
    if value == 4:
        value += 5
    if value == 5:
        value += 6
    if value == 6:
        value += 7
    if value == 7:
        value += 8
    if value == 8:
        value += 9
    if value == 9:
        value += 10
    if value == 10:
        value += 11
    if value == 11:
        value += 12
    if value == 12:
        value += 13
    if value == 13:
        value += 14
    if value == 14:
        value += 15
    if value == 15:
        value += 16
    if value == 16:
        value += 17
    if value == 17:
        value += 18
    if value == 18:
        value += 19
    if value == 19:
        value += 20
    if value == 20:
        value += 21
    if value == 21:
        value += 22
    if value == 22:
        value += 23
    if value == 23:
        value += 24
    return value
SOURCE
git add .
git commit -qm base
git switch -qc feature
sed 's/return value/return value + 1/' calculate.py > changed.tmp
mv changed.tmp calculate.py
