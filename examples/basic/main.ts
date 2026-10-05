// SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { App, Chart } from "cdk8s";
import * as kplus from "cdk8s-plus-34";

const app = new App();
const chart = new Chart(app, "hello");

const deploy = new kplus.Deployment(chart, "web", {
  replicas: 2,
  containers: [{
    image: "nginxinc/nginx-unprivileged:1.27",
    portNumber: 8080,
  }],
});
deploy.exposeViaService({ ports: [{ port: 80, targetPort: 8080 }] });

app.synth();
