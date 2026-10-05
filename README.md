<!--
SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
SPDX-License-Identifier: Apache-2.0 OR MIT
-->

# argocd-cmp-cdk8s-deno

An Argo CD
[config management plugin](https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/)
that renders [cdk8s](https://cdk8s.io) TypeScript apps with Deno, offline and
sandboxed.

The image ships with a pre-populated Deno cache, so nothing is fetched at render
time. Every app runs with:

- `--cached-only --no-remote --frozen` against the lockfile baked into the image
- no network, subprocess, FFI or sys access
- read access to the app's own directory, and write access to a throwaway output
  dir
- an emptied environment that only carries `ARGOCD_APP_*`, `ARGOCD_ENV_*` and
  `KUBE_*`

Deno's read permissions don't cover static imports, and symlinks are checked by
where the link sits rather than where it points. To close both gaps, the plugin
checks the module graph and the app directory before each render and refuses to
run if any import or symlink resolves outside the repo. Imports can come from
anywhere in the repo, so `../../lib` style sharing in a monorepo still works.
The repo root is the working dir minus `ARGOCD_APP_SOURCE_PATH`. Argo CD itself
already rejects repos containing out-of-bounds symlinks, so the symlink check
only matters if you've turned that off.

CI tries to break out of all this on every run. Each script in
[test/escape](test/escape) goes after a canary through a different route (file
reads, imports, symlinks, env, subprocesses, FFI, network, workers) and the
build fails if the canary ever shows up in the output.

## What's in the image

| import          | package                    |
| --------------- | -------------------------- |
| `cdk8s`         | `npm:cdk8s@2.70.108`       |
| `cdk8s-plus-34` | `npm:cdk8s-plus-34@2.0.62` |
| `constructs`    | `npm:constructs@10.8.1`    |

Import them by these bare names. The plugin always uses its own import map and
lockfile, so a `deno.json` in your repo is only for your editor. Everything else
has to be a relative import from inside the repo, which includes whatever
`cdk8s import` generates.

Need another package? Build an image on top of this one with your own
`deno.json` and `deno.lock` and run `deno install --frozen`.

## Install

Needs Argo CD 2.6 or later. [deploy/](deploy/) is a kustomize component that
adds the sidecar to `argocd-repo-server` and hides the service account token
from it. Add it to the kustomization you install Argo CD with:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: argocd
resources:
  - https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
components:
  - https://github.com/xorps/argocd-cmp-cdk8s-deno//deploy?ref=v0.1.0
```

## Use

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: shop
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/example/infra.git
    path: apps/shop
    plugin:
      name: cdk8s-deno
      env:
        - name: CDK8S_MAIN # optional, defaults to main.ts
          value: main.ts
      parameters:
        - name: image
          string: ghcr.io/acme/shop:1.4.2
        - name: replicas
          string: "3"
        - name: args
          array: [--log-format=json]
        - name: env
          map:
            LOG_LEVEL: info
  destination:
    server: https://kubernetes.default.svc
    namespace: shop
```

Call `app.synth()` as usual. The plugin points `CDK8S_OUTDIR` at a temp dir and
hands every YAML file written there back to Argo CD. Anything your app prints
goes to the sidecar's logs, not into the manifests.

Parameters show up as JSON in `ARGOCD_APP_PARAMETERS`, next to the usual
`ARGOCD_APP_NAME`, `ARGOCD_APP_NAMESPACE` and friends. `env` entries become
`ARGOCD_ENV_<name>`.

Examples:

- [examples/basic](examples/basic): a single file, no inputs
- [examples/webapp](examples/webapp): split across files, driven by parameters,
  with an optional ingress and a ConfigMap for env

## Limits

Anything in cdk8s that shells out won't work, because the sandbox can't spawn
processes. That rules out `Helm`, `Include` and `Yaml.load`, even for local
files. Use `cdk8s import` for typed resources, and put plain YAML in its own
source on a multi-source Application.

## Threat model

Point this at repos whose authors you'd already trust to run code. The sandbox
is defense in depth, not a wall between tenants.

Helm templates can't do much by design. Apps here are real programs, held back
only by Deno's permissions and the preflight. A bug in V8 or Deno that slips
past those gives an attacker code running as uid 999 in the sidecar, and from
there they could:

- read the sources of other apps rendering at the same time, since every render
  shares the sidecar's user and `/tmp`
- leave a process behind that tampers with later renders

It can't reach git credentials (repo-server keeps those), the service account
token (if you use the deploy patch), or root. The container runs without
capabilities, with `no-new-privileges` and a read-only root filesystem.

Each render gets a 512 MiB V8 heap, so a greedy app fails on its own instead of
taking the sidecar down with it. There's no CPU cap beyond the sidecar's
`ARGOCD_EXEC_TIMEOUT` (90s by default), and the deploy patch sets a memory limit
on the container as a backstop.

Ideas for tightening this further, none done yet:

- [Landlock](https://docs.kernel.org/userspace-api/landlock.html) around
  `deno run`, so the kernel enforces the filesystem boundary too. Needs Linux
  5.13 or later.
- Mount, network and PID namespaces per render, for example via bubblewrap.
  Default seccomp profiles block creating these in an unprivileged pod, so this
  needs Kubernetes user namespaces (`hostUsers: false`) or a looser profile.
- Running repo-server under [gVisor](https://gvisor.dev) through a
  `RuntimeClass`.
- A JS engine inside WebAssembly instead of V8, which adds a second boundary at
  the cost of Deno and Node compatibility.

## Development

```sh
docker build -t cmp:dev .
test/e2e.sh cmp:dev

# against a real argo cd, needs a kind cluster
kind create cluster
test/argocd/run.sh cmp:dev
```

`test/e2e.sh` runs the plugin straight from docker and covers the escape
attempts. `test/argocd/run.sh` installs Argo CD with the plugin into kind, syncs
the examples from a snapshot of your working tree, and checks that an app
importing a file from outside the repo gets refused.

To bump a dependency, edit `deno.json`, then run `deno install` to refresh
`deno.lock`.

## Security

Found a way out of the sandbox? Please report it privately, see
[SECURITY.md](SECURITY.md).

## License

Licensed under either of

- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE))
- MIT license ([LICENSE-MIT](LICENSE-MIT))

at your option.

Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in this work, as defined in the Apache-2.0 license, shall be dual
licensed as above, without any additional terms or conditions.

Every file carries SPDX headers, and CI checks them with
[reuse](https://reuse.software).
