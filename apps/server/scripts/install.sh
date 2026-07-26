#!/usr/bin/env bash
set -euo pipefail

DEFAULT_REPO="EK-LABS-LLC/pulse"
LEGACY_SERVER_REPO="EK-LABS-LLC/trace-service"
LEGACY_CLI_REPO="EK-LABS-LLC/trace-cli"
REPO="${PULSE_REPO:-$DEFAULT_REPO}"
CLI_REPO="${PULSE_CLI_REPO:-$DEFAULT_REPO}"
SERVER_TAG_PREFIX="server-"
CLI_TAG_PREFIX="cli-"
BINARY="pulse-server"
VERSION="${PULSE_VERSION:-latest}"
CLI_VERSION="${PULSE_CLI_VERSION:-latest}"
INSTALL_DIR="${PULSE_INSTALL_DIR:-$HOME/.local/bin}"
INSTALL_CLI=1
REQUESTED_SCALE_MODE=0

usage() {
  cat <<'EOF'
Usage: install.sh [pulse-server|pulse-server-scale] [--version <tag>|latest] [--cli-version <tag>|latest] [--install-dir <path>] [--server-only]

Examples:
  install.sh
  install.sh pulse-server --version v0.1.0
  install.sh pulse-server-scale --version v0.1.0   # compatibility alias
  install.sh pulse-server --cli-version v0.1.0
  install.sh pulse-server --install-dir /usr/local/bin
EOF
}

# Parse install target/options.
while [[ $# -gt 0 ]]; do
  case "$1" in
    pulse-server)
      BINARY="pulse-server"
      shift
      ;;
    pulse-server-scale)
      echo "Argument 'pulse-server-scale' is deprecated. Installing 'pulse-server' and using env-driven scale mode."
      BINARY="pulse-server"
      REQUESTED_SCALE_MODE=1
      shift
      ;;
    pulse)
      echo "Argument 'pulse' is deprecated. Installing 'pulse-server' instead."
      BINARY="pulse-server"
      shift
      ;;
    pulse-scale)
      echo "Argument 'pulse-scale' is deprecated. Installing 'pulse-server' and using env-driven scale mode."
      BINARY="pulse-server"
      REQUESTED_SCALE_MODE=1
      shift
      ;;
    --version)
      if [[ $# -lt 2 ]]; then
        echo "--version requires a value"
        exit 1
      fi
      VERSION="$2"
      shift 2
      ;;
    --cli-version)
      if [[ $# -lt 2 ]]; then
        echo "--cli-version requires a value"
        exit 1
      fi
      CLI_VERSION="$2"
      shift 2
      ;;
    --install-dir)
      if [[ $# -lt 2 ]]; then
        echo "--install-dir requires a value"
        exit 1
      fi
      INSTALL_DIR="$2"
      shift 2
      ;;
    --server-only|--no-cli)
      INSTALL_CLI=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

# Detect host OS/architecture so we pick the right release asset.
case "$(uname -s)" in
  Linux) OS="linux" ;;
  Darwin) OS="darwin" ;;
  *)
    echo "Unsupported operating system: $(uname -s)"
    exit 1
    ;;
esac

case "$(uname -m)" in
  x86_64|amd64) ARCH="amd64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *)
    echo "Unsupported architecture: $(uname -m)"
    exit 1
    ;;
esac

TMP_DIR="$(mktemp -d /tmp/pulse-install.XXXXXX)"
trap 'rm -rf "$TMP_DIR"' EXIT

DASHBOARD_ARCHIVE="pulse-dashboard-assets.tar.gz"
DASHBOARD_DIR="${INSTALL_DIR}/dashboard"
INSTALL_METADATA="${INSTALL_DIR}/.pulse-install.toml"

# Resolve release tag + verify artifact integrity against checksums.
parse_release_page() {
  local response="$1"
  local parsed="$2"

  if command -v jq >/dev/null 2>&1; then
    jq -r '
      if type != "array" or any(.[]; (.tag_name | type) != "string") then
        error("invalid GitHub releases response")
      else
        length, (.[] | .tag_name)
      end
    ' "$response" > "$parsed"
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
' "$response" > "$parsed"
  else
    echo "Resolving the latest release requires jq or python3." >&2
    return 2
  fi
}

fetch_tag() {
  local repo="$1"
  local prefix="$2"
  local page=1
  local response
  local content_type
  local tags
  local tag

  while true; do
    response="${TMP_DIR}/releases-${page}.json"
    if ! content_type="$(curl -fsSL \
      -H "Accept: application/vnd.github+json" \
      -o "$response" \
      -w '%{content_type}' \
      "https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}")"; then
      echo "Failed to query GitHub releases for ${repo}" >&2
      return 2
    fi

    case "$content_type" in
      application/json*) ;;
      *)
        echo "GitHub returned an unexpected response for ${repo}: ${content_type:-unknown content type}" >&2
        return 2
        ;;
    esac

    tags="${TMP_DIR}/release-tags-${page}.txt"
    if ! parse_release_page "$response" "$tags"; then
      echo "GitHub returned invalid release JSON for ${repo}" >&2
      return 2
    fi

    if [[ "$(sed -n '1p' "$tags")" == "0" ]]; then
      return 3
    fi

    tag="$(sed '1d' "$tags" |
      grep "^${prefix}v[0-9][0-9]*\\.[0-9][0-9]*\\.[0-9][0-9]*$" |
      head -n1 || true)"
    if [[ -n "$tag" ]]; then
      printf '%s\n' "$tag"
      return 0
    fi

    page=$((page + 1))
  done
}

sha256_file() {
  local path="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$path" | awk '{print $1}'
    return
  fi
  shasum -a 256 "$path" | awk '{print $1}'
}

if [[ "$VERSION" == "latest" ]]; then
  SERVER_LOOKUP_PREFIX="$SERVER_TAG_PREFIX"
  if [[ "$REPO" == "$LEGACY_SERVER_REPO" ]]; then
    SERVER_LOOKUP_PREFIX=""
  fi
  if TAG="$(fetch_tag "$REPO" "$SERVER_LOOKUP_PREFIX")"; then
    :
  else
    LOOKUP_STATUS=$?
    if [[ "$LOOKUP_STATUS" == "3" && "$REPO" == "$DEFAULT_REPO" ]]; then
      REPO="$LEGACY_SERVER_REPO"
      if TAG="$(fetch_tag "$REPO" "")"; then
        :
      else
        LOOKUP_STATUS=$?
        if [[ "$LOOKUP_STATUS" == "3" ]]; then
          echo "No release tag found for ${REPO}" >&2
        fi
        exit 1
      fi
    elif [[ "$LOOKUP_STATUS" == "3" ]]; then
      echo "No matching release tag found for ${REPO}" >&2
      exit 1
    else
      exit 1
    fi
  fi
  if [[ -z "$TAG" ]]; then
    echo "Could not resolve latest release tag from ${REPO}"
    exit 1
  fi
else
  TAG="$VERSION"
  if [[ "$TAG" == v* && "$REPO" == "$DEFAULT_REPO" ]]; then
    REPO="$LEGACY_SERVER_REPO"
  fi
fi

# Download + verify server binary (supports new and legacy asset names).
BASE_URL="https://github.com/${REPO}/releases/download/${TAG}"
CHECKSUM_URL="${BASE_URL}/checksums.txt"
curl -fL "$CHECKSUM_URL" -o "${TMP_DIR}/checksums.txt"
ASSET_CANDIDATES=("pulse-server-${OS}-${ARCH}")
if [[ "$REQUESTED_SCALE_MODE" == "1" ]]; then
  ASSET_CANDIDATES+=("pulse-server-scale-${OS}-${ARCH}")
  ASSET_CANDIDATES+=("pulse-scale-${OS}-${ARCH}")
else
  ASSET_CANDIDATES+=("pulse-${OS}-${ARCH}")
fi

DOWNLOADED_ASSET=""
for CANDIDATE in "${ASSET_CANDIDATES[@]}"; do
  BINARY_URL="${BASE_URL}/${CANDIDATE}"
  if curl -fsL "$BINARY_URL" -o "${TMP_DIR}/${CANDIDATE}"; then
    DOWNLOADED_ASSET="${CANDIDATE}"
    break
  fi
done

if [[ -z "$DOWNLOADED_ASSET" ]]; then
  echo "Could not download a release asset for pulse-server (${OS}/${ARCH}) at tag ${TAG}"
  exit 1
fi

echo "Downloaded ${DOWNLOADED_ASSET} (${TAG})"

EXPECTED_HASH="$(awk -v name="${DOWNLOADED_ASSET}" '$2 == name {print $1}' "${TMP_DIR}/checksums.txt")"
if [[ -z "$EXPECTED_HASH" ]]; then
  echo "No checksum entry found for ${DOWNLOADED_ASSET}"
  exit 1
fi

ACTUAL_HASH="$(sha256_file "${TMP_DIR}/${DOWNLOADED_ASSET}")"
if [[ "$EXPECTED_HASH" != "$ACTUAL_HASH" ]]; then
  echo "Checksum mismatch for ${DOWNLOADED_ASSET}"
  echo "Expected: ${EXPECTED_HASH}"
  echo "Actual:   ${ACTUAL_HASH}"
  exit 1
fi

DASHBOARD_URL="${BASE_URL}/${DASHBOARD_ARCHIVE}"
if ! curl -fsL "$DASHBOARD_URL" -o "${TMP_DIR}/${DASHBOARD_ARCHIVE}"; then
  echo "Could not download dashboard assets archive (${DASHBOARD_ARCHIVE}) at tag ${TAG}"
  exit 1
fi

DASHBOARD_EXPECTED_HASH="$(awk -v name="${DASHBOARD_ARCHIVE}" '$2 == name {print $1}' "${TMP_DIR}/checksums.txt")"
if [[ -z "$DASHBOARD_EXPECTED_HASH" ]]; then
  echo "No checksum entry found for ${DASHBOARD_ARCHIVE}"
  exit 1
fi

DASHBOARD_ACTUAL_HASH="$(sha256_file "${TMP_DIR}/${DASHBOARD_ARCHIVE}")"
if [[ "$DASHBOARD_EXPECTED_HASH" != "$DASHBOARD_ACTUAL_HASH" ]]; then
  echo "Checksum mismatch for ${DASHBOARD_ARCHIVE}"
  echo "Expected: ${DASHBOARD_EXPECTED_HASH}"
  echo "Actual:   ${DASHBOARD_ACTUAL_HASH}"
  exit 1
fi

mkdir -p "$INSTALL_DIR"
install -m 0755 "${TMP_DIR}/${DOWNLOADED_ASSET}" "${INSTALL_DIR}/${BINARY}"
rm -rf "$DASHBOARD_DIR"
mkdir -p "$DASHBOARD_DIR"
tar -xzf "${TMP_DIR}/${DASHBOARD_ARCHIVE}" -C "$DASHBOARD_DIR" --strip-components=1
cat > "$INSTALL_METADATA" <<EOF
server_version = "${TAG}"
server_repo = "${REPO}"
dashboard_assets_version = "${TAG}"
EOF

echo "Installed ${BINARY} to ${INSTALL_DIR}/${BINARY}"
echo "Installed dashboard assets to ${DASHBOARD_DIR}"
echo "Wrote install metadata to ${INSTALL_METADATA}"

if [[ "$REQUESTED_SCALE_MODE" == "1" ]]; then
  echo "Scale mode now uses the same binary. Start with:"
  echo "  export PULSE_MODE=scale"
  echo "  export DATABASE_URL='postgresql://pulse:pulse@localhost:5432/pulse'"
  echo "  pulse-server"
fi

# Optionally install the CLI so users have a ready-to-use local setup.
if [[ "$INSTALL_CLI" == "1" ]]; then
  if [[ "$CLI_VERSION" == "latest" ]]; then
    CLI_LOOKUP_PREFIX="$CLI_TAG_PREFIX"
    if [[ "$CLI_REPO" == "$LEGACY_CLI_REPO" ]]; then
      CLI_LOOKUP_PREFIX=""
    fi
    if CLI_TAG="$(fetch_tag "$CLI_REPO" "$CLI_LOOKUP_PREFIX")"; then
      :
    else
      LOOKUP_STATUS=$?
      if [[ "$LOOKUP_STATUS" == "3" && "$CLI_REPO" == "$DEFAULT_REPO" ]]; then
        CLI_REPO="$LEGACY_CLI_REPO"
        if CLI_TAG="$(fetch_tag "$CLI_REPO" "")"; then
          :
        else
          LOOKUP_STATUS=$?
          if [[ "$LOOKUP_STATUS" == "3" ]]; then
            echo "No release tag found for ${CLI_REPO}" >&2
          fi
          exit 1
        fi
      elif [[ "$LOOKUP_STATUS" == "3" ]]; then
        echo "No matching release tag found for ${CLI_REPO}" >&2
        exit 1
      else
        exit 1
      fi
    fi
    echo "Installing pulse CLI (latest)..."
  else
    CLI_TAG="$CLI_VERSION"
    if [[ "$CLI_TAG" == v* && "$CLI_REPO" == "$DEFAULT_REPO" ]]; then
      CLI_REPO="$LEGACY_CLI_REPO"
    fi
    echo "Installing pulse CLI (${CLI_VERSION})..."
  fi
  if [[ "$CLI_REPO" == "$DEFAULT_REPO" ]]; then
    CLI_INSTALL_PATH="crates/pulse-cli/install.sh"
  else
    CLI_INSTALL_PATH="install.sh"
  fi
  CLI_INSTALL_SCRIPT_URL="https://raw.githubusercontent.com/${CLI_REPO}/${CLI_TAG}/${CLI_INSTALL_PATH}"
  curl -fsSL "$CLI_INSTALL_SCRIPT_URL" |
    PULSE_REPO="$CLI_REPO" PULSE_INSTALL_DIR="$INSTALL_DIR" PULSE_VERSION="$CLI_TAG" sh
fi

if [[ ":${PATH}:" != *":${INSTALL_DIR}:"* ]]; then
  echo "Add ${INSTALL_DIR} to PATH:"
  echo "  export PATH=\"${INSTALL_DIR}:\$PATH\""
fi
