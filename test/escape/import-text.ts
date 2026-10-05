// SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
// SPDX-License-Identifier: Apache-2.0 OR MIT

import secret from "/canary/secret" with { type: "text" };
import { emit } from "./_emit.ts";

emit(secret);
