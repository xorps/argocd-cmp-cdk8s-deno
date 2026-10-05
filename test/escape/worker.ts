// SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { emit } from "./_emit.ts";

const src = `await fetch("https://example.com"); postMessage("ESCAPED");`;
const worker = new Worker(
  `data:application/javascript,${encodeURIComponent(src)}`,
  { type: "module" },
);
emit(
  await new Promise((resolve, reject) => {
    worker.onmessage = (e) => resolve(e.data);
    worker.onerror = (e) => reject(e);
  }),
);
