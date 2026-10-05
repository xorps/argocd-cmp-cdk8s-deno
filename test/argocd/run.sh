#!/bin/sh
# SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
# SPDX-License-Identifier: Apache-2.0 OR MIT

# Installs argo cd with the plugin into an existing kind cluster and checks
# that real Applications render through it.

set -eu

image="${1:?usage: run.sh IMAGE}"
cluster="${KIND_CLUSTER:-kind}"
root="$(cd "$(dirname "$0")/../.." && pwd)"
here="$root/test/argocd"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

dump() {
  echo "--- applications" >&2
  kubectl -n argocd get applications -o yaml >&2 || true
  echo "--- plugin logs" >&2
  kubectl -n argocd logs deploy/argocd-repo-server -c cdk8s-deno --tail=200 >&2 || true
}

fail() {
  echo "fail: $*" >&2
  dump
  exit 1
}

# wait_for TIMEOUT DESCRIPTION COMMAND...
wait_for() {
  limit="$1"
  what="$2"
  shift 2
  i=0
  until "$@" >/dev/null 2>&1; do
    i=$((i + 5))
    [ "$i" -ge "$limit" ] && fail "timed out waiting for $what"
    sleep 5
  done
}

# snapshot the working tree, uncommitted changes included. argo refuses repos
# with out-of-bounds symlinks outright, so the symlink fixtures stay behind.
mkdir "$work/tree"
(cd "$root" && git ls-files -co --exclude-standard -z -- . ':!test/escape-symlink' |
  xargs -0 tar -cf - --no-recursion) |
  tar -xf - -C "$work/tree"
git -C "$work/tree" init -q -b main
git -C "$work/tree" add -A
git -C "$work/tree" -c user.name=e2e -c user.email=e2e@localhost commit -qm snapshot
git clone -q --bare "$work/tree" "$work/repo.git"
touch "$work/repo.git/git-daemon-export-ok"

cat >"$work/Dockerfile" <<'DOCKERFILE'
FROM alpine:3.22
RUN apk add --no-cache git-daemon
COPY --chown=1000:1000 repo.git /srv/repo.git
USER 1000
CMD ["git", "daemon", "--reuseaddr", "--base-path=/srv", "/srv"]
DOCKERFILE
docker build -q -t e2e-git:test "$work" >/dev/null

if [ "$image" != cmp:test ]; then
  docker tag "$image" cmp:test
fi
kind load docker-image --name "$cluster" cmp:test e2e-git:test

kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply --server-side --force-conflicts -k "$here" >/dev/null
kubectl -n argocd rollout status deploy/argocd-repo-server --timeout=300s
kubectl -n argocd rollout status deploy/git --timeout=120s
kubectl -n argocd rollout status statefulset/argocd-application-controller --timeout=300s

kubectl wait --for condition=established --timeout=60s \
  crd/applications.argoproj.io crd/appprojects.argoproj.io >/dev/null
kubectl apply -f "$here/project.yaml" -f "$here/apps.yaml" >/dev/null

synced() {
  [ "$(kubectl -n argocd get application "$1" -o jsonpath='{.status.sync.status}')" = Synced ]
}
for app in basic shop monorepo; do
  wait_for 300 "$app to sync" synced "$app"
  echo "ok: $app synced"
done

[ "$(kubectl -n e2e-basic get deploy -o name | wc -l)" -eq 1 ] ||
  fail "basic should have one deployment"
echo "ok: basic resources"

[ "$(kubectl -n e2e-shop get deploy shop -o jsonpath='{.spec.replicas}')" = 3 ] ||
  fail "shop should have 3 replicas"
[ "$(kubectl -n e2e-shop get ingress shop -o jsonpath='{.spec.rules[0].host}')" = shop.example.com ] ||
  fail "shop ingress host"
[ "$(kubectl -n e2e-shop get configmap shop-env -o jsonpath='{.data.LOG_LEVEL}')" = info ] ||
  fail "shop env configmap"
[ "$(kubectl -n e2e-shop get deploy shop -o jsonpath='{.metadata.namespace}')" = e2e-shop ] ||
  fail "shop namespace"
echo "ok: shop parameters made it through"

[ -n "$(kubectl -n e2e-monorepo get configmap -l app.kubernetes.io/part-of=monorepo -o name)" ] ||
  fail "monorepo configmap with shared labels"
echo "ok: monorepo shared import"

refused() {
  kubectl -n argocd get application escape -o jsonpath='{.status.conditions[*].message}' |
    grep -q 'refusing to render'
}
settled() { refused || synced escape; }
wait_for 300 "escape to settle" settled
refused || fail "escape app synced, the preflight let /etc/passwd through"
echo "ok: escape refused by preflight"
