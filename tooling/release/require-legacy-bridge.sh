#!/usr/bin/env bash
set -euo pipefail

component="${1:?component is required}"
version="${2:?version is required}"

case "${component}" in
  cli)
    prefix="cli-"
    legacy_repo="EK-LABS-LLC/trace-cli"
    assets=(
      pulse-darwin-amd64.tar.gz
      pulse-darwin-arm64.tar.gz
      pulse-linux-amd64.tar.gz
      pulse-linux-arm64.tar.gz
    )
    ;;
  service)
    prefix="service-"
    legacy_repo="EK-LABS-LLC/trace-service"
    assets=(
      checksums.txt
      pulse-dashboard-assets.tar.gz
      pulse-server-darwin-amd64
      pulse-server-darwin-arm64
      pulse-server-linux-amd64
      pulse-server-linux-arm64
    )
    ;;
  *)
    echo "Unsupported component: ${component}" >&2
    exit 1
    ;;
esac

release_count="$(
  gh api "repos/${GITHUB_REPOSITORY}/releases?per_page=100" \
    --jq "[.[] | select(.tag_name | startswith(\"${prefix}v\"))] | length"
)"
if [[ "${release_count}" != "0" ]]; then
  exit 0
fi

legacy_tag="v${version}"
release="$(gh api "repos/${legacy_repo}/releases/tags/${legacy_tag}")"
for asset in "${assets[@]}"; do
  if ! jq -e --arg name "${asset}" 'any(.assets[]; .name == $name)' <<<"${release}" >/dev/null; then
    echo "First ${component} release requires ${legacy_repo}/${legacy_tag} asset ${asset}" >&2
    exit 1
  fi
done

echo "Legacy ${component} bridge verified: ${legacy_repo}/${legacy_tag}."
