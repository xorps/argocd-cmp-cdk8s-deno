<!--
SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
SPDX-License-Identifier: Apache-2.0 OR MIT
-->

# Security

The whole point of this plugin is the sandbox, so escapes are bugs we want to
hear about.

Please don't open a public issue. Use GitHub's
[private vulnerability reporting](https://github.com/xorps/argocd-cmp-cdk8s-deno/security/advisories/new)
instead, and include a repo layout or script that reproduces it. Adding it as a
new case under `test/escape` is the most useful form.

Things that are already known and documented in the README's threat model, such
as a V8 bug giving code execution in the sidecar, aren't new reports on their
own. A working escape through one of them still is.

Only the latest release gets fixes.
