// SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { emit } from "./_emit.ts";

Deno.dlopen("libc.so.6", { getpid: { parameters: [], result: "i32" } });
emit("ESCAPED");
