// SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { Chart } from "cdk8s";
import type { Construct } from "constructs";
import * as kplus from "cdk8s-plus-34";
import type { Params } from "../params.ts";

export class WebChart extends Chart {
  constructor(scope: Construct, p: Params) {
    super(scope, p.name, {
      namespace: p.namespace,
      labels: { "app.kubernetes.io/name": p.name },
      disableResourceNameHashes: true,
    });

    const deploy = new kplus.Deployment(this, "deployment", {
      metadata: { name: p.name },
      replicas: p.replicas,
    });

    const container = deploy.addContainer({
      image: p.image,
      args: p.args,
      portNumber: p.port,
    });

    if (Object.keys(p.env).length > 0) {
      const config = new kplus.ConfigMap(this, "env", {
        metadata: { name: `${p.name}-env` },
        data: p.env,
      });
      container.env.copyFrom(kplus.Env.fromConfigMap(config));
    }

    const svc = deploy.exposeViaService({
      name: p.name,
      ports: [{ port: 80, targetPort: p.port }],
    });

    if (p.host) {
      const ingress = new kplus.Ingress(this, "ingress", {
        metadata: { name: p.name },
      });
      ingress.addHostDefaultBackend(
        p.host,
        kplus.IngressBackend.fromService(svc),
      );
    }
  }
}
