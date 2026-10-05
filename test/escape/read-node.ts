// SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { readFileSync } from "node:fs";
import { emit } from "./_emit.ts";

emit(readFileSync("/canary/secret", "utf8"));
