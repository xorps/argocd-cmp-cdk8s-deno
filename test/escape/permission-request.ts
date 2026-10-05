// SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { emit } from "./_emit.ts";

const wanted: Deno.PermissionDescriptor[] = [
  { name: "read", path: "/canary/secret" },
  { name: "net" },
  { name: "run" },
  { name: "write" },
  { name: "ffi" },
  { name: "sys" },
];
const granted = [];
for (const desc of wanted) {
  if ((await Deno.permissions.request(desc)).state === "granted") {
    granted.push(desc.name);
  }
}
if (granted.length > 0) {
  emit(`ESCAPED ${granted.join(",")}`);
}
