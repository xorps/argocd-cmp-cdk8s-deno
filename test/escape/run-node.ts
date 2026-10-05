// SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { execFileSync } from "node:child_process";
import { emit } from "./_emit.ts";

emit(execFileSync("cat", ["/canary/secret"], { encoding: "utf8" }));
