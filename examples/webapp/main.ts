// SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { App } from "cdk8s";
import { WebChart } from "./charts/web.ts";
import { loadParams } from "./params.ts";

const app = new App();
new WebChart(app, loadParams());
app.synth();
