// SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
// SPDX-License-Identifier: Apache-2.0 OR MIT

import data from "/canary/data.json" with { type: "json" };
import { emit } from "./_emit.ts";

emit(JSON.stringify(data));
