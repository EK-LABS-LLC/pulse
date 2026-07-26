#!/usr/bin/env bash
set -euo pipefail

component="${1:?component is required}"
target_version="${2:?version is required}"

if [[ ! "${target_version}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Invalid ${component} version: ${target_version}" >&2
  exit 1
fi

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
  server)
    prefix="server-"
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

current_releases="$(
  gh api --paginate "repos/${GITHUB_REPOSITORY}/releases?per_page=100"
)"
if jq -se --arg prefix "${prefix}" \
  'any(
    .[][];
    (.draft == false) and
    (.prerelease == false) and
    (.tag_name | test("^" + $prefix + "v[0-9]+\\.[0-9]+\\.[0-9]+$"))
  )' \
  <<<"${current_releases}" >/dev/null; then
  exit 0
fi

legacy_releases="$(
  gh api --paginate "repos/${legacy_repo}/releases?per_page=100"
)"
release="$(
  jq -sc '
    [
      .[][] |
      select(.draft == false and .prerelease == false) |
      select(.tag_name | test("^v[0-9]+\\.[0-9]+\\.[0-9]+$")) |
      . + {
        version_parts: (
          .tag_name |
          ltrimstr("v") |
          split(".") |
          map(tonumber)
        )
      }
    ] |
    sort_by(.version_parts) |
    last
  ' <<<"${legacy_releases}"
)"
if [[ "${release}" == "null" ]]; then
  echo "No stable legacy ${component} release found in ${legacy_repo}" >&2
  exit 1
fi

legacy_tag="$(jq -r '.tag_name' <<<"${release}")"
legacy_version="${legacy_tag#v}"
newest_version="$(
  printf '%s\n%s\n' "${legacy_version}" "${target_version}" |
    sort -V |
    tail -n1
)"
if [[ "${newest_version}" != "${target_version}" || "${legacy_version}" == "${target_version}" ]]; then
  echo "First ${component} release must be newer than ${legacy_repo}/${legacy_tag}" >&2
  exit 1
fi

release_id="$(jq -r '.id' <<<"${release}")"
legacy_assets="$(
  gh api --paginate "repos/${legacy_repo}/releases/${release_id}/assets?per_page=100"
)"
for asset in "${assets[@]}"; do
  if ! jq -se --arg name "${asset}" \
    'any(.[][]; .name == $name)' \
    <<<"${legacy_assets}" >/dev/null; then
    echo "First ${component} release requires ${legacy_repo}/${legacy_tag} asset ${asset}" >&2
    exit 1
  fi
done

echo "Legacy ${component} bridge verified: ${legacy_repo}/${legacy_tag} -> ${prefix}v${target_version}."
