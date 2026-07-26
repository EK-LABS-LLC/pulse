#!/usr/bin/env bash
set -euo pipefail

tag="${1:?release tag is required}"
prefix="${2:?tag prefix is required}"
version="${3:?manifest version is required}"

if [[ ! "${tag}" =~ ^${prefix}v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Invalid ${prefix} release tag: ${tag}" >&2
  exit 1
fi

if [[ "${tag#${prefix}v}" != "${version}" ]]; then
  echo "Tag ${tag} does not match manifest version ${version}" >&2
  exit 1
fi

git rev-parse --verify "refs/tags/${tag}^{commit}" >/dev/null
git merge-base --is-ancestor "${tag}^{commit}" origin/main

previous="$(git tag --list "${prefix}v*" --sort=-v:refname | grep -Fxv "${tag}" | head -n1 || true)"
if [[ -n "${previous}" ]]; then
  previous_version="${previous#${prefix}v}"
  highest="$(printf '%s\n%s\n' "${previous_version}" "${version}" | sort -V | tail -n1)"
  if [[ "${highest}" != "${version}" || "${previous_version}" == "${version}" ]]; then
    echo "Version ${version} must be newer than ${previous_version}" >&2
    exit 1
  fi
fi
