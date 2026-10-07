#!/usr/bin/env bash
# Run Bash-granting Claude evals around this macOS host's sandbox limitations.
# The eval sandbox examines ~/.docker even when DOCKER_CONFIG points elsewhere.
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "Usage: bash evals/with-bash-eval-environment.sh <eval command> [args...]" >&2
  exit 64
fi

docker_root="${HOME:?}/.docker"
docker_backup="${HOME}/.docker.claude-eval-backup"
temporary_docker=''
docker_swapped=0
temporary_git=''
source_git='/Library/Developer/CommandLineTools/usr/bin/git'

restore_environment() {
  result=$?
  trap - EXIT

  if [ "$docker_swapped" -eq 1 ]; then
    if [ -L "$docker_root" ] && [ "$(readlink "$docker_root")" = "$temporary_docker" ]; then
      unlink "$docker_root"
    elif [ -e "$docker_root" ] || [ -L "$docker_root" ]; then
      echo "ERROR: $docker_root changed during the eval; original is at $docker_backup." >&2
      result=70
    fi
    if [ ! -e "$docker_root" ] && [ ! -L "$docker_root" ] && [ -d "$docker_backup" ]; then
      mv "$docker_backup" "$docker_root"
      echo "Docker configuration restored."
    fi
  fi

  if [ -n "$temporary_git" ]; then
    if [ -f "$temporary_git" ] && cmp -s "$temporary_git" "$source_git"; then
      unlink "$temporary_git"
      echo "Temporary Git binary removed."
    else
      echo "ERROR: $temporary_git changed during the eval; inspect it before removal." >&2
      result=70
    fi
  fi

  if [ -n "$temporary_docker" ] && [ -d "$temporary_docker" ]; then
    if [ -f "$temporary_docker/config.json" ]; then
      unlink "$temporary_docker/config.json"
    fi
    rmdir "$temporary_docker" || {
      echo "Temporary Docker directory is not empty: $temporary_docker" >&2
      result=70
    }
  fi

  exit "$result"
}

trap restore_environment EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

if [ -e "$docker_backup" ] || [ -L "$docker_backup" ]; then
  echo "Refusing to run: Docker backup already exists at $docker_backup. Restore or inspect it first." >&2
  exit 69
fi

if [ -d "$docker_root" ] && [ ! -L "$docker_root" ] &&
   [ -n "$(find "$docker_root" -type l -print -quit)" ]; then
  if pgrep -f '(/Applications/Docker.app/|com[.]docker[.]backend)' >/dev/null 2>&1; then
    echo "Quit Docker Desktop before running Bash-granting evals; it may read ~/.docker during the temporary swap." >&2
    exit 69
  fi
  temporary_docker=$(mktemp -d /private/tmp/claude-eval-docker.XXXXXX)
  printf '{}\n' > "$temporary_docker/config.json"
  mv "$docker_root" "$docker_backup"
  docker_swapped=1
  ln -s "$temporary_docker" "$docker_root"
  export DOCKER_CONFIG="$temporary_docker"
  echo "Temporarily isolated Docker configuration for the eval."
fi

# /usr/bin/git is an xcrun shim on macOS. Inside Claude's eval sandbox its
# cache directory is unwritable; a direct binary at an existing PATH entry works.
if [ "$(uname -s)" = 'Darwin' ] && [ "$(command -v git || true)" = '/usr/bin/git' ] &&
   [ -f "$source_git" ]; then
  direct_git='/opt/homebrew/bin/git'
  if [ ! -e "$direct_git" ] && [ ! -L "$direct_git" ] &&
     [ -d '/opt/homebrew/bin' ]; then
    cp "$source_git" "$direct_git"
    temporary_git="$direct_git"
    chmod 755 "$direct_git"
    echo "Temporarily installed direct Git binary for the eval sandbox."
  fi
fi

"$@"
