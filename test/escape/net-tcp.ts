// SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { emit } from "./_emit.ts";

const conn = await Deno.connect({ hostname: "1.1.1.1", port: 443 });
conn.close();
emit("ESCAPED");
