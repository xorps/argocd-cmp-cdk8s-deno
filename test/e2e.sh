#!/bin/sh
# SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
# SPDX-License-Identifier: Apache-2.0 OR MIT

set -eu

image="${1:?usage: e2e.sh IMAGE}"
root="$(cd "$(dirname "$0")/.." && pwd)"

# things the escape fixtures go after, readable by anyone so only deno's
# sandbox stands in the way
canary="$(mktemp -d)"
trap 'rm -rf "$canary"' EXIT
echo CANARY_FILE >"$canary/secret"
echo '{"s": "CANARY_JSON"}' >"$canary/data.json"
echo 'export default "CANARY_TS";' >"$canary/mod.ts"
chmod 755 "$canary"
chmod 644 "$canary"/*

# run DIR [docker args...]
run() {
  dir="$1"
  shift
  docker run --rm \
    --read-only --tmpfs /tmp \
    --user 999 \
    --cap-drop ALL \
    --security-opt no-new-privileges \
    "$@" \
    -v "$root/$dir:/src:ro" -w /src \
    --entrypoint cmp-generate \
    "$image"
}

expect() {
  echo "$out" | grep -qx -- "$1" || {
    echo "fail: expected line '$1'" >&2
    echo "$out" >&2
    exit 1
  }
}

out="$(run examples/basic --network none)"
expect 'kind: Deployment'
expect 'kind: Service'
echo "ok: basic"

params='[
  {"name": "image", "string": "ghcr.io/acme/shop:1.4.2"},
  {"name": "replicas", "string": "3"},
  {"name": "host", "string": "shop.example.com"},
  {"name": "args", "array": ["--log-format=json"]},
  {"name": "env", "map": {"LOG_LEVEL": "info"}}
]'
out="$(run examples/webapp --network none \
  -e ARGOCD_APP_NAME=shop \
  -e ARGOCD_APP_NAMESPACE=shop \
  -e ARGOCD_APP_PARAMETERS="$params")"
expect '  replicas: 3'
expect '  namespace: shop'
expect 'kind: Ingress'
expect '    - host: shop.example.com'
expect '  LOG_LEVEL: info'
echo "ok: webapp"

# with networking on, nothing should even try to fetch
log="$(run examples/webapp \
  -e ARGOCD_APP_PARAMETERS='[{"name": "image", "string": "x"}]' 2>&1 >/dev/null)"
if [ -n "$log" ]; then
  echo "fail: render wrote to stderr, expected silence" >&2
  echo "$log" >&2
  exit 1
fi
echo "ok: webapp renders without fetching"

if run examples/webapp --network none >/dev/null 2>&1; then
  echo "fail: webapp should require the image parameter" >&2
  exit 1
fi
echo "ok: webapp without image rejected"

monorepo() {
  docker run --rm --network none \
    --read-only --tmpfs /tmp \
    --user 999 \
    "$@" \
    -v "$root/test/monorepo:/repo:ro" -w /repo/apps/web \
    --entrypoint cmp-generate \
    "$image"
}
out="$(monorepo -e ARGOCD_APP_SOURCE_PATH=apps/web)"
expect '    app.kubernetes.io/part-of: monorepo'
echo "ok: monorepo import from repo root"

if monorepo >/dev/null 2>&1; then
  echo "fail: import above the app dir allowed without a source path" >&2
  exit 1
fi
echo "ok: monorepo import blocked without source path"

# escapes run with networking on, so deno's sandbox is the only thing in the way
attempt() {
  dir="$1"
  file="$2"
  out="$(run "$dir" \
    -v "$canary:/canary:ro" \
    -e CANARY=CANARY_ENV \
    -e ARGOCD_ENV_CDK8S_MAIN="$file" 2>/dev/null || true)"
}

attempt test/escape control.ts
expect '  value: "CONTROL_OK"'
echo "ok: escape harness"

failed=0
for f in "$root"/test/escape/[!_]*.ts "$root"/test/escape-symlink/[!_]*.ts; do
  dir="${f%/*}"
  dir="${dir#"$root"/}"
  name="${f##*/}"
  [ "$name" = control.ts ] && continue
  attempt "$dir" "$name"
  if echo "$out" | grep -qE 'CANARY_|ESCAPED'; then
    echo "FAIL: $dir/$name"
    echo "$out" | grep -E 'CANARY_|ESCAPED' | sed 's/^/    /'
    failed=1
  else
    echo "ok: $dir/$name"
  fi
done
exit "$failed"
