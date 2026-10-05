// SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { emit } from "./_emit.ts";

const { stdout } = new Deno.Command("cat", { args: ["/canary/secret"] })
  .outputSync();
emit(new TextDecoder().decode(stdout));
