// SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { emit } from "./_emit.ts";

Deno.writeTextFileSync("/tmp/escaped", "x");
emit("ESCAPED");
