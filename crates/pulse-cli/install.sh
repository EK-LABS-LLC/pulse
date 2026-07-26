#!/bin/sh
set -e

DEFAULT_REPO="EK-LABS-LLC/pulse"
LEGACY_REPO="EK-LABS-LLC/trace-cli"
REPO="${PULSE_REPO:-$DEFAULT_REPO}"
TAG_PREFIX="cli-"
BINARY_NAME="pulse"
INSTALL_DIR="${PULSE_INSTALL_DIR:-$HOME/.local/bin}"

# --- helpers ---

info() {
  printf '  \033[1;34m>\033[0m %s\n' "$1"
}

ok() {
  printf '  \033[1;32m✓\033[0m %s\n' "$1"
}

err() {
  printf '  \033[1;31m✗\033[0m %s\n' "$1" >&2
  exit 1
}

# --- detect platform ---

detect_os() {
  case "$(uname -s)" in
    Linux*)  echo "linux" ;;
    Darwin*) echo "darwin" ;;
    *)       err "Unsupported OS: $(uname -s). Pulse supports Linux and macOS." ;;
  esac
}

detect_arch() {
  case "$(uname -m)" in
    x86_64|amd64)  echo "amd64" ;;
    aarch64|arm64)  echo "arm64" ;;
    *)              err "Unsupported architecture: $(uname -m). Pulse supports x86_64 and arm64." ;;
  esac
}

# --- resolve version ---

parse_release_page() {
  response_file="$1"
  parsed_file="$2"

  if command -v jq >/dev/null 2>&1; then
    jq -r '
      if type != "array" or any(.[]; (.tag_name | type) != "string") then
        error("invalid GitHub releases response")
      else
        length, (.[] | .tag_name)
      end
    ' "$response_file" > "$parsed_file"
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c '
import json, sys
with open(sys.argv[1], encoding="utf-8") as source:
    releases = json.load(source)
if not isinstance(releases, list) or any(
    not isinstance(release, dict) or not isinstance(release.get("tag_name"), str)
    for release in releases
):
    raise ValueError("invalid GitHub releases response")
print(len(releases))
for release in releases:
    print(release["tag_name"])
' "$response_file" > "$parsed_file"
  else
    printf 'Resolving the latest release requires jq or python3.\n' >&2
    return 2
  fi
}

fetch_latest_tag() {
  repo="$1"
  tag_pattern="$2"
  page=1

  while true; do
    response="${TMPDIR}/releases-${page}.json"
    if ! content_type=$(curl -fsSL \
      -H "Accept: application/vnd.github+json" \
      -o "$response" \
      -w '%{content_type}' \
      "https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}"); then
      printf 'GitHub release lookup failed for %s\n' "$repo" >&2
      return 2
    fi

    case "$content_type" in
      application/json*) ;;
      *)
        printf 'GitHub returned an unexpected response for %s: %s\n' \
          "$repo" "${content_type:-unknown content type}" >&2
        return 2
        ;;
    esac

    parsed="${TMPDIR}/release-tags-${page}.txt"
    if ! parse_release_page "$response" "$parsed"; then
      printf 'GitHub returned invalid release JSON for %s\n' "$repo" >&2
      return 2
    fi

    release_count=$(sed -n '1p' "$parsed")
    if [ "$release_count" -eq 0 ]; then
      return 3
    fi

    tags="${TMPDIR}/release-tags-${page}.txt"
    latest=$(sed '1d' "$tags" |
      grep "$tag_pattern" |
      head -n1 || true)
    if [ -n "$latest" ]; then
      printf '%s\n' "$latest"
      return 0
    fi

    page=$((page + 1))
  done
}

resolve_version() {
  if [ -n "$PULSE_VERSION" ]; then
    case "$PULSE_VERSION" in
      cli-v*) VERSION="$PULSE_VERSION" ;;
      v*)
        if [ "$REPO" = "$DEFAULT_REPO" ]; then
          REPO="$LEGACY_REPO"
        fi
        VERSION="$PULSE_VERSION"
        ;;
      *) VERSION="$PULSE_VERSION" ;;
    esac
    return
  fi

  if [ "$REPO" = "$LEGACY_REPO" ]; then
    tag_pattern="^v[0-9][0-9]*\\.[0-9][0-9]*\\.[0-9][0-9]*$"
  else
    tag_pattern="^${TAG_PREFIX}v[0-9][0-9]*\\.[0-9][0-9]*\\.[0-9][0-9]*$"
  fi

  if latest=$(fetch_latest_tag "$REPO" "$tag_pattern"); then
    :
  else
    lookup_status=$?
    if [ "$lookup_status" -eq 3 ] && [ "$REPO" = "$DEFAULT_REPO" ]; then
      REPO="$LEGACY_REPO"
      if latest=$(fetch_latest_tag "$REPO" \
        "^v[0-9][0-9]*\\.[0-9][0-9]*\\.[0-9][0-9]*$"); then
        :
      else
        lookup_status=$?
        if [ "$lookup_status" -eq 3 ]; then
          err "No legacy release is available from ${REPO}."
        fi
        err "Could not query GitHub releases for ${REPO}."
      fi
    elif [ "$lookup_status" -eq 3 ]; then
      err "No matching release is available from ${REPO}."
    else
      err "Could not query GitHub releases for ${REPO}."
    fi
  fi

  if [ -z "$latest" ]; then
    err "Could not determine latest version. Set PULSE_VERSION=cli-vX.Y.Z to install a specific version."
  fi

  VERSION="$latest"
}

# --- main ---

main() {
  printf '\n\033[1mpulse installer\033[0m\n\n'

  OS=$(detect_os)
  ARCH=$(detect_arch)
  TMPDIR=$(mktemp -d)
  trap 'rm -rf "$TMPDIR"' EXIT
  resolve_version
  ARTIFACT="${BINARY_NAME}-${OS}-${ARCH}"

  info "Version:  ${VERSION}"
  info "Platform: ${OS}/${ARCH}"
  info "Target:   ${INSTALL_DIR}/${BINARY_NAME}"
  echo ""

  # download
  URL="https://github.com/${REPO}/releases/download/${VERSION}/${ARTIFACT}.tar.gz"
  info "Downloading ${URL}"

  if ! curl -fsSL "$URL" -o "${TMPDIR}/${ARTIFACT}.tar.gz"; then
    err "Download failed. Check that version ${VERSION} exists and has a ${OS}/${ARCH} binary."
  fi

  # extract
  tar xzf "${TMPDIR}/${ARTIFACT}.tar.gz" -C "$TMPDIR"

  # install
  mkdir -p "$INSTALL_DIR"
  mv "${TMPDIR}/${ARTIFACT}" "${INSTALL_DIR}/${BINARY_NAME}"
  chmod +x "${INSTALL_DIR}/${BINARY_NAME}"

  ok "Installed pulse ${VERSION} to ${INSTALL_DIR}/${BINARY_NAME}"
  echo ""

  # check PATH
  case ":$PATH:" in
    *":${INSTALL_DIR}:"*) ;;
    *)
      printf '  \033[1;33m!\033[0m %s is not in your PATH. Add it:\n' "$INSTALL_DIR"
      echo ""
      echo "    export PATH=\"${INSTALL_DIR}:\$PATH\""
      echo ""
      echo "  Add that line to your ~/.bashrc or ~/.zshrc to make it permanent."
      echo ""
      ;;
  esac

  # quick start
  printf '  \033[1mGet started:\033[0m\n'
  echo ""
  echo "    pulse connect       # connect to a remote/shared Pulse instance"
  echo "    pulse status        # verify setup"
  echo ""
  echo "  Or for a local managed Pulse install:"
  echo ""
  echo "    pulse up"
  echo "    pulse dashboard"
  echo "    pulse status"
  echo ""
}

main
