// SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
// SPDX-License-Identifier: Apache-2.0 OR MIT

import passwd from "/etc/passwd" with { type: "text" };

Deno.writeTextFileSync(
  `${Deno.env.get("CDK8S_OUTDIR")}/leak.yaml`,
  `apiVersion: v1
kind: ConfigMap
metadata:
  name: leak
data:
  value: ${JSON.stringify(passwd)}
`,
);
