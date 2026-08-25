import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import { bicepPath } from "./lib/bicep.mjs";

const toolchain = JSON.parse(await readFile("toolchain.json", "utf8"));
const output = execFileSync(bicepPath, ["--version"], { encoding: "utf8" });
assert.match(
  output,
  new RegExp(`Bicep CLI version ${toolchain.bicepCli.replaceAll(".", "\\.")}`),
);
console.log(`Pinned Bicep CLI verified: ${toolchain.bicepCli}`);
