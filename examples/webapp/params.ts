// SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
// SPDX-License-Identifier: Apache-2.0 OR MIT

// argo passes plugin parameters as a JSON list in ARGOCD_APP_PARAMETERS, e.g.
// [{"name":"image","string":"nginx"},{"name":"args","array":["-v"]}]
interface RawParam {
  name: string;
  string?: string;
  array?: string[];
  map?: Record<string, string>;
}

export interface Params {
  name: string;
  namespace?: string;
  image: string;
  replicas: number;
  port: number;
  host?: string;
  args: string[];
  env: Record<string, string>;
}

export function loadParams(): Params {
  const raw: RawParam[] = JSON.parse(
    Deno.env.get("ARGOCD_APP_PARAMETERS") ?? "[]",
  );
  const params = new Map(raw.map((p) => [p.name, p]));

  const image = params.get("image")?.string;
  if (!image) {
    throw new Error("missing required parameter: image");
  }

  return {
    name: Deno.env.get("ARGOCD_APP_NAME") ?? "webapp",
    namespace: Deno.env.get("ARGOCD_APP_NAMESPACE") || undefined,
    image,
    replicas: int(params.get("replicas")?.string, 1, "replicas"),
    port: int(params.get("port")?.string, 8080, "port"),
    host: params.get("host")?.string || undefined,
    args: params.get("args")?.array ?? [],
    env: params.get("env")?.map ?? {},
  };
}

function int(value: string | undefined, fallback: number, name: string) {
  if (value === undefined || value === "") {
    return fallback;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(
      `parameter ${name} must be a non-negative integer, got "${value}"`,
    );
  }
  return n;
}
