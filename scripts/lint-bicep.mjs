import { execFileSync } from "node:child_process";

import { bicepPath } from "./lib/bicep.mjs";

for (const file of [
  "infra/profile-j/foundation.bicep",
  "infra/profile-j/registry.bicep",
  "infra/profile-j/main.bicep",
]) {
  execFileSync(bicepPath, ["lint", file, "--no-restore"], {
    stdio: "inherit",
  });
}
console.log("Profile J Bicep lint passed.");
