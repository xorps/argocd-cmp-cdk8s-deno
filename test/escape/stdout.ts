// SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
// SPDX-License-Identifier: Apache-2.0 OR MIT

console.log("ESCAPED");
Deno.stdout.writeSync(new TextEncoder().encode("ESCAPED\n"));
