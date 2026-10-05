// SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { App, Chart } from "cdk8s";
import * as kplus from "cdk8s-plus-34";
import { labels } from "../../lib/labels.ts";

const app = new App();
const chart = new Chart(app, "web", { labels });
new kplus.ConfigMap(chart, "cm", { data: { from: "monorepo" } });
app.synth();
