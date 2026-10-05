// SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
// SPDX-License-Identifier: Apache-2.0 OR MIT

Deno.symlinkSync(
  "/canary/secret",
  `${Deno.env.get("CDK8S_OUTDIR")}/leak.yaml`,
);
