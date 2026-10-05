// SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { emit } from "./_emit.ts";

const path = ["./canary", "link"].join("-");
const mod = await import(path, { with: { type: "text" } });
emit(mod.default);
