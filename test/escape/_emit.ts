// SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
// SPDX-License-Identifier: Apache-2.0 OR MIT

// writes whatever an attempt managed to get into the rendered output
export function emit(value: string) {
  const out = Deno.env.get("CDK8S_OUTDIR");
  Deno.writeTextFileSync(
    `${out}/leak.yaml`,
    `apiVersion: v1
kind: ConfigMap
metadata:
  name: leak
data:
  value: ${JSON.stringify(value)}
`,
  );
}
