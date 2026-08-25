import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import { bicepPath } from "./lib/bicep.mjs";

for (const file of [
  "infra/profile-j/foundation.bicep",
  "infra/profile-j/registry.bicep",
  "infra/profile-j/main.bicep",
]) {
  const current = await readFile(file, "utf8");
  const formatted = execFileSync(bicepPath, ["format", file, "--stdout"], {
    encoding: "utf8",
  });
  assert.equal(
    current,
    formatted,
    `${file} must be formatted with the pinned Bicep CLI`,
  );
}
console.log("Profile J Bicep sources are formatted.");
