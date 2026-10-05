// SPDX-FileCopyrightText: 2026 The argocd-cmp-cdk8s-deno Authors
// SPDX-License-Identifier: Apache-2.0 OR MIT

// Static imports skip deno's read permission checks, and symlinks are checked
// by where they sit rather than where they point. Before rendering, make sure
// every module in the graph, and every symlink the app can read through,
// resolves to somewhere inside the repo.

import { join } from "node:path";
import { fileURLToPath } from "node:url";

interface Graph {
  modules?: { specifier?: string }[];
}

function* symlinks(dir: string): Generator<string> {
  for (const entry of Deno.readDirSync(dir)) {
    const path = join(dir, entry.name);
    if (entry.isSymlink) {
      yield path;
    } else if (entry.isDirectory) {
      yield* symlinks(path);
    }
  }
}

function* localModules(graph: Graph): Generator<string> {
  for (const { specifier } of graph.modules ?? []) {
    if (specifier?.startsWith("file:")) {
      yield fileURLToPath(specifier);
    }
  }
}

function escapes(root: string, path: string): string | undefined {
  try {
    const real = Deno.realPathSync(path);
    if (real === root || real.startsWith(`${root}/`)) {
      return undefined;
    }
    return `${path} -> ${real}`;
  } catch (err) {
    // a missing file fails later with a clearer error from deno itself
    return err instanceof Deno.errors.NotFound ? undefined : path;
  }
}

async function main() {
  const [root, app] = Deno.args;
  const graph: Graph = JSON.parse(
    await new Response(Deno.stdin.readable).text(),
  );

  const outside = [...symlinks(app), ...localModules(graph)]
    .map((path) => escapes(root, path))
    .filter((problem) => problem !== undefined);

  if (outside.length > 0) {
    console.error(`refusing to render, these resolve outside ${root}:`);
    for (const problem of outside) {
      console.error(`  ${problem}`);
    }
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
